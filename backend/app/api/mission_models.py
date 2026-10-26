from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi import status as http
from fastapi.responses import FileResponse

from app.api.deps import require_editor, require_session
from app.api.projects import get_project_or_404
from app.models import Project
from app.schemas.mission import ModelId
from app.schemas.project import MissionModelOut
from app.services import mission_models as model_service
from app.services import storage
from app.services.conversion import NEEDS_EXPORT, SUPPORTED_UPLOAD_FORMATS, ConversionError

router = APIRouter(prefix="/projects/{project_id}/mission-models", tags=["mission"])


@router.post(
    "",
    response_model=MissionModelOut,
    status_code=http.HTTP_201_CREATED,
    dependencies=[Depends(require_editor)],
)
async def upload_model(
    file: UploadFile = File(...), project: Project = Depends(get_project_or_404)
) -> MissionModelOut:
    try:
        model_id = await model_service.save(project.id, file)
    except model_service.UnsupportedFormat as exc:
        detail = NEEDS_EXPORT.get(str(exc)) or (
            f"אי אפשר לקרוא קובצי '.{exc}'. הפורמטים הנתמכים: "
            + ", ".join(sorted(SUPPORTED_UPLOAD_FORMATS))
        )
        raise HTTPException(http.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail) from exc
    except ConversionError as exc:
        raise HTTPException(http.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
    except storage.UploadTooLarge as exc:
        raise HTTPException(http.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "הקובץ גדול מדי.") from exc
    return MissionModelOut(id=model_id)


@router.get("/{model_id}", dependencies=[Depends(require_session)])
async def get_model(
    model_id: ModelId, project: Project = Depends(get_project_or_404)
) -> FileResponse:
    path = model_service.model_path(project.id, model_id)
    if not path.exists():
        raise HTTPException(http.HTTP_404_NOT_FOUND, "הדגם הזה כבר לא קיים.")
    # The file behind an id never changes, so it can be cached for good.
    return FileResponse(
        path,
        media_type="model/gltf-binary",
        filename=f"{model_id}.glb",
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )
