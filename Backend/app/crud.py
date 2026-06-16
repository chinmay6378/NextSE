import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Client, Profile


async def get_latest_version(db: AsyncSession, model, client_id: uuid.UUID):
    """Fetch the highest-`version` row for a client from one of the three
    generated-content tables (ClientProfileGenerated/StudyMaterial/SalesPitch)
    — they all share the same (client_id, version) shape."""
    result = await db.execute(
        select(model).where(model.client_id == client_id).order_by(model.version.desc()).limit(1)
    )
    return result.scalars().first()


async def get_visible_client(db: AsyncSession, profile: Profile, client_id: uuid.UUID) -> Client:
    """Fetch a client, 404ing if it doesn't exist or is a draft an admin
    didn't request (non-admins may only ever see published clients)."""
    client = await db.get(Client, client_id)
    if client is None or (client.status != "published" and profile.role != "admin"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client
