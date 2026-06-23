"""Voice assessment service.

STT  : Groq Whisper (whisper-large-v3-turbo) via direct httpx
LLM  : Groq llama-3.3-70b-versatile (streaming)
TTS  : ElevenLabs eleven_flash_v2_5  (ultra-low-latency)

Low-latency pipeline:
  1. Audio uploaded → Groq Whisper transcribes
  2. Groq LLM streams tokens; each completed sentence fires a TTS task immediately
  3. ElevenLabs TTS runs in parallel per sentence, passing previous_text so the
     prosody model has context → consistent tone, no seam at sentence boundaries
  4. Audio chunks gathered in order → joined as single MP3 blob
"""

import asyncio
import uuid

import httpx
from groq import AsyncGroq, RateLimitError as GroqRateLimitError
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

_groq = AsyncGroq(api_key=settings.groq_api_key)

OPENING_PROMPT = "Hello? Kaun bol raha hai?"
_ELEVENLABS_VOICE_ID = "codoBx1vrQVwrVQylqGj"

# Whisper v3 commonly hallucinates these phrases on near-silent audio
_WHISPER_HALLUCINATIONS = frozenset({
    "thank you", "thank you.", "thanks", "thanks.",
    "thank you for watching", "thank you for watching.",
    "thanks for watching", "thanks for watching.",
    "you", ".", "..", "...", "okay", "okay.", "ok", "ok.",
    "bye", "bye.", "goodbye", "goodbye.", "hmm", "hmm.",
})


# ---------------------------------------------------------------------------
# TTS — ElevenLabs Flash v2.5
# ---------------------------------------------------------------------------

async def synthesize_speech(text: str) -> bytes:
    """Convert text to speech with ElevenLabs Flash (ultra-low-latency). Returns MP3 bytes."""
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{_ELEVENLABS_VOICE_ID}/stream",
            params={"optimize_streaming_latency": 4, "output_format": "mp3_44100_128"},
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_flash_v2_5",
                "voice_settings": {
                    "stability": 0.4,
                    "similarity_boost": 0.75,
                    "speed": 1.0,
                },
            },
        )
        r.raise_for_status()
        return r.content


# ---------------------------------------------------------------------------
# STT — Groq Whisper
# ---------------------------------------------------------------------------

def _audio_file_tuple(audio_bytes: bytes, hint_mime: str) -> tuple[str, bytes, str]:
    """Return (filename, bytes, audio_mime) for Whisper multipart upload.

    Python's mimetypes maps .webm → video/webm, which Whisper rejects.
    We detect the real format from magic bytes and force audio/* MIME types
    so the SDK sends the right Content-Type header in the multipart.
    """
    magic: dict[bytes, tuple[str, str]] = {
        b"\x1a\x45\xdf\xa3": ("webm", "audio/webm"),  # WebM / Matroska EBML
        b"OggS":              ("ogg",  "audio/ogg"),
        b"RIFF":              ("wav",  "audio/wav"),
        b"fLaC":              ("flac", "audio/flac"),
        b"ID3\x03":          ("mp3",  "audio/mpeg"),
        b"ID3\x04":          ("mp3",  "audio/mpeg"),
        b"\xff\xfb":         ("mp3",  "audio/mpeg"),
        b"\xff\xf3":         ("mp3",  "audio/mpeg"),
        b"\xff\xf2":         ("mp3",  "audio/mpeg"),
    }
    prefix = audio_bytes[:4]
    for sig, (ext, mime) in magic.items():
        if prefix[: len(sig)] == sig:
            return (f"recording.{ext}", audio_bytes, mime)

    # Fallback: honour the browser-reported MIME, map video/webm → audio/webm
    clean = hint_mime.split(";")[0].strip().replace("video/", "audio/")
    ext_from_mime = {
        "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "mp4",
        "audio/mpeg": "mp3",  "audio/wav": "wav", "audio/x-m4a": "m4a",
    }.get(clean, "webm")
    return (f"recording.{ext_from_mime}", audio_bytes, clean or "audio/webm")


async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """Transcribe using Groq Whisper via direct httpx (ultra-low-latency STT)."""
    if len(audio_bytes) < 1000:
        return ""

    filename, _, audio_mime = _audio_file_tuple(audio_bytes, mime_type)
    print(f"[STT] {len(audio_bytes)} bytes | magic={audio_bytes[:4].hex()} | mime={audio_mime} | file={filename}", flush=True)

    max_retries = 4
    for attempt in range(max_retries):
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                files={"file": (filename, audio_bytes, audio_mime)},
                data={"model": "whisper-large-v3-turbo", "response_format": "text"},
            )
        if r.status_code == 429:
            # Honour Retry-After if present, else back off 3s → 6s → 12s
            retry_after = float(r.headers.get("retry-after", 3 * (2 ** attempt)))
            print(f"[STT] 429 rate-limit — retrying in {retry_after}s (attempt {attempt + 1}/{max_retries})", flush=True)
            await asyncio.sleep(retry_after)
            continue
        if r.status_code >= 400:
            raise ValueError(f"Groq STT {r.status_code}: {r.text[:600]}")
        text = r.text.strip()
        if text.lower() in _WHISPER_HALLUCINATIONS or len(text) < 4:
            return ""
        return text

    raise ValueError("Groq STT rate-limit: all retries exhausted")


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

