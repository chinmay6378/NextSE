"""initial schema: profiles, clients, generation, testing, results, llm logs

Revision ID: 0001
Revises:
Create Date: 2026-06-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _enum(*values: str, name: str) -> sa.Enum:
    # SQLAlchemy 2.0 changed native_enum=False's default to create_constraint=False;
    # we want the CHECK constraint, so it must be passed explicitly.
    return sa.Enum(*values, name=name, native_enum=False, create_constraint=True, validate_strings=True)


UPDATED_AT_TRIGGER_TABLES = (
    "clients",
    "client_profiles_generated",
    "study_materials",
    "sales_pitches",
    "engineer_progress",
)


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    # --- profiles ---------------------------------------------------------
    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("auth_user_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("role", _enum("admin", "engineer", "manager", name="profile_role"), nullable=False, server_default="engineer"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["auth_user_id"], ["auth.users.id"], ondelete="CASCADE"),
    )

    # --- clients ------------------------------------------------------------
    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("industry", sa.String(), nullable=False),
        sa.Column("status", _enum("draft", "published", name="client_status"), nullable=False, server_default="draft"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["created_by"], ["profiles.id"]),
    )

    # --- client_files --------------------------------------------------------
    op.create_table(
        "client_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("extraction_status", _enum("pending", "done", "failed", name="extraction_status"), nullable=False, server_default="pending"),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )

    # --- client_custom_prompts ------------------------------------------------
    op.create_table(
        "client_custom_prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )

    generated_content_status = _enum("generating", "ready", "edited", "failed", name="generated_content_status")

    # --- client_profiles_generated ---------------------------------------------
    op.create_table(
        "client_profiles_generated",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content_json", postgresql.JSONB(), nullable=True),
        sa.Column("content_markdown", sa.Text(), nullable=True),
        sa.Column("generated_from_prompt_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", generated_content_status, nullable=False, server_default="generating"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["generated_from_prompt_id"], ["client_custom_prompts.id"]),
        sa.UniqueConstraint("client_id", "version", name="uq_client_profile_version"),
    )

    # --- study_materials -------------------------------------------------------
    op.create_table(
        "study_materials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content_markdown", sa.Text(), nullable=True),
        sa.Column("status", generated_content_status, nullable=False, server_default="generating"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("client_id", "version", name="uq_study_material_version"),
    )

    # --- sales_pitches --------------------------------------------------------
    op.create_table(
        "sales_pitches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content_markdown", sa.Text(), nullable=True),
        sa.Column("status", generated_content_status, nullable=False, server_default="generating"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("client_id", "version", name="uq_sales_pitch_version"),
    )

    # --- engineer_progress ------------------------------------------------------
    op.create_table(
        "engineer_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("engineer_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("studied_percent", sa.Numeric(), nullable=False, server_default="0"),
        sa.Column("studied_sections", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["engineer_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("engineer_id", "client_id", name="uq_engineer_progress"),
    )

    # --- test_requests --------------------------------------------------------
    op.create_table(
        "test_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("engineer_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", _enum("pending", "approved", "in_progress", "completed", name="test_request_status"), nullable=False, server_default="pending"),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["engineer_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by"], ["profiles.id"]),
    )

    # --- mcq_sets ---------------------------------------------------------------
    op.create_table(
        "mcq_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )

    # --- mcq_questions -----------------------------------------------------------
    op.create_table(
        "mcq_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("mcq_set_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=False),
        sa.Column("correct_option_index", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("difficulty", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["mcq_set_id"], ["mcq_sets.id"], ondelete="CASCADE"),
    )

    # --- mcq_attempts -------------------------------------------------------------
    op.create_table(
        "mcq_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("test_request_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("engineer_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("mcq_set_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("answers", postgresql.JSONB(), nullable=False),
        sa.Column("score_percent", sa.Numeric(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["test_request_id"], ["test_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["engineer_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["mcq_set_id"], ["mcq_sets.id"]),
    )

    # --- voice_sessions -------------------------------------------------------------
    op.create_table(
        "voice_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("test_request_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("engineer_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("status", _enum("pending", "in_progress", "completed", name="voice_session_status"), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["test_request_id"], ["test_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["engineer_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )

    # --- voice_transcripts -------------------------------------------------------------
    op.create_table(
        "voice_transcripts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("voice_session_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("speaker", _enum("ai", "engineer", name="voice_speaker"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("timestamp_ms", sa.Integer(), nullable=False),
        sa.Column("sequence_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["voice_session_id"], ["voice_sessions.id"], ondelete="CASCADE"),
    )

    # --- results -------------------------------------------------------------
    op.create_table(
        "results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("test_request_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("engineer_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("knowledge_score", sa.Numeric(), nullable=True),
        sa.Column("communication_score", sa.Numeric(), nullable=True),
        sa.Column("overall_score", sa.Numeric(), nullable=True),
        sa.Column("status", _enum("pending_review", "pass", "retrain", "reject", name="result_status"), nullable=False, server_default="pending_review"),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewer_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["test_request_id"], ["test_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["engineer_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["profiles.id"]),
    )

    # --- llm_generation_logs -------------------------------------------------------------
    op.create_table(
        "llm_generation_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("purpose", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("prompt_version", sa.String(), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("status", _enum("success", "error", name="llm_log_status"), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
    )

    for table in UPDATED_AT_TRIGGER_TABLES:
        op.execute(
            f"""
            CREATE TRIGGER trg_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
            """
        )


def downgrade() -> None:
    for table in UPDATED_AT_TRIGGER_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table}")

    op.drop_table("llm_generation_logs")
    op.drop_table("results")
    op.drop_table("voice_transcripts")
    op.drop_table("voice_sessions")
    op.drop_table("mcq_attempts")
    op.drop_table("mcq_questions")
    op.drop_table("mcq_sets")
    op.drop_table("test_requests")
    op.drop_table("engineer_progress")
    op.drop_table("sales_pitches")
    op.drop_table("study_materials")
    op.drop_table("client_profiles_generated")
    op.drop_table("client_custom_prompts")
    op.drop_table("client_files")
    op.drop_table("clients")
    op.drop_table("profiles")

    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")
