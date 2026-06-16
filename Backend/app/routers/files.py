import uuid

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status

from app.deps import AdminProfile, DbSession
from app.models import Client, ClientFile
from app.schemas.client import ClientFileOut
from app.services import storage
from app.services.file_extraction import process_client_file

router = APIRouter(prefix="/clients", tags=["client-files"])


@router.post(
    "/{client_id}/files", response_model=list[ClientFileOut], status_code=status.HTTP_201_CREATED
)
async def upload_files(
    client_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: DbSession,
    _profile: AdminProfile,
    files: list[UploadFile] = File(...),
) -> list[ClientFile]:
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided")

    created: list[ClientFile] = []
    for upload in files:
        content = await upload.read()
        storage_path = storage.build_storage_path(client_id, upload.filename or "file")
        await storage.upload_file(
            storage_path, content, upload.content_type or "application/octet-stream"
        )

        row = ClientFile(
            client_id=client_id,
            file_name=upload.filename or "file",
            storage_path=storage_path,
            mime_type=upload.content_type or "application/octet-stream",
        )
        db.add(row)
        created.append(row)

    await db.commit()
    for row in created:
        await db.refresh(row)
        background_tasks.add_task(process_client_file, row.id)

    return created


@router.delete("/{client_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    client_id: uuid.UUID,
    file_id: uuid.UUID,
    db: DbSession,
    _profile: AdminProfile,
) -> None:
    row = await db.get(ClientFile, file_id)
    if row is None or row.client_id != client_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    await storage.delete_file(row.storage_path)
    await db.delete(row)
    await db.commit()
