# SalesPrep AI

Sales-training platform: admins onboard client companies, generate AI training material, and certify sales engineers via a two-stage test (MCQ + live AI voice roleplay) before they're allowed to sell to that client.

```
NextSE/
├── Backend/                FastAPI + Supabase Postgres + OpenAI
└── Frontend/NextSE-main/    Next.js 16 (App Router) + TypeScript + Tailwind v4
```

This README covers **Phase 1**: project scaffolding, the full database schema, auth, and the admin client/file/profile-generation flow (create a client → upload reference docs → generate profile/study material/sales pitch → edit/regenerate → publish). Later phases (engineer study tracking, MCQ + voice certification, results/manager review) will extend this doc as they land.

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → API**: copy the Project URL, `anon` public key, `service_role` key, and the JWT secret.
3. **Settings → Database → Connection string**: copy the **direct connection** or **session pooler** string (port `5432`). Do *not* use the transaction pooler (port `6543`) — it breaks asyncpg's prepared statements.
4. **Storage**: create a bucket named `client-files`, set to **private**.

## 2. Backend setup

```bash
cd Backend
python -m venv .venv
.venv/Scripts/activate          # Windows; `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # fill in Supabase + OpenAI values from step 1
alembic upgrade head            # creates all 16 tables, indexes, triggers
python scripts/create_admin.py admin@example.com "StrongPassword123" "Ada Admin"
uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`. Full details in [Backend/README.md](Backend/README.md).

## 3. Frontend setup

```bash
cd Frontend/NextSE-main
pnpm install
cp .env.local.example .env.local   # NEXT_PUBLIC_SUPABASE_URL / ANON_KEY from step 1, API base URL from step 2
pnpm dev
```

Open `http://localhost:3000`. Sign in with the admin account created by `scripts/create_admin.py`, or sign up a new account (always created as `engineer`).

## What's real vs. still mock right now

**Real, wired end-to-end:** signup/login (Supabase Auth), role-based routing (`admin`/`engineer`/`manager`), admin client CRUD, file upload + server-side text extraction, AI-generated client profile / study material / sales pitch (OpenAI structured outputs, backgrounded with live status polling), manual edits, regeneration, publish.

**Still mock data (explicitly deferred to later phases, marked inline in the code):** Study Hub's per-client material view, the MCQ + voice test flow, results analysis, and manager review. These still render and navigate correctly — they're just not backed by real endpoints yet.

## Why some endpoints/columns don't match the original spec literally

A few additions were necessary for the API to actually be usable end-to-end — see the "Notes on deviations" section in [Backend/README.md](Backend/README.md) for the full list and reasoning (e.g. `profiles.email`, `client_files.extraction_status`, `GET /admin/users` + role promotion, since public signup intentionally cannot create an admin).
