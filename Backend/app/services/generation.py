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

PROFILE_SYSTEM_PROMPT = """\
You are a DOCUMENT EXTRACTION specialist. Your only job is to extract and structure every \
factual detail from the provided documents into the Company Profile fields. \
This is EXTRACTION, not writing — do not compress, paraphrase, or omit any information. \
Your output length must reflect the richness of the source documents.

ABSOLUTE RULES:
1. Use ONLY information found in the uploaded documents. Zero general knowledge. Zero assumptions.
2. If a field's information is not present in any document, write "Not Available in Documents". \
   Never guess. Never fill in blanks with industry knowledge.
3. Do NOT summarize. If documents list 20 products with specs, your products_services list must \
   reflect all 20 products with all their specs.
4. Do NOT write vague phrases like "various industrial applications" or "suitable for many uses". \
   State each application exactly as described in the documents.
5. Spec numbers matter: copy sizes, pressure ratings, temperature ranges, materials, standard codes \
   (ISO, API, ASME, etc.) exactly as written in the documents.

HOW TO FILL EACH FIELD:

company_overview — What the company manufactures or trades, who their customers are, what core \
problem they solve, and what makes them different — all strictly as described in documents.

history_background — Founding year, growth milestones, key events in the company's timeline, \
exactly as stated in documents. "Not Available in Documents" if absent.

vision_mission — Exact vision statement, mission statement, and company values from documents. \
"Not Available in Documents" if not explicitly stated.

products_services — ONE list item per product category or product family found in documents. \
Each item must be a markdown block:
  Line 1: **Category/Product Name** in bold.
  Then list EVERY grade, variant, or model as its own bullet point on a new line:
  - Grade or Variant Name: [any spec, application, or property stated in documents]
  If the document has sub-categories (e.g. Round Bars, Die Steels, Flat Bars), each \
  sub-category is its own list item. Each individual grade or model gets its own bullet — \
  NEVER write grades as a comma-separated list on one line.
  Include ALL sizes, pressure/temperature ratings, materials, standards, and applications \
  for each grade exactly as stated in documents.
  Do not merge two different products. Do not omit any product. Do not abbreviate any spec.

industries_served — ONE item per industry or application sector. Each item = \
"Industry Name: [how/why the product is used in this industry as stated in documents, \
specific application context]". List ALL industries mentioned anywhere in documents.

manufacturing_facilities — Every manufacturing site, plant location, production capacity, \
manufacturing technology, and production capability stated in documents. "Not Available in \
Documents" if absent.

certifications — Every certification, quality standard, test report, and accreditation code \
mentioned in documents. Include exact standard numbers (e.g. ISO 9001:2015, API 600, \
ASME B16.34). Return empty list only if truly none are mentioned anywhere.

major_customers — Every customer name, client reference, project, or testimonial explicitly \
mentioned in documents. Return empty list only if truly none appear anywhere.

market_presence — All countries, regions, export destinations, office locations, distributor \
networks, and sales reach data from documents. Be specific — list actual country/city names.

competitors — Only competitors explicitly named in documents. \
Use ["Not Available in Documents"] if no competitor is named anywhere.

key_differentiators — Specific, concrete USPs and technical advantages from documents. \
Each item must include a verifiable claim: not "high quality" but "manufactured to API 600 \
standard with 100% pressure-tested at 1.5× rated pressure". Pull exact claims from documents.

swot_analysis — Markdown SWOT table derived only from document facts. Each quadrant: \
minimum 3 points. Label any inferred point as "(inferred from documents)".

future_growth — Expansion plans, new product launches, or new market entries mentioned in \
documents. "Not Available in Documents" if absent.

additional_notes — Capture EVERYTHING else from the documents that does not fit the above \
fields. This includes:
  - FAQs and qualification questions (formatted as a bulleted list under "### FAQs / \
    Qualification Questions")
  - Sales scripts or pitch templates (under "### Sales Script")
  - Delivery, payment, or warranty terms (under the relevant sub-heading)
  - Contact information, branch details (under "### Contact / Location")
  - Any other structured content from the documents
  Format as organized markdown with ### sub-headings for each topic. \
  Write "Not Available in Documents" only if the entire document was already captured above.\
"""

