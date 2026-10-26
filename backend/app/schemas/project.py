from datetime import datetime
from typing import Literal
from uuid import UUID

from app.schemas.common import ApiModel, CameraPose, Quaternion, Trimmed
from app.schemas.mission import Mission


class ProjectSettings(ApiModel):
    # Turns an uploaded model the right way up. Null means it arrived correctly oriented.
    model_rotation: Quaternion | None = None
    intro_camera: CameraPose | None = None
    environment: Literal["studio", "night", "dawn"] = "studio"
    show_grid: bool = False
    # The delivery the live showcase plays. Null for a project that only shows its model.
    mission: Mission | None = None


ProjectStageLiteral = Literal["draft", "ready"]
ProjectStatusLiteral = Literal["uploaded", "processing", "ready", "failed"]
Point3 = tuple[float, float, float]


class ModelStats(ApiModel):
    # Empty until the upload has been converted.
    triangles: int | None = None
    vertices: int | None = None
    bounds_min: Point3 | None = None
    bounds_max: Point3 | None = None
    extents: Point3 | None = None


class MissionModelOut(ApiModel):
    """An uploaded model, converted and stored. The mission refers to it by this id."""

    id: str


class ProjectOut(ApiModel):
    id: UUID
    name: str
    description: str
    status: ProjectStatusLiteral
    stage: ProjectStageLiteral
    error_message: str | None
    source_filename: str
    source_format: str
    has_model: bool
    model_version: str | None
    has_thumbnail: bool
    model_stats: ModelStats
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
