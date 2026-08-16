import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, jobs, recipes, research, shares, shopping
from app.services.jobs import ArqJobRunner, InlineJobRunner, JobRunner

settings = get_settings()
log = logging.getLogger(__name__)


async def _build_runner() -> JobRunner:
    try:
        from arq import create_pool
        from arq.connections import RedisSettings

        pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
        return ArqJobRunner(pool)
    except Exception as e:
        log.warning("ARQ pool unavailable (%s) — running jobs inline", e)
        return InlineJobRunner(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.job_runner = await _build_runner()
    yield
    pool = getattr(app.state.job_runner, "pool", None)
    if pool is not None:
        await pool.close(close_connection_pool=True)


app = FastAPI(title="RecipyAI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.env}


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(recipes.router, prefix="/recipes", tags=["recipes"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(research.router, prefix="/research", tags=["research"])
app.include_router(shares.router, prefix="/share", tags=["share"])
app.include_router(shopping.router, prefix="/shopping-list", tags=["shopping"])
