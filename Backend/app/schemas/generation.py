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

    company_snapshot: str = Field(description="Section 1 - Company Snapshot. Include ONLY what is explicitly in the documents. Fields to extract if present: Company Name, Tagline/Brand Positioning, Website(s), Industry, Sub-Industry, Founded Year, History & Milestones, Employee Count, Turnover Band, HQ Location, Plant/Factory Locations, Branch/Office Locations, Ownership Type, Group Companies, Key Leadership (Name + Designation), Awards & Recognition, LinkedIn URL, YouTube URL, Social Media Links. CRITICAL: Completely OMIT any field not found in documents. Do NOT write 'Not found', 'N/A', 'Not available', or any placeholder for missing fields.")
    offer_and_products: str = Field(description="Section 2 - Offer & Products. Include ONLY what is in the documents. Fields to extract if present: Primary Product/Service (1-liner), Problem it Solves, Product/Service List with Categories, Specifications table (grade/size/material per product), Applications per Product, Standards & Compliance (IS/ASTM/DIN/BIS), Custom Fabrication/EPC Capability, New/Upcoming Products, USPs, Why Clients Choose Them, Why Clients Leave, Price Positioning, Pain Type Addressed. CRITICAL: Completely OMIT any field not in documents.")
    ideal_buyer_profile: str = Field(description="Section 3 - Ideal Buyer Profile. Include ONLY what documents state. Fields to extract if present: Best Margin Segment, Fastest Converting Segment, Ideal Client Size, Designations to Target, Segments With Repeat Orders, Segments to Avoid, Primary Geographies, Secondary Geographies, Sales Cycle Length. CRITICAL: Completely OMIT any field not in documents.")
    buyer_committee: str = Field(description="Section 4 - Buyer Committee. Include ONLY what documents state. Fields to extract if present: Who Initiates Requirement, Technical Evaluator, Final Decision Maker, Who Can Block Deal, Approval Layers Before PO, First Contact to PO Timeline. CRITICAL: Completely OMIT any field not in documents.")
    competitor_intelligence: str = Field(description="Section 5 - Competitor Intelligence. Include ONLY what documents explicitly state. Fields to extract if present: Competitor Names, Why Clients Choose Competitors, Where This Client Wins, Competitor Pricing Position, Competitor Aggression Level, Competitor Weaknesses. CRITICAL: Never invent competitor names. Completely OMIT any field not in documents.")
    sales_playbook: str = Field(description="Section 6 - Sales Playbook. Include ONLY what documents state. Fields to extract if present: Lead Sources, Who Handles Sales, How Deals Close, Follow-ups Before Response, Where Deals Stall, Deal Loss Reasons, Proof Content That Converts, Field Visit Importance, Objections & Responses, Best Cold Outreach Angle. CRITICAL: Completely OMIT any field not in documents.")
    demand_and_timing: str = Field(description="Section 7 - Demand & Timing. Include ONLY what documents state. Fields to extract if present: Purchase Triggers, Demand Type, Peak Buying Months, Slow Months, Selling Approach. CRITICAL: Completely OMIT any field not in documents.")
    commercial_overview: str = Field(description="Section 8 - Commercial Overview. Include ONLY figures explicitly stated in documents. Fields to extract if present: Order Value Range (in Rs.), Project Value, Gross Margin %, Conversion Rate %, Payment Terms, Repeat Order Frequency, Capacity Headroom. CRITICAL: Never fabricate numbers. Completely OMIT any field not in documents.")
    credibility_assets: str = Field(description="Section 9 - Credibility Assets. Include ONLY what documents mention. Fields to extract if present: Past Projects & Installations, Client Names/Logos, Client List, Certifications, Export Countries, Website Quality, LinkedIn Status. CRITICAL: Completely OMIT any field not in documents.")
    strategy_and_focus: str = Field(description="Section 10 - Strategy & Focus. Include ONLY what documents state. Fields to extract if present: Top Priorities for Next 12 Months, Segments to Grow, Segments to Exit, New Geographies, Expansion Plans. CRITICAL: Completely OMIT any field not in documents.")
    watchlist_director_notes: str = Field(description="Section 11 - Watchlist / Director Notes. Include ONLY what documents mention: red flags, sensitivities, complaint history, special handling notes, SE instructions. If nothing relevant is found in the documents, return an empty string. Do NOT write any placeholder, heading, or filler text.")


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
