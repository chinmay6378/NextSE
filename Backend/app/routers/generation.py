import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy import select

from app.crud import get_latest_version
from app.deps import AdminProfile, DbSession
from app.models import Client, ClientCustomPrompt, ClientProfileGenerated, SalesPitch, StudyMaterial
from app.schemas.client import GenerateProfileRequest, GenerationStatusOut, RegenerateRequest
from app.services.generation import run_generation, start_generation

router = APIRouter(prefix="/clients", tags=["generation"])


async def _kickoff(
    client_id: uuid.UUID, custom_prompt: str, sections: tuple[str, ...], background_tasks: BackgroundTasks
):
    handles = await start_generation(client_id, custom_prompt, sections)
    background_tasks.add_task(run_generation, client_id, handles, custom_prompt)
    return handles


@router.post("/{client_id}/generate-profile", status_code=status.HTTP_202_ACCEPTED)
async def generate_profile(
    client_id: uuid.UUID,
    payload: GenerateProfileRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    _profile: AdminProfile,
) -> dict:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    handles = await _kickoff(
        client_id, payload.custom_prompt, ("profile", "study_material", "sales_pitch"), background_tasks
    )
    return {
        "status": "generating",
        "profile_id": handles.profile_id,
        "study_material_id": handles.study_material_id,
        "sales_pitch_id": handles.sales_pitch_id,
    }


@router.get("/{client_id}/generation-status", response_model=GenerationStatusOut)
async def generation_status(
    client_id: uuid.UUID, db: DbSession, _profile: AdminProfile
) -> GenerationStatusOut:
    profile_row = await get_latest_version(db, ClientProfileGenerated, client_id)
    study_row = await get_latest_version(db, StudyMaterial, client_id)
    pitch_row = await get_latest_version(db, SalesPitch, client_id)

    if profile_row is None and study_row is None and pitch_row is None:
        return GenerationStatusOut(overall_status="not_started")

    statuses = [r.status for r in (profile_row, study_row, pitch_row) if r is not None]
    if "failed" in statuses:
        overall = "failed"
    elif "generating" in statuses:
        overall = "generating"
    elif "edited" in statuses:
        overall = "edited"
    else:
        overall = "ready"

    return GenerationStatusOut(
        overall_status=overall,
        profile_status=profile_row.status if profile_row else None,
        study_material_status=study_row.status if study_row else None,
        sales_pitch_status=pitch_row.status if pitch_row else None,
        profile_error=profile_row.error_message if profile_row else None,
        study_material_error=study_row.error_message if study_row else None,
        sales_pitch_error=pitch_row.error_message if pitch_row else None,
    )


@router.post("/{client_id}/regenerate", status_code=status.HTTP_202_ACCEPTED)
async def regenerate(
    client_id: uuid.UUID,
    payload: RegenerateRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    _profile: AdminProfile,
) -> dict:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    custom_prompt = payload.custom_prompt
    if custom_prompt is None:
        result = await db.execute(
            select(ClientCustomPrompt)
            .where(ClientCustomPrompt.client_id == client_id)
            .order_by(ClientCustomPrompt.created_at.desc())
            .limit(1)
        )
        latest_prompt = result.scalars().first()
        if latest_prompt is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No prior custom prompt found for this client; provide custom_prompt",
            )
        custom_prompt = latest_prompt.prompt_text

    sections = (payload.section,) if payload.section else ("profile", "study_material", "sales_pitch")
    handles = await _kickoff(client_id, custom_prompt, sections, background_tasks)
    return {
        "status": "generating",
        "profile_id": handles.profile_id,
        "study_material_id": handles.study_material_id,
        "sales_pitch_id": handles.sales_pitch_id,
    }
