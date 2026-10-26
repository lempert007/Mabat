"""The drone models a mission flies: the carrier, the droid it lowers, and the parcel.

Each slot holds at most one uploaded model, converted to GLB like a project's own model. A slot
with nothing uploaded falls back to the built-in model the viewer draws, so a mission plays
before anyone has a model to hand. The file on disk is the whole record: there is no table, and
its timestamp is the version that keeps a replaced model from being served from cache.
"""

import asyncio
import shutil
import tempfile
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile

from app.services import storage
from app.services.conversion import SUPPORTED_UPLOAD_FORMATS, convert_to_glb, extension_of

SLOTS = ("carrier", "droid", "parcel")


class UnsupportedFormat(Exception):
    pass


def model_path(project_id: UUID, slot: str) -> Path:
    return storage.vehicles_dir(project_id) / f"{slot}.glb"


def versions(project_id: UUID) -> dict[str, str | None]:
    """Each slot's model version, or None where nothing has been uploaded."""
    result: dict[str, str | None] = {}
    for slot in SLOTS:
        try:
            result[slot] = str(model_path(project_id, slot).stat().st_mtime_ns)
        except OSError:
            result[slot] = None
    return result


async def save(project_id: UUID, slot: str, upload: UploadFile) -> None:
    """Convert an upload into the slot's model, replacing the previous one only on success.

    Drone models are small, so the conversion runs while the request waits and a model that
    cannot be read is reported straight back rather than through a status to poll.
    """
    filename = storage.safe_filename(upload.filename or "model")
    if extension_of(filename) not in SUPPORTED_UPLOAD_FORMATS:
        raise UnsupportedFormat(extension_of(filename))

    storage.vehicles_dir(project_id).mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix=f"{slot}-", dir=storage.vehicles_dir(project_id)))
    try:
        source = work / filename
        await storage.write_upload(upload, source)
        await asyncio.to_thread(convert_to_glb, source, model_path(project_id, slot))
    finally:
        shutil.rmtree(work, ignore_errors=True)


def remove(project_id: UUID, slot: str) -> None:
    model_path(project_id, slot).unlink(missing_ok=True)
