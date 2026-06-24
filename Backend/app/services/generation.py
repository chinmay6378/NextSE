"""Orchestrates the three parallel OpenAI generation calls behind
POST /clients/{id}/generate-profile and POST /clients/{id}/regenerate.

Split into two halves:
  * start_generation()  -- runs synchronously inside the request, creates the
                            "generating"-status placeholder rows so polling has
                            something to read immediately, and returns their ids.
  * run_generation()     -- the slow part, scheduled via BackgroundTasks, which
                            calls OpenAI and fills in those exact rows.
"""

import asyncio
import uuid
from dataclasses import dataclass

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.models import (
    Client,
    ClientCustomPrompt,
    ClientFile,
    ClientProfileGenerated,
    SalesPitch,
    StudyMaterial,
)
from app.schemas.generation import (
    GeneratedClientProfile,
    GeneratedSalesPitch,
    GeneratedStudyMaterial,
    ObjectionNote,
)
from app.services.openai_client import GenerationFailedError, generate_structured

MAX_CONTEXT_CHARS = 120_000

PROFILE_SYSTEM_PROMPT = """
You are a Senior Industrial Sales Strategist and B2B Market Research Expert.

Your task is to analyze the uploaded product documents and create a complete Client Profile and Market Intelligence Report.

Rules:

1. Use uploaded documents as the primary source.
2. Do not invent technical specifications, certifications, customer names, or performance claims.
3. If information is missing, mention:
   - Not available in uploaded documents
   - Need confirmation from client
   - Requires validation

Output Structure:

1. Product Overview
   - What is the product?
   - What problem does it solve?
   - Who uses it?
   - Where is it used?

2. Industry Mapping
   - Relevant industries
   - Applications
   - Use cases
   - Departments involved

3. Ideal Customer Profile (ICP)
   - Best-fit industries
   - Company size
   - Company type
   - Geography (if available)
   - Target decision makers

4. Buyer Personas
   For each persona:
   - Responsibilities
   - Pain points
   - Buying motivations
   - Preferred conversation angle

5. Prospect Pain Points
   - Technical pain points
   - Operational pain points
   - Commercial pain points

6. Buying Triggers
   - New projects
   - Plant expansion
   - Vendor replacement
   - Cost reduction
   - Compliance requirements
   - Capacity expansion

7. Customer Qualification Framework
   - Ideal prospects
   - Moderate-fit prospects
   - Poor-fit prospects

8. Exclusion List
   - Companies not worth targeting
   - Wrong buyer personas

9. Lead Qualification Scorecard
   - Score out of 100
   - Qualification criteria

10. Missing Information Required From Client
"""

STUDY_MATERIAL_SYSTEM_PROMPT = """You are a Senior Sales Engineer Trainer and Industrial Product Training Specialist.

Your task is to create a practical study guide for a sales engineer using the uploaded product documents.

Rules:

1. Use only information available in uploaded documents.
2. Do not invent technical claims.
3. Explain concepts in simple language.
4. Train the sales engineer to confidently discuss the product with customers.

Output Structure:

1. Product Understanding

A. One-Line Explanation

B. Simple Explanation

C. Technical Explanation

2. Product Deep Dive

- Features
- Specifications
- Applications
- Industries
- Benefits
- Differentiators

3. Application & Use Case Mapping

Table:
- Application
- Industry
- Problem
- Solution
- Buyer
- Sales Angle

4. Product Benefits Translation

Table:
- Product Feature
- Technical Meaning
- Commercial Meaning
- Customer Value

5. Product Positioning

- Premium positioning
- Reliability positioning
- Cost-saving positioning
- Technical positioning

6. Sales Conversation Strategy

- Opening
- Discovery
- Need Identification
- Pitching
- Closing

7. Discovery Questions

- Basic qualification
- Technical qualification
- Purchase qualification
- Urgency qualification

8. Sales Pitch Library

Create:

- 30-second pitch
- 60-second pitch
- Technical buyer pitch
- Purchase buyer pitch
- Founder pitch
- Enterprise pitch

9. Objection Handling

Handle:

- Already have vendor
- No requirement
- Price high
- Send details
- Not interested
- Call later
- Approved vendor only
- Lowest price requirement

10. Follow-Up Strategy

- WhatsApp templates
- Email templates
- No-response sequences

11. Role Play Scenarios

Create 5 practical role plays.

12. Sales Engineer Notes

- What to remember
- What never to say
- Common mistakes
- Information to collect on every call

13. Missing Information Required From Client"""

SALES_PITCH_SYSTEM_PROMPT = (
    "You are a senior sales engineer. Draft a detailed sample sales pitch script a sales engineer "
    "could use when meeting prospects for this product. "
    "Use ONLY the product facts, features, specifications, applications, and advantages mentioned "
    "in the uploaded documents — do not add information from general knowledge. "
    "The pitch must reference specific product benefits and differentiators from the documents. "
    "Include: a strong opening, the problem this product solves, specific product features as solutions, "
    "value proposition with measurable benefits from documents, and a confident closing."
)


