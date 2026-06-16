# SalesPrep AI — Backend

FastAPI + Supabase (Postgres/Auth/Storage) + OpenAI backend for the sales-training platform. This README covers **Phase 1**: project setup, the full database schema, auth, and the admin client/file/profile-generation flow. It will be extended as later phases (study tracking, MCQ + voice testing, results/manager review) land.

## Stack

- FastAPI + Pydantic v2, async SQLAlchemy 2.0 (asyncpg) against a Supabase Postgres connection string
- Alembic for migrations (sync psycopg driver)
- supabase-py for Storage (bucket `client-files`) and Auth admin calls only — all other DB access goes through SQLAlchemy directly
- OpenAI (`gpt-4o` by default) for structured-output generation, behind a single retrying wrapper (`app/services/openai_client.py`)

## One-time setup

### 1. Supabase project

In your Supabase project dashboard:

1. **Settings → API**: copy the Project URL, `anon` public key, `service_role` key, and the JWT secret.
2. **Settings → Database**: copy the connection string. Use the **direct connection** or **session pooler** (port `5432`) — *not* the transaction pooler (port `6543`), which breaks asyncpg's prepared statements under SQLAlchemy's async engine.
3. **Storage**: create a new bucket named `client-files`, set to **private** (not public). The backend uses the service-role key to read/write it, so no public access policy is needed.

### 2. Python environment

```bash
cd Backend
python -m venv .venv
.venv/Scripts/activate        # Windows
pip install -r requirements.txt
```

### 3. Environment variables

```bash
cp .env.example .env
```

Fill in every value from step 1, plus your `OPENAI_API_KEY`. See `.env.example` for the full list and comments.

### 4. Run migrations

```bash
alembic upgrade head
```

This creates all 16 application tables (`profiles`, `clients`, `client_files`, `client_custom_prompts`, `client_profiles_generated`, `study_materials`, `sales_pitches`, `engineer_progress`, `test_requests`, `mcq_sets`, `mcq_questions`, `mcq_attempts`, `voice_sessions`, `voice_transcripts`, `results`, `llm_generation_logs`), foreign keys, indexes on every `client_id`/`engineer_id`/`test_request_id` column, and `updated_at` triggers on `clients`, `client_profiles_generated`, `study_materials`, `sales_pitches`, `engineer_progress`.

### 5. Create your first admin

Public signup (`POST /auth/signup`) always creates an `engineer`. Run this once to create an admin login:

```bash
python scripts/create_admin.py admin@example.com "StrongPassword123" "Ada Admin"
```

### 6. Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

OpenAPI docs at `http://localhost:8000/docs`.

## Auth model

- Roles are `admin` / `engineer` / `manager`, stored on `profiles.role`.
- The frontend authenticates directly against Supabase Auth (supabase-js) and sends the resulting access token as `Authorization: Bearer <token>` on every API call.
- The backend verifies that JWT itself (HS256, `SUPABASE_JWT_SECRET`) — it never calls back to Supabase to validate a session.
- `POST /auth/signup` creates the Supabase Auth user (via the service-role admin API) **and** the `profiles` row in one call, always as `role=engineer`. There is intentionally no API path to create an admin or manager — use `scripts/create_admin.py` once, then `PATCH /admin/users/{id}/role` (admin-only) to promote anyone else.

## Endpoints built so far

```
POST   /auth/signup
GET    /me
GET    /admin/users                          (admin)
PATCH  /admin/users/{id}/role                (admin)
POST   /clients                              (admin)
GET    /clients                              (any role; non-admins always see status=published only)
GET    /clients/{id}
POST   /clients/{id}/files                   (admin, multipart)
DELETE /clients/{id}/files/{file_id}         (admin)
POST   /clients/{id}/generate-profile        (admin)
GET    /clients/{id}/generation-status       (admin)
PATCH  /clients/{id}/profile                 (admin)
POST   /clients/{id}/regenerate              (admin)
POST   /clients/{id}/publish                 (admin)
```

`generate-profile` kicks off 3 parallel OpenAI structured-output calls (client profile, study material, sales pitch) as a background task and returns immediately with `status: generating`; poll `generation-status` until each section is `ready` (or `failed`, with `*_error` populated). Every OpenAI call is logged to `llm_generation_logs` (model, token counts, latency, success/error) regardless of outcome.

## Notes on deviations from a literal reading of the spec

- `profiles.email`, `client_files.extraction_status`, and `updated_at`/`error_message` on the three generated-content tables were added — none were in the original table list but are needed for the API to be useful (see inline comments / commit history for why).
- `results.status` will include a `pending_review` value (added when Phase 5 builds that table's consumers) in addition to `pass|retrain|reject`, since `GET /results?status=pending_review` is referenced directly in the spec's Manager Review section.
- Enums are `VARCHAR` + `CHECK` constraints (`Enum(..., native_enum=False, create_constraint=True)`), not native Postgres `ENUM` types, so adding a new status value later is a simple constraint migration instead of `ALTER TYPE`.
