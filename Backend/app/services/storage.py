"""Supabase Storage helpers (bucket: client-files).

The supabase-py client is synchronous under the hood, so every call here is
pushed onto a worker thread with asyncio.to_thread to avoid blocking the
FastAPI event loop.
"""

import asyncio
import uuid

from app.core.config import settings
from app.core.supabase_client import get_supabase_admin


def _safe_filename(file_name: str) -> str:
    return "".join(c for c in file_name if c.isalnum() or c in "._- ") or "file"


def build_storage_path(client_id: uuid.UUID, file_name: str) -> str:
    return f"{client_id}/{uuid.uuid4()}_{_safe_filename(file_name)}"


async def upload_file(storage_path: str, content: bytes, mime_type: str) -> None:
    def _upload():
        get_supabase_admin().storage.from_(settings.supabase_storage_bucket).upload(
            storage_path,
            content,
            file_options={"content-type": mime_type or "application/octet-stream"},
        )

    await asyncio.to_thread(_upload)


async def download_file(storage_path: str) -> bytes:
    def _download() -> bytes:
        return get_supabase_admin().storage.from_(settings.supabase_storage_bucket).download(storage_path)

    return await asyncio.to_thread(_download)


async def delete_file(storage_path: str) -> None:
    def _delete():
        get_supabase_admin().storage.from_(settings.supabase_storage_bucket).remove([storage_path])

    await asyncio.to_thread(_delete)


async def create_signed_url(storage_path: str, expires_in: int = 3600) -> str:
    def _sign() -> str:
        result = get_supabase_admin().storage.from_(settings.supabase_storage_bucket).create_signed_url(
            storage_path, expires_in
        )
        # supabase-py v2 returns an object with .signed_url
        if hasattr(result, "signed_url"):
            return result.signed_url or ""
        if isinstance(result, dict):
            return result.get("signedURL") or result.get("signed_url") or ""
        return ""

    return await asyncio.to_thread(_sign)
