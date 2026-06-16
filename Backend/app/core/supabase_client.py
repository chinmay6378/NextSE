from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache
def get_supabase_admin() -> Client:
    """Service-role Supabase client. Server-side only — bypasses RLS and Storage
    policies, so it must never be exposed to the frontend. Used exclusively for
    Storage object operations and Auth admin (user creation) calls."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
