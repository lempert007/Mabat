"""Points of interest: CRUD, identifier generation, ordering."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Poi
from app.schemas.poi import PoiCreate, PoiUpdate


async def list_pois(db: AsyncSession, project_id: UUID) -> list[Poi]:
    result = await db.scalars(
        select(Poi).where(Poi.project_id == project_id).order_by(Poi.sort_order, Poi.created_at)
    )
    return list(result.all())


async def get_poi(db: AsyncSession, poi_id: UUID) -> Poi | None:
    return await db.get(Poi, poi_id)


async def _next_identifier(db: AsyncSession, project_id: UUID) -> str:
    existing = set(
        (await db.scalars(select(Poi.identifier).where(Poi.project_id == project_id))).all()
    )
    number = len(existing) + 1
    while (candidate := f"P-{number:02d}") in existing:
        number += 1
    return candidate


async def _next_sort_order(db: AsyncSession, project_id: UUID) -> int:
    current = await db.scalar(select(func.max(Poi.sort_order)).where(Poi.project_id == project_id))
    return (current or 0) + 1


def _dump_blocks(blocks) -> list[dict]:
    return [block.model_dump(by_alias=True) for block in blocks]


async def create_poi(
    db: AsyncSession, project_id: UUID, data: PoiCreate, user_id: UUID | None
) -> Poi:
    poi = Poi(
        project_id=project_id,
        identifier=data.identifier or await _next_identifier(db, project_id),
        title=data.title.strip(),
        summary=data.summary.strip(),
        category_id=data.category_id,
        position=data.position.model_dump(),
        normal=data.normal.model_dump(),
        camera=data.camera.model_dump(by_alias=True) if data.camera else None,
        blocks=_dump_blocks(data.blocks),
        sort_order=await _next_sort_order(db, project_id),
        created_by=user_id,
        updated_by=user_id,
    )
    db.add(poi)
    await db.commit()
    await db.refresh(poi)
    return poi


async def update_poi(db: AsyncSession, poi: Poi, data: PoiUpdate, user_id: UUID | None) -> Poi:
    if data.title is not None:
        poi.title = data.title.strip()
    if data.identifier is not None:
        poi.identifier = data.identifier.strip()
    if data.summary is not None:
        poi.summary = data.summary.strip()
    if data.clear_category:
        poi.category_id = None
    elif data.category_id is not None:
        poi.category_id = data.category_id
    if data.position is not None:
        poi.position = data.position.model_dump()
    if data.normal is not None:
        poi.normal = data.normal.model_dump()
    if data.clear_camera:
        poi.camera = None
    elif data.camera is not None:
        poi.camera = data.camera.model_dump(by_alias=True)
    if data.blocks is not None:
        poi.blocks = _dump_blocks(data.blocks)
    poi.updated_by = user_id
    await db.commit()
    await db.refresh(poi)
    return poi


async def reorder_pois(db: AsyncSession, project_id: UUID, ordered_ids: list[UUID]) -> list[Poi]:
    pois = await list_pois(db, project_id)
    by_id = {poi.id: poi for poi in pois}
    requested = set(ordered_ids)
    position = 0
    for poi_id in ordered_ids:
        poi = by_id.get(poi_id)
        if poi is not None:
            poi.sort_order = position
            position += 1
    for poi in pois:  # anything not mentioned keeps its relative order at the end
        if poi.id not in requested:
            poi.sort_order = position
            position += 1
    await db.commit()
    # `updated_at` is filled by a server-side onupdate, so the rows have to be read back
    # rather than reused from memory.
    return await list_pois(db, project_id)


async def delete_poi(db: AsyncSession, poi: Poi) -> None:
    await db.delete(poi)
    await db.commit()
