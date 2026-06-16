"""One-time bootstrap: create the first ADMIN account.

Public signup (POST /auth/signup) always creates role=engineer, so there is no
API path that can create the first admin. Run this script once, manually,
after Supabase is configured:

    python scripts/create_admin.py admin@example.com "StrongPassword123" "Ada Admin"
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.db import AsyncSessionLocal  # noqa: E402
from app.core.supabase_client import get_supabase_admin  # noqa: E402
from app.models import Profile  # noqa: E402


async def create_admin(email: str, password: str, full_name: str) -> None:
    auth_response = get_supabase_admin().auth.admin.create_user(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name},
        }
    )
    auth_user = auth_response.user
    if auth_user is None:
        raise RuntimeError("Supabase did not return a created user")

    async with AsyncSessionLocal() as session:
        session.add(
            Profile(auth_user_id=auth_user.id, email=email, full_name=full_name, role="admin")
        )
        await session.commit()

    print(f"Created admin '{full_name}' <{email}> (auth_user_id={auth_user.id})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email")
    parser.add_argument("password")
    parser.add_argument("full_name")
    args = parser.parse_args()
    asyncio.run(create_admin(args.email, args.password, args.full_name))


if __name__ == "__main__":
    main()
