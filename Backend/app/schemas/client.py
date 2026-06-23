import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ClientStatus = Literal["draft", "published"]
GeneratedStatus = Literal["generating", "ready", "edited", "failed"]
ExtractionStatus = Literal["pending", "done", "failed"]
Section = Literal["profile", "study_material", "sales_pitch"]


class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    industry: str = Field(min_length=1, max_length=200)
    target_industries: list[str] = Field(default_factory=list)
    target_locations: list[str] = Field(default_factory=list)


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    industry: str
    target_industries: list[str]
    target_locations: list[str]
    status: ClientStatus
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ClientFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    file_name: str
    mime_type: str
    file_category: str | None = None
    extraction_status: ExtractionStatus
    uploaded_at: datetime


class GeneratedContentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version: int
    status: GeneratedStatus
    content_markdown: str | None = None
    content_json: dict | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class ClientDetailOut(BaseModel):
    client: ClientOut
    files: list[ClientFileOut]
    profile: GeneratedContentOut | None = None
    study_material: GeneratedContentOut | None = None
    sales_pitch: GeneratedContentOut | None = None


class GenerateProfileRequest(BaseModel):
    custom_prompt: str = Field(min_length=1)


class GenerationStatusOut(BaseModel):
    overall_status: Literal["generating", "ready", "edited", "failed", "not_started"]
    profile_status: GeneratedStatus | None = None
    study_material_status: GeneratedStatus | None = None
    sales_pitch_status: GeneratedStatus | None = None
    profile_error: str | None = None
    study_material_error: str | None = None
    sales_pitch_error: str | None = None


class ProfilePatchRequest(BaseModel):
    content_markdown: str | None = None
    content_json: dict | None = None

    @model_validator(mode="after")
    def at_least_one_field(self):
        if self.content_markdown is None and self.content_json is None:
            raise ValueError("Provide content_markdown and/or content_json to update")
        return self


class RegenerateRequest(BaseModel):
    section: Section | None = None
    custom_prompt: str | None = None
