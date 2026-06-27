"""Voice assessment endpoints.

Flow per test request:
  POST /test-requests/{id}/voice/start   → create/resume VoiceSession, return opening AI message
  POST /voice-sessions/{id}/turn         → upload audio, transcribe, store turns, get AI reply
  POST /voice-sessions/{id}/end          → score conversation, persist communication_score
"""

import asyncio
import base64
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import DbSession, EngineerProfile
from app.core.db import AsyncSessionLocal
from app.models import (
    Client,
    ClientProfileGenerated,
    MCQAttempt,
    Profile,
    Result,
    TestRequest,
    VoiceSession,
    VoiceTranscript,
)
from app.schemas.voice import VoiceScoreOut, VoiceSessionOut, VoiceTranscriptOut, VoiceTurnOut
from app.services.voice_scoring import (
    OPENING_PROMPT,
    generate_prospect_response,
    generate_response_with_audio,
    score_voice_session,
    synthesize_speech,
    synthesize_speech_stream,
    transcribe_audio,
)

router = APIRouter(tags=["voice"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _client_context(db: AsyncSession, client_id: uuid.UUID) -> str:
    client = await db.get(Client, client_id)
    if client is None:
        return "unknown client"
    context = f"{client.name} (industry: {client.industry})"
    profile = (
        await db.execute(
            select(ClientProfileGenerated)
            .where(ClientProfileGenerated.client_id == client_id)
            .where(ClientProfileGenerated.status == "ready")
            .order_by(ClientProfileGenerated.version.desc())
            .limit(1)
        )
    ).scalars().first()
    if profile and profile.content_markdown:
        context += f"\n\nProfile summary:\n{profile.content_markdown[:600]}"
    return context


async def _transcript(db: AsyncSession, session_id: uuid.UUID) -> list[VoiceTranscript]:
    rows = (
        await db.execute(
            select(VoiceTranscript)
            .where(VoiceTranscript.voice_session_id == session_id)
            .order_by(VoiceTranscript.sequence_index)
        )
    ).scalars().all()
    return list(rows)


def _out(t: VoiceTranscript) -> VoiceTranscriptOut:
    return VoiceTranscriptOut(
        id=t.id,
        speaker=t.speaker,
        message=t.message,
        timestamp_ms=t.timestamp_ms,
        sequence_index=t.sequence_index,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/test-requests/{request_id}/voice/start",
    response_model=VoiceSessionOut,
    status_code=status.HTTP_200_OK,
)
async def start_voice_session(
    request_id: uuid.UUID,
    db: DbSession,
    profile: EngineerProfile,
) -> VoiceSessionOut:
    req = await db.get(TestRequest, request_id)
    if req is None or req.engineer_id != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test request not found")

    # Engineer must have passed MCQ
    attempt = (
        await db.execute(
            select(MCQAttempt).where(MCQAttempt.test_request_id == request_id)
        )
    ).scalar_one_or_none()
    if attempt is None or not attempt.passed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must pass the MCQ assessment before starting voice assessment",
        )

    # Resume existing session if not yet completed
    existing = (
        await db.execute(
            select(VoiceSession).where(VoiceSession.test_request_id == request_id)
        )
    ).scalar_one_or_none()

    if existing and existing.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voice assessment already completed for this test",
        )

    try:
        opening_audio_bytes = await synthesize_speech(OPENING_PROMPT)
        opening_audio_b64 = base64.b64encode(opening_audio_bytes).decode()
    except Exception:
        opening_audio_b64 = None

    if existing:
        return VoiceSessionOut(
            id=existing.id,
            test_request_id=request_id,
            status=existing.status,
            started_at=existing.started_at,
            opening_message=OPENING_PROMPT,
            opening_audio_b64=opening_audio_b64,
        )

    now = datetime.now(timezone.utc)
    session = VoiceSession(
        test_request_id=request_id,
        engineer_id=profile.id,
        client_id=req.client_id,
        status="in_progress",
        started_at=now,
    )
    db.add(session)
    await db.flush()

    db.add(VoiceTranscript(
        voice_session_id=session.id,
        speaker="ai",
        message=OPENING_PROMPT,
        timestamp_ms=0,
        sequence_index=0,
    ))
    await db.commit()
    await db.refresh(session)

    return VoiceSessionOut(
        id=session.id,
        test_request_id=request_id,
        status=session.status,
        started_at=session.started_at,
        opening_message=OPENING_PROMPT,
        opening_audio_b64=opening_audio_b64,
    )


