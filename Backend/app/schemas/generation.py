"""Pydantic models that double as OpenAI structured-output JSON schemas.

These describe exactly what we ask GPT-4o to return for each of the three
generation calls kicked off by POST /clients/{id}/generate-profile. They are
also used to validate the parsed response before it's persisted.
"""

from pydantic import BaseModel, ConfigDict, Field

# extra="forbid" is required on every one of these models (including nested
# ones) so Pydantic's model_json_schema() emits "additionalProperties": false,
# which OpenAI's structured-output "strict" mode requires at every object level.
_STRICT = ConfigDict(extra="forbid")


class ObjectionNote(BaseModel):
    model_config = _STRICT

    objection: str
    recommended_response: str


class GeneratedClientProfile(BaseModel):
    model_config = _STRICT

    company_overview: str = Field(description="What the company makes/trades, who their customers are, core problem they solve, key product categories — as described in documents only. No general knowledge.")
    history_background: str = Field(description="Founding year, growth milestones, key events — exactly as stated in documents. Write 'Not Available in Documents' if absent.")
    vision_mission: str = Field(description="Exact vision and mission statements and company values as written in documents. Write 'Not Available in Documents' if not explicitly stated.")
    products_services: list[str] = Field(description="ONE item per product or product family. Each item is a markdown block: **Product Name** on first line, then ALL specs (sizes, pressure ratings, temperature range, materials, end connections, standards), ALL variants/models, ALL applications for that product — exactly as in documents. Do NOT merge products. Do NOT skip any product. Do NOT abbreviate specs.")
    industries_served: list[str] = Field(description="ONE item per industry/sector. Format: 'Industry Name: [specific use case and application context exactly as described in documents]'. List ALL industries mentioned anywhere in documents.")
    manufacturing_facilities: str = Field(description="Every plant location, capacity, technology, production line, and manufacturing capability from documents. 'Not Available in Documents' if absent.")
    certifications: list[str] = Field(description="Every certification code, standard number, test report, and accreditation mentioned anywhere in documents (e.g. ISO 9001:2015, API 600, ASME B16.34). Return empty list only if truly none exist.")
    major_customers: list[str] = Field(description="Every customer name, client reference, project name, or testimonial explicitly mentioned in documents. Return empty list only if truly none appear.")
    market_presence: str = Field(description="All export countries, office locations, distributor networks, and geographic reach from documents — list actual country/city names, not vague phrases.")
    competitors: list[str] = Field(description="Only competitors explicitly named in documents. Use ['Not Available in Documents'] if none are named.")
    key_differentiators: list[str] = Field(description="Specific, verifiable USPs from documents — e.g. 'API 600 certified, 100% hydro-tested at 1.5x rated pressure' not 'high quality'. Each item must cite a concrete claim from documents.")
    swot_analysis: str = Field(description="Markdown SWOT analysis derived only from document facts. Each quadrant: minimum 3 points. Label inferences as '(inferred from documents)'.")
    future_growth: str = Field(description="Expansion plans, new product launches, new markets explicitly mentioned in documents. Write 'Not Available in Documents' if absent.")
    additional_notes: str = Field(description="Capture ALL other structured content from documents that does not fit the above sections: FAQs, qualification questions, sales scripts, delivery terms, warranty info, payment terms, ordering process, company policies, contact info, etc. Format as organized markdown with sub-headings for each topic found. Write 'Not Available in Documents' if truly nothing else remains.")


class StudyModule(BaseModel):
    model_config = _STRICT

    title: str
    content: str


class Flashcard(BaseModel):
    model_config = _STRICT

    front: str
    back: str


class YoutubeVideo(BaseModel):
    model_config = _STRICT

    title: str = Field(description="Descriptive title telling engineers what they will learn about the PRODUCT — e.g. 'Industrial Ball Valve Working Principle Explained', 'How Pressure Relief Valves Work - Animation'")
    query: str = Field(description="YouTube search query about the PRODUCT TYPE or CATEGORY (NOT the company name). Focus on: how the product works, product demos, product selection, or industry application. Example: 'ball valve working principle animation', 'industrial pressure sensor how it works', 'flow meter types and working explained'. Use exact product terminology from the documents.")


class GeneratedStudyMaterial(BaseModel):
    model_config = _STRICT

    modules: list[StudyModule] = Field(description="Exactly 29 study modules — one for each Sales Playbook section (Task 1, sections 1-29). Never skip or merge sections. Each module must have thorough content with multiple paragraphs or detailed bullet lists. All content must come from the provided documents only.")
    flashcards: list[Flashcard] = Field(description="Exactly 15 knowledge test questions: 5 Basic Understanding + 5 Product Knowledge + 5 Sales Understanding. All questions must be based strictly on the provided documents. Question as 'front', empty string as 'back'.")
    cheat_sheet: str = Field(description="Quick revision cheat sheet (6-8 key bullet points from Section 28) combined with Lead Qualification Criteria — structured in markdown, grounded in document facts")
    youtube_videos: list[YoutubeVideo] = Field(
        description="Exactly 3 YouTube search queries about the PRODUCT TYPE/CATEGORY. Each query must help engineers understand the product's working principle, applications, or selection process. Do NOT use company name in queries. Use specific product terminology from the documents."
    )


class GeneratedSalesPitch(BaseModel):
    model_config = _STRICT

    opening: str
    key_value_props: list[str]
    objection_responses: list[ObjectionNote]
    closing: str
