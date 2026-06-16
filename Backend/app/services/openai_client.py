"""Single chokepoint for all OpenAI text-generation calls.

Route handlers and the generation orchestrator never import the OpenAI SDK
directly — they call generate_structured() here, which adds retry/backoff,
structured-output JSON-schema enforcement, and llm_generation_logs bookkeeping.
"""

import json
import time
import uuid
from typing import TypeVar

from openai import APIConnectionError, AsyncOpenAI, RateLimitError
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.models import LLMGenerationLog

_client = AsyncOpenAI(api_key=settings.openai_api_key)

T = TypeVar("T", bound=BaseModel)


class GenerationFailedError(Exception):
    pass


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((APIConnectionError, RateLimitError)),
)
async def _call_openai(*, model: str, system_prompt: str, user_prompt: str, schema: type[BaseModel]):
    return await _client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": schema.__name__,
                "schema": schema.model_json_schema(),
                "strict": True,
            },
        },
    )


async def generate_structured(
    db: AsyncSession,
    *,
    schema: type[T],
    system_prompt: str,
    user_prompt: str,
    purpose: str,
    client_id: uuid.UUID | None = None,
    model: str | None = None,
    prompt_version: str | None = None,
) -> T:
    """Call OpenAI for a structured JSON response validated against `schema`,
    logging the call (success or failure) to llm_generation_logs."""
    model = model or settings.openai_text_model
    start = time.monotonic()
    status, error_message, input_tokens, output_tokens = "success", None, None, None

    try:
        completion = await _call_openai(
            model=model, system_prompt=system_prompt, user_prompt=user_prompt, schema=schema
        )
        usage = completion.usage
        if usage:
            input_tokens, output_tokens = usage.prompt_tokens, usage.completion_tokens

        raw_content = completion.choices[0].message.content
        if not raw_content:
            raise GenerationFailedError("OpenAI returned an empty response")

        return schema.model_validate(json.loads(raw_content))
    except Exception as exc:
        status = "error"
        error_message = str(exc)[:2000]
        raise GenerationFailedError(str(exc)) from exc
    finally:
        latency_ms = int((time.monotonic() - start) * 1000)
        db.add(
            LLMGenerationLog(
                client_id=client_id,
                purpose=purpose,
                model=model,
                prompt_version=prompt_version,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=latency_ms,
                status=status,
                error_message=error_message,
            )
        )
        await db.commit()
