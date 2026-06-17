import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import AdminProfile, DbSession, EngineerProfile
from app.models import Client, MCQAttempt, MCQQuestion, MCQSet, Profile, Result, TestRequest
from app.schemas.testing import (
    MCQAnswerIn,
    MCQQuestionOut,
    MCQQuestionResult,
    MCQResultOut,
    MCQStartOut,
    MCQSubmitRequest,
    TestRequestCreate,
    TestRequestOut,
)
from app.services.mcq_generation import GenerationFailedError, get_or_generate_mcq_set

router = APIRouter(tags=["tests"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _req_out(
    req: TestRequest,
    client_name: str | None = None,
    engineer_name: str | None = None,
) -> TestRequestOut:
    return TestRequestOut(
        id=req.id,
        client_id=req.client_id,
        engineer_id=req.engineer_id,
        requested_by=req.requested_by,
        status=req.status,
        requested_at=req.requested_at,
        responded_at=req.responded_at,
        client_name=client_name,
        engineer_name=engineer_name,
    )


async def _enrich(db: AsyncSession, requests: list[TestRequest]) -> list[TestRequestOut]:
    """Batch-fetch client and engineer names, then build TestRequestOut list."""
    if not requests:
        return []

    client_ids = {r.client_id for r in requests}
    engineer_ids = {r.engineer_id for r in requests}

    client_rows = (
        await db.execute(select(Client).where(Client.id.in_(client_ids)))
    ).scalars().all()
    engineer_rows = (
        await db.execute(select(Profile).where(Profile.id.in_(engineer_ids)))
    ).scalars().all()

    client_names: dict[uuid.UUID, str] = {c.id: c.name for c in client_rows}
    engineer_names: dict[uuid.UUID, str] = {p.id: p.full_name for p in engineer_rows}

    return [
        _req_out(r, client_name=client_names.get(r.client_id), engineer_name=engineer_names.get(r.engineer_id))
        for r in requests
    ]


async def _get_latest_mcq_set(db: AsyncSession, client_id: uuid.UUID) -> MCQSet | None:
    result = await db.execute(
        select(MCQSet).where(MCQSet.client_id == client_id).order_by(MCQSet.version.desc()).limit(1)
    )
    return result.scalars().first()


async def _load_questions(db: AsyncSession, mcq_set_id: uuid.UUID) -> list[MCQQuestion]:
    result = await db.execute(select(MCQQuestion).where(MCQQuestion.mcq_set_id == mcq_set_id))
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.post("/admin/test-requests", response_model=TestRequestOut, status_code=status.HTTP_201_CREATED)
async def create_test_request(
    payload: TestRequestCreate, db: DbSession, profile: AdminProfile
) -> TestRequestOut:
    client = await db.get(Client, payload.client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    engineer = await db.get(Profile, payload.engineer_id)
    if engineer is None or engineer.role != "engineer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Engineer not found")

    req = TestRequest(
        client_id=payload.client_id,
        engineer_id=payload.engineer_id,
        requested_by=profile.id,
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return _req_out(req, client_name=client.name, engineer_name=engineer.full_name)


@router.get("/admin/test-requests", response_model=list[TestRequestOut])
async def list_test_requests_admin(
    db: DbSession,
    profile: AdminProfile,
    engineer_id: uuid.UUID | None = None,
    client_id: uuid.UUID | None = None,
    status_filter: str | None = None,
) -> list[TestRequestOut]:
    q = select(TestRequest)
    if engineer_id:
        q = q.where(TestRequest.engineer_id == engineer_id)
    if client_id:
        q = q.where(TestRequest.client_id == client_id)
    if status_filter:
        q = q.where(TestRequest.status == status_filter)
    q = q.order_by(TestRequest.requested_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return await _enrich(db, list(rows))


@router.patch("/admin/test-requests/{request_id}/approve", response_model=TestRequestOut)
async def approve_test_request(
    request_id: uuid.UUID, db: DbSession, profile: AdminProfile
) -> TestRequestOut:
    req = await db.get(TestRequest, request_id)
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test request not found")
    if req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve a request with status '{req.status}'",
        )
    req.status = "approved"
    req.responded_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    return (await _enrich(db, [req]))[0]


# ---------------------------------------------------------------------------
# Engineer endpoints
# ---------------------------------------------------------------------------

@router.get("/test-requests", response_model=list[TestRequestOut])
async def list_test_requests_engineer(db: DbSession, profile: EngineerProfile) -> list[TestRequestOut]:
    rows = (
        await db.execute(
            select(TestRequest)
            .where(TestRequest.engineer_id == profile.id)
            .order_by(TestRequest.requested_at.desc())
        )
    ).scalars().all()
    return await _enrich(db, list(rows))


@router.post("/test-requests/{request_id}/start", response_model=MCQStartOut)
async def start_test(request_id: uuid.UUID, db: DbSession, profile: EngineerProfile) -> MCQStartOut:
    req = await db.get(TestRequest, request_id)
    if req is None or req.engineer_id != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test request not found")
    if req.status not in ("approved", "in_progress"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot start a test with status '{req.status}'",
        )

    try:
        mcq_set = await get_or_generate_mcq_set(db, req.client_id)
    except GenerationFailedError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"MCQ generation failed: {exc}",
        ) from exc

    questions = await _load_questions(db, mcq_set.id)

    if req.status == "approved":
        req.status = "in_progress"
        req.responded_at = datetime.now(timezone.utc)
        await db.commit()

    return MCQStartOut(
        mcq_set_id=mcq_set.id,
        questions=[
            MCQQuestionOut(
                id=q.id,
                question_text=q.question_text,
                options=q.options,
                difficulty=q.difficulty,
            )
            for q in questions
        ],
    )


@router.post("/test-requests/{request_id}/submit-mcq", response_model=MCQResultOut)
async def submit_mcq(
    request_id: uuid.UUID,
    payload: MCQSubmitRequest,
    db: DbSession,
    profile: EngineerProfile,
) -> MCQResultOut:
    req = await db.get(TestRequest, request_id)
    if req is None or req.engineer_id != profile.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test request not found")
    if req.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test is not in progress",
        )

    existing_attempt = (
        await db.execute(
            select(MCQAttempt).where(
                MCQAttempt.test_request_id == request_id,
                MCQAttempt.engineer_id == profile.id,
            )
        )
    ).scalar_one_or_none()
    if existing_attempt is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MCQ already submitted for this test",
        )

    mcq_set = await _get_latest_mcq_set(db, req.client_id)
    if mcq_set is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No MCQ set found for this client")

    questions = await _load_questions(db, mcq_set.id)
    question_map: dict[uuid.UUID, MCQQuestion] = {q.id: q for q in questions}

    answer_map: dict[uuid.UUID, int] = {a.question_id: a.selected_option_index for a in payload.answers}

    question_results: list[MCQQuestionResult] = []
    correct_count = 0
    for q_id, q in question_map.items():
        selected = answer_map.get(q_id, -1)
        is_correct = selected == q.correct_option_index
        if is_correct:
            correct_count += 1
        question_results.append(
            MCQQuestionResult(
                question_id=q_id,
                selected_option_index=selected,
                correct_option_index=q.correct_option_index,
                is_correct=is_correct,
                explanation=q.explanation,
            )
        )

    total = len(question_map)
    score_percent = round(100 * correct_count / max(total, 1), 2)
    passed = score_percent >= 70.0

    now = datetime.now(timezone.utc)
    answers_json = [
        {"question_id": str(a.question_id), "selected_option_index": a.selected_option_index}
        for a in payload.answers
    ]
    db.add(
        MCQAttempt(
            test_request_id=request_id,
            engineer_id=profile.id,
            mcq_set_id=mcq_set.id,
            answers=answers_json,
            score_percent=score_percent,
            passed=passed,
            started_at=now,
        )
    )

    existing_result = (
        await db.execute(select(Result).where(Result.test_request_id == request_id))
    ).scalar_one_or_none()
    if existing_result is None:
        db.add(
            Result(
                test_request_id=request_id,
                engineer_id=profile.id,
                client_id=req.client_id,
                knowledge_score=score_percent,
                status="pending_review",
            )
        )
    else:
        existing_result.knowledge_score = score_percent

    req.status = "completed"
    await db.commit()

    return MCQResultOut(
        score_percent=score_percent,
        passed=passed,
        total=total,
        correct=correct_count,
        question_results=question_results,
    )
