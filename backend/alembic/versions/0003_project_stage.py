"""separate the editor's stage from the upload's processing status

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

project_stage = sa.Enum("draft", "ready", name="project_stage")


def upgrade() -> None:
    project_stage.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "projects",
        sa.Column("stage", project_stage, nullable=False, server_default="draft"),
    )
    # Projects that already exist were being shown as ready, so they keep that standing.
    op.execute("UPDATE projects SET stage = 'ready' WHERE status = 'ready'")


def downgrade() -> None:
    op.drop_column("projects", "stage")
    project_stage.drop(op.get_bind(), checkfirst=True)
