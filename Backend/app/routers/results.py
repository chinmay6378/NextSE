"""Admin & engineer results endpoints."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import CurrentProfile, DbSession, require_role
from app.models import Client, Profile, Result

router = APIRouter(tags=["results"])


class ResultOut(BaseModel):
    id: uuid.UUID
    test_request_id: uuid.UUID
    engineer_id: uuid.UUID
    engineer_name: str | None
    client_id: uuid.UUID
    client_name: str | None
    knowledge_score: float | None
    communication_score: float | None
    overall_score: float | None
    status: str
    created_at: datetime


async def _enrich_results(db: AsyncSession, rows: list[Result]) -> list[ResultOut]:
    if not rows:
        return []

    engineer_ids = {r.engineer_id for r in rows}
    client_ids = {r.client_id for r in rows}

    engineer_rows = (await db.execute(select(Profile).where(Profile.id.in_(engineer_ids)))).scalars().all()
    client_rows = (await db.execute(select(Client).where(Client.id.in_(client_ids)))).scalars().all()

    eng_map: dict[uuid.UUID, str] = {p.id: p.full_name for p in engineer_rows}
    cli_map: dict[uuid.UUID, str] = {c.id: c.name for c in client_rows}

    return [
        ResultOut(
            id=r.id,
            test_request_id=r.test_request_id,
            engineer_id=r.engineer_id,
            engineer_name=eng_map.get(r.engineer_id),
            client_id=r.client_id,
            client_name=cli_map.get(r.client_id),
            knowledge_score=float(r.knowledge_score) if r.knowledge_score is not None else None,
            communication_score=float(r.communication_score) if r.communication_score is not None else None,
            overall_score=float(r.overall_score) if r.overall_score is not None else None,
            status=r.status,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get(
    "/admin/results",
    response_model=list[ResultOut],
    dependencies=[Depends(require_role("admin", "manager"))],
)
async def list_all_results(
    db: DbSession,
    engineer_id: uuid.UUID | None = None,
    client_id: uuid.UUID | None = None,
) -> list[ResultOut]:
    q = select(Result).order_by(Result.created_at.desc())
    if engineer_id:
        q = q.where(Result.engineer_id == engineer_id)
    if client_id:
        q = q.where(Result.client_id == client_id)
    rows = (await db.execute(q)).scalars().all()
    return await _enrich_results(db, list(rows))


@router.get("/engineer/results", response_model=list[ResultOut])
async def list_my_results(db: DbSession, profile: CurrentProfile) -> list[ResultOut]:
    rows = (
        await db.execute(
            select(Result)
            .where(Result.engineer_id == profile.id)
            .order_by(Result.created_at.desc())
        )
    ).scalars().all()
    return await _enrich_results(db, list(rows))
