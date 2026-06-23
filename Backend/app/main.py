from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import admin_users, auth, clients, files, generation, results, study, tests, voice

app = FastAPI(title="SalesPrep AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(clients.router)
app.include_router(files.router)
app.include_router(generation.router)
app.include_router(study.router)
app.include_router(tests.router)
app.include_router(results.router)
app.include_router(voice.router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "environment": settings.environment}
