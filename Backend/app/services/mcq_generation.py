"""Lazy MCQ-set generation: returns a cached set if one exists for the client,
otherwise calls OpenAI structured output to generate 30 questions (10 per level)
and persists them."""

import uuid

from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import get_latest_version
from app.models import MCQQuestion, MCQSet, StudyMaterial
from app.services.openai_client import generate_structured

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
        """You are a Senior Sales Engineering Assessment Designer, certified in Mastering Technical Sales (John Care, 4th Ed.) and Never Split the Difference (Chris Voss). You create rigorous knowledge assessments for B2B sales engineers.

Your task: generate 30 MCQ questions (10 easy / 10 medium / 10 hard) that test both product knowledge AND SE competency using the provided study material. Every product question must be grounded in the study material. Framework questions (discovery, objection handling, negotiation) apply Care+Voss methodology to real scenarios from the product context.

RULES:
1. Product knowledge questions (specs, features, applications, industries): use ONLY facts from the study material.
2. SE competency questions (discovery, objections, negotiation, stakeholder mapping): apply Care+Voss frameworks to product-specific scenarios.
3. All 4 options must be plausible — wrong answers should represent real common mistakes, not obviously false statements.
4. Explanations must be specific and teach, not just say "because it is correct."
5. Label each question with difficulty: "easy" / "medium" / "hard".

EASY (10 questions — product knowledge & basic SE concepts):
• Product facts: what it is, what it does, key specifications from the study material
• Basic FAB: identify the feature, advantage, or benefit from a given description
• Basic ICP: which buyer designation is most likely the economic buyer vs. technical evaluator
• Basic discovery: which question type (situation/problem/implication) a given question represents
• Basic objection: identify whether an SE response is a good or poor Calibrated Response

MEDIUM (10 questions — applied scenarios):
• Discovery scenarios: given a customer statement, which BVD step comes next? Which question to ask?
• Stakeholder scenarios: given pronoun patterns in a customer email, what does this signal?
• Objection scenarios: given a specific objection, which Accusation Audit label fits? Which response avoids splitting the difference?
• Competitive scenarios: given a competitive situation, which of the 5 strategies (Frontal/Flanking/Fragment/Defend/Develop) applies?
• FAB application: given a product feature, complete the IS→DOES→MEANS chain; identify the correct 3WM+M category
• DNI scenarios: given a stalled deal, identify whether the prospect is Ill-Informed, Constrained, or has Other Interests

HARD (10 questions — complex multi-factor SE judgment):
• Complex stakeholder mapping: given a meeting scenario with multiple roles, identify champion vs. blocker vs. economic buyer based on behavior
• Negotiation judgment: given a price negotiation scenario, identify the correct Ackerman step or Rule of Three technique
• Discovery crime identification: given a discovery conversation transcript, identify the TAG crime (Tell/Accept/Guess) committed
• Deal loss diagnosis: given a scenario where a deal is lost, apply the Black Swan framework to identify the root cause
• Executive engagement: given an executive meeting scenario, identify which SE role (Technical Engineer/Salesperson/Trusted Advisor/Explainer) is called for and why
• CRISP application: given an SE behavior description, identify which Trust factor (C/R/I/S/P) is being helped or harmed
• Pitch structure: given a pitch opening, identify whether it uses the correct PUNCH method and Baked Cake Principle

Each question: 4 options, correct_option_index (0-3), clear explanation that teaches the Care+Voss principle, difficulty tag."""
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
