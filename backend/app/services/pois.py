"""Points of interest: CRUD, identifier generation, ordering."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, Poi
from app.schemas.poi import PoiCreate, PoiUpdate


class CategoryNotInProject(Exception):
    """A point was given a category that belongs to some other project."""


async def list_pois(db: AsyncSession, project_id: UUID) -> list[Poi]:
    result = await db.scalars(
        select(Poi).where(Poi.project_id == project_id).order_by(Poi.sort_order, Poi.created_at)
    )
    return list(result.all())


async def get_poi(db: AsyncSession, poi_id: UUID) -> Poi | None:
    return await db.get(Poi, poi_id)


def free_identifier(taken: set[str]) -> str:
    """The first P-NN not already in `taken`, starting from the count so the search is short."""
    number = len(taken) + 1
    while (candidate := f"P-{number:02d}") in taken:
        number += 1
    return candidate


async def taken_identifiers(db: AsyncSession, project_id: UUID) -> set[str]:
    return set((await db.scalars(select(Poi.identifier).where(Poi.project_id == project_id))).all())


async def next_sort_order(db: AsyncSession, project_id: UUID) -> int:
    current = await db.scalar(select(func.max(Poi.sort_order)).where(Poi.project_id == project_id))
    return 0 if current is None else current + 1


async def _check_category(db: AsyncSession, project_id: UUID, category_id: UUID | None) -> None:
    if category_id is None:
        return
    category = await db.get(Category, category_id)
    if category is None or category.project_id != project_id:
        raise CategoryNotInProject(category_id)


def _dump_blocks(blocks) -> list[dict]:
    return [block.model_dump(by_alias=True) for block in blocks]


async def create_poi(
    db: AsyncSession, project_id: UUID, data: PoiCreate, user_id: UUID | None
) -> Poi:
    await _check_category(db, project_id, data.category_id)
    identifier = (data.identifier or "").strip()
    poi = Poi(
        project_id=project_id,
        identifier=identifier or free_identifier(await taken_identifiers(db, project_id)),
        title=data.title.strip(),
        summary=data.summary.strip(),
        category_id=data.category_id,
        position=data.position.model_dump(),
        normal=data.normal.model_dump(),
        camera=data.camera.model_dump(by_alias=True) if data.camera else None,
        blocks=_dump_blocks(data.blocks),
        sort_order=await next_sort_order(db, project_id),
        created_by=user_id,
        updated_by=user_id,
    )
    db.add(poi)
    await db.commit()
    await db.refresh(poi)
    return poi


async def update_poi(db: AsyncSession, poi: Poi, data: PoiUpdate, user_id: UUID | None) -> Poi:
    if not data.clear_category:
        await _check_category(db, poi.project_id, data.category_id)
    if data.title is not None:
        poi.title = data.title.strip()
    if data.identifier is not None and data.identifier.strip():
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
