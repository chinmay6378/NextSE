from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import decode_supabase_jwt
from app.models import Profile

bearer_scheme = HTTPBearer(auto_error=True)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_profile(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: DbSession,
) -> Profile:
    claims = decode_supabase_jwt(credentials.credentials)
    auth_user_id = claims.get("sub")
    if not auth_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(Profile).where(Profile.auth_user_id == UUID(auth_user_id)))
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile found for this account. Contact an administrator.",
        )
    return profile


CurrentProfile = Annotated[Profile, Depends(get_current_profile)]


def require_role(*roles: str):
    async def _check(profile: CurrentProfile) -> Profile:
        if profile.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of roles: {', '.join(roles)}",
            )
        return profile

    return _check


# Annotated dependency aliases for the routes used in this phase. Using these
# (rather than `= Depends(require_role(...))` alongside an Annotated type)
# avoids FastAPI's "Depends in Annotated and default value together" error.
AdminProfile = Annotated[Profile, Depends(require_role("admin"))]
EngineerProfile = Annotated[Profile, Depends(require_role("engineer"))]
ManagerProfile = Annotated[Profile, Depends(require_role("manager"))]
