"""The models a mission draws: the editor's own carrier and the actors on the ground.

Every upload is converted to GLB like a project's model and stored under a fresh id, so a file
behind an id never changes and the browser can cache it for good. Replacing a model is uploading
another and pointing the mission at it. Nothing records which files exist besides the folder;
the mission's references are what keep a file, and `collect` sweeps up the rest.
"""

import asyncio
import shutil
import tempfile
import time
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import UploadFile

from app.services import storage
from app.services.conversion import SUPPORTED_UPLOAD_FORMATS, convert_to_glb, extension_of

# An upload reaches the mission a moment after it lands, through the debounced settings save.
# A file this young may simply not be referenced yet, so it is left alone.
GRACE_SECONDS = 3600


class UnsupportedFormat(Exception):
    pass


def models_dir(project_id: UUID) -> Path:
    return storage.project_dir(project_id) / "mission-models"


def model_path(project_id: UUID, model_id: str) -> Path:
    return models_dir(project_id) / f"{model_id}.glb"


async def save(project_id: UUID, upload: UploadFile) -> str:
    """Convert an upload and return the id it is stored under.

    These models are small, so the conversion runs while the request waits and a model that
    cannot be read is reported straight back rather than through a status to poll.
    """
    filename = storage.safe_filename(upload.filename or "model")
    if extension_of(filename) not in SUPPORTED_UPLOAD_FORMATS:
        raise UnsupportedFormat(extension_of(filename))

    model_id = uuid4().hex
    models_dir(project_id).mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="upload-", dir=models_dir(project_id)))
    try:
        source = work / filename
        await storage.write_upload(upload, source)
        await asyncio.to_thread(convert_to_glb, source, model_path(project_id, model_id))
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return model_id


def collect(project_id: UUID, keep: set[str]) -> None:
    """Remove the models nothing refers to any more, once they are old enough to be sure."""
    folder = models_dir(project_id)
    if not folder.is_dir():
        return
    cutoff = time.time() - GRACE_SECONDS
    for path in folder.glob("*.glb"):
        try:
            if path.stem not in keep and path.stat().st_mtime < cutoff:
                path.unlink()
        except OSError:
            continue
