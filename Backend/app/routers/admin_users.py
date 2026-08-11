import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.deps import DbSession, require_role
from app.models import Profile
from app.schemas.profile import ProfileOut, Role, RoleUpdateRequest

router = APIRouter(prefix="/admin/users", tags=["admin-users"], dependencies=[Depends(require_role("admin"))])


@router.get("", response_model=list[ProfileOut])
async def list_users(db: DbSession, role: Role | None = None, include_archived: bool = False) -> list[Profile]:
    query = select(Profile).order_by(Profile.full_name)
    if role:
        query = query.where(Profile.role == role)
    if not include_archived:
        query = query.where(Profile.archived.is_(False))
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{profile_id}", response_model=ProfileOut)
async def get_user(profile_id: uuid.UUID, db: DbSession) -> Profile:
    profile = await db.get(Profile, profile_id)
    if profile is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return profile


@router.patch("/{profile_id}/role", response_model=ProfileOut)
async def update_role(profile_id: uuid.UUID, payload: RoleUpdateRequest, db: DbSession) -> Profile:
    profile = await db.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile.role = payload.role
    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/{profile_id}/archive", response_model=ProfileOut)
async def archive_user(profile_id: uuid.UUID, db: DbSession) -> Profile:
    profile = await db.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if profile.role != "engineer":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only engineers can be archived")
    profile.archived = True
    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/{profile_id}/unarchive", response_model=ProfileOut)
async def unarchive_user(profile_id: uuid.UUID, db: DbSession) -> Profile:
    profile = await db.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if profile.role != "engineer":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only engineers can be unarchived")
    profile.archived = False
    await db.commit()
    await db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(profile_id: uuid.UUID, db: DbSession) -> None:
    profile = await db.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if profile.role != "engineer":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only engineers can be deleted")
    await db.delete(profile)
    await db.commit()
