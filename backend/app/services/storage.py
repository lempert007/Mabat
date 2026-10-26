"""Filesystem layout under the storage root. The app owns everything below it."""

import re
import shutil
from pathlib import Path
from uuid import UUID

import aiofiles
from fastapi import UploadFile

from app.core.config import get_settings

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")
_CHUNK_BYTES = 1024 * 1024


class UploadTooLarge(Exception):
    """The upload went past MABAT_MAX_UPLOAD_MB."""


async def write_upload(upload: UploadFile, target: Path) -> int:
    """Stream an upload to `target` and return its size.

    The size limit is enforced while streaming, so an oversized file is never held in full.
    A refused or interrupted upload leaves nothing behind.
    """
    limit = get_settings().max_upload_bytes
    written = 0
    try:
        async with aiofiles.open(target, "wb") as out:
            while chunk := await upload.read(_CHUNK_BYTES):
                written += len(chunk)
                if written > limit:
                    raise UploadTooLarge()
                await out.write(chunk)
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    return written


def remove_files(*relative_paths: str | None) -> None:
    """Delete stored files by their root-relative paths. Missing or unsafe paths are skipped."""
    for relative in relative_paths:
        if not relative:
            continue
        try:
            absolute_from_root(relative).unlink(missing_ok=True)
        except ValueError:
            continue


def safe_filename(name: str) -> str:
    """Strip path components and unusual characters from a user-supplied filename."""
    base = Path(name).name or "upload"
    cleaned = _SAFE_NAME.sub("_", base).strip("._") or "upload"
    return cleaned[:200]


def project_dir(project_id: UUID) -> Path:
    return get_settings().projects_root / str(project_id)


def source_dir(project_id: UUID) -> Path:
    return project_dir(project_id) / "source"


def attachments_dir(project_id: UUID) -> Path:
    return project_dir(project_id) / "attachments"


def model_path(project_id: UUID) -> Path:
    return project_dir(project_id) / "model.glb"


def thumbnail_path(project_id: UUID) -> Path:
    return project_dir(project_id) / "thumbnail.jpg"


def ensure_project_dirs(project_id: UUID) -> None:
    source_dir(project_id).mkdir(parents=True, exist_ok=True)
    attachments_dir(project_id).mkdir(parents=True, exist_ok=True)


def remove_project_dir(project_id: UUID) -> None:
    shutil.rmtree(project_dir(project_id), ignore_errors=True)


def relative_to_root(path: Path) -> str:
    return str(path.resolve().relative_to(get_settings().storage_root))


def absolute_from_root(relative: str) -> Path:
    root = get_settings().storage_root
    resolved = (root / relative).resolve()
    if root not in resolved.parents and resolved != root:
        raise ValueError("Path escapes storage root")
    return resolved
