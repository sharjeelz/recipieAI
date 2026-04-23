import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models.job import Job
from app.schemas.recipe import JobOut

router = APIRouter()


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Job:
    job = (
        await db.execute(select(Job).where(Job.id == job_id))
    ).scalar_one_or_none()
    if job is None or job.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "job not found")
    return job
