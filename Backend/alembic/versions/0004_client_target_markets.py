"""add target_industries, target_locations to clients; file_category to client_files

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("target_industries", postgresql.JSONB(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "clients",
        sa.Column("target_locations", postgresql.JSONB(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "client_files",
        sa.Column("file_category", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("clients", "target_industries")
    op.drop_column("clients", "target_locations")
    op.drop_column("client_files", "file_category")
