"""Filesystem layout under the storage root. The app owns everything below it."""

import re
import shutil
from pathlib import Path
from uuid import UUID

from app.core.config import get_settings

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


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
