from uuid import UUID

from pydantic import Field

from app.schemas.common import ApiModel, Trimmed

COLOR_PATTERN = r"^#[0-9a-fA-F]{6}$"


class CategoryOut(ApiModel):
    id: UUID
    project_id: UUID
    name: str
    color: str
    sort_order: int


class CategoryCreate(ApiModel):
    name: Trimmed(80)
    color: str = Field(pattern=COLOR_PATTERN)


class CategoryUpdate(ApiModel):
    name: Trimmed(80) | None = None
    color: str | None = Field(default=None, pattern=COLOR_PATTERN)
    sort_order: int | None = None
