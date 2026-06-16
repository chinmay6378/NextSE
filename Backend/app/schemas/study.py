import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class EngineerProgressOut(BaseModel):
    client_id: uuid.UUID
    studied_percent: float
    studied_sections: dict[str, bool]
    updated_at: datetime


class EngineerProgressUpdateRequest(BaseModel):
    section_id: str = Field(min_length=1)
    studied: bool
