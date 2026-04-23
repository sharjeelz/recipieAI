"""recipes, ingredients, steps, saved_recipes, share_tokens, jobs

Revision ID: 0002_recipes_jobs
Revises: 0001_init_users
Create Date: 2026-04-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_recipes_jobs"
down_revision: Union[str, None] = "0001_init_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    visibility = sa.Enum("private", "unlisted", "public", name="visibility")
    job_status = sa.Enum(
        "queued", "transcribing", "structuring", "done", "failed", name="job_status"
    )

    op.create_table(
        "recipes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True),
        sa.Column("source_url", sa.String(2048), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("summary", sa.Text()),
        sa.Column("servings", sa.Integer()),
        sa.Column("total_time_min", sa.Integer()),
        sa.Column("cuisine", sa.String(100)),
        sa.Column("visibility", visibility, nullable=False, server_default="private"),
        sa.Column("llm_provider", sa.String(50)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "ingredients",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("recipe_id", sa.Uuid(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.String(50)),
        sa.Column("unit", sa.String(50)),
        sa.Column("item", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text()),
    )

    op.create_table(
        "steps",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("recipe_id", sa.Uuid(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("duration_seconds", sa.Integer()),
    )

    op.create_table(
        "saved_recipes",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("recipe_id", sa.Uuid(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("saved_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "share_tokens",
        sa.Column("token", sa.String(64), primary_key=True),
        sa.Column("recipe_id", sa.Uuid(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), index=True),
        sa.Column("source_url", sa.String(2048), nullable=False),
        sa.Column("status", job_status, nullable=False, server_default="queued"),
        sa.Column("recipe_id", sa.Uuid(), sa.ForeignKey("recipes.id", ondelete="SET NULL")),
        sa.Column("error", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_table("share_tokens")
    op.drop_table("saved_recipes")
    op.drop_table("steps")
    op.drop_table("ingredients")
    op.drop_table("recipes")
    sa.Enum(name="job_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="visibility").drop(op.get_bind(), checkfirst=True)
