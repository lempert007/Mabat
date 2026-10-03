"""Project lifecycle: creation, upload storage, background conversion, deletion."""

import asyncio
import logging
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.exc import StaleDataError

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
from app.services.images import UnreadableImage, write_cover

log = logging.getLogger(__name__)

DEFAULT_CATEGORIES = [
    ("כללי", "#8b9cff"),
    ("מבנה", "#f0b35a"),
    ("היסטוריה", "#5ad1a8"),
    ("סיכון", "#ff6b6b"),
]


# Shown when a conversion was cut short by the server stopping, so the editor can retry it.
INTERRUPTED_MESSAGE = "העיבוד נקטע כשהשרת הופעל מחדש. אפשר לנסות שוב."
UNEXPECTED_MESSAGE = "אירעה תקלה בעיבוד הדגם."

_BUSY = (ProjectStatus.UPLOADED, ProjectStatus.PROCESSING)


class UnsupportedFormat(Exception):
    pass


class AlreadyProcessing(Exception):
    """A conversion for this project is queued or running."""


class UnreadableCover(Exception):
    """The uploaded cover is not an image Pillow can read."""


def model_version(project: Project) -> str | None:
    """Identifies the current model file, so a cached copy is replaced the moment it changes.

    Nanoseconds, so a model reprocessed within the same second still gets a new version.
    """
    if project.model_path is None:
        return None
    try:
        return str(storage.absolute_from_root(project.model_path).stat().st_mtime_ns)
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
        # A name of only spaces passes the form's length check; fall back to the file's name.
        name=name.strip() or filename.rsplit(".", 1)[0],
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
        await storage.write_upload(upload, storage.source_dir(project.id) / filename)
    except Exception:
        storage.remove_project_dir(project.id)
        await db.rollback()
        raise

    for index, (cat_name, color) in enumerate(DEFAULT_CATEGORIES):
        db.add(Category(project_id=project.id, name=cat_name, color=color, sort_order=index))

    await db.commit()
    await db.refresh(project)
    return project


async def queue_processing(db: AsyncSession, project: Project) -> Project:
    """Mark a project for another conversion attempt. The caller schedules `process_project`."""
    if project.status in _BUSY:
        raise AlreadyProcessing(project.id)
    project.status = ProjectStatus.UPLOADED
    project.error_message = None
    await db.commit()
    await db.refresh(project)
    return project


async def fail_interrupted_processing(db: AsyncSession) -> int:
    """Conversions run inside the server process, so a restart abandons any that were running.

    Left alone they would read "processing" forever. Marking them failed lets the editor retry.
    """
    result = await db.execute(
        update(Project)
        .where(Project.status.in_(_BUSY))
        .values(status=ProjectStatus.FAILED, error_message=INTERRUPTED_MESSAGE)
    )
    await db.commit()
    return result.rowcount or 0


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
            project.error_message = UNEXPECTED_MESSAGE
        else:
            project.status = ProjectStatus.READY
            project.model_path = storage.relative_to_root(output)
            project.model_stats = stats.as_dict()
        try:
            await db.commit()
        except StaleDataError:
            # The project was deleted while its model was converting; there is nothing to record.
            log.info("Project %s was deleted during conversion", project_id)


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


async def save_thumbnail(db: AsyncSession, project: Project, upload: UploadFile) -> Project:
    """Store a viewer capture as the project's gallery cover."""
    raw = storage.project_dir(project.id) / "thumbnail.upload"
    target = storage.thumbnail_path(project.id)
    await storage.write_upload(upload, raw)
    try:
        await asyncio.to_thread(write_cover, raw, target)
    except UnreadableImage as exc:
        raise UnreadableCover() from exc
    finally:
        raw.unlink(missing_ok=True)
    project.thumbnail_path = storage.relative_to_root(target)
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project: Project) -> None:
    project_id = project.id
    await db.delete(project)
    await db.commit()
    storage.remove_project_dir(project_id)
