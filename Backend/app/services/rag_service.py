"""RAG service: chunk → embed → index → search → answer.

Each client has its own isolated knowledge base stored in client_chunks.
Embeddings use OpenAI text-embedding-3-small (1536 dims).
Similarity search runs in Python with numpy (fast enough for < 5000 chunks/client).
"""

import uuid

import numpy as np
from openai import AsyncOpenAI
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.models.client_chunk import ClientChunk
from app.models.client import ClientFile

_openai = AsyncOpenAI(api_key=settings.openai_api_key)

EMBED_MODEL = "text-embedding-3-small"
CHUNK_SIZE = 600       # target chars per chunk
CHUNK_OVERLAP = 80     # chars of overlap between adjacent chunks
TOP_K = 6              # chunks to retrieve per query
MAX_CONTEXT_CHARS = 9000


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def _chunk_text(text: str, file_name: str) -> list[dict]:
    """Split text into overlapping chunks of ~CHUNK_SIZE chars."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    raw: list[str] = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 <= CHUNK_SIZE:
            current = (current + "\n\n" + para).strip() if current else para
        else:
            if current:
                raw.append(current)
            if len(para) > CHUNK_SIZE:
                # Split long paragraph by sentences / words
                words = para.split()
                temp = ""
                for word in words:
                    if len(temp) + len(word) + 1 <= CHUNK_SIZE:
                        temp = (temp + " " + word).strip() if temp else word
                    else:
                        if temp:
                            raw.append(temp)
                        temp = word
                current = temp
            else:
                current = para

    if current:
        raw.append(current)

    # Stitch overlap: prepend tail of previous chunk
    chunks = []
    for i, chunk in enumerate(raw):
        if i > 0 and CHUNK_OVERLAP > 0:
            prefix = raw[i - 1][-CHUNK_OVERLAP:]
            content = prefix + "\n" + chunk
        else:
            content = chunk
        chunks.append({"content": content, "source": file_name, "index": i})

    return chunks


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

async def _embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch-embed texts; returns one list[float] per input in order."""
    if not texts:
        return []
    response = await _openai.embeddings.create(model=EMBED_MODEL, input=texts)
    return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / (denom + 1e-10))


# ---------------------------------------------------------------------------
# Indexing
# ---------------------------------------------------------------------------

async def index_client_file(client_file_id: uuid.UUID) -> None:
    """Background task: chunk + embed + store a file's extracted text."""
    async with AsyncSessionLocal() as session:
        file = await session.get(ClientFile, client_file_id)
        if file is None or not file.extracted_text or file.extraction_status != "done":
            return

        await session.execute(
            delete(ClientChunk).where(ClientChunk.file_id == client_file_id)
        )

        chunks = _chunk_text(file.extracted_text, file.file_name)
        if not chunks:
            await session.commit()
            return

        texts = [c["content"] for c in chunks]
        try:
            embeddings = await _embed_texts(texts)
        except Exception as exc:
            print(f"[RAG] Embedding failed for {file.file_name}: {exc}", flush=True)
            return

        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            session.add(ClientChunk(
                client_id=file.client_id,
                file_id=client_file_id,
                chunk_index=i,
                content=chunk["content"],
                embedding=emb,
                chunk_metadata={"source": chunk["source"]},
            ))

        await session.commit()
        print(f"[RAG] Indexed {len(chunks)} chunks for '{file.file_name}'", flush=True)


async def reindex_all_files(client_id: uuid.UUID) -> int:
    """Re-index every extracted file for a client. Returns file count queued."""
    async with AsyncSessionLocal() as session:
        rows = (await session.execute(
            select(ClientFile).where(
                ClientFile.client_id == client_id,
                ClientFile.extraction_status == "done",
            )
        )).scalars().all()

    for row in rows:
        await index_client_file(row.id)

    return len(rows)


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

async def search_chunks(query: str, client_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """Return the top-K most relevant chunks for a query."""
    query_emb = (await _embed_texts([query]))[0]

    rows = (await db.execute(
        select(ClientChunk).where(
            ClientChunk.client_id == client_id,
            ClientChunk.embedding.isnot(None),
        )
    )).scalars().all()

    if not rows:
        return []

    scored = [
        {
            "content": row.content,
            "source": row.chunk_metadata.get("source", ""),
            "score": _cosine_similarity(query_emb, row.embedding),
        }
        for row in rows
    ]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:TOP_K]


# ---------------------------------------------------------------------------
# Answer generation
# ---------------------------------------------------------------------------

async def answer_question(
    question: str,
    client_id: uuid.UUID,
    db: AsyncSession,
    history: list[dict],
) -> str:
    """RAG pipeline: retrieve relevant chunks then generate an answer."""
    chunks = await search_chunks(question, client_id, db)

    if not chunks:
        context = (
            "No documents have been indexed for this client yet. "
            "Ask an admin to upload and index the client's documents."
        )
    else:
        parts = [f"[Source: {c['source']}]\n{c['content']}" for c in chunks]
        context = "\n\n---\n\n".join(parts)
        if len(context) > MAX_CONTEXT_CHARS:
            context = context[:MAX_CONTEXT_CHARS] + "…"

    # Keep last 6 turns of history to stay within token limits
    trimmed_history = [
        {"role": m["role"], "content": m["content"]}
        for m in history[-6:]
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]

    messages = [
        {
            "role": "system",
            "content": (
                "You are a knowledgeable AI assistant embedded in a B2B sales training platform. "
                "Sales engineers ask you questions about a specific client's company, products, pricing, "
                "target markets, competitors, and sales strategy.\n\n"
                "Rules:\n"
                "- Answer ONLY from the provided context. If the context doesn't cover the question, "
                "say so clearly — do not make things up.\n"
                "- Be concise and practical. Sales engineers need quick, actionable answers.\n"
                "- Use bullet points for lists. Keep answers under 200 words unless the question requires more detail.\n\n"
                f"CONTEXT FROM CLIENT DOCUMENTS:\n{context}"
            ),
        },
        *trimmed_history,
        {"role": "user", "content": question},
    ]

    response = await _openai.chat.completions.create(
        model=settings.openai_text_model,
        messages=messages,
        max_tokens=500,
        temperature=0.2,
    )

    return (response.choices[0].message.content or "I couldn't find a relevant answer in the documents.").strip()
