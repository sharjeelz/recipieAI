import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class JobStatus(str, enum.Enum):
    queued = "queued"
    transcribing = "transcribing"
    structuring = "structuring"
    done = "done"
    failed = "failed"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    title: Mapped[str | None] = mapped_column(String(500))
    thumbnail_url: Mapped[str | None] = mapped_column(String(2048))
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status"), default=JobStatus.queued, nullable=False
    )
    recipe_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("recipes.id", ondelete="SET NULL")
    )
    error: Mapped[str | None] = mapped_column(Text)
    llm_input_tokens: Mapped[int | None] = mapped_column(Integer)
    llm_output_tokens: Mapped[int | None] = mapped_column(Integer)
    transcribe_seconds: Mapped[float | None] = mapped_column(Float)
    cost_usd: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
