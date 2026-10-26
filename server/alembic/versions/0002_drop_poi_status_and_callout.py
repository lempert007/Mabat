"""drop poi status and the callout block type

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

poi_status = sa.Enum("none", "planned", "in_progress", "done", name="poi_status")

# Callout blocks become plain text blocks so existing content survives the type being removed.
CALLOUT_TO_TEXT = sa.text(
    """
    UPDATE pois
    SET blocks = (
        SELECT jsonb_agg(
            CASE
                WHEN block->>'type' = 'callout'
                THEN jsonb_build_object(
                    'id', block->>'id',
                    'type', 'text',
                    'markdown', coalesce(block->>'text', '')
                )
                ELSE block
            END
            ORDER BY ordinality
        )
        FROM jsonb_array_elements(pois.blocks) WITH ORDINALITY AS t(block, ordinality)
    )
    WHERE blocks @> '[{"type": "callout"}]'
    """
)


def upgrade() -> None:
    op.execute(CALLOUT_TO_TEXT)
    op.drop_column("pois", "status")
    poi_status.drop(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    poi_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "pois",
        sa.Column("status", poi_status, nullable=False, server_default="none"),
    )
