from datetime import datetime
from uuid import UUID

from app.schemas.blocks import Block
from app.schemas.common import ApiModel, CameraPose, Trimmed, Vec3

PoiTitle = Trimmed(160)
PoiIdentifier = Trimmed(32)


class PoiOut(ApiModel):
    id: UUID
    project_id: UUID
    category_id: UUID | None
    identifier: str
    title: str
    summary: str
    position: Vec3
    normal: Vec3
    camera: CameraPose | None
    blocks: list[Block]
    sort_order: int
    created_by: UUID | None
    updated_by: UUID | None
    created_at: datetime
    updated_at: datetime


class PoiCreate(ApiModel):
    title: PoiTitle = "נקודה חדשה"
    identifier: PoiIdentifier | None = None
    summary: str = ""
    category_id: UUID | None = None
    position: Vec3
    normal: Vec3 = Vec3(x=0, y=1, z=0)
    camera: CameraPose | None = None
    blocks: list[Block] = []


class PoiUpdate(ApiModel):
    title: PoiTitle | None = None
    identifier: PoiIdentifier | None = None
    summary: str | None = None
    category_id: UUID | None = None
    clear_category: bool = False
    position: Vec3 | None = None
    normal: Vec3 | None = None
    camera: CameraPose | None = None
    clear_camera: bool = False
    blocks: list[Block] | None = None


class PoiOrderRequest(ApiModel):
    ids: list[UUID]
