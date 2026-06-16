from pydantic import BaseModel, EmailStr, Field

from app.schemas.profile import ProfileOut


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=200)


class SignupResponse(ProfileOut):
    pass
