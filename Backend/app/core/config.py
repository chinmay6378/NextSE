from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    supabase_storage_bucket: str = "client-files"

    # Database (direct/session pooler connection, port 5432 — NOT the 6543 transaction pooler)
    database_url: str

    # OpenAI
    openai_api_key: str
    openai_text_model: str = "gpt-4o"
    openai_realtime_model: str = "gpt-4o-realtime-preview"

    # Groq (LLM)
    groq_api_key: str = ""

    # Deepgram (STT)
    deepgram_api_key: str = ""

    # ElevenLabs (TTS)
    elevenlabs_api_key: str = ""

    # App
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    # YouTube Data API v3 (optional — resolves search queries to specific video IDs)
    youtube_api_key: str = ""

    # Test / certification config
    mcq_default_question_count: int = 10
    mcq_pass_threshold_percent: float = 70.0

    @property
    def async_database_url(self) -> str:
        return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    @property
    def sync_database_url(self) -> str:
        return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
