"""Per-client RAG chatbot endpoints.

POST /clients/{client_id}/chatbot/ask      — ask a question (any authenticated user)
POST /clients/{client_id}/chatbot/reindex  — re-index all files (admin only)
"""

import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, Field

from app.deps import AdminProfile, CurrentProfile, DbSession
from app.models import Client
from app.services import rag_service

router = APIRouter(prefix="/clients", tags=["chatbot"])


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str


@router.post("/{client_id}/chatbot/ask", response_model=ChatResponse)
async def ask_chatbot(
    client_id: uuid.UUID,
    request: ChatRequest,
    db: DbSession,
    profile: CurrentProfile,
) -> ChatResponse:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    answer = await rag_service.answer_question(
        question=request.question,
        client_id=client_id,
        db=db,
        history=[m.model_dump() for m in request.history],
    )
    return ChatResponse(answer=answer)


@router.post("/{client_id}/chatbot/reindex", status_code=status.HTTP_202_ACCEPTED)
async def reindex_client(
    client_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: DbSession,
    _profile: AdminProfile,
) -> dict:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    background_tasks.add_task(rag_service.reindex_all_files, client_id)
    return {"status": "reindexing_started", "client_id": str(client_id)}
