"""add client_chunks table for RAG chatbot

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "client_chunks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("client_id", UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_id", UUID(as_uuid=True), sa.ForeignKey("client_files.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", JSONB(), nullable=True),
        sa.Column("chunk_metadata", JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_client_chunks_client_id", "client_chunks", ["client_id"])
    op.create_index("ix_client_chunks_file_id", "client_chunks", ["file_id"])


def downgrade() -> None:
    op.drop_index("ix_client_chunks_file_id", table_name="client_chunks")
    op.drop_index("ix_client_chunks_client_id", table_name="client_chunks")
    op.drop_table("client_chunks")
