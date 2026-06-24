"""Lazy MCQ-set generation: returns a cached set if one exists for the client,
otherwise calls OpenAI structured output to generate 30 questions (10 per level)
and persists them."""

import uuid

from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import get_latest_version
from app.models import MCQQuestion, MCQSet, StudyMaterial
from app.services.openai_client import GenerationFailedError, generate_structured

MIN_QUESTIONS_PER_LEVEL = 8  # regenerate if any level has fewer than this


class _MCQQuestionGenerated(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_text: str
    options: list[str]
    correct_option_index: int
    explanation: str
    difficulty: str


class _MCQGenerated(BaseModel):
    model_config = ConfigDict(extra="forbid")

    questions: list[_MCQQuestionGenerated]


async def _has_enough_questions(db: AsyncSession, mcq_set_id: uuid.UUID) -> bool:
    """Check that the MCQ set has at least MIN_QUESTIONS_PER_LEVEL questions per difficulty."""
    for difficulty in ("easy", "medium", "hard"):
        count = await db.scalar(
            select(func.count(MCQQuestion.id)).where(
                MCQQuestion.mcq_set_id == mcq_set_id,
                MCQQuestion.difficulty == difficulty,
            )
        )
        if (count or 0) < MIN_QUESTIONS_PER_LEVEL:
            return False
    return True


async def get_or_generate_mcq_set(db: AsyncSession, client_id: uuid.UUID) -> MCQSet:
    """Return the latest cached MCQ set (if it has enough questions per level),
    or generate and persist a new 30-question set (10 easy / 10 medium / 10 hard)."""
    cached = await db.execute(
        select(MCQSet).where(MCQSet.client_id == client_id).order_by(MCQSet.version.desc()).limit(1)
    )
    mcq_set = cached.scalars().first()
    if mcq_set is not None and await _has_enough_questions(db, mcq_set.id):
        return mcq_set

    context = await _build_context(db, client_id)

    system_prompt = (
        "You are an expert sales trainer creating a tiered MCQ assessment for sales engineers. "
        "Generate exactly 30 multiple-choice questions split across 3 difficulty levels: "
        "10 easy (L1), 10 medium (L2), and 10 hard (L3). "
        "Each question must have exactly 4 answer options. "
        "correct_option_index is 0-based (0, 1, 2, or 3). "
        "difficulty must be exactly one of: easy, medium, hard — use 'easy' for 10 questions, "
        "'medium' for 10 questions, and 'hard' for 10 questions. "
        "L1 easy: Basic product/company facts an engineer should know after a quick read. "
        "L2 medium: Application, specification, and customer-matching questions requiring deeper understanding. "
        "L3 hard: Complex scenario-based, competitive differentiation, and objection-handling questions. "
        "Every question must be grounded in the provided study material."
    )
    user_prompt = (
        f"Client study material:\n\n"
        f"{context or 'No material available — generate general B2B sales knowledge questions.'}"
        f"\n\nGenerate 30 MCQ questions: 10 easy, 10 medium, 10 hard."
    )

    generated = await generate_structured(
        db,
        schema=_MCQGenerated,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        purpose="mcq_generation",
        client_id=client_id,
    )

    version_row = await db.execute(
        select(func.max(MCQSet.version)).where(MCQSet.client_id == client_id)
    )
    next_version = (version_row.scalar() or 0) + 1

    new_set = MCQSet(client_id=client_id, version=next_version)
    db.add(new_set)
    await db.flush()

    for q in generated.questions:
        db.add(
            MCQQuestion(
                mcq_set_id=new_set.id,
                question_text=q.question_text,
                options=q.options,
                correct_option_index=q.correct_option_index,
                explanation=q.explanation,
                difficulty=q.difficulty,
            )
        )

    await db.commit()
    await db.refresh(new_set)
    return new_set


async def _build_context(db: AsyncSession, client_id: uuid.UUID) -> str:
    material: StudyMaterial | None = await get_latest_version(db, StudyMaterial, client_id)
    if material is None:
        return ""

    parts: list[str] = []
    if material.content_json:
        content = material.content_json
        for m in content.get("modules", []):
            parts.append(f"Module: {m['title']}\n{m['content']}")
        for f in content.get("flashcards", []):
            parts.append(f"Q: {f['front']}\nA: {f['back']}")
        if content.get("cheat_sheet"):
            parts.append(f"Key Facts:\n{content['cheat_sheet']}")
    elif material.content_markdown:
        parts.append(material.content_markdown[:4000])

    return "\n\n".join(parts)[:5000]
