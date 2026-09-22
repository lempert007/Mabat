"""Moving a project's points to another model.

The export is a plain JSON document so it can be kept, edited by hand or committed somewhere.
It carries the source project id, which lets an import on the same server copy across any
images and documents the points referenced.
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.blocks import Block
from app.schemas.common import ApiModel, CameraPose, Vec3

POINTS_FORMAT = "mabat.points"
POINTS_VERSION = 1


class ExportedCategory(ApiModel):
    name: str
    color: str


class ExportedPoint(ApiModel):
    identifier: str
    title: str
    summary: str = ""
    category_name: str | None = None
    position: Vec3
    normal: Vec3
    camera: CameraPose | None = None
    blocks: list[Block] = []


class PointsDocument(ApiModel):
    """The file produced by export and accepted by import."""

    format: Literal["mabat.points"] = POINTS_FORMAT
    version: int = POINTS_VERSION
    exported_at: datetime
    source_project_id: UUID | None = None
    source_project_name: str = ""
    categories: list[ExportedCategory] = []
    points: list[ExportedPoint] = []


class ImportRequest(ApiModel):
    document: PointsDocument
    # "append" keeps the points already in the project; "replace" clears them first.
    mode: Literal["append", "replace"] = "append"


class ImportResult(ApiModel):
    points_created: int
    categories_created: int
    attachments_copied: int
    attachments_missing: int = Field(
        default=0,
        description="Referenced files that no longer exist, whose entries were dropped.",
    )
