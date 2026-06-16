import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.deps import DbSession, require_role
from app.models import Profile
from app.schemas.profile import ProfileOut, Role, RoleUpdateRequest

router = APIRouter(prefix="/admin/users", tags=["admin-users"], dependencies=[Depends(require_role("admin"))])


@router.get("", response_model=list[ProfileOut])
async def list_users(db: DbSession, role: Role | None = None) -> list[Profile]:
    query = select(Profile).order_by(Profile.full_name)
    if role:
        query = query.where(Profile.role == role)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.patch("/{profile_id}/role", response_model=ProfileOut)
async def update_role(profile_id: uuid.UUID, payload: RoleUpdateRequest, db: DbSession) -> Profile:
    profile = await db.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile.role = payload.role
    await db.commit()
    await db.refresh(profile)
    return profile
