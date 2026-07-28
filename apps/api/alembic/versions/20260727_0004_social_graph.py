"""Social graph, activity feed, notifications, search.

Revision ID: 20260727_0004
Revises: 20260727_0003
Create Date: 2026-07-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260727_0004"
down_revision: Union[str, Sequence[str], None] = "20260727_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("profiles") as batch:
        batch.add_column(
            sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false())
        )

    op.create_table(
        "follows",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("follower_id", sa.Integer(), nullable=False),
        sa.Column("following_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["follower_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["following_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("follower_id", "following_id", name="uq_follow_pair"),
    )
    op.create_index("ix_follows_follower_id", "follows", ["follower_id"])
    op.create_index("ix_follows_following_id", "follows", ["following_id"])

    op.create_table(
        "activity_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=False),
        sa.Column("profile_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("ref_id", sa.Integer(), nullable=True),
        sa.Column("summary", sa.String(length=280), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_events_actor_user_id", "activity_events", ["actor_user_id"])
    op.create_index("ix_activity_events_profile_id", "activity_events", ["profile_id"])
    op.create_index("ix_activity_events_event_type", "activity_events", ["event_type"])
    op.create_index("ix_activity_events_created_at", "activity_events", ["created_at"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("notif_type", sa.String(length=40), nullable=False),
        sa.Column("ref_id", sa.Integer(), nullable=True),
        sa.Column("body", sa.String(length=280), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    op.create_table(
        "comment_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("comment_id", sa.Integer(), nullable=False),
        sa.Column("reporter_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=200), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["comment_id"], ["comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comment_id", "reporter_id", name="uq_comment_report"),
    )
    op.create_index("ix_comment_reports_comment_id", "comment_reports", ["comment_id"])

    op.create_index(
        "ix_comments_profile_created",
        "comments",
        ["profile_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_comments_profile_created", table_name="comments")
    op.drop_index("ix_comment_reports_comment_id", table_name="comment_reports")
    op.drop_table("comment_reports")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_activity_events_created_at", table_name="activity_events")
    op.drop_index("ix_activity_events_event_type", table_name="activity_events")
    op.drop_index("ix_activity_events_profile_id", table_name="activity_events")
    op.drop_index("ix_activity_events_actor_user_id", table_name="activity_events")
    op.drop_table("activity_events")
    op.drop_index("ix_follows_following_id", table_name="follows")
    op.drop_index("ix_follows_follower_id", table_name="follows")
    op.drop_table("follows")
    with op.batch_alter_table("profiles") as batch:
        batch.drop_column("onboarding_completed")
