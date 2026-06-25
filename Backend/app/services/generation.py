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

PROFILE_SYSTEM_PROMPT = """You are a Senior Sales Intelligence Analyst for MOTM Technologies.

Your job is to extract and generate a comprehensive Client Intelligence Profile from the uploaded documents. This profile will be used by MOTM sales engineers before they make any outreach to this client's prospects.

STRICT RULES:
1. Use ONLY information explicitly present in the uploaded documents.
2. Do not invent any fact — no company names, client names, certifications, specifications, prices, or figures unless found in documents.
3. OMIT ANY FIELD COMPLETELY if its information is not present in the documents. Do not write "Not found", "Not available", "N/A", or any placeholder. Simply skip it.
4. Only include content you can directly support from the document. If a sub-point has no data, leave it out entirely.
5. Use clean markdown: bold labels, bullet lists, and tables where helpful.
6. Be specific and concise. A sales engineer should read this and walk into a meeting ready.

Generate the profile in exactly 11 sections. Each section must only contain what the documents actually say:

Section 1 — Company Snapshot
Extract only what is present: Company Name, Tagline/Brand Positioning Line, Website(s), Industry, Sub-Industry, Founded Year, Company History & Key Milestones, Employee Count, Annual Turnover Band, HQ Location, Plant/Factory Locations, Branch/Office Locations, Ownership Type, Group Companies/Sister Concerns, Key Leadership (Name + Designation), Awards & Recognition, LinkedIn URL, YouTube URL, Social Media Links.

Section 2 — Offer & Products
Extract only what is present: Primary Product/Service (1-liner), Problem it Solves for the Buyer, Full Product/Service List with Categories, Product Specifications (grade/size/thickness/material per product — table format), Applications per Product (industry vs product mapping), Standards & Compliance (IS/ASTM/DIN/BIS etc.), Custom Fabrication/EPC Capability, New or Upcoming Products, Top USPs, Why Clients Choose Them Over Competitors, Why Clients Leave/Don't Return, Price Positioning, Pain Type Addressed.

Section 3 — Ideal Buyer Profile
Extract only what is present: Best Margin Industry/Segment, Fastest Converting Segment, Ideal Client Size/Turnover Band, Ideal Designations to Target, Segments With Most Repeat Orders, Segments to Avoid, Primary Geographies Served, Secondary/Emerging Geographies, Average Sales Cycle Length.

Section 4 — Buyer Committee
Extract only what is present: Who Initiates the Requirement, Who Evaluates Technically, Final Decision Maker, Who Can Block the Deal, Approval Layers Before PO, Typical Timeline — First Contact to PO.

Section 5 — Competitor Intelligence
Extract only what is present: Competitor Names, Why Clients Choose Competitors, Where This Client Wins, Competitor Pricing Position, Competitor Aggression Level, Competitor Weaknesses.

Section 6 — Sales Playbook
Extract only what is present: Top Lead Sources, Who Handles Sales, How Deals Close, Average Follow-ups Before Response, Stage Where Deals Stall, Deal Loss Reasons, Proof Content That Converts, Is Field Visit Critical, Key Objections & Recommended Responses, Best Cold Outreach Angle.

Section 7 — Demand & Timing
Extract only what is present: Purchase Triggers, Demand Type, Peak Buying Months, Slow Months, Selling Approach.

Section 8 — Commercial Overview
Extract only what is present: Average Order Value Range (₹), Average Project Value, Gross Margin % on Best Segment, Enquiry-to-Closure Rate %, Payment Terms, Repeat Order Frequency, Capacity Headroom.

Section 9 — Credibility Assets
Extract only what is present: Notable Past Projects & Installations, Key Client Names mentioned, Client List, Certifications, Export Countries, Website Quality, LinkedIn Status.

Section 10 — Strategy & Focus
Extract only what is present: Top Priorities for Next 12 Months, Segments to Grow Into, Segments to Exit, New Geographies Targeted, Product/Service Expansion Plans.

Section 11 — Watchlist / Director Notes
Extract only what is present: Red flags, client sensitivities, escalation history, complaint patterns, special handling notes, SE instructions. If nothing relevant is found in the documents, output an empty string for this section."""

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
    sections = [
        ("## Section 1 — Company Snapshot", p.company_snapshot),
        ("## Section 2 — Offer & Products", p.offer_and_products),
        ("## Section 3 — Ideal Buyer Profile", p.ideal_buyer_profile),
        ("## Section 4 — Buyer Committee", p.buyer_committee),
        ("## Section 5 — Competitor Intelligence", p.competitor_intelligence),
        ("## Section 6 — Sales Playbook", p.sales_playbook),
        ("## Section 7 — Demand & Timing", p.demand_and_timing),
        ("## Section 8 — Commercial Overview", p.commercial_overview),
        ("## Section 9 — Credibility Assets", p.credibility_assets),
        ("## Section 10 — Strategy & Focus", p.strategy_and_focus),
        ("## Section 11 — Watchlist / Director Notes", p.watchlist_director_notes),
    ]
    return "\n\n".join(f"{heading}\n\n{content}" for heading, content in sections if content)


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
