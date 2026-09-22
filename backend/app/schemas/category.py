from uuid import UUID

from pydantic import Field

from app.schemas.common import ApiModel

COLOR_PATTERN = r"^#[0-9a-fA-F]{6}$"


class CategoryOut(ApiModel):
    id: UUID
    project_id: UUID
    name: str
    color: str
    sort_order: int


class CategoryCreate(ApiModel):
    name: str = Field(min_length=1, max_length=80)
    color: str = Field(pattern=COLOR_PATTERN)


class CategoryUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = Field(default=None, pattern=COLOR_PATTERN)
    sort_order: int | None = None
