"""Extract plain text from uploaded client documents before sending to OpenAI.

We never upload raw binaries to OpenAI — everything is converted to text
server-side first.
"""

import csv
import io
import uuid

import docx
from pypdf import PdfReader

from app.core.db import AsyncSessionLocal
from app.models import ClientFile
from app.services import storage


class ExtractionError(Exception):
    pass


async def process_client_file(client_file_id: uuid.UUID) -> None:
    """Background task: download the uploaded file from Storage, extract its
    text, persist it, then index it for RAG search."""
    extraction_ok = False
    async with AsyncSessionLocal() as session:
        row = await session.get(ClientFile, client_file_id)
        if row is None:
            return
        try:
            content = await storage.download_file(row.storage_path)
            row.extracted_text = extract_text(content, row.file_name, row.mime_type)
            row.extraction_status = "done"
            extraction_ok = True
        except Exception as exc:  # noqa: BLE001 - any failure just marks the file failed
            row.extraction_status = "failed"
            row.extracted_text = None
            _ = exc
        await session.commit()

    if extraction_ok:
        from app.services.rag_service import index_client_file
        await index_client_file(client_file_id)


def extract_text(content: bytes, file_name: str, mime_type: str) -> str:
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""

    try:
        if ext == "pdf" or "pdf" in mime_type:
            return _extract_pdf(content)
        if ext == "docx" or "wordprocessingml" in mime_type:
            return _extract_docx(content)
        if ext == "csv" or mime_type == "text/csv":
            return _extract_csv(content)
        if ext in ("txt", "md") or mime_type.startswith("text/"):
            return _extract_txt(content)
    except Exception as exc:  # noqa: BLE001 - normalize any parser failure
        raise ExtractionError(f"Failed to extract text from {file_name}: {exc}") from exc

    raise ExtractionError(f"Unsupported file type for {file_name} ({mime_type})")


def _extract_pdf(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    return "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()


def _extract_docx(content: bytes) -> str:
    document = docx.Document(io.BytesIO(content))
    return "\n".join(p.text for p in document.paragraphs if p.text).strip()


def _extract_csv(content: bytes) -> str:
    text = content.decode("utf-8", errors="replace")
    rows = list(csv.reader(io.StringIO(text)))
    return "\n".join(", ".join(row) for row in rows).strip()


def _extract_txt(content: bytes) -> str:
    return content.decode("utf-8", errors="replace").strip()
