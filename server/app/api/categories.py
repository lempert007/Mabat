from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_editor, require_session
from app.api.projects import get_project_or_404
from app.db.session import get_db
from app.models import Category, Project
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import categories as category_service

router = APIRouter(tags=["categories"])


async def get_category_or_404(category_id: UUID, db: AsyncSession = Depends(get_db)) -> Category:
    category = await category_service.get_category(db, category_id)
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "הקטגוריה לא נמצאה.")
    return category


@router.get(
    "/projects/{project_id}/categories",
    response_model=list[CategoryOut],
    dependencies=[Depends(require_session)],
)
async def list_categories(
    project: Project = Depends(get_project_or_404), db: AsyncSession = Depends(get_db)
) -> list[CategoryOut]:
    return [
        CategoryOut.model_validate(c)
        for c in await category_service.list_categories(db, project.id)
    ]


@router.post(
    "/projects/{project_id}/categories",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_editor)],
)
async def create_category(
    data: CategoryCreate,
    project: Project = Depends(get_project_or_404),
    db: AsyncSession = Depends(get_db),
) -> CategoryOut:
    return CategoryOut.model_validate(await category_service.create_category(db, project.id, data))


@router.patch(
    "/categories/{category_id}", response_model=CategoryOut, dependencies=[Depends(require_editor)]
)
async def update_category(
    data: CategoryUpdate,
    category: Category = Depends(get_category_or_404),
    db: AsyncSession = Depends(get_db),
) -> CategoryOut:
    return CategoryOut.model_validate(await category_service.update_category(db, category, data))


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_editor)],
)
async def delete_category(
    category: Category = Depends(get_category_or_404), db: AsyncSession = Depends(get_db)
) -> None:
    await category_service.delete_category(db, category)
