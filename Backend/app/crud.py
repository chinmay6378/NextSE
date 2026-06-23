import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Client, Profile
from app.models.testing import TestRequest


async def get_latest_version(db: AsyncSession, model, client_id: uuid.UUID):
    """Fetch the highest-`version` row regardless of status (used by admin paths)."""
    result = await db.execute(
        select(model).where(model.client_id == client_id).order_by(model.version.desc()).limit(1)
    )
    return result.scalars().first()


async def get_ready_version(db: AsyncSession, model, client_id: uuid.UUID):
    """Fetch the latest 'ready' or 'edited' version (used by engineer-facing endpoints).

    Engineers should never see 'generating' or 'failed' rows — return only
    content that was successfully produced so study material is always visible
    even if a subsequent regeneration is still in progress or failed.
    """
    result = await db.execute(
        select(model)
        .where(model.client_id == client_id, model.status.in_(["ready", "edited"]))
        .order_by(model.version.desc())
        .limit(1)
    )
    return result.scalars().first()


async def get_visible_client(db: AsyncSession, profile: Profile, client_id: uuid.UUID) -> Client:
    """Fetch a client, 404ing if it doesn't exist, is a draft, or the engineer
    is not assigned to it."""
    client = await db.get(Client, client_id)
    if client is None or (client.status != "published" and profile.role != "admin"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if profile.role == "engineer":
        assigned = await db.scalar(
            select(TestRequest.id).where(
                TestRequest.engineer_id == profile.id,
                TestRequest.client_id == client_id,
            ).limit(1)
        )
        if not assigned:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client
