"""shopping list items

Revision ID: 0005_shopping_list
Revises: 0004_recipe_translations
Create Date: 2026-04-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_shopping_list"
down_revision: Union[str, None] = "0004_recipe_translations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shopping_list_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        ),
        sa.Column("item", sa.String(255), nullable=False),
        sa.Column("item_normalized", sa.String(255), nullable=False),
        sa.Column(
            "recipe_id",
            sa.Uuid(),
            sa.ForeignKey("recipes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "item_normalized", name="uq_shopping_user_item"),
    )


def downgrade() -> None:
    op.drop_table("shopping_list_items")
