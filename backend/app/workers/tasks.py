import uuid

from arq.connections import RedisSettings

from app.config import get_settings
from app.services.jobs import process_job

settings = get_settings()


async def transcribe_and_structure(ctx: dict, job_id: str, video_url: str) -> None:
    await process_job(uuid.UUID(job_id), video_url, settings)


class WorkerSettings:
    functions = [transcribe_and_structure]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
