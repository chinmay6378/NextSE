"""add archived flag to clients and profiles

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("archived", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("profiles", sa.Column("archived", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("profiles", "archived")
    op.drop_column("clients", "archived")
