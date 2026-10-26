"""Export a project's points to a document, and import one into another project.

The point of this is swapping the model underneath a set of points. Positions come across as
they were, so a revised model puts every point roughly where it belongs and the editor nudges
the ones that moved rather than rebuilding all of them.
"""

import shutil
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Attachment, Category, Poi, Project
from app.schemas.transfer import (
    ExportedCategory,
    ExportedPoint,
    ImportResult,
    PointsDocument,
)
from app.services import storage
from app.services.categories import list_categories
from app.services.pois import free_identifier, list_pois, next_sort_order, taken_identifiers

# Block types whose items point at uploaded files.
ATTACHMENT_BLOCK_TYPES = {"images", "documents"}


def _iter_attachment_items(blocks: list[dict]) -> list[dict]:
    """Every {attachmentId: ...} entry in a block list, including inside sections."""
    items: list[dict] = []
    for block in blocks:
        if block.get("type") == "section":
            items.extend(_iter_attachment_items(block.get("blocks", [])))
        elif block.get("type") in ATTACHMENT_BLOCK_TYPES:
            items.extend(block.get("items", []))
    return items


async def export_points(db: AsyncSession, project: Project) -> PointsDocument:
    categories = await list_categories(db, project.id)
    names = {category.id: category.name for category in categories}
    points = await list_pois(db, project.id)
    return PointsDocument(
        exported_at=datetime.now(UTC),
        source_project_id=project.id,
        source_project_name=project.name,
        categories=[
            ExportedCategory(name=category.name, color=category.color) for category in categories
        ],
        points=[
            ExportedPoint(
                identifier=poi.identifier,
                title=poi.title,
                summary=poi.summary,
                category_name=names.get(poi.category_id) if poi.category_id else None,
                position=poi.position,
                normal=poi.normal,
                camera=poi.camera,
                blocks=poi.blocks,
            )
            for poi in points
        ],
    )


async def _copy_attachment(
    db: AsyncSession, source_id: UUID, target_project: Project
) -> Attachment | None:
    """Duplicate an attachment into the target project, file and all."""
    source = await db.get(Attachment, source_id)
    if source is None:
        return None
    try:
        source_path = storage.absolute_from_root(source.path)
    except ValueError:
        return None
    if not source_path.exists():
        return None

    new_id = uuid4()
    folder = storage.attachments_dir(target_project.id)
    folder.mkdir(parents=True, exist_ok=True)
    target_path = folder / f"{new_id}{source_path.suffix}"
    shutil.copyfile(source_path, target_path)

    thumb_relative = None
    if source.thumb_path:
        try:
            source_thumb = storage.absolute_from_root(source.thumb_path)
        except ValueError:
            source_thumb = None
        if source_thumb and source_thumb.exists():
            target_thumb = folder / f"{new_id}.thumb.jpg"
            shutil.copyfile(source_thumb, target_thumb)
            thumb_relative = storage.relative_to_root(target_thumb)

    copy = Attachment(
        id=new_id,
        project_id=target_project.id,
        poi_id=None,
        kind=source.kind,
        filename=source.filename,
        mime=source.mime,
        size=source.size,
        path=storage.relative_to_root(target_path),
        thumb_path=thumb_relative,
        width=source.width,
        height=source.height,
    )
    db.add(copy)
    return copy


async def _rehome_attachments(
    db: AsyncSession, blocks: list[dict], target: Project, copied: dict[str, str | None]
) -> tuple[int, int]:
    """Point every file reference in `blocks` at a copy living in the target project.

    References whose file is gone are dropped rather than left pointing at nothing. Returns the
    number of files copied and the number of dead references removed.
    """
    fresh = 0
    missing = 0
    for block in blocks:
        if block.get("type") == "section":
            nested_fresh, nested_missing = await _rehome_attachments(
                db, block.get("blocks", []), target, copied
            )
            fresh += nested_fresh
            missing += nested_missing
            continue
        if block.get("type") not in ATTACHMENT_BLOCK_TYPES:
            continue

        kept = []
        for item in block.get("items", []):
            original = item.get("attachmentId")
            if not original:
                continue
            if original not in copied:
                try:
                    attachment = await _copy_attachment(db, UUID(original), target)
                except ValueError:
                    attachment = None
                copied[original] = str(attachment.id) if attachment else None
                if attachment is not None:
                    fresh += 1
            replacement = copied[original]
            if replacement is None:
                missing += 1
                continue
            kept.append({**item, "attachmentId": replacement})
        block["items"] = kept
    return fresh, missing


def _referenced_attachment_ids(blocks: list[dict]) -> set[str]:
    return {
        item["attachmentId"] for item in _iter_attachment_items(blocks) if item.get("attachmentId")
    }


async def _delete_orphan_attachments(db: AsyncSession, project_id: UUID) -> int:
    """Remove files in this project that no point references any more.

    Replacing a project's points strands whatever the previous set had brought in, and repeating
    an import would otherwise keep piling up copies.
    """
    referenced: set[str] = set()
    for poi in await list_pois(db, project_id):
        referenced |= _referenced_attachment_ids(poi.blocks)

    attachments = await db.scalars(select(Attachment).where(Attachment.project_id == project_id))
    removed = 0
    for attachment in attachments.all():
        if str(attachment.id) in referenced:
            continue
        storage.remove_files(attachment.path, attachment.thumb_path)
        await db.delete(attachment)
        removed += 1
    return removed


async def import_points(
    db: AsyncSession,
    project: Project,
    document: PointsDocument,
    *,
    mode: str,
    user_id: UUID | None,
) -> ImportResult:
    if mode == "replace":
        for existing in await list_pois(db, project.id):
            await db.delete(existing)
        await db.flush()

    # Categories are matched by name so an import lands in the project's existing scheme.
    categories = {category.name: category for category in await list_categories(db, project.id)}
    highest_order = await db.scalar(
        select(func.max(Category.sort_order)).where(Category.project_id == project.id)
    )
    next_order = 0 if highest_order is None else highest_order + 1
    categories_created = 0
    for exported in document.categories:
        if exported.name in categories:
            continue
        category = Category(
            project_id=project.id,
            name=exported.name,
            color=exported.color,
            sort_order=next_order,
        )
        db.add(category)
        categories[exported.name] = category
        categories_created += 1
        next_order += 1
    await db.flush()

    taken = await taken_identifiers(db, project.id)
    copied: dict[str, str | None] = {}
    attachments_copied = 0
    attachments_missing = 0
    sort_order = await next_sort_order(db, project.id)

    for point in document.points:
        blocks = [block.model_dump(by_alias=True) for block in point.blocks]
        fresh, missing = await _rehome_attachments(db, blocks, project, copied)
        attachments_copied += fresh
        attachments_missing += missing

        identifier = point.identifier if point.identifier not in taken else free_identifier(taken)
        taken.add(identifier)

        category = categories.get(point.category_name) if point.category_name else None
        db.add(
            Poi(
                project_id=project.id,
                identifier=identifier,
                title=point.title,
                summary=point.summary,
                category_id=category.id if category else None,
                position=point.position.model_dump(),
                normal=point.normal.model_dump(),
                camera=point.camera.model_dump(by_alias=True) if point.camera else None,
                blocks=blocks,
                sort_order=sort_order,
                created_by=user_id,
                updated_by=user_id,
            )
        )
        sort_order += 1

    if mode == "replace":
        await db.flush()
        await _delete_orphan_attachments(db, project.id)

    await db.commit()
    return ImportResult(
        points_created=len(document.points),
        categories_created=categories_created,
        attachments_copied=attachments_copied,
        attachments_missing=attachments_missing,
    )