STUDY_MATERIAL_SYSTEM_PROMPT = """\
ROLE:
You are a Product Training + Sales Conversion Assistant for a B2B sales team.

Your job is to read the uploaded documents (product catalogue, company profile, brochures, \
technical documents, Excel strategy checklist) and convert them into a complete SALES PLAYBOOK.

⚠️ STRICT DOCUMENT-ONLY RULE:
- Use ONLY information found in the uploaded documents. Do NOT add general knowledge, assumptions, \
  or invented content.
- If information for any section is not in the documents → write "Not Available in Documents" for \
  that specific point. Do NOT skip the section — still include it with that placeholder.
- All product specs, applications, pricing hints, certifications, customers must come from documents.
- Exception: Sales scripts and objection-handling LANGUAGE can be naturally phrased, but the \
  FACTS (product features, use cases, benefits) must come from documents only.

OBJECTIVE: Help a sales engineer know WHO to target, WHAT to sell, HOW to sell, handle objections, \
qualify leads, and close deals — all grounded in the actual product documents.

TASK 1 — SALES PLAYBOOK (produce ALL 29 sections, comprehensive content per section):
1. Scope of Work — product focus, primary/secondary industries, ideal company type, MOQ, \
   target geography (from checklist if available; else from documents)
2. Target Customer Profile — company size, industry, designation, pain points, buying behaviour
3. Company & Product Overview — what the company makes, key products, their purpose
4. Product Understanding — product types/variants, working concept, key features, specifications; \
   cover EVERY product mentioned in documents
5. Working Principle — step-by-step how the product works, simple language, real-life analogy
6. Product Benefits / Value Proposition — specific, measurable benefits from documents
7. Applications / Use Cases — industry-by-industry: what product does there, why it's needed; \
   cover every application mentioned in documents
8. Key Selling Points — top 3-5 MOST IMPORTANT points, highlight as "IMPORTANT"
9. Competitor / Market Position — from documents; "Not Available in Documents" if absent
10. Why We Are Better Than Competitors — practical differentiation points from documents; \
    "Not Available in Documents" if absent
11. Technical Highlights — specs, standards, materials, certifications from documents
12. How to Explain This Product — sales flow: opening → problem identification → solution → \
    positioning → closing; use product facts from documents
13. Call Opening Script — 3 types: Direct / Consultative / Industry-specific, 2-3 variations each; \
    reference actual product benefits from documents
14. Sales Scripts — 30-second pitch, 60-second pitch, WhatsApp pitch; grounded in document facts
15. Objection Handling — price high, existing supplier, send details, not interested; \
    responses must reference actual product advantages from documents
16. Customer Qualification Questions — questions to ask prospects based on product's target market
17. Lead Qualification Criteria — Good lead / Average lead / Poor lead based on documents
18. Disqualification Criteria — red flags, when NOT to pursue
19. Sales Process Flow — Identify → Qualify → Understand → Pitch → Follow-up → Close
20. Follow-up Strategy — timing, what to say, WhatsApp follow-up message template
21. Buying Triggers — events or conditions that make a customer ready to buy this product
22. Decision Makers to Target — per application: Influencer / Buyer / Decision Maker / End User \
    with typical designations
23. Technical vs Commercial Selling Angle — when to use technical pitch vs value/ROI pitch
24. Upselling / Cross-Selling Opportunities — related products or services from documents
25. Mistakes to Avoid — common sales mistakes for this product type
26. Trust Building Points — certifications, customers, test reports, quality marks from documents
27. Industry Knowledge — how the target industry works, where this product fits, why they need it; \
    base on documents; mark any inference as "(inferred)"
28. Quick Revision Cheat Sheet — 6-8 must-know bullet points for a new sales engineer
29. Closing Techniques:
    A. Practical closing lines and urgency lines tailored to this product
    B. Deal Closing Psychology (Urgency, Fear of Loss, Social Proof, Authority, Anchoring, \
       Risk Reversal — each with: when to use + exact sales line referencing the product)
    C. Customer Personality Types (Analytical / Price-Sensitive / Fast Decision Maker / \
       Relationship-Based — how to identify, how to talk, what to avoid, closing line for each)

TASK 2 — KNOWLEDGE TEST QUESTIONS (strictly from documents only):
Section 1: Basic Understanding (5 questions about the company/product basics)
Section 2: Product Knowledge (5 questions about technical features, specs, applications)
Section 3: Sales Understanding (5 questions about objections, target customers, USPs)
Rules: Questions only, no answers, short and clear, based ONLY on document content.

OUTPUT FORMAT MAPPING:
- modules: ALL 29 Sales Playbook sections as StudyModules. Title = section number + name. \
  Content must be thorough — multiple paragraphs or detailed bullet lists per module.
- flashcards: All 15 questions from Task 2. Question as 'front', empty string as 'back'.
- cheat_sheet: Section 28 Quick Revision Cheat Sheet + Lead Qualification Criteria combined \
  into one structured markdown block.
- youtube_videos: Exactly 3 YouTube search queries about the PRODUCT TYPE/CATEGORY (not the \
  company). Focus on helping engineers understand HOW the product works and its applications. \
  Queries should be about the product category, working principle, or industry use — NOT about \
  the company's marketing. Example format: "[product type] working principle explained", \
  "[product type] industrial application demo", "[product type] how to select and use". \
  Always use specific product terms from the documents, never generic terms.\
"""
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
