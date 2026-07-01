"""One-time script: index all existing client files for RAG chatbot.

Run inside the backend container:
  docker compose exec backend python scripts/reindex_all.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.db import AsyncSessionLocal
from app.models.client import ClientFile
from app.services.rag_service import index_client_file


async def main():
    async with AsyncSessionLocal() as session:
        files = (await session.execute(
            select(ClientFile).where(ClientFile.extraction_status == "done")
        )).scalars().all()

    print(f"Found {len(files)} extracted files to index.")

    for i, f in enumerate(files, 1):
        print(f"[{i}/{len(files)}] Indexing '{f.file_name}' (client: {f.client_id}) ...")
        await index_client_file(f.id)

    print("Done. All files indexed.")


asyncio.run(main())
