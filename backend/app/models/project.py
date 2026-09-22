from enum import StrEnum
from typing import Any
from uuid import UUID

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.base import enum_values as _enum_values


class ProjectStatus(StrEnum):
    """How the uploaded file is getting on. Set by the server, never by a person."""

    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class ProjectStage(StrEnum):
    """Whether the editor considers the project fit to show. Theirs to set."""

    DRAFT = "draft"
    READY = "ready"


class Project(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status", values_callable=_enum_values),
        default=ProjectStatus.UPLOADED,
        nullable=False,
    )
    stage: Mapped[ProjectStage] = mapped_column(
        Enum(ProjectStage, name="project_stage", values_callable=_enum_values),
        default=ProjectStage.DRAFT,
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(Text)
    source_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    source_format: Mapped[str] = mapped_column(String(16), nullable=False)
    model_path: Mapped[str | None] = mapped_column(String(512))
    thumbnail_path: Mapped[str | None] = mapped_column(String(512))
    model_stats: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    settings: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    categories = relationship("Category", cascade="all, delete-orphan", back_populates="project")
    pois = relationship("Poi", cascade="all, delete-orphan", back_populates="project")
    attachments = relationship("Attachment", cascade="all, delete-orphan", back_populates="project")
