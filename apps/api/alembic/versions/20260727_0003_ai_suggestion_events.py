"""Add ai_suggestion_events for AI metrics.

Revision ID: 20260727_0003
Revises: 20260726_0002
Create Date: 2026-07-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260727_0003"
down_revision: Union[str, Sequence[str], None] = "20260726_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_suggestion_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("feature", sa.String(length=64), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("accepted", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_suggestion_events_user_id", "ai_suggestion_events", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_suggestion_events_user_id", table_name="ai_suggestion_events")
    op.drop_table("ai_suggestion_events")
