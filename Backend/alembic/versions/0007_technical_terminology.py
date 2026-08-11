"""add technical_terminology table (4th versioned generated-content section)

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    generated_content_status = sa.Enum(
        "generating", "ready", "edited", "failed",
        name="generated_content_status", native_enum=False, create_constraint=False,
    )

    op.create_table(
        "technical_terminology",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content_json", postgresql.JSONB(), nullable=True),
        sa.Column("content_markdown", sa.Text(), nullable=True),
        sa.Column("status", generated_content_status, nullable=False, server_default="generating"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("client_id", "version", name="uq_technical_terminology_version"),
    )

    op.execute(
        """
        CREATE TRIGGER trg_technical_terminology_updated_at
        BEFORE UPDATE ON technical_terminology
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_technical_terminology_updated_at ON technical_terminology")
    op.drop_table("technical_terminology")
