"""Voice assessment service.

STT  : Deepgram Nova-2 via REST API
LLM  : Groq llama-3.3-70b-versatile (streaming)
TTS  : ElevenLabs eleven_flash_v2_5  (ultra-low-latency)

Low-latency pipeline:
  1. Audio uploaded → Deepgram Nova-2 transcribes
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

OPENING_PROMPT = "Yes, hello — who's this?"
_ELEVENLABS_VOICE_ID = "codoBx1vrQVwrVQylqGj"

# Shared voice settings — high stability prevents tone drift between calls
_TTS_VOICE_SETTINGS = {
    "stability": 0.75,        # was 0.4 — low stability caused tone to shift each call
    "similarity_boost": 0.85, # was 0.75 — keeps voice character consistent
    "style": 0.0,             # disable style exaggeration for professional tone
    "use_speaker_boost": True,
    "speed": 1.0,
}


# ---------------------------------------------------------------------------
# TTS — ElevenLabs Flash v2.5
# ---------------------------------------------------------------------------

async def synthesize_speech(text: str) -> bytes:
    """Convert text to speech with ElevenLabs Flash. Returns complete MP3 bytes."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{_ELEVENLABS_VOICE_ID}",
            params={"output_format": "mp3_44100_128"},
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_flash_v2_5",
                "voice_settings": _TTS_VOICE_SETTINGS,
            },
        )
        r.raise_for_status()
        return r.content


async def synthesize_speech_stream(text: str):
    """Stream MP3 audio chunks from ElevenLabs Flash. Use for WebSocket TTS streaming."""
    async with httpx.AsyncClient(timeout=30) as client:
        async with client.stream(
            "POST",
            f"https://api.elevenlabs.io/v1/text-to-speech/{_ELEVENLABS_VOICE_ID}/stream",
            params={"optimize_streaming_latency": 2, "output_format": "mp3_44100_128"},
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_flash_v2_5",
                "voice_settings": _TTS_VOICE_SETTINGS,
            },
        ) as r:
            r.raise_for_status()
            async for chunk in r.aiter_bytes(4096):
                if chunk:
                    yield chunk


# ---------------------------------------------------------------------------
# STT — Deepgram Nova-2
# ---------------------------------------------------------------------------

def _deepgram_content_type(audio_bytes: bytes, hint_mime: str) -> str:
    """Detect audio MIME type from magic bytes; fall back to hint."""
    magic: dict[bytes, str] = {
        b"\x1a\x45\xdf\xa3": "audio/webm",
        b"OggS":              "audio/ogg",
        b"RIFF":              "audio/wav",
        b"fLaC":              "audio/flac",
        b"ID3\x03":          "audio/mpeg",
        b"ID3\x04":          "audio/mpeg",
        b"\xff\xfb":         "audio/mpeg",
        b"\xff\xf3":         "audio/mpeg",
        b"\xff\xf2":         "audio/mpeg",
    }
    prefix = audio_bytes[:4]
    for sig, mime in magic.items():
        if prefix[: len(sig)] == sig:
            return mime
    clean = hint_mime.split(";")[0].strip().replace("video/", "audio/")
    return clean or "audio/webm"


async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """Transcribe using Deepgram Nova-2 REST API."""
    if len(audio_bytes) < 1000:
        return ""

    content_type = _deepgram_content_type(audio_bytes, mime_type)
    print(f"[STT] {len(audio_bytes)} bytes | magic={audio_bytes[:4].hex()} | mime={content_type}", flush=True)

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://api.deepgram.com/v1/listen",
            params={
                "model": "nova-2",
                "smart_format": "true",
                "punctuate": "true",
                "detect_language": "true",
            },
            headers={
                "Authorization": f"Token {settings.deepgram_api_key}",
                "Content-Type": content_type,
            },
            content=audio_bytes,
        )

    if r.status_code >= 400:
        raise ValueError(f"Deepgram STT {r.status_code}: {r.text[:600]}")

    data = r.json()
    try:
        transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"].strip()
    except (KeyError, IndexError):
        return ""

    if len(transcript) < 4:
        return ""
    return transcript


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------

def _extract_company_and_industry(client_context: str) -> tuple[str, str]:
    company = "the company"
    industry = "business"
    try:
        if "(" in client_context:
            company = client_context.split("(")[0].strip()
        if "industry:" in client_context:
            industry = client_context.split("industry:")[1].split(")")[0].strip()
    except Exception:
        pass
    return company, industry


def _prospect_messages(conversation: list[dict], client_context: str) -> list[dict]:
    company, industry = _extract_company_and_industry(client_context)
    return [
        {
            "role": "system",
            "content": (
                f"You are a senior decision-maker (VP / Director / Owner) at {company}, "
                f"a company in the {industry} industry. "
                "A sales engineer has cold-called you. You did NOT ask for this call. "
                "You are professional, busy, and appropriately skeptical — but fair and open if they make a good point.\n\n"
                "RULES:\n"
                "1. Reply in 1-3 complete sentences. Be direct. No filler words.\n"
                "2. Respond in the same language the caller uses. If they speak Hindi, reply in Hindi. If they use Hinglish, match that. If English, use professional English.\n"
                "3. Ask sharp, specific questions: ROI, implementation effort, integration, support model.\n"
                "4. Push back on vague claims — ask for specifics or proof.\n"
                "5. Raise realistic objections: cost, existing vendors, team bandwidth, timelines.\n"
                "6. Show genuine interest only when the engineer earns it with a compelling point.\n"
                "7. Never pretend to know their product or company already.\n"
                "8. Vary your responses — sometimes ask, sometimes state your position or concern.\n"
                "9. Always complete every sentence fully. Never trail off.\n\n"
                "Example replies:\n"
                "'What exactly does your product do that our current system doesn't?'\n"
                "'We've evaluated similar tools before — what makes yours different?'\n"
                "'That sounds interesting. What does implementation look like and how long does it take?'\n"
                "'I have about five minutes. Give me the core value proposition.'\n"
                "'We're already locked in with another vendor until next year.'\n"
                "'If the ROI is what you're claiming, I'd consider a pilot — but I need to see real numbers.'"
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
    """Generate AI prospect reply (non-streaming, used by WebSocket demo path)."""
    resp = await _groq_chat_with_retry(
        messages=_prospect_messages(conversation, client_context),
        max_tokens=120,
        temperature=0.75,
    )
    return (resp.choices[0].message.content or "Go ahead, I'm listening.").strip()


async def generate_response_with_audio(
    conversation: list[dict],
    client_context: str,
) -> tuple[str, bytes | None]:
    """Stream Groq LLM to collect full text, then synthesize in one ElevenLabs call.

    Single TTS request = one coherent MP3. Splitting per sentence and
    concatenating bytes causes decoder glitches and tone shifts.
    """
    full_text = ""

    stream = await _groq_chat_with_retry(
        messages=_prospect_messages(conversation, client_context),
        max_tokens=120,
        temperature=0.75,
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
