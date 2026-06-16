import uuid

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at_col, updated_at_col, uuid_pk

ClientStatus = SAEnum("draft", "published", name="client_status", native_enum=False, create_constraint=True, validate_strings=True)
ExtractionStatus = SAEnum(
    "pending", "done", "failed", name="extraction_status", native_enum=False, create_constraint=True, validate_strings=True
)
GeneratedContentStatus = SAEnum(
    "generating", "ready", "edited", "failed", name="generated_content_status",
    native_enum=False, create_constraint=True, validate_strings=True,
)


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String, nullable=False)
    industry: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(ClientStatus, nullable=False, server_default="draft")
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    created_at = created_at_col()
    updated_at = updated_at_col()


class ClientFile(Base):
    __tablename__ = "client_files"

    id: Mapped[uuid.UUID] = uuid_pk()
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_status: Mapped[str] = mapped_column(
        ExtractionStatus, nullable=False, server_default="pending"
    )
    uploaded_at = created_at_col()


class ClientCustomPrompt(Base):
    __tablename__ = "client_custom_prompts"

    id: Mapped[uuid.UUID] = uuid_pk()
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at = created_at_col()


class ClientProfileGenerated(Base):
    __tablename__ = "client_profiles_generated"
    __table_args__ = (UniqueConstraint("client_id", "version", name="uq_client_profile_version"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    content_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    content_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_from_prompt_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("client_custom_prompts.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(GeneratedContentStatus, nullable=False, server_default="generating")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at = created_at_col()
    updated_at = updated_at_col()


class StudyMaterial(Base):
    __tablename__ = "study_materials"
    __table_args__ = (UniqueConstraint("client_id", "version", name="uq_study_material_version"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    content_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(GeneratedContentStatus, nullable=False, server_default="generating")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at = created_at_col()
    updated_at = updated_at_col()


class SalesPitch(Base):
    __tablename__ = "sales_pitches"
    __table_args__ = (UniqueConstraint("client_id", "version", name="uq_sales_pitch_version"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    content_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(GeneratedContentStatus, nullable=False, server_default="generating")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at = created_at_col()
    updated_at = updated_at_col()
