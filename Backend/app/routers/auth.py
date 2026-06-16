import asyncio

from fastapi import APIRouter, HTTPException, status

from app.core.supabase_client import get_supabase_admin
from app.deps import CurrentProfile, DbSession
from app.models import Profile
from app.schemas.auth import SignupRequest, SignupResponse
from app.schemas.profile import ProfileOut

router = APIRouter(tags=["auth"])


@router.post("/auth/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: DbSession) -> Profile:
    """Creates a Supabase Auth user + a profiles row. Role is always
    `engineer` — admins/managers are promoted via PATCH /admin/users/{id}/role.
    The frontend signs the user in client-side (supabase-js) right after this
    call succeeds; this endpoint does not return a session."""

    def _create_auth_user():
        return get_supabase_admin().auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {"full_name": payload.full_name},
            }
        )

    try:
        auth_response = await asyncio.to_thread(_create_auth_user)
    except Exception as exc:  # noqa: BLE001 - surface Supabase's own error message
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    auth_user = auth_response.user
    if auth_user is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Supabase did not return a created user"
        )

    profile = Profile(
        auth_user_id=auth_user.id, email=payload.email, full_name=payload.full_name, role="engineer"
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("/me", response_model=ProfileOut)
async def get_me(profile: CurrentProfile) -> Profile:
    return profile
