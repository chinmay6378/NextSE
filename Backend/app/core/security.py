import jwt
from fastapi import HTTPException, status

from app.core.config import settings


def decode_supabase_jwt(token: str) -> dict:
    """Verify and decode a Supabase Auth access token (HS256, project JWT secret).

    Note: the JWT's own `role` claim is the Postgres role (`authenticated`/`anon`)
    used by Supabase for RLS — it is NOT our application role. Our application
    role lives in the `profiles` table, keyed by this token's `sub` claim.
    """
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token"
        ) from exc
