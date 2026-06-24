import uuid
from datetime import datetime

from pydantic import BaseModel


class TestRequestCreate(BaseModel):
    client_id: uuid.UUID
    engineer_id: uuid.UUID


class TestRequestOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    engineer_id: uuid.UUID
    requested_by: uuid.UUID
    status: str
    requested_at: datetime
    responded_at: datetime | None = None
    client_name: str | None = None
    engineer_name: str | None = None
    score_percent: float | None = None
    passed: bool | None = None


class MCQQuestionOut(BaseModel):
    id: uuid.UUID
    question_text: str
    options: list[str]
    difficulty: str | None = None


class MCQStartOut(BaseModel):
    mcq_set_id: uuid.UUID
    questions: list[MCQQuestionOut]
    level: int = 1


class MCQAnswerIn(BaseModel):
    question_id: uuid.UUID
    selected_option_index: int


class MCQSubmitRequest(BaseModel):
    answers: list[MCQAnswerIn]


class MCQQuestionResult(BaseModel):
    question_id: uuid.UUID
    selected_option_index: int
    correct_option_index: int
    is_correct: bool
    explanation: str | None = None


class MCQResultOut(BaseModel):
    score_percent: float
    passed: bool
    total: int
    correct: int
    question_results: list[MCQQuestionResult]
    level: int = 1
