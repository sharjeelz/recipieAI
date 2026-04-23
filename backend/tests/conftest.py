import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-please-change")

from app import db as db_module  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import job, recipe, user  # noqa: F401, E402  -- register models
from app.services import jobs as jobs_service  # noqa: E402
from app.services.jobs import InlineJobRunner  # noqa: E402
from app.services.llm.base import Ingredient, Step, StructuredRecipe, StructureResult  # noqa: E402


class FakeProvider:
    name = "fake"

    async def structure_recipe(
        self,
        transcript: str,
        source_url: str,
        *,
        title: str | None = None,
        description: str | None = None,
        transcript_source: str = "transcript",
    ) -> StructureResult:
        recipe = StructuredRecipe(
            title="Garlic Butter Pasta",
            summary="A quick garlic butter pasta from a YouTube video.",
            servings=2,
            total_time_min=15,
            cuisine="italian",
            ingredients=[
                Ingredient(quantity="200", unit="g", item="spaghetti", notes=None),
                Ingredient(quantity="3", unit="clove", item="garlic", notes="thinly sliced"),
                Ingredient(quantity="2", unit="tbsp", item="butter", notes=None),
            ],
            steps=[
                Step(text="Boil salted water and cook the spaghetti to al dente.", duration_seconds=480),
                Step(text="Melt butter with garlic over low heat.", duration_seconds=120),
                Step(text="Toss pasta with garlic butter and serve.", duration_seconds=60),
            ],
        )
        return StructureResult(recipe=recipe, model="fake-model", input_tokens=100, output_tokens=200)


@pytest_asyncio.fixture
async def client(monkeypatch) -> AsyncIterator[AsyncClient]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    db_module.engine = engine
    db_module.SessionLocal = SessionLocal

    async def fake_captions(url: str) -> str:
        return "fake transcript about garlic butter pasta"

    from app.services.llm.classifier import ClassifyResult
    from app.services.transcript.metadata import VideoMetadata

    async def fake_metadata(url: str) -> VideoMetadata:
        return VideoMetadata(
            title="Fake Pasta Video",
            description="A test recipe description.",
            duration_seconds=120.0,
        )

    async def fake_classify(transcript, settings):
        return ClassifyResult(
            is_recipe=True,
            reason="looks like a recipe",
            model="fake-classifier",
            input_tokens=50,
            output_tokens=10,
        )

    monkeypatch.setattr(
        "app.services.transcript.pipeline.fetch_captions", fake_captions
    )
    monkeypatch.setattr(
        "app.services.transcript.pipeline.fetch_metadata", fake_metadata
    )
    monkeypatch.setattr(
        "app.services.recipe_builder.get_llm_provider", lambda settings: FakeProvider()
    )
    monkeypatch.setattr(
        "app.services.transcript.pipeline.classify_recipe", fake_classify
    )

    async def override_get_db():
        async with SessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        app.state.job_runner = InlineJobRunner(get_settings())
        yield ac

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
def creds() -> dict[str, str]:
    return {"email": "cook@example.com", "password": "hunter2hunter2", "display_name": "Cook"}


@pytest_asyncio.fixture
async def auth_headers(client, creds) -> dict[str, str]:
    r = await client.post("/auth/register", json=creds)
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
