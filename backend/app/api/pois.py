from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Session, require_editor, require_session
from app.api.projects import get_project_or_404
from app.db.session import get_db
from app.models import Poi, Project
from app.schemas.poi import PoiCreate, PoiOrderRequest, PoiOut, PoiUpdate
from app.services import pois as poi_service

router = APIRouter(tags=["pois"])


async def get_poi_or_404(poi_id: UUID, db: AsyncSession = Depends(get_db)) -> Poi:
    poi = await poi_service.get_poi(db, poi_id)
    if poi is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "הנקודה לא נמצאה.")
    return poi


@router.get(
    "/projects/{project_id}/pois",
    response_model=list[PoiOut],
    dependencies=[Depends(require_session)],
)
async def list_pois(
    project: Project = Depends(get_project_or_404), db: AsyncSession = Depends(get_db)
) -> list[PoiOut]:
    return [PoiOut.model_validate(p) for p in await poi_service.list_pois(db, project.id)]


@router.post(
    "/projects/{project_id}/pois", response_model=PoiOut, status_code=status.HTTP_201_CREATED
)
async def create_poi(
    data: PoiCreate,
    project: Project = Depends(get_project_or_404),
    session: Session = Depends(require_editor),
    db: AsyncSession = Depends(get_db),
) -> PoiOut:
    try:
        poi = await poi_service.create_poi(db, project.id, data, session.user_id)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "המזהה הזה כבר תפוס.") from exc
    return PoiOut.model_validate(poi)


@router.put(
    "/projects/{project_id}/pois/order",
    response_model=list[PoiOut],
    dependencies=[Depends(require_editor)],
)
async def reorder_pois(
    data: PoiOrderRequest,
    project: Project = Depends(get_project_or_404),
    db: AsyncSession = Depends(get_db),
) -> list[PoiOut]:
    return [
        PoiOut.model_validate(p) for p in await poi_service.reorder_pois(db, project.id, data.ids)
    ]


@router.get("/pois/{poi_id}", response_model=PoiOut, dependencies=[Depends(require_session)])
async def get_poi(poi: Poi = Depends(get_poi_or_404)) -> PoiOut:
    return PoiOut.model_validate(poi)


@router.patch("/pois/{poi_id}", response_model=PoiOut)
async def update_poi(
    data: PoiUpdate,
    poi: Poi = Depends(get_poi_or_404),
    session: Session = Depends(require_editor),
    db: AsyncSession = Depends(get_db),
) -> PoiOut:
    try:
        updated = await poi_service.update_poi(db, poi, data, session.user_id)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "המזהה הזה כבר תפוס.") from exc
    return PoiOut.model_validate(updated)


@router.delete(
    "/pois/{poi_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_editor)]
)
async def delete_poi(
    poi: Poi = Depends(get_poi_or_404), db: AsyncSession = Depends(get_db)
) -> None:
    await poi_service.delete_poi(db, poi)