@dataclass
class GenerationHandles:
    prompt_id: uuid.UUID
    profile_id: uuid.UUID | None = None
    study_material_id: uuid.UUID | None = None
    sales_pitch_id: uuid.UUID | None = None


async def _next_version(session: AsyncSession, model, client_id: uuid.UUID) -> int:
    result = await session.execute(select(func.max(model.version)).where(model.client_id == client_id))
    current_max = result.scalar()
    return (current_max or 0) + 1


async def start_generation(
    client_id: uuid.UUID,
    custom_prompt: str,
    sections: tuple[str, ...] = ("profile", "study_material", "sales_pitch"),
) -> GenerationHandles:
    async with AsyncSessionLocal() as session:
        prompt_row = ClientCustomPrompt(client_id=client_id, prompt_text=custom_prompt)
        session.add(prompt_row)
        await session.flush()

        handles = GenerationHandles(prompt_id=prompt_row.id)

        if "profile" in sections:
            row = ClientProfileGenerated(
                client_id=client_id,
                version=await _next_version(session, ClientProfileGenerated, client_id),
                generated_from_prompt_id=prompt_row.id,
                status="generating",
            )
            session.add(row)
            await session.flush()
            handles.profile_id = row.id

        if "study_material" in sections:
            row = StudyMaterial(
                client_id=client_id,
                version=await _next_version(session, StudyMaterial, client_id),
                status="generating",
            )
            session.add(row)
            await session.flush()
            handles.study_material_id = row.id

        if "sales_pitch" in sections:
            row = SalesPitch(
                client_id=client_id,
                version=await _next_version(session, SalesPitch, client_id),
                status="generating",
            )
            session.add(row)
            await session.flush()
            handles.sales_pitch_id = row.id

        await session.commit()
        return handles


async def _build_user_prompt(client_id: uuid.UUID, custom_prompt: str) -> tuple[str, str, str]:
    async with AsyncSessionLocal() as session:
        client = await session.get(Client, client_id)
        files_result = await session.execute(
            select(ClientFile).where(
                ClientFile.client_id == client_id, ClientFile.extraction_status == "done"
            )
        )
        files = files_result.scalars().all()

    context_text = "\n\n---\n\n".join(
        f"[{f.file_name}]\n{f.extracted_text}" for f in files if f.extracted_text
    )[:MAX_CONTEXT_CHARS]

    parts = [f"Client name: {client.name}", f"Industry: {client.industry}"]
    if client.target_industries:
        numbered = ", ".join(f"{i+1}. {ind}" for i, ind in enumerate(client.target_industries))
        parts.append(f"Target Industries (priority order): {numbered}")
    if client.target_locations:
        numbered = ", ".join(f"{i+1}. {loc}" for i, loc in enumerate(client.target_locations))
        parts.append(f"Target Locations (priority order): {numbered}")
    if custom_prompt:
        parts.append(f"Admin instructions: {custom_prompt}")
    parts.append(
        "Source documents (extracted text):\n" + context_text
        if context_text
        else "No source documents were provided; rely on the client name, industry, and admin instructions."
    )
    return client.name, client.industry, "\n\n".join(parts)


def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def _objection_bullets(items: list[ObjectionNote]) -> str:
    return "\n".join(f"- **{o.objection}** — {o.recommended_response}" for o in items)


def _profile_to_markdown(p: GeneratedClientProfile) -> str:
    def show(content: str) -> bool:
        """Return True only if content has real data (not empty or a 'not available' placeholder)."""
        return bool(content) and "not available in documents" not in content.lower()

    products_block = "\n\n---\n\n".join(item.strip() for item in p.products_services)
    industries_block = "\n\n".join(item.strip() for item in p.industries_served)
    certifications_block = _bullets(p.certifications) if p.certifications else ""
    customers_block = _bullets(p.major_customers) if p.major_customers else ""
    competitors_block = _bullets(p.competitors)

    candidates = [
        ("## Company Overview", p.company_overview),
        ("## History and Background", p.history_background),
        ("## Vision and Mission", p.vision_mission),
        ("## Products & Services", products_block),
        ("## Industries Served", industries_block),
        ("## Manufacturing Facilities", p.manufacturing_facilities),
        ("## Certifications", certifications_block),
        ("## Major Customers", customers_block),
        ("## Market Presence", p.market_presence),
        ("## Competitors", competitors_block),
        ("## Key Differentiators", _bullets(p.key_differentiators)),
        ("## SWOT Analysis", p.swot_analysis),
        ("## Future Growth Opportunities", p.future_growth),
        ("## Additional Notes", p.additional_notes),
    ]
    return "\n\n".join(f"{heading}\n{content}" for heading, content in candidates if show(content))


def _study_material_to_markdown(m: GeneratedStudyMaterial) -> str:
    modules = "\n\n".join(f"## {mod.title}\n{mod.content}" for mod in m.modules)
    flashcards = "\n".join(f"- **Q:** {fc.front}  **A:** {fc.back}" for fc in m.flashcards)
    videos = "\n".join(
        f"- [{v.title}](https://www.youtube.com/results?search_query={v.query.replace(' ', '+')})"
        for v in m.youtube_videos
    )
    return "\n\n".join([
        modules,
        "## Flashcards\n" + flashcards,
        "## Cheat Sheet\n" + m.cheat_sheet,
        "## Video Resources\n" + videos,
    ])


def _sales_pitch_to_markdown(sp: GeneratedSalesPitch) -> str:
    return "\n\n".join(
        [
            "## Opening\n" + sp.opening,
            "## Key Value Propositions\n" + _bullets(sp.key_value_props),
            "## Objection Responses\n" + _objection_bullets(sp.objection_responses),
            "## Closing\n" + sp.closing,
        ]
    )


async def _resolve_youtube_video_ids(videos: list[dict]) -> list[dict]:
    """Call YouTube Data API v3 to resolve each query to an actual video ID."""
    if not settings.youtube_api_key:
        return videos
    enriched: list[dict] = []
    async with httpx.AsyncClient(timeout=8) as client:
        for video in videos:
            video_id: str | None = None
            try:
                r = await client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params={
                        "part": "snippet",
                        "q": video["query"],
                        "type": "video",
                        "maxResults": 1,
                        "key": settings.youtube_api_key,
                    },
                )
                r.raise_for_status()
                items = r.json().get("items", [])
                video_id = items[0]["id"]["videoId"] if items else None
            except Exception as exc:
                print(f"[YouTube] Failed to resolve '{video.get('query')}': {exc}", flush=True)
            enriched.append({**video, "video_id": video_id})
    return enriched


async def _run_section(
    *, model, row_id: uuid.UUID, schema, system_prompt: str, user_prompt: str,
    purpose: str, client_id: uuid.UUID, to_markdown,
) -> None:
    import re as _re
    async with AsyncSessionLocal() as session:
        row = await session.get(model, row_id)
        try:
            result = await generate_structured(
                session,
                schema=schema,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                purpose=purpose,
                client_id=client_id,
            )
            enriched_videos: list[dict] | None = None
            if hasattr(row, "content_json"):
                content_dict = result.model_dump()
                if "youtube_videos" in content_dict:
                    content_dict["youtube_videos"] = await _resolve_youtube_video_ids(
                        content_dict["youtube_videos"]
                    )
                    enriched_videos = content_dict["youtube_videos"]
                row.content_json = content_dict
            row.content_markdown = to_markdown(result)
            # Patch Video Resources section to use direct watch URLs where video_id is known
            if enriched_videos:
                video_lines = "\n".join(
                    f"- [{v['title']}](https://www.youtube.com/watch?v={v['video_id']})"
                    if v.get("video_id")
                    else f"- [{v['title']}](https://www.youtube.com/results?search_query={v['query'].replace(' ', '+')})"
                    for v in enriched_videos
                )
                row.content_markdown = _re.sub(
                    r"## Video Resources\n.*",
                    f"## Video Resources\n{video_lines}",
                    row.content_markdown or "",
                    flags=_re.DOTALL,
                )
            row.status = "ready"
            row.error_message = None
        except GenerationFailedError as exc:
            row.status = "failed"
            row.error_message = str(exc)[:2000]
        await session.commit()


async def run_generation(client_id: uuid.UUID, handles: GenerationHandles, custom_prompt: str) -> None:
    _, _, user_prompt = await _build_user_prompt(client_id, custom_prompt)

    tasks = []
    if handles.profile_id:
        tasks.append(
            _run_section(
                model=ClientProfileGenerated,
                row_id=handles.profile_id,
                schema=GeneratedClientProfile,
                system_prompt=PROFILE_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                purpose="client_profile",
                client_id=client_id,
                to_markdown=_profile_to_markdown,
            )
        )
    if handles.study_material_id:
        tasks.append(
            _run_section(
                model=StudyMaterial,
                row_id=handles.study_material_id,
                schema=GeneratedStudyMaterial,
                system_prompt=STUDY_MATERIAL_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                purpose="study_material",
                client_id=client_id,
                to_markdown=_study_material_to_markdown,
            )
        )
    if handles.sales_pitch_id:
        tasks.append(
            _run_section(
                model=SalesPitch,
                row_id=handles.sales_pitch_id,
                schema=GeneratedSalesPitch,
                system_prompt=SALES_PITCH_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                purpose="sales_pitch",
                client_id=client_id,
                to_markdown=_sales_pitch_to_markdown,
            )
        )

    await asyncio.gather(*tasks)
