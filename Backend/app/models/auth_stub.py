from sqlalchemy import Column, Table
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base

# Stub reference to Supabase's own `auth.users` table, registered in our
# metadata only so SQLAlchemy's ORM can resolve profiles.auth_user_id's
# ForeignKey at flush time. We never create/alter/drop this table ourselves —
# Supabase manages the `auth` schema entirely. Excluded from Alembic
# autogenerate via include_object in alembic/env.py.
auth_users_table = Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth",
)
