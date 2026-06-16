from functools import lru_cache

import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient

from app.core.config import settings


@lru_cache
def _jwks_client() -> PyJWKClient:
    # Supabase's modern projects sign access tokens with an asymmetric key
    # (ES256) rotated via this JWKS endpoint, rather than the legacy shared
    # HS256 secret. PyJWKClient fetches + caches the key set by `kid`.
    return PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json", cache_keys=True)


def decode_supabase_jwt(token: str) -> dict:
    """Verify and decode a Supabase Auth access token. Supports both the
    modern asymmetric signing keys (ES256/RS256, via JWKS) and legacy
    projects still on the shared HS256 JWT secret.

    Note: the JWT's own `role` claim is the Postgres role (`authenticated`/
    `anon`) used by Supabase for RLS — it is NOT our application role. Our
    application role lives in the `profiles` table, keyed by this token's
    `sub` claim.
    """
    try:
        algorithm = jwt.get_unverified_header(token).get("alg", "HS256")

        if algorithm == "HS256":
            return jwt.decode(
                token, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated"
            )

        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        return jwt.decode(token, signing_key.key, algorithms=[algorithm], audience="authenticated")
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token"
        ) from exc
