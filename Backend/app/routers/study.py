import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.crud import get_latest_version, get_ready_version, get_visible_client
from app.deps import AdminProfile, CurrentProfile, DbSession, EngineerProfile
from app.models import EngineerProgress, SalesPitch, StudyMaterial
from app.schemas.client import GeneratedContentOut
from app.schemas.study import EngineerProgressOut, EngineerProgressUpdateRequest

router = APIRouter(tags=["study"])


@router.get("/clients/{client_id}/study-material", response_model=GeneratedContentOut)
async def get_study_material(client_id: uuid.UUID, db: DbSession, profile: CurrentProfile) -> StudyMaterial:
    await get_visible_client(db, profile, client_id)
    material = await get_ready_version(db, StudyMaterial, client_id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study material not generated yet")
    return material


@router.get("/clients/{client_id}/sales-pitch", response_model=GeneratedContentOut)
async def get_sales_pitch(client_id: uuid.UUID, db: DbSession, profile: CurrentProfile) -> SalesPitch:
    await get_visible_client(db, profile, client_id)
    pitch = await get_ready_version(db, SalesPitch, client_id)
    if pitch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales pitch not generated yet")
    return pitch


async def _get_progress_row(db: DbSession, engineer_id: uuid.UUID, client_id: uuid.UUID) -> EngineerProgress | None:
    result = await db.execute(
        select(EngineerProgress).where(
            EngineerProgress.engineer_id == engineer_id, EngineerProgress.client_id == client_id
        )
    )
    return result.scalar_one_or_none()


def _progress_out(client_id: uuid.UUID, row: EngineerProgress | None) -> EngineerProgressOut:
    if row is None:
        return EngineerProgressOut(
            client_id=client_id, studied_percent=0.0, studied_sections={}, updated_at=datetime.now(timezone.utc)
        )
    return EngineerProgressOut(
        client_id=row.client_id,
        studied_percent=float(row.studied_percent),
        studied_sections=row.studied_sections,
        updated_at=row.updated_at,
    )


@router.get("/engineer-progress/{client_id}", response_model=EngineerProgressOut)
async def get_engineer_progress(client_id: uuid.UUID, db: DbSession, profile: EngineerProfile) -> EngineerProgressOut:
    row = await _get_progress_row(db, profile.id, client_id)
    return _progress_out(client_id, row)


@router.patch("/engineer-progress/{client_id}", response_model=EngineerProgressOut)
async def update_engineer_progress(
    client_id: uuid.UUID, payload: EngineerProgressUpdateRequest, db: DbSession, profile: EngineerProfile
) -> EngineerProgressOut:
    material = await get_latest_version(db, StudyMaterial, client_id)
    if material is None or not material.content_json:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study material not generated yet")

    total_sections = (
        len(material.content_json.get("modules", [])) + len(material.content_json.get("flashcards", [])) + 1
    )

    row = await _get_progress_row(db, profile.id, client_id)
    if row is None:
        row = EngineerProgress(engineer_id=profile.id, client_id=client_id, studied_sections={})
        db.add(row)

    sections = dict(row.studied_sections or {})
    sections[payload.section_id] = payload.studied
    row.studied_sections = sections
    completed = sum(1 for v in sections.values() if v)
    row.studied_percent = round(100 * completed / max(total_sections, 1), 2)

    await db.commit()
    await db.refresh(row)
    return _progress_out(client_id, row)


@router.post("/clients/{client_id}/study-material/resolve-videos")
async def resolve_study_material_videos(
    client_id: uuid.UUID,
    db: DbSession,
    _: AdminProfile,
) -> dict:
    """Re-run YouTube API ID resolution on existing study material without full regeneration."""
    from app.services.generation import _resolve_youtube_video_ids

    material = await get_latest_version(db, StudyMaterial, client_id)
    if material is None or not material.content_json:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study material not found")
    if material.status not in ("ready", "edited"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Study material status is '{material.status}', expected ready or edited",
        )

    videos = list(material.content_json.get("youtube_videos", []))
    if not videos:
        return {"status": "ok", "resolved": 0, "total": 0, "youtube_videos": []}

    enriched = await _resolve_youtube_video_ids(videos)
    content_dict = dict(material.content_json)
    content_dict["youtube_videos"] = enriched
    material.content_json = content_dict

    if material.content_markdown:
        video_lines = "\n".join(
            f"- [{v['title']}](https://www.youtube.com/watch?v={v['video_id']})"
            if v.get("video_id")
            else f"- [{v['title']}](https://www.youtube.com/results?search_query={v['query'].replace(' ', '+')})"
            for v in enriched
        )
        material.content_markdown = re.sub(
            r"## Video Resources\n.*",
            f"## Video Resources\n{video_lines}",
            material.content_markdown,
            flags=re.DOTALL,
        )

    await db.commit()
    resolved = sum(1 for v in enriched if v.get("video_id"))
    return {"status": "ok", "resolved": resolved, "total": len(enriched), "youtube_videos": enriched}
