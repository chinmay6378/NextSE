import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_latest_version(db: AsyncSession, model, client_id: uuid.UUID):
    """Fetch the highest-`version` row for a client from one of the three
    generated-content tables (ClientProfileGenerated/StudyMaterial/SalesPitch)
    — they all share the same (client_id, version) shape."""
    result = await db.execute(
        select(model).where(model.client_id == client_id).order_by(model.version.desc()).limit(1)
    )
    return result.scalars().first()
