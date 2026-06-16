import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.crud import get_latest_version, get_visible_client
from app.deps import AdminProfile, CurrentProfile, DbSession
from app.models import Client, ClientFile, ClientProfileGenerated, SalesPitch, StudyMaterial
from app.schemas.client import (
    ClientCreate,
    ClientDetailOut,
    ClientFileOut,
    ClientOut,
    GeneratedContentOut,
    ProfilePatchRequest,
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(payload: ClientCreate, db: DbSession, profile: AdminProfile) -> Client:
    client = Client(name=payload.name, industry=payload.industry, created_by=profile.id)
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("", response_model=list[ClientOut])
async def list_clients(
    db: DbSession,
    profile: CurrentProfile,
    status_filter: Literal["draft", "published"] | None = None,
    industry: str | None = None,
) -> list[Client]:
    query = select(Client)
    if profile.role != "admin":
        # Non-admins may only ever see published clients, regardless of the query param.
        query = query.where(Client.status == "published")
    elif status_filter:
        query = query.where(Client.status == status_filter)
    if industry:
        query = query.where(Client.industry == industry)
    query = query.order_by(Client.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{client_id}", response_model=ClientDetailOut)
async def get_client(client_id: uuid.UUID, db: DbSession, profile: CurrentProfile) -> ClientDetailOut:
    client = await get_visible_client(db, profile, client_id)

    files_result = await db.execute(
        select(ClientFile).where(ClientFile.client_id == client_id).order_by(ClientFile.uploaded_at)
    )
    files = list(files_result.scalars().all())

    generated_profile = await get_latest_version(db, ClientProfileGenerated, client_id)
    study_material = await get_latest_version(db, StudyMaterial, client_id)
    sales_pitch = await get_latest_version(db, SalesPitch, client_id)

    return ClientDetailOut(
        client=ClientOut.model_validate(client),
        files=[ClientFileOut.model_validate(f) for f in files],
        profile=GeneratedContentOut.model_validate(generated_profile) if generated_profile else None,
        study_material=GeneratedContentOut.model_validate(study_material) if study_material else None,
        sales_pitch=GeneratedContentOut.model_validate(sales_pitch) if sales_pitch else None,
    )


@router.patch("/{client_id}/profile", response_model=GeneratedContentOut)
async def patch_profile(
    client_id: uuid.UUID,
    payload: ProfilePatchRequest,
    db: DbSession,
    _profile: AdminProfile,
) -> ClientProfileGenerated:
    generated_profile = await get_latest_version(db, ClientProfileGenerated, client_id)
    if generated_profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No generated profile yet")

    if payload.content_markdown is not None:
        generated_profile.content_markdown = payload.content_markdown
    if payload.content_json is not None:
        generated_profile.content_json = payload.content_json
    generated_profile.status = "edited"

    await db.commit()
    await db.refresh(generated_profile)
    return generated_profile


@router.post("/{client_id}/publish", response_model=ClientOut)
async def publish_client(client_id: uuid.UUID, db: DbSession, _profile: AdminProfile) -> Client:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    sections = {
        "profile": await get_latest_version(db, ClientProfileGenerated, client_id),
        "study material": await get_latest_version(db, StudyMaterial, client_id),
        "sales pitch": await get_latest_version(db, SalesPitch, client_id),
    }
    not_ready = [
        name for name, row in sections.items() if row is None or row.status not in ("ready", "edited")
    ]
    if not_ready:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot publish: not ready yet — {', '.join(not_ready)}",
        )

    client.status = "published"
    await db.commit()
    await db.refresh(client)
    return client
