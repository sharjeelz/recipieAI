"""title + thumbnail_url columns on jobs

Revision ID: 0010_job_metadata
Revises: 0009_recipe_thumbnail
Create Date: 2026-04-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_job_metadata"
down_revision: Union[str, None] = "0009_recipe_thumbnail"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("title", sa.String(length=500), nullable=True))
    op.add_column(
        "jobs",
        sa.Column("thumbnail_url", sa.String(length=2048), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("jobs", "thumbnail_url")
    op.drop_column("jobs", "title")