@router.post("/voice-sessions/{session_id}/turn", response_model=VoiceTurnOut)
async def submit_turn(
    session_id: uuid.UUID,
    db: DbSession,
    profile: EngineerProfile,
    audio: UploadFile = File(...),
) -> VoiceTurnOut:
    session = await db.get(VoiceSession, session_id)
    if session is None or session.engineer_id != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice session not found")
    if session.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not active")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio upload")

    transcription = await transcribe_audio(audio_bytes, audio.content_type or "audio/webm")
    if not transcription:
        transcription = "[inaudible]"

    existing = await _transcript(db, session_id)
    conversation = [{"speaker": t.speaker, "message": t.message} for t in existing]
    next_seq = len(existing)
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

    # Persist engineer turn
    db.add(VoiceTranscript(
        voice_session_id=session_id,
        speaker="engineer",
        message=transcription,
        timestamp_ms=now_ms,
        sequence_index=next_seq,
    ))

    conversation.append({"speaker": "engineer", "message": transcription})
    ctx = await _client_context(db, session.client_id)

    # Flush engineer transcript to DB while LLM streams + TTS runs in parallel
    await db.flush()
    response_task = asyncio.create_task(generate_response_with_audio(conversation, ctx))
    ai_response, ai_audio_bytes = await response_task

    # Persist AI turn then commit both together
    db.add(VoiceTranscript(
        voice_session_id=session_id,
        speaker="ai",
        message=ai_response,
        timestamp_ms=now_ms + 1,
        sequence_index=next_seq + 1,
    ))
    await db.commit()

    full = await _transcript(db, session_id)
    engineer_turns = sum(1 for t in full if t.speaker == "engineer")
    ai_audio_b64 = base64.b64encode(ai_audio_bytes).decode() if ai_audio_bytes else None

    return VoiceTurnOut(
        transcription=transcription,
        ai_response=ai_response,
        ai_audio_b64=ai_audio_b64,
        turn_count=engineer_turns,
        session_transcript=[_out(t) for t in full],
    )


@router.post("/voice-sessions/{session_id}/end", response_model=VoiceScoreOut)
async def end_voice_session(
    session_id: uuid.UUID,
    db: DbSession,
    profile: EngineerProfile,
) -> VoiceScoreOut:
    session = await db.get(VoiceSession, session_id)
    if session is None or session.engineer_id != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice session not found")
    if session.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not active")

    transcript = await _transcript(db, session_id)
    engineer_turns = [t for t in transcript if t.speaker == "engineer"]
    if not engineer_turns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No speech recorded — please complete at least one turn before ending",
        )

    conversation = [{"speaker": t.speaker, "message": t.message} for t in transcript]
    ctx = await _client_context(db, session.client_id)
    scored = await score_voice_session(conversation, ctx, db, session.client_id)

    now = datetime.now(timezone.utc)
    duration = int((now - session.started_at).total_seconds()) if session.started_at else 0
    session.status = "completed"
    session.ended_at = now
    session.duration_seconds = duration

    result = (
        await db.execute(
            select(Result).where(Result.test_request_id == session.test_request_id)
        )
    ).scalar_one_or_none()

    overall = scored.communication_score
    if result:
        result.communication_score = scored.communication_score
        knowledge = float(result.knowledge_score or 0)
        overall = round((knowledge + scored.communication_score) / 2, 2)
        result.overall_score = overall

    await db.commit()

    return VoiceScoreOut(
        communication_score=scored.communication_score,
        ai_feedback=scored.feedback,
        overall_score=overall,
        strengths=scored.strengths,
        improvements=scored.improvements,
    )


# ---------------------------------------------------------------------------
# Demo / practice endpoints  (stateless — no DB persistence)
# ---------------------------------------------------------------------------

@router.get("/voice/demo/opening")
async def demo_opening(
    db: DbSession,
    profile: EngineerProfile,
) -> dict:
    """Return ElevenLabs-synthesized opening audio so the demo uses the same voice throughout."""
    try:
        audio_bytes = await synthesize_speech(OPENING_PROMPT)
        return {"audio_b64": base64.b64encode(audio_bytes).decode()}
    except Exception:
        return {"audio_b64": None}


@router.post("/voice/demo/turn")
async def demo_turn(
    db: DbSession,
    profile: EngineerProfile,
    audio: UploadFile = File(...),
    client_id: str = Form(...),
    conversation_json: str = Form(default="[]"),
) -> dict:
    """Practice turn: transcribe audio, generate AI prospect reply + TTS. Stateless."""
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio upload")

    try:
        conversation: list[dict] = json.loads(conversation_json)
    except json.JSONDecodeError:
        conversation = []

    transcription = await transcribe_audio(audio_bytes, audio.content_type or "audio/webm")
    if not transcription:
        transcription = "[inaudible]"

    try:
        client_uuid = uuid.UUID(client_id)
        ctx = await _client_context(db, client_uuid)
    except (ValueError, Exception):
        ctx = "a prospective client"

    conversation.append({"speaker": "engineer", "message": transcription})
    ai_response, ai_audio_bytes = await generate_response_with_audio(conversation, ctx)
    ai_audio_b64 = base64.b64encode(ai_audio_bytes).decode() if ai_audio_bytes else None

    return {"transcription": transcription, "ai_response": ai_response, "ai_audio_b64": ai_audio_b64}


