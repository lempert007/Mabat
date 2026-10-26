from datetime import datetime
from typing import Literal
from uuid import UUID

from app.schemas.common import ApiModel


class AttachmentOut(ApiModel):
    id: UUID
    project_id: UUID
    poi_id: UUID | None
    kind: Literal["image", "document"]
    filename: str
    mime: str
    size: int
    width: int | None
    height: int | None
    has_thumb: bool
    created_at: datetime
