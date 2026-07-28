"""Add media_likes and comment_likes.

Revision ID: 20260727_0005
Revises: 20260727_0004
Create Date: 2026-07-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260727_0005"
down_revision: Union[str, Sequence[str], None] = "20260727_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "media_likes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("media_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["media_id"], ["media_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("media_id", "user_id", name="uq_media_like"),
    )
    op.create_index("ix_media_likes_media_id", "media_likes", ["media_id"])
    op.create_index("ix_media_likes_user_id", "media_likes", ["user_id"])

    op.create_table(
        "comment_likes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("comment_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["comment_id"], ["comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comment_id", "user_id", name="uq_comment_like"),
    )
    op.create_index("ix_comment_likes_comment_id", "comment_likes", ["comment_id"])
    op.create_index("ix_comment_likes_user_id", "comment_likes", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_comment_likes_user_id", table_name="comment_likes")
    op.drop_index("ix_comment_likes_comment_id", table_name="comment_likes")
    op.drop_table("comment_likes")
    op.drop_index("ix_media_likes_user_id", table_name="media_likes")
    op.drop_index("ix_media_likes_media_id", table_name="media_likes")
    op.drop_table("media_likes")