@router.websocket("/ws/voice/demo/{client_id}")
async def ws_voice_demo(
    websocket: WebSocket,
    client_id: str,
    token: str = Query(default=""),
) -> None:
    """Real-time voice practice over WebSocket with streaming TTS.

    Client → Server (text JSON):
      {"type": "turn", "audio_b64": "<base64 WAV>", "conversation": [...]}
      {"type": "interrupt"}
      {"type": "end"}

    Server → Client (text JSON):
      {"type": "transcript", "text": "..."}
      {"type": "ai_response", "text": "..."}
      {"type": "audio_done"}
      {"type": "interrupted"}
      {"type": "error", "message": "..."}
    Server → Client (binary): raw MP3 audio chunks
    """
    from app.core.security import decode_supabase_jwt

    try:
        claims = decode_supabase_jwt(token)
        auth_user_id = claims.get("sub")
        if not auth_user_id:
            return
    except Exception:
        return

    async with AsyncSessionLocal() as db:
        try:
            profile = (await db.execute(
                select(Profile).where(Profile.auth_user_id == uuid.UUID(auth_user_id))
            )).scalar_one_or_none()
        except Exception:
            return

        if profile is None or profile.role != "engineer":
            return

        try:
            client_ctx = await _client_context(db, uuid.UUID(client_id))
        except Exception:
            client_ctx = "a prospective client"

    await websocket.accept()

    abort_event = asyncio.Event()
    tts_task: asyncio.Task | None = None

    async def do_tts_stream(text: str) -> None:
        abort_event.clear()
        try:
            async for chunk in synthesize_speech_stream(text):
                if abort_event.is_set():
                    break
                await websocket.send_bytes(chunk)
            if not abort_event.is_set():
                await websocket.send_json({"type": "audio_done"})
        except asyncio.CancelledError:
            pass
        except Exception:
            try:
                if not abort_event.is_set():
                    await websocket.send_json({"type": "audio_done"})
            except Exception:
                pass

    try:
        while True:
            msg = await websocket.receive()
            if msg["type"] == "websocket.disconnect":
                break

            if not msg.get("text"):
                continue

            try:
                data = json.loads(msg["text"])
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            if msg_type == "interrupt":
                abort_event.set()
                if tts_task and not tts_task.done():
                    tts_task.cancel()
                tts_task = None
                try:
                    await websocket.send_json({"type": "interrupted"})
                except Exception:
                    pass

            elif msg_type == "turn":
                abort_event.set()
                if tts_task and not tts_task.done():
                    tts_task.cancel()
                tts_task = None

                audio_b64 = data.get("audio_b64", "")
                conversation = data.get("conversation", [])

                try:
                    audio_bytes = base64.b64decode(audio_b64)
                except Exception:
                    await websocket.send_json({"type": "error", "message": "Invalid audio data"})
                    continue

                try:
                    transcript = await transcribe_audio(audio_bytes, "audio/wav")
                    if not transcript:
                        transcript = "[inaudible]"
                except Exception as exc:
                    await websocket.send_json({"type": "error", "message": f"Transcription failed: {exc}"})
                    continue

                await websocket.send_json({"type": "transcript", "text": transcript})

                conversation_with_turn = list(conversation) + [{"speaker": "engineer", "message": transcript}]
                try:
                    ai_text = await generate_prospect_response(conversation_with_turn, client_ctx)
                except Exception as exc:
                    await websocket.send_json({"type": "error", "message": f"AI response failed: {exc}"})
                    continue

                await websocket.send_json({"type": "ai_response", "text": ai_text})

                # Stream TTS as background task so interrupt messages can arrive concurrently
                tts_task = asyncio.create_task(do_tts_stream(ai_text))

            elif msg_type == "end":
                break

    except WebSocketDisconnect:
        pass
    finally:
        abort_event.set()
        if tts_task and not tts_task.done():
            tts_task.cancel()


@router.post("/voice/demo/score")
async def demo_score(
    db: DbSession,
    profile: EngineerProfile,
    client_id: str = Form(...),
    conversation_json: str = Form(...),
) -> VoiceScoreOut:
    """Score a practice conversation. Stateless."""
    try:
        conversation: list[dict] = json.loads(conversation_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid conversation JSON")

    engineer_turns = [t for t in conversation if t.get("speaker") == "engineer"]
    if not engineer_turns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No engineer turns in conversation",
        )

    try:
        client_uuid = uuid.UUID(client_id)
        ctx = await _client_context(db, client_uuid)
    except (ValueError, Exception):
        ctx = "a prospective client"

    scored = await score_voice_session(conversation, ctx, db, None)

    return VoiceScoreOut(
        communication_score=scored.communication_score,
        ai_feedback=scored.feedback,
        overall_score=scored.communication_score,
        strengths=scored.strengths,
        improvements=scored.improvements,
    )
