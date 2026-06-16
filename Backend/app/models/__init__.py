from app.models import auth_stub  # noqa: F401 - registers auth.users stub for FK resolution
from app.models.base import Base
from app.models.client import (
    Client,
    ClientCustomPrompt,
    ClientFile,
    ClientProfileGenerated,
    SalesPitch,
    StudyMaterial,
)
from app.models.llm_log import LLMGenerationLog
from app.models.profile import Profile
from app.models.testing import (
    EngineerProgress,
    MCQAttempt,
    MCQQuestion,
    MCQSet,
    Result,
    TestRequest,
    VoiceSession,
    VoiceTranscript,
)

__all__ = [
    "Base",
    "Profile",
    "Client",
    "ClientFile",
    "ClientCustomPrompt",
    "ClientProfileGenerated",
    "StudyMaterial",
    "SalesPitch",
    "EngineerProgress",
    "TestRequest",
    "MCQSet",
    "MCQQuestion",
    "MCQAttempt",
    "VoiceSession",
    "VoiceTranscript",
    "Result",
    "LLMGenerationLog",
]
