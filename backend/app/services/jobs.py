import logging
import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import db as db_module
from app.config import Settings
from app.models.job import Job, JobStatus
from app.models.recipe import Visibility
from app.services.llm.classifier import NotARecipeError
from app.services.llm.pricing import llm_cost_usd
from app.services.recipe_builder import build_recipe
from app.services.recipe_store import persist_recipe

log = logging.getLogger(__name__)


class JobRunner(Protocol):
    async def enqueue(self, job_id: uuid.UUID, video_url: str) -> None: ...


async def process_job(job_id: uuid.UUID, video_url: str, settings: Settings) -> None:
    """Run a build job end-to-end, updating the jobs row as it progresses."""
    async with db_module.SessionLocal() as db:
        job = await _set_status(db, job_id, JobStatus.transcribing)
        if job is None:
            return
        owner_id = job.user_id

    try:
        result = await build_recipe(video_url, settings)
    except NotARecipeError as e:
        classify_usd = llm_cost_usd(
            e.classify.model, e.classify.input_tokens, e.classify.output_tokens
        )
        async with db_module.SessionLocal() as db:
            await _fail(
                db,
                job_id,
                e.reason,
                input_tokens=e.classify.input_tokens,
                output_tokens=e.classify.output_tokens,
                cost_usd=round(classify_usd, 6),
            )
        return
    except Exception as e:
        log.exception("build_recipe failed for job %s", job_id)
        async with db_module.SessionLocal() as db:
            await _fail(db, job_id, str(e))
        return

    async with db_module.SessionLocal() as db:
        await _set_status(db, job_id, JobStatus.structuring)
        recipe = await persist_recipe(
            db,
            source_url=video_url,
            owner_id=owner_id,
            visibility=Visibility.private,
            llm_provider=result.llm_provider,
            llm_model=result.llm_model,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            transcribe_seconds=result.transcribe_seconds,
            cost_usd=result.cost_usd,
            thumbnail_url=result.thumbnail_url,
            structured=result.recipe,
        )
        await _complete(
            db,
            job_id,
            recipe_id=recipe.id,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            transcribe_seconds=result.transcribe_seconds,
            cost_usd=result.cost_usd,
        )


async def _set_status(db: AsyncSession, job_id: uuid.UUID, status: JobStatus) -> Job | None:
    job = (await db.execute(select(Job).where(Job.id == job_id))).scalar_one_or_none()
    if job is None:
        return None
    job.status = status
    await db.commit()
    return job


async def _complete(
    db: AsyncSession,
    job_id: uuid.UUID,
    *,
    recipe_id: uuid.UUID,
    input_tokens: int,
    output_tokens: int,
    transcribe_seconds: float | None,
    cost_usd: float,
) -> None:
    job = (await db.execute(select(Job).where(Job.id == job_id))).scalar_one_or_none()
    if job is None:
        return
    job.status = JobStatus.done
    job.recipe_id = recipe_id
    job.llm_input_tokens = input_tokens
    job.llm_output_tokens = output_tokens
    job.transcribe_seconds = transcribe_seconds
    job.cost_usd = cost_usd
    await db.commit()


async def _fail(
    db: AsyncSession,
    job_id: uuid.UUID,
    error: str,
    *,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
    cost_usd: float | None = None,
) -> None:
    job = (await db.execute(select(Job).where(Job.id == job_id))).scalar_one_or_none()
    if job is None:
        return
    job.status = JobStatus.failed
    job.error = error[:2000]
    if input_tokens is not None:
        job.llm_input_tokens = input_tokens
    if output_tokens is not None:
        job.llm_output_tokens = output_tokens
    if cost_usd is not None:
        job.cost_usd = cost_usd
    await db.commit()


class InlineJobRunner:
    """Runs jobs in-process. Used in dev without Redis and in tests."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def enqueue(self, job_id: uuid.UUID, video_url: str) -> None:
        await process_job(job_id, video_url, self.settings)


class ArqJobRunner:
    """Enqueues to ARQ/Redis. Used in production."""

    def __init__(self, pool) -> None:
        self.pool = pool

    async def enqueue(self, job_id: uuid.UUID, video_url: str) -> None:
        await self.pool.enqueue_job("transcribe_and_structure", str(job_id), video_url)
