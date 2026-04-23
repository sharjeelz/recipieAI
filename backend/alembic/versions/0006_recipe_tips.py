"""tips column on recipes

Revision ID: 0006_recipe_tips
Revises: 0005_shopping_list
Create Date: 2026-04-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_recipe_tips"
down_revision: Union[str, None] = "0005_shopping_list"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("recipes", sa.Column("tips", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("recipes", "tips")
