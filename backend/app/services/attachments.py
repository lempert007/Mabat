"""Attachments: images and PDF documents that POI blocks reference."""

import asyncio
from pathlib import Path
from uuid import UUID, uuid4

import aiofiles
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Attachment
from app.models.attachment import AttachmentKind
from app.services import storage
from app.services.images import probe_dimensions, write_thumbnail

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
    pass


class AttachmentTooLarge(Exception):
    pass


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


async def _write_upload(upload: UploadFile, target: Path) -> int:
    limit = get_settings().max_upload_bytes
    written = 0
    async with aiofiles.open(target, "wb") as out:
        while chunk := await upload.read(1024 * 1024):
            written += len(chunk)
            if written > limit:
                raise AttachmentTooLarge()
            await out.write(chunk)
    return written


async def create_attachment(
    db: AsyncSession, project_id: UUID, poi_id: UUID | None, upload: UploadFile
) -> Attachment:
    mime = (upload.content_type or "").lower()
    kind = kind_for_mime(mime)
    attachment_id = uuid4()
    ext = _EXTENSION_BY_MIME[mime]
    folder = storage.attachments_dir(project_id)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{attachment_id}.{ext}"

    try:
        size = await _write_upload(upload, path)
    except Exception:
        path.unlink(missing_ok=True)
        raise

    width = height = None
    thumb_path: Path | None = None
    if kind is AttachmentKind.IMAGE:
        dims = probe_dimensions(path)
        if dims:
            width, height = dims
        thumb_path = folder / f"{attachment_id}.thumb.jpg"
        await asyncio.to_thread(write_thumbnail, path, thumb_path)

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
    for relative in (attachment.path, attachment.thumb_path):
        if relative:
            storage.absolute_from_root(relative).unlink(missing_ok=True)
    await db.delete(attachment)
    await db.commit()
