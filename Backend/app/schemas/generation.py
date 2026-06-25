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

    company_snapshot: str = Field(description="Section 1 — Company Snapshot. Extract from documents: Company Name, Tagline/Brand Positioning Line, Website(s), Industry, Sub-Industry, Founded Year, Company History & Key Milestones, Employee Count, Annual Turnover Band, HQ Location, Plant/Factory Locations, Branch/Office Locations, Ownership Type (Private/Listed/Family-Owned/Partnership/LLP), Group Companies/Sister Concerns, Key Leadership (Name + Designation), Awards & Recognition, LinkedIn URL, YouTube URL, Other Social Media Links. For any field not found in documents, write 'Not found in documents — confirm with client.'")
    offer_and_products: str = Field(description="Section 2 — Offer & Products. Extract: Primary Product/Service (1-liner summary), Problem it Solves for the Buyer, Full Product/Service List with Categories, Product Specifications (grade/size/thickness/material type per product), Applications per Product (which industry uses which product), Standards & Compliance per Product (IS/ASTM/DIN/BIS etc.), Custom Fabrication/EPC Capability (Yes/No/Partial), New or Upcoming Products, Top 3 USPs, Why Clients Choose Them Over Competitors, Why Clients Leave/Don't Return, Price Positioning (Budget/Mid-Market/Premium), Pain Type Addressed (Financial/Operational/Reputational). Use tables and bullet lists. Only use facts from documents.")
    ideal_buyer_profile: str = Field(description="Section 3 — Ideal Buyer Profile. Extract: Best Margin Industry/Segment, Fastest Converting Segment, Ideal Client Company Size/Turnover Band, Ideal Client Designations to Target, Segments Giving Most Repeat Orders, Segments/Client Types to Avoid, Primary Geographies Served, Secondary/Emerging Geographies, Average Sales Cycle Length. Infer logically from product applications and industries if not stated explicitly — label inferences clearly.")
    buyer_committee: str = Field(description="Section 4 — Buyer Committee. Extract: Who Initiates the Requirement (designation), Who Evaluates Technically (designation), Who is the Final Decision Maker (designation), Who Can Block or Kill the Deal (designation), Number of Approval Layers Before PO, Typical Timeline from First Contact to PO. If not in documents, provide logical inference based on industry and product type — label clearly.")
    competitor_intelligence: str = Field(description="Section 5 — Competitor Intelligence. Extract: Top 3 Competitors (names), Why Clients Choose Competitors Over This Client, Where This Client Consistently Wins, Competitor Pricing vs This Client (Lower/Similar/Higher), Competitor Aggression Level (Low/Medium/High), Competitor Weaknesses SE Can Exploit. Only use competitor names and claims found in documents; do not invent.")
    sales_playbook: str = Field(description="Section 6 — Sales Playbook. Extract: Top Lead Sources (Referral/LinkedIn/Cold Call/Exhibition/Inbound/Dealer Network/Direct Visit), Who Handles Sales (Founder Only/Sales Team/Both), How Deals Typically Close, Average Follow-ups Before a Response, Stage Where Deals Most Commonly Stall (Inquiry/Quotation/Negotiation/PO Release), Primary Deal Loss Reasons (Price/Trust/Competitor/Timing/Budget/Approval Delay), Proof Content That Converts Prospects (Case Study/Demo/Certificate/Client List/Project Reference), Is Field Visit Critical to Close (Yes/No/Sometimes), Key Objections & Recommended Responses, Best Opening Pitch Angle for Cold Outreach.")
    demand_and_timing: str = Field(description="Section 7 — Demand & Timing. Extract: What Triggers a Purchase Requirement, Demand Type (Regular/Project-Based/Annual/One-Time), Peak Buying Months, Slow/Off-Season Months, Selling Approach (Reactive/Proactive/Both). Infer from product category and industry if not explicitly stated — label inferences.")
    commercial_overview: str = Field(description="Section 8 — Commercial Overview. Extract: Average Order Value Range (Min to Max in ₹), Average Project Value, Gross Margin % on Best Segment, Enquiry to Closure Conversion Rate %, Payment Terms Offered (Advance/30 Days/60 Days/90 Days/Mixed), Repeat Order Frequency (Monthly/Quarterly/Annual/Project-Based), Current Production/Delivery Capacity Headroom. Only state figures explicitly found in documents.")
    credibility_assets: str = Field(description="Section 9 — Credibility Assets. Extract: Notable Past Projects & Installations (names, scale, industry), Key Client Names/Logos mentioned in documents, Client List, Certifications List (IS/BIS/ISO/CE/ASTM etc.), Export Presence & Countries Served, Website Quality Assessment (Strong/Partial/Weak based on any mention), LinkedIn Page Status (Active/Inactive/Not Present if mentioned). List only what is explicitly in the documents.")
    strategy_and_focus: str = Field(description="Section 10 — Strategy & Focus. Extract: Top 3 Priorities for Next 12 Months, Segments to Grow Into, Segments to Exit or Stop Serving, New Geographies Being Targeted, Product or Service Expansion Planned. If not explicitly stated, infer from product range and market positioning — label inferences clearly.")
    watchlist_director_notes: str = Field(description="Section 11 — Watchlist / Director Notes. Extract any red flags, client sensitivities, escalation history, or special handling notes found in documents. Include Special Instructions for SE Before Outreach if inferable. If no relevant information found, write: 'No flags found in documents — to be filled manually by Director/Manager before assigning to SE.'")


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
