"""recipe_ratings table — per-user rating and cook count

Revision ID: 0011_recipe_ratings
Revises: 0010_job_metadata
Create Date: 2026-08-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_recipe_ratings"
down_revision: Union[str, None] = "0010_job_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recipe_ratings",
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "recipe_id",
            sa.Uuid(),
            sa.ForeignKey("recipes.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("cooked_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_cooked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        # 1..5 or nothing — enforced here so a bad client can't write a 9.
        sa.CheckConstraint(
            "rating IS NULL OR (rating >= 1 AND rating <= 5)",
            name="ck_recipe_ratings_range",
        ),
    )


def downgrade() -> None:
    op.drop_table("recipe_ratings")
