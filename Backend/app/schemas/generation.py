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

    product_clarity: str = Field(description="One-line explanation, simple buyer explanation, technical buyer explanation, main problem solved, and why customers may consider switching from current solution.")
    best_fit_icp: str = Field(description="Markdown table with columns: Industry | Company Type | Department/Person to Approach | Use Case | Reason to Target | Priority (High/Medium/Low). Also include a section on who NOT to target.")
    buyer_problems_triggers: str = Field(description="List of technical problems, commercial/business problems, and buying triggers such as new project, vendor issue, breakdown, expansion, quality issue, compliance, replacement, maintenance shutdown, cost reduction.")
    feature_to_value: str = Field(description="Markdown table with columns: Feature/Fact from Document | Technical Meaning | Business Value | Buyer Who Cares | How to Explain It | Proof Available / Proof Missing.")
    stakeholder_messaging: str = Field(description="For each buyer type (Owner/Director, Plant/Production, Maintenance, Quality, Project/Engineering, Purchase, Consultant/EPC): what they care about, what to say, what not to say, best question to ask.")
    discovery_questions: list[str] = Field(description="Exactly 12 strong discovery questions covering: current process/vendor, application, pain/problem, impact of problem, technical requirement, purchase process, decision-maker, timeline, success criteria, reason to change. No weak questions like 'Do you have requirement?'")
    sales_pitch_scripts: str = Field(description="Four pitch scripts: A) 30-second cold call pitch, B) First meeting pitch, C) Technical buyer pitch, D) Purchase buyer pitch. Each includes: Opening, Relevance, Problem, Product Value, Discovery Question, Next Step. Keep scripts natural, short, and practical.")
    objection_handling: str = Field(description="For each objection (Send details, Already have vendor, No requirement now, Price is high, Not interested, Talk to purchase, Share profile, Call later, We need lowest price, We only work with approved vendors): what prospect may actually mean, best response, follow-up question, next step. Use calm consultative language and tactical empathy.")
    lead_qualification_score: str = Field(description="Scoring framework out of 100: Industry fit (20), Application fit (20), Problem/need (20), Decision-maker access (15), Timeline/urgency (15), Commercial seriousness (10). Classification: Hot / Warm / Nurture / Not relevant.")
    call_execution_notes: str = Field(description="5 things sales engineer must remember, 5 mistakes to avoid, 5 details to capture in CRM, 5 missing inputs to ask the client.")


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
