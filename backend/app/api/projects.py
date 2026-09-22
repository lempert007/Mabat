import re
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi import status as http
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Session, require_editor, require_session
from app.db.session import get_db
from app.models import Project
from app.schemas.project import ProjectOut, ProjectSettings, ProjectUpdate
from app.schemas.transfer import ImportRequest, ImportResult, PointsDocument
from app.services import projects as project_service
from app.services import storage
from app.services import transfer as transfer_service
from app.services.conversion import NEEDS_EXPORT, SUPPORTED_UPLOAD_FORMATS
from app.services.images import write_cover

router = APIRouter(prefix="/projects", tags=["projects"])


def to_out(project: Project, poi_count: int) -> ProjectOut:
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status.value,
        stage=project.stage.value,
        error_message=project.error_message,
        source_filename=project.source_filename,
        source_format=project.source_format,
        has_model=project.model_path is not None,
        model_version=project_service.model_version(project),
        has_thumbnail=project.thumbnail_path is not None,
        model_stats=project.model_stats,
        settings=ProjectSettings.model_validate(project.settings),
        poi_count=poi_count,
        created_by=project.created_by,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


async def get_project_or_404(project_id: UUID, db: AsyncSession = Depends(get_db)) -> Project:
    project = await project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(http.HTTP_404_NOT_FOUND, "הפרויקט לא נמצא.")
    return project


@router.get("", response_model=list[ProjectOut], dependencies=[Depends(require_session)])
async def list_projects(db: AsyncSession = Depends(get_db)) -> list[ProjectOut]:
    return [to_out(p, count) for p, count in await project_service.list_projects(db)]


@router.post("", response_model=ProjectOut, status_code=http.HTTP_201_CREATED)
async def create_project(
    background: BackgroundTasks,
    name: str = Form(min_length=1, max_length=160),
    description: str = Form(default=""),
    file: UploadFile = File(...),
    session: Session = Depends(require_editor),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    try:
        project = await project_service.create_project(
            db, name=name, description=description, upload=file, created_by=session.user_id
        )
    except project_service.UnsupportedFormat as exc:
        # A format we know by name gets its own instructions; anything else gets the list.
        detail = NEEDS_EXPORT.get(str(exc)) or (
            f"אי אפשר לקרוא קובצי '.{exc}'. הפורמטים הנתמכים: "
            + ", ".join(sorted(SUPPORTED_UPLOAD_FORMATS))
        )
        raise HTTPException(http.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail) from exc
    except project_service.UploadTooLarge as exc:
        raise HTTPException(http.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "הקובץ גדול מדי.") from exc
    background.add_task(project_service.process_project, project.id)
    return to_out(project, 0)


@router.get("/{project_id}", response_model=ProjectOut, dependencies=[Depends(require_session)])
async def get_project(
    project: Project = Depends(get_project_or_404), db: AsyncSession = Depends(get_db)
) -> ProjectOut:
    return to_out(project, await project_service.poi_count(db, project.id))


@router.patch("/{project_id}", response_model=ProjectOut, dependencies=[Depends(require_editor)])
async def update_project(
    data: ProjectUpdate,
    project: Project = Depends(get_project_or_404),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    project = await project_service.update_project(
        db,
        project,
        name=data.name,
        description=data.description,
        settings=data.settings,
        stage=data.stage,
    )
    return to_out(project, await project_service.poi_count(db, project.id))


@router.post(
    "/{project_id}/reprocess", response_model=ProjectOut, dependencies=[Depends(require_editor)]
)
async def reprocess_project(
    background: BackgroundTasks,
    project: Project = Depends(get_project_or_404),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    background.add_task(project_service.process_project, project.id)
    return to_out(project, await project_service.poi_count(db, project.id))


@router.delete(
    "/{project_id}", status_code=http.HTTP_204_NO_CONTENT, dependencies=[Depends(require_editor)]
)
async def delete_project(
    project: Project = Depends(get_project_or_404), db: AsyncSession = Depends(get_db)
) -> None:
    await project_service.delete_project(db, project)


@router.get("/{project_id}/model", dependencies=[Depends(require_session)])
async def get_model(project: Project = Depends(get_project_or_404)) -> FileResponse:
    if project.model_path is None:
        raise HTTPException(http.HTTP_404_NOT_FOUND, "הדגם עוד לא מוכן.")
    # Callers fetch this with the project's modelVersion in the query, so the URL changes
    # whenever the file does. That lets the response be cached hard without ever going stale.
    return FileResponse(
        storage.absolute_from_root(project.model_path),
        media_type="model/gltf-binary",
        filename="model.glb",
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )


@router.get("/{project_id}/thumbnail", dependencies=[Depends(require_session)])
async def get_thumbnail(project: Project = Depends(get_project_or_404)) -> FileResponse:
    if project.thumbnail_path is None:
        raise HTTPException(http.HTTP_404_NOT_FOUND, "אין תמונה ממוזערת.")
    return FileResponse(
        storage.absolute_from_root(project.thumbnail_path),
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=60"},
    )


@router.put(
    "/{project_id}/thumbnail", response_model=ProjectOut, dependencies=[Depends(require_editor)]
)
async def set_thumbnail(
    file: UploadFile = File(...),
    project: Project = Depends(get_project_or_404),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(http.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "צריך לשלוח קובץ תמונה.")
    raw = storage.project_dir(project.id) / "thumbnail.upload"
    raw.write_bytes(await file.read())
    target = storage.thumbnail_path(project.id)
    try:
        write_cover(raw, target)
    finally:
        raw.unlink(missing_ok=True)
    project = await project_service.set_thumbnail(db, project, target)
    return to_out(project, await project_service.poi_count(db, project.id))


@router.get(
    "/{project_id}/points/export",
    response_model=PointsDocument,
    dependencies=[Depends(require_session)],
)
async def export_points(
    project: Project = Depends(get_project_or_404), db: AsyncSession = Depends(get_db)
) -> JSONResponse:
    """Every point in the project as a portable document, offered as a file download."""
    document = await transfer_service.export_points(db, project)
    # A Hebrew project name cannot go in a plain filename parameter, so offer an ASCII fallback
    # alongside the UTF-8 form that browsers actually use.
    ascii_name = re.sub(r"[^A-Za-z0-9_-]+", "-", project.name).strip("-") or "project"
    utf8_name = quote(f"{project.name} - points.json")
    return JSONResponse(
        content=jsonable_encoder(document, by_alias=True),
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"{ascii_name}-points.json\"; filename*=UTF-8''{utf8_name}"
            )
        },
    )


@router.post(
    "/{project_id}/points/import",
    response_model=ImportResult,
    dependencies=[Depends(require_editor)],
)
async def import_points(
    data: ImportRequest,
    project: Project = Depends(get_project_or_404),
    session: Session = Depends(require_editor),
    db: AsyncSession = Depends(get_db),
) -> ImportResult:
    """Add points from an exported document, bringing their images and files along."""
    return await transfer_service.import_points(
        db, project, data.document, mode=data.mode, user_id=session.user_id
    )
