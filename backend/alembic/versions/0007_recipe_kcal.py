"""kcal_per_serving column on recipes

Revision ID: 0007_recipe_kcal
Revises: 0006_recipe_tips
Create Date: 2026-04-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_recipe_kcal"
down_revision: Union[str, None] = "0006_recipe_tips"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recipes",
        sa.Column("kcal_per_serving", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("recipes", "kcal_per_serving")
