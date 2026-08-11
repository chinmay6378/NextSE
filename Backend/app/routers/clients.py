import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.crud import get_latest_version, get_visible_client
from app.deps import AdminProfile, CurrentProfile, DbSession
from app.models import (
    Client,
    ClientFile,
    ClientProfileGenerated,
    SalesPitch,
    StudyMaterial,
    TechnicalTerminology,
    TestRequest,
)
from app.schemas.client import (
    ClientCreate,
    ClientDetailOut,
    ClientFileOut,
    ClientOut,
    GeneratedContentOut,
    ProfilePatchRequest,
)
from app.services import storage

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
async def create_client(payload: ClientCreate, db: DbSession, profile: AdminProfile) -> Client:
    existing = await db.scalar(
        select(Client).where(func.lower(Client.name) == func.lower(payload.name))
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A client named '{payload.name}' already exists",
        )
    client = Client(
        name=payload.name,
        industry=payload.industry,
        target_industries=payload.target_industries,
        target_locations=payload.target_locations,
        created_by=profile.id,
    )
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
    include_archived: bool = False,
) -> list[Client]:
    query = select(Client)
    if profile.role == "engineer":
        assigned_ids = select(TestRequest.client_id).where(TestRequest.engineer_id == profile.id)
        query = query.where(Client.status == "published").where(Client.id.in_(assigned_ids))
    elif profile.role != "admin":
        query = query.where(Client.status == "published")
    elif status_filter:
        query = query.where(Client.status == status_filter)
    if industry:
        query = query.where(Client.industry == industry)
    if not (profile.role == "admin" and include_archived):
        query = query.where(Client.archived.is_(False))
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
    terminology = await get_latest_version(db, TechnicalTerminology, client_id)

    return ClientDetailOut(
        client=ClientOut.model_validate(client),
        files=[ClientFileOut.model_validate(f) for f in files],
        profile=GeneratedContentOut.model_validate(generated_profile) if generated_profile else None,
        study_material=GeneratedContentOut.model_validate(study_material) if study_material else None,
        sales_pitch=GeneratedContentOut.model_validate(sales_pitch) if sales_pitch else None,
        technical_terminology=GeneratedContentOut.model_validate(terminology) if terminology else None,
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


@router.patch("/{client_id}/technical-terminology", response_model=GeneratedContentOut)
async def patch_technical_terminology(
    client_id: uuid.UUID,
    payload: ProfilePatchRequest,
    db: DbSession,
    _profile: AdminProfile,
) -> TechnicalTerminology:
    terminology = await get_latest_version(db, TechnicalTerminology, client_id)
    if terminology is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No generated terminology yet")

    if payload.content_markdown is not None:
        terminology.content_markdown = payload.content_markdown
    if payload.content_json is not None:
        terminology.content_json = payload.content_json
    terminology.status = "edited"

    await db.commit()
    await db.refresh(terminology)
    return terminology


@router.post("/{client_id}/publish", response_model=ClientOut)
async def publish_client(client_id: uuid.UUID, db: DbSession, _profile: AdminProfile) -> Client:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    sections = {
        "profile": await get_latest_version(db, ClientProfileGenerated, client_id),
        "study material": await get_latest_version(db, StudyMaterial, client_id),
        "sales pitch": await get_latest_version(db, SalesPitch, client_id),
        "technical terminology": await get_latest_version(db, TechnicalTerminology, client_id),
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


@router.post("/{client_id}/archive", response_model=ClientOut)
async def archive_client(client_id: uuid.UUID, db: DbSession, _profile: AdminProfile) -> Client:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    client.archived = True
    await db.commit()
    await db.refresh(client)
    return client


@router.post("/{client_id}/unarchive", response_model=ClientOut)
async def unarchive_client(client_id: uuid.UUID, db: DbSession, _profile: AdminProfile) -> Client:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    client.archived = False
    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(client_id: uuid.UUID, db: DbSession, _profile: AdminProfile) -> None:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    files_result = await db.execute(select(ClientFile).where(ClientFile.client_id == client_id))
    for f in files_result.scalars().all():
        await storage.delete_file(f.storage_path)

    await db.delete(client)
    await db.commit()
