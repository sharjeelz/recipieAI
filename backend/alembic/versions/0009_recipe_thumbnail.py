"""thumbnail_url column on recipes

Revision ID: 0009_recipe_thumbnail
Revises: 0008_recipe_notes
Create Date: 2026-04-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_recipe_thumbnail"
down_revision: Union[str, None] = "0008_recipe_notes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recipes",
        sa.Column("thumbnail_url", sa.String(length=2048), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("recipes", "thumbnail_url")
