import datetime
import uuid

from sqlalchemy import Boolean, DateTime, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at_col, uuid_pk

TestRequestStatus = SAEnum(
    "pending", "approved", "in_progress", "completed",
    name="test_request_status", native_enum=False, create_constraint=True, validate_strings=True,
)
VoiceSessionStatus = SAEnum(
    "pending", "in_progress", "completed",
    name="voice_session_status", native_enum=False, create_constraint=True, validate_strings=True,
)
VoiceSpeaker = SAEnum("ai", "engineer", name="voice_speaker", native_enum=False, create_constraint=True, validate_strings=True)
ResultStatus = SAEnum(
    "pending_review", "pass", "retrain", "reject",
    name="result_status", native_enum=False, create_constraint=True, validate_strings=True,
)


class EngineerProgress(Base):
    __tablename__ = "engineer_progress"
    __table_args__ = (UniqueConstraint("engineer_id", "client_id", name="uq_engineer_progress"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    engineer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    studied_percent: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="0")
    studied_sections: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class TestRequest(Base):
    __tablename__ = "test_requests"

    id: Mapped[uuid.UUID] = uuid_pk()
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    engineer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    requested_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(TestRequestStatus, nullable=False, server_default="pending")
    requested_at = created_at_col()
    responded_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MCQSet(Base):
    __tablename__ = "mcq_sets"

    id: Mapped[uuid.UUID] = uuid_pk()
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at = created_at_col()


class MCQQuestion(Base):
    __tablename__ = "mcq_questions"

    id: Mapped[uuid.UUID] = uuid_pk()
    mcq_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mcq_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSONB, nullable=False)
    correct_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String, nullable=True)


class MCQAttempt(Base):
    __tablename__ = "mcq_attempts"

    id: Mapped[uuid.UUID] = uuid_pk()
    test_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("test_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    engineer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mcq_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mcq_sets.id"), nullable=False
    )
    answers: Mapped[list] = mapped_column(JSONB, nullable=False)
    score_percent: Mapped[float] = mapped_column(Numeric, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    started_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at = created_at_col()


class VoiceSession(Base):
    __tablename__ = "voice_sessions"

    id: Mapped[uuid.UUID] = uuid_pk()
    test_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("test_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    engineer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(VoiceSessionStatus, nullable=False, server_default="pending")
    started_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)


class VoiceTranscript(Base):
    __tablename__ = "voice_transcripts"

    id: Mapped[uuid.UUID] = uuid_pk()
    voice_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("voice_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    speaker: Mapped[str] = mapped_column(VoiceSpeaker, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    sequence_index: Mapped[int] = mapped_column(Integer, nullable=False)


class Result(Base):
    __tablename__ = "results"

    id: Mapped[uuid.UUID] = uuid_pk()
    test_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("test_requests.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    engineer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    knowledge_score: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    communication_score: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    overall_score: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    status: Mapped[str] = mapped_column(ResultStatus, nullable=False, server_default="pending_review")
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True
    )
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at = created_at_col()
    reviewed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
