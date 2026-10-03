from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_editor, require_session
from app.api.projects import get_project_or_404
from app.db.session import get_db
from app.models import Attachment, Project
from app.schemas.attachment import AttachmentOut
from app.services import attachments as attachment_service
from app.services import storage

router = APIRouter(tags=["attachments"])


def to_out(attachment: Attachment) -> AttachmentOut:
    return AttachmentOut(
        id=attachment.id,
        project_id=attachment.project_id,
        poi_id=attachment.poi_id,
        kind=attachment.kind.value,
        filename=attachment.filename,
        mime=attachment.mime,
        size=attachment.size,
        width=attachment.width,
        height=attachment.height,
        has_thumb=attachment.thumb_path is not None,
        created_at=attachment.created_at,
    )


async def get_attachment_or_404(
    attachment_id: UUID, db: AsyncSession = Depends(get_db)
) -> Attachment:
    attachment = await attachment_service.get_attachment(db, attachment_id)
    if attachment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "הקובץ לא נמצא.")
    return attachment


@router.get(
    "/projects/{project_id}/attachments",
    response_model=list[AttachmentOut],
    dependencies=[Depends(require_session)],
)
async def list_attachments(
    project: Project = Depends(get_project_or_404), db: AsyncSession = Depends(get_db)
) -> list[AttachmentOut]:
    return [to_out(a) for a in await attachment_service.list_for_project(db, project.id)]


@router.post(
    "/projects/{project_id}/attachments",
    response_model=AttachmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_editor)],
)
async def upload_attachment(
    file: UploadFile = File(...),
    poi_id: UUID | None = Form(default=None),
    project: Project = Depends(get_project_or_404),
    db: AsyncSession = Depends(get_db),
) -> AttachmentOut:
    try:
        attachment = await attachment_service.create_attachment(db, project.id, poi_id, file)
    except attachment_service.UnsupportedAttachment as exc:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "אפשר לצרף תמונות (JPEG, PNG, WebP, GIF) וקובצי PDF.",
        ) from exc
    except attachment_service.PoiNotInProject as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "הנקודה הזו לא שייכת לפרויקט."
        ) from exc
    except storage.UploadTooLarge as exc:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "הקובץ גדול מדי.") from exc
    return to_out(attachment)


@router.get("/attachments/{attachment_id}/file", dependencies=[Depends(require_session)])
async def get_file(attachment: Attachment = Depends(get_attachment_or_404)) -> FileResponse:
    return FileResponse(
        storage.absolute_from_root(attachment.path),
        media_type=attachment.mime,
        filename=attachment.filename,
        content_disposition_type="inline",
        headers={"Cache-Control": "private, max-age=86400"},
    )


@router.get("/attachments/{attachment_id}/thumb", dependencies=[Depends(require_session)])
async def get_thumb(attachment: Attachment = Depends(get_attachment_or_404)) -> FileResponse:
    if attachment.thumb_path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "אין תמונה ממוזערת.")
    return FileResponse(
        storage.absolute_from_root(attachment.thumb_path),
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=86400"},
    )


@router.delete(
    "/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_editor)],
)
async def delete_attachment(
    attachment: Attachment = Depends(get_attachment_or_404), db: AsyncSession = Depends(get_db)
) -> None:
    await attachment_service.delete_attachment(db, attachment)
