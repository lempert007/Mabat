"""Project lifecycle: creation, upload storage, background conversion, deletion."""

import asyncio
import logging
from pathlib import Path
from uuid import UUID

import aiofiles
from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import Category, Poi, Project
from app.models.project import ProjectStage, ProjectStatus
from app.schemas.project import ProjectSettings
from app.services import orientation, storage
from app.services.conversion import (
    SUPPORTED_UPLOAD_FORMATS,
    ConversionError,
    convert_to_glb,
    extension_of,
)

log = logging.getLogger(__name__)

DEFAULT_CATEGORIES = [
    ("כללי", "#8b9cff"),
    ("מבנה", "#f0b35a"),
    ("היסטוריה", "#5ad1a8"),
    ("סיכון", "#ff6b6b"),
]


class UploadTooLarge(Exception):
    pass


class UnsupportedFormat(Exception):
    pass


def model_version(project: Project) -> str | None:
    """Identifies the current model file, so a cached copy is replaced the moment it changes."""
    if project.model_path is None:
        return None
    try:
        return str(int(storage.absolute_from_root(project.model_path).stat().st_mtime))
    except (OSError, ValueError):
        return None


async def list_projects(db: AsyncSession) -> list[tuple[Project, int]]:
    poi_counts = (
        select(Poi.project_id, func.count(Poi.id).label("count"))
        .group_by(Poi.project_id)
        .subquery()
    )
    rows = await db.execute(
        select(Project, func.coalesce(poi_counts.c.count, 0))
        .outerjoin(poi_counts, poi_counts.c.project_id == Project.id)
        .order_by(Project.updated_at.desc())
    )
    return [(project, int(count)) for project, count in rows.all()]


async def get_project(db: AsyncSession, project_id: UUID) -> Project | None:
    return await db.get(Project, project_id)


async def poi_count(db: AsyncSession, project_id: UUID) -> int:
    return int(await db.scalar(select(func.count(Poi.id)).where(Poi.project_id == project_id)) or 0)


async def _save_upload(upload: UploadFile, target: Path) -> int:
    limit = get_settings().max_upload_bytes
    written = 0
    async with aiofiles.open(target, "wb") as out:
        while chunk := await upload.read(1024 * 1024):
            written += len(chunk)
            if written > limit:
                raise UploadTooLarge()
            await out.write(chunk)
    return written


async def create_project(
    db: AsyncSession,
    *,
    name: str,
    description: str,
    upload: UploadFile,
    created_by: UUID | None,
) -> Project:
    filename = storage.safe_filename(upload.filename or "model")
    ext = extension_of(filename)
    if ext not in SUPPORTED_UPLOAD_FORMATS:
        raise UnsupportedFormat(ext)

    project = Project(
        name=name.strip(),
        description=description.strip(),
        source_filename=filename,
        source_format=ext,
        status=ProjectStatus.UPLOADED,
        settings=ProjectSettings().model_dump(by_alias=True),
        created_by=created_by,
    )
    db.add(project)
    await db.flush()

    storage.ensure_project_dirs(project.id)
    try:
        await _save_upload(upload, storage.source_dir(project.id) / filename)
    except Exception:
        storage.remove_project_dir(project.id)
        await db.rollback()
        raise

    for index, (cat_name, color) in enumerate(DEFAULT_CATEGORIES):
        db.add(Category(project_id=project.id, name=cat_name, color=color, sort_order=index))

    await db.commit()
    await db.refresh(project)
    return project


async def process_project(project_id: UUID) -> None:
    """Background task: convert the uploaded source to GLB and record the result."""
    async with SessionLocal() as db:
        project = await db.get(Project, project_id)
        if project is None:
            return
        project.status = ProjectStatus.PROCESSING
        project.error_message = None
        await db.commit()

        source = storage.source_dir(project_id) / project.source_filename
        output = storage.model_path(project_id)
        try:
            stats = await asyncio.to_thread(convert_to_glb, source, output)
        except ConversionError as exc:
            log.warning("Conversion failed for %s: %s", project_id, exc)
            project.status = ProjectStatus.FAILED
            project.error_message = str(exc)
        except Exception:
            log.exception("Unexpected conversion error for %s", project_id)
            project.status = ProjectStatus.FAILED
            project.error_message = "אירעה תקלה בעיבוד הדגם."
        else:
            project.status = ProjectStatus.READY
            project.model_path = storage.relative_to_root(output)
            project.model_stats = stats.as_dict()
        await db.commit()


async def update_project(
    db: AsyncSession,
    project: Project,
    *,
    name: str | None,
    description: str | None,
    settings: ProjectSettings | None,
    stage: str | None,
) -> Project:
    if name is not None:
        project.name = name.strip()
    if description is not None:
        project.description = description.strip()
    if settings is not None:
        # Turning the model takes the points with it, so markers stay on the geometry.
        previous = ProjectSettings.model_validate(project.settings)
        await orientation.reorient_points(
            db, project.id, previous.model_rotation, settings.model_rotation
        )
        project.settings = settings.model_dump(by_alias=True)
    if stage is not None:
        project.stage = ProjectStage(stage)
    await db.commit()
    await db.refresh(project)
    return project


async def set_thumbnail(db: AsyncSession, project: Project, thumbnail: Path) -> Project:
    project.thumbnail_path = storage.relative_to_root(thumbnail)
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project: Project) -> None:
    project_id = project.id
    await db.delete(project)
    await db.commit()
    storage.remove_project_dir(project_id)
