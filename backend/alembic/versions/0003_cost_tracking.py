"""cost tracking columns on recipes and jobs

Revision ID: 0003_cost_tracking
Revises: 0002_recipes_jobs
Create Date: 2026-04-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_cost_tracking"
down_revision: Union[str, None] = "0002_recipes_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("recipes", sa.Column("llm_model", sa.String(100), nullable=True))
    op.add_column("recipes", sa.Column("llm_input_tokens", sa.Integer(), nullable=True))
    op.add_column("recipes", sa.Column("llm_output_tokens", sa.Integer(), nullable=True))
    op.add_column("recipes", sa.Column("transcribe_seconds", sa.Float(), nullable=True))
    op.add_column("recipes", sa.Column("cost_usd", sa.Float(), nullable=True))

    op.add_column("jobs", sa.Column("llm_input_tokens", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("llm_output_tokens", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("transcribe_seconds", sa.Float(), nullable=True))
    op.add_column("jobs", sa.Column("cost_usd", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "cost_usd")
    op.drop_column("jobs", "transcribe_seconds")
    op.drop_column("jobs", "llm_output_tokens")
    op.drop_column("jobs", "llm_input_tokens")

    op.drop_column("recipes", "cost_usd")
    op.drop_column("recipes", "transcribe_seconds")
    op.drop_column("recipes", "llm_output_tokens")
    op.drop_column("recipes", "llm_input_tokens")
    op.drop_column("recipes", "llm_model")
