"""Spend + usage totals for the signed-in user.

Cost accounting note: on a successful extraction the same figures are
written to BOTH the job and the resulting recipe, so summing the two
would double-count. Jobs are the base here because they also carry the
cost of extractions that FAILED (we pay for transcription and the
classifier before a video is rejected), which a recipes-only total
would silently omit — and that's precisely the number worth seeing.

Translations are billed separately and are not attached to a job, so
they're summed on their own and added.
"""
import datetime as dt

from fastapi import APIRouter
from sqlalchemy import func, select

from app.deps import CurrentUser, DbSession
from app.models.job import Job, JobStatus
from app.models.recipe import Recipe, RecipeTranslation

router = APIRouter()


def _f(value) -> float:
    return float(value or 0)


def _i(value) -> int:
    return int(value or 0)


@router.get("")
async def get_stats(user: CurrentUser, db: DbSession) -> dict:
    # Start of the current month, in UTC — matches how timestamps are stored.
    now = dt.datetime.now(dt.timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    job_totals = (
        await db.execute(
            select(
                func.count(Job.id),
                func.sum(Job.cost_usd),
                func.sum(Job.llm_input_tokens),
                func.sum(Job.llm_output_tokens),
                func.sum(Job.transcribe_seconds),
            ).where(Job.user_id == user.id)
        )
    ).one()

    failed_count = (
        await db.execute(
            select(func.count(Job.id)).where(
                Job.user_id == user.id, Job.status == JobStatus.failed
            )
        )
    ).scalar_one()

    failed_usd = (
        await db.execute(
            select(func.sum(Job.cost_usd)).where(
                Job.user_id == user.id, Job.status == JobStatus.failed
            )
        )
    ).scalar_one()

    month_usd = (
        await db.execute(
            select(func.sum(Job.cost_usd)).where(
                Job.user_id == user.id, Job.created_at >= month_start
            )
        )
    ).scalar_one()

    # Translations hang off recipes, not jobs — join to scope them to this user.
    translation_totals = (
        await db.execute(
            select(
                func.count(RecipeTranslation.recipe_id),
                func.sum(RecipeTranslation.cost_usd),
                func.sum(RecipeTranslation.llm_input_tokens),
                func.sum(RecipeTranslation.llm_output_tokens),
            )
            .select_from(RecipeTranslation)
            .join(Recipe, Recipe.id == RecipeTranslation.recipe_id)
            .where(Recipe.owner_id == user.id)
        )
    ).one()

    month_translation_usd = (
        await db.execute(
            select(func.sum(RecipeTranslation.cost_usd))
            .select_from(RecipeTranslation)
            .join(Recipe, Recipe.id == RecipeTranslation.recipe_id)
            .where(
                Recipe.owner_id == user.id,
                RecipeTranslation.created_at >= month_start,
            )
        )
    ).scalar_one()

    recipe_count = (
        await db.execute(
            select(func.count(Recipe.id)).where(Recipe.owner_id == user.id)
        )
    ).scalar_one()

    jobs_total, jobs_usd, jobs_in, jobs_out, transcribe_seconds = job_totals
    tr_count, tr_usd, tr_in, tr_out = translation_totals

    extraction_usd = _f(jobs_usd)
    translation_usd = _f(tr_usd)
    total_usd = extraction_usd + translation_usd
    recipes = _i(recipe_count)

    return {
        "recipes": recipes,
        "jobs": {
            "total": _i(jobs_total),
            "failed": _i(failed_count),
        },
        "translations": _i(tr_count),
        "spend_usd": {
            "total": round(total_usd, 6),
            "extraction": round(extraction_usd, 6),
            "translation": round(translation_usd, 6),
            # Money spent on videos that never became a recipe.
            "wasted": round(_f(failed_usd), 6),
            "this_month": round(_f(month_usd) + _f(month_translation_usd), 6),
            # Only meaningful once something has actually been extracted.
            "per_recipe": round(total_usd / recipes, 6) if recipes else None,
        },
        "tokens": {
            "input": _i(jobs_in) + _i(tr_in),
            "output": _i(jobs_out) + _i(tr_out),
        },
        "transcribe_seconds": round(_f(transcribe_seconds), 2),
    }