def _prospect_messages(conversation: list[dict], client_context: str) -> list[dict]:
    return [
        {
            "role": "system",
            "content": (
                f"You are a busy professional at: {client_context}. "
                "A sales engineer just cold-called you — you did NOT ask for this call. "
                "You are mildly annoyed, guarded, but will listen briefly. "
                "STRICT RULE: reply in 1-2 short sentences ONLY. Never more. "
                "Think of it like a WhatsApp reply — quick, natural, reactive. "
                "Do NOT explain, elaborate, or give opinions. Just react to what they said. "
                "Push back on vague claims. Ask sharp one-liners. Show brief interest only if earned. "
                "Never pretend to know their product already. "
                "Always reply in Hinglish (natural Hindi-English mix in Roman script). "
                "Good reply examples: 'Haan bolo, kya cheez hai?' | 'Price kya hai?' | "
                "'Competitor X se kya alag hai?' | 'Okay samjha, aur kya?' | "
                "'Dekho mujhe abhi time nahi hai zyada.' | 'Interesting, demo dikh sakta hai?'"
            ),
        },
        *[
            {"role": "assistant" if t["speaker"] == "ai" else "user", "content": t["message"]}
            for t in conversation
        ],
    ]


async def _groq_chat_with_retry(messages: list[dict], max_tokens: int, temperature: float, stream: bool = False):
    """Call Groq chat completions with exponential-backoff retry on 429."""
    max_retries = 4
    for attempt in range(max_retries):
        try:
            return await _groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=stream,
            )
        except GroqRateLimitError as e:
            if attempt == max_retries - 1:
                raise
            # Parse retry delay from response headers if available, else back off
            retry_after = 10 * (2 ** attempt)
            try:
                import re
                m = re.search(r'try again in ([\d.]+)s', str(e))
                if m:
                    retry_after = float(m.group(1)) + 1
            except Exception:
                pass
            print(f"[LLM] 429 rate-limit — retrying in {retry_after:.1f}s (attempt {attempt + 1}/{max_retries})", flush=True)
            await asyncio.sleep(retry_after)


async def generate_prospect_response(conversation: list[dict], client_context: str) -> str:
    """Generate AI prospect reply (non-streaming, used by score path)."""
    resp = await _groq_chat_with_retry(
        messages=_prospect_messages(conversation, client_context),
        max_tokens=60,
        temperature=0.8,
    )
    return (resp.choices[0].message.content or "Haan, bolo.").strip()


async def generate_response_with_audio(
    conversation: list[dict],
    client_context: str,
) -> tuple[str, bytes | None]:
    """Stream Groq LLM to collect full text, then synthesize in one ElevenLabs call.

    A single TTS request produces one coherent MP3 with consistent prosody and
    voice throughout. Parallel per-sentence calls produce separate MP3 files
    whose raw byte concatenation confuses browser audio decoders.
    """
    full_text = ""

    stream = await _groq_chat_with_retry(
        messages=_prospect_messages(conversation, client_context),
        max_tokens=60,
        temperature=0.8,
        stream=True,
    )

    async for chunk in stream:
        full_text += chunk.choices[0].delta.content or ""

    full_text = full_text.strip() or "Please continue."

    try:
        audio_bytes = await synthesize_speech(full_text)
        return full_text, audio_bytes
    except Exception:
        return full_text, None


# ---------------------------------------------------------------------------
# Scoring — still uses OpenAI structured output (not latency-sensitive)
# ---------------------------------------------------------------------------

class _VoiceScoreSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    communication_score: float
    feedback: str
    strengths: list[str]
    improvements: list[str]


async def score_voice_session(
    conversation: list[dict],
    client_context: str,
    db: AsyncSession,
    client_id: uuid.UUID | None = None,
) -> _VoiceScoreSchema:
    """Score the full conversation holistically via GPT-4o structured output."""
    from app.services.openai_client import generate_structured  # avoid circular import

    conversation_text = "\n".join(
        f"{'ENGINEER' if t['speaker'] == 'engineer' else 'PROSPECT'}: {t['message']}"
        for t in conversation
    )

    return await generate_structured(
        db,
        schema=_VoiceScoreSchema,
        system_prompt=(
            "You are a senior sales trainer evaluating a recorded sales pitch role-play. "
            "Score ONLY the engineer's performance on a 0–100 scale based on: "
            "clarity, persuasiveness, objection-handling, tone, and product knowledge. "
            "Return practical, constructive feedback."
        ),
        user_prompt=(
            f"Client context: {client_context}\n\n"
            f"Transcript:\n{conversation_text}\n\n"
            "Return JSON with keys: "
            "communication_score (float 0-100), "
            "feedback (2-3 sentence summary string), "
            "strengths (list of up to 3 short strings), "
            "improvements (list of up to 3 short strings)."
        ),
        purpose="voice_scoring",
        client_id=client_id,
    )
