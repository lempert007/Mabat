"""Attachments: images and PDF documents that POI blocks reference."""

import asyncio
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Attachment, Poi
from app.models.attachment import AttachmentKind
from app.services import storage
from app.services.images import UnreadableImage, write_thumbnail

IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
DOCUMENT_MIMES = {"application/pdf"}
_EXTENSION_BY_MIME = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
}


class UnsupportedAttachment(Exception):
    """Not an image or PDF we accept, or an image that cannot be decoded."""


class PoiNotInProject(Exception):
    """The attachment was tied to a point that does not belong to its project."""


def kind_for_mime(mime: str) -> AttachmentKind:
    if mime in IMAGE_MIMES:
        return AttachmentKind.IMAGE
    if mime in DOCUMENT_MIMES:
        return AttachmentKind.DOCUMENT
    raise UnsupportedAttachment(mime)


async def get_attachment(db: AsyncSession, attachment_id: UUID) -> Attachment | None:
    return await db.get(Attachment, attachment_id)


async def list_for_project(db: AsyncSession, project_id: UUID) -> list[Attachment]:
    result = await db.scalars(
        select(Attachment)
        .where(Attachment.project_id == project_id)
        .order_by(Attachment.created_at.desc())
    )
    return list(result.all())


async def _check_poi(db: AsyncSession, project_id: UUID, poi_id: UUID | None) -> None:
    if poi_id is None:
        return
    poi = await db.get(Poi, poi_id)
    if poi is None or poi.project_id != project_id:
        raise PoiNotInProject(poi_id)


async def create_attachment(
    db: AsyncSession, project_id: UUID, poi_id: UUID | None, upload: UploadFile
) -> Attachment:
    mime = (upload.content_type or "").lower()
    kind = kind_for_mime(mime)
    await _check_poi(db, project_id, poi_id)

    attachment_id = uuid4()
    ext = _EXTENSION_BY_MIME[mime]
    folder = storage.attachments_dir(project_id)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{attachment_id}.{ext}"
    thumb_path = folder / f"{attachment_id}.thumb.jpg" if kind is AttachmentKind.IMAGE else None

    size = await storage.write_upload(upload, path)
    width = height = None
    if thumb_path is not None:
        try:
            width, height = await asyncio.to_thread(write_thumbnail, path, thumb_path)
        except UnreadableImage as exc:
            path.unlink(missing_ok=True)
            thumb_path.unlink(missing_ok=True)
            raise UnsupportedAttachment(mime) from exc

    attachment = Attachment(
        id=attachment_id,
        project_id=project_id,
        poi_id=poi_id,
        kind=kind,
        filename=storage.safe_filename(upload.filename or f"file.{ext}"),
        mime=mime,
        size=size,
        path=storage.relative_to_root(path),
        thumb_path=storage.relative_to_root(thumb_path) if thumb_path else None,
        width=width,
        height=height,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


async def delete_attachment(db: AsyncSession, attachment: Attachment) -> None:
    files = (attachment.path, attachment.thumb_path)
    await db.delete(attachment)
    await db.commit()
    # Only once the row is gone: a failed commit must not leave a record pointing at nothing.
    storage.remove_files(*files)
