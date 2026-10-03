from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from app.schemas.common import ApiModel, CameraPose, Quaternion, Trimmed


class ProjectSettings(ApiModel):
    # Turns an uploaded model the right way up. Null means it arrived correctly oriented.
    model_rotation: Quaternion | None = None
    intro_camera: CameraPose | None = None
    environment: Literal["studio", "night", "dawn"] = "studio"
    show_grid: bool = False


ProjectStageLiteral = Literal["draft", "ready"]


class ProjectOut(ApiModel):
    id: UUID
    name: str
    description: str
    status: str
    stage: ProjectStageLiteral
    error_message: str | None
    source_filename: str
    source_format: str
    has_model: bool
    model_version: str | None
    has_thumbnail: bool
    model_stats: dict[str, Any]
    settings: ProjectSettings
    poi_count: int
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(ApiModel):
    name: Trimmed(160) | None = None
    description: str | None = None
    settings: ProjectSettings | None = None
    stage: ProjectStageLiteral | None = None
