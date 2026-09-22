from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


async def list_categories(db: AsyncSession, project_id: UUID) -> list[Category]:
    result = await db.scalars(
        select(Category)
        .where(Category.project_id == project_id)
        .order_by(Category.sort_order, Category.name)
    )
    return list(result.all())


async def get_category(db: AsyncSession, category_id: UUID) -> Category | None:
    return await db.get(Category, category_id)


async def create_category(db: AsyncSession, project_id: UUID, data: CategoryCreate) -> Category:
    current_max = await db.scalar(
        select(func.max(Category.sort_order)).where(Category.project_id == project_id)
    )
    category = Category(
        project_id=project_id,
        name=data.name.strip(),
        color=data.color.lower(),
        sort_order=(current_max or 0) + 1,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def update_category(db: AsyncSession, category: Category, data: CategoryUpdate) -> Category:
    if data.name is not None:
        category.name = data.name.strip()
    if data.color is not None:
        category.color = data.color.lower()
    if data.sort_order is not None:
        category.sort_order = data.sort_order
    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(db: AsyncSession, category: Category) -> None:
    await db.delete(category)
    await db.commit()
