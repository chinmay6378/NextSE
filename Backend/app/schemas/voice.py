import uuid
from datetime import datetime

from pydantic import BaseModel


class VoiceSessionOut(BaseModel):
    id: uuid.UUID
    test_request_id: uuid.UUID
    status: str
    started_at: datetime | None = None
    opening_message: str
    opening_audio_b64: str | None = None


class VoiceTranscriptOut(BaseModel):
    id: uuid.UUID
    speaker: str
    message: str
    timestamp_ms: int
    sequence_index: int


class VoiceTurnOut(BaseModel):
    transcription: str
    ai_response: str
    ai_audio_b64: str | None = None
    turn_count: int
    session_transcript: list[VoiceTranscriptOut]


class VoiceScoreOut(BaseModel):
    communication_score: float
    ai_feedback: str
    overall_score: float
    strengths: list[str]
    improvements: list[str]
