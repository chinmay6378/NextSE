"""add level and started_at columns to mcq_attempts

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-29

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "mcq_attempts",
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "mcq_attempts",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_column("mcq_attempts", "started_at")
    op.drop_column("mcq_attempts", "level")
