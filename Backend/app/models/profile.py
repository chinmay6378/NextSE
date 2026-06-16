import uuid

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at_col, uuid_pk

ProfileRole = SAEnum(
    "admin", "engineer", "manager", name="profile_role", native_enum=False, create_constraint=True, validate_strings=True
)


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = uuid_pk()
    auth_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(ProfileRole, nullable=False, server_default="engineer")
    created_at = created_at_col()
