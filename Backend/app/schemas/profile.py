import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

Role = Literal["admin", "engineer", "manager"]


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    auth_user_id: uuid.UUID
    email: str
    full_name: str
    role: Role
    created_at: datetime


class RoleUpdateRequest(BaseModel):
    role: Role
