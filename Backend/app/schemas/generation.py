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

    company_overview: str = Field(description="2-4 paragraph overview of the client company")
    products_services: list[str] = Field(description="Distinct products/services offered")
    unique_selling_points: list[str]
    target_market: str
    competitors: list[str]
    key_talking_points: list[str] = Field(description="Points a sales engineer should lead with")
    objection_handling: list[ObjectionNote]


class StudyModule(BaseModel):
    model_config = _STRICT

    title: str
    content: str


class Flashcard(BaseModel):
    model_config = _STRICT

    front: str
    back: str


class GeneratedStudyMaterial(BaseModel):
    model_config = _STRICT

    modules: list[StudyModule] = Field(description="3-6 study modules covering the company/product")
    flashcards: list[Flashcard] = Field(description="5-10 Q&A flashcards for quick recall")
    cheat_sheet: str = Field(description="Condensed quick-reference summary, markdown-friendly")


class GeneratedSalesPitch(BaseModel):
    model_config = _STRICT

    opening: str
    key_value_props: list[str]
    objection_responses: list[ObjectionNote]
    closing: str
