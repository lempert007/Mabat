from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi import status as http
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_editor, require_session
from app.api.projects import get_project_or_404, to_out
from app.db.session import get_db
from app.models import Project
from app.schemas.project import ProjectOut
from app.services import projects as project_service
from app.services import storage
from app.services import vehicles as vehicle_service
from app.services.conversion import NEEDS_EXPORT, SUPPORTED_UPLOAD_FORMATS, ConversionError

router = APIRouter(prefix="/projects/{project_id}/vehicles", tags=["vehicles"])

Slot = Literal["carrier", "droid", "parcel"]


@router.put("/{slot}", response_model=ProjectOut, dependencies=[Depends(require_editor)])
async def upload_vehicle(
    slot: Slot,
    file: UploadFile = File(...),
    project: Project = Depends(get_project_or_404),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    try:
        await vehicle_service.save(project.id, slot, file)
    except vehicle_service.UnsupportedFormat as exc:
        detail = NEEDS_EXPORT.get(str(exc)) or (
            f"אי אפשר לקרוא קובצי '.{exc}'. הפורמטים הנתמכים: "
            + ", ".join(sorted(SUPPORTED_UPLOAD_FORMATS))
        )
        raise HTTPException(http.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail) from exc
    except ConversionError as exc:
        raise HTTPException(http.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    except storage.UploadTooLarge as exc:
        raise HTTPException(http.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "הקובץ גדול מדי.") from exc
    return to_out(project, await project_service.poi_count(db, project.id))


@router.get("/{slot}", dependencies=[Depends(require_session)])
async def get_vehicle(slot: Slot, project: Project = Depends(get_project_or_404)) -> FileResponse:
    path = vehicle_service.model_path(project.id, slot)
    if not path.exists():
        raise HTTPException(http.HTTP_404_NOT_FOUND, "לא הועלה דגם לכלי הזה.")
    # Requested with the version in the query, like the project's model, so it can be cached hard.
    return FileResponse(
        path,
        media_type="model/gltf-binary",
        filename=f"{slot}.glb",
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )


@router.delete("/{slot}", response_model=ProjectOut, dependencies=[Depends(require_editor)])
async def remove_vehicle(
    slot: Slot, project: Project = Depends(get_project_or_404), db: AsyncSession = Depends(get_db)
) -> ProjectOut:
    vehicle_service.remove(project.id, slot)
    return to_out(project, await project_service.poi_count(db, project.id))
