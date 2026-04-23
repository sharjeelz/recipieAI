# RecipyAI backend

FastAPI + async SQLAlchemy + ARQ (Redis) worker. Python 3.11+.

See the [top-level README](../README.md) for what the project does and how the pieces fit together.

## Run with Docker (recommended)

```bash
cp .env.example .env          # then set JWT_SECRET + your LLM API key(s)
docker compose up -d --build
docker compose exec api alembic upgrade head   # first time only
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Run without Docker

Requires local Postgres + Redis, or set `DATABASE_URL=sqlite+aiosqlite:///./dev.db` for the simplest dev setup (jobs will run inline — no worker needed).

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

If Redis is unreachable at startup, the API falls back to an `InlineJobRunner` and processes recipes in-request — good for local dev, not for prod.

## Migrations

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

In Docker: prefix with `docker compose exec api`.

## Tests

```bash
pytest
```

Uses SQLite in-memory and monkeypatches the transcript + LLM + classifier layers — no network or API keys needed.

## Layout

```
app/
  main.py                   FastAPI app + CORS + router wiring + lifespan (picks ArqJobRunner or InlineJobRunner)
  config.py                 pydantic-settings (reads .env)
  db.py                     async engine + SessionLocal + Base
  deps.py                   typed FastAPI deps (DbSession, SettingsDep, CurrentUser)
  security.py               bcrypt + JWT (access/refresh, token_version for revocation)
  routers/
    auth.py                 register, login, refresh, logout, me
    recipes.py              POST (enqueues job), GET /mine, CRUD, /share, /save
    jobs.py                 GET /jobs/:id (polled by frontend)
    shares.py               public GET /share/:token
  models/                   SQLAlchemy models
  schemas/                  Pydantic I/O schemas
  services/
    jobs.py                 process_job orchestration, InlineJobRunner + ArqJobRunner
    recipe_builder.py       transcript → classifier → structuring → cost aggregation
    recipe_store.py         persists StructuredRecipe + cost columns
    transcript/
      captions.py           YouTube captions via youtube-transcript-api
      metadata.py           yt-dlp info dict: title, description, duration
      pipeline.py           captions → description → whisper priority
      whisper.py            yt-dlp download + Whisper (OpenAI API or faster-whisper)
    llm/
      base.py               Ingredient/Step/StructuredRecipe Pydantic models, LLMProvider Protocol
      anthropic.py          AsyncAnthropic + tool_use (emit_recipe)
      openai.py             AsyncOpenAI + response_format=json_schema strict
      classifier.py         cheap Haiku / gpt-4o-mini eligibility check, NotARecipeError
      pricing.py            per-model $/M-tokens + Whisper $/second
      prompt.py             SYSTEM + USER_TEMPLATE + RECIPE_SCHEMA
      registry.py           get_llm_provider(settings) dispatch
  workers/tasks.py          ARQ task entrypoint
alembic/                    migrations
tests/                      pytest + httpx, SQLite in-memory
```

## Key design notes

- **Dialect-agnostic models.** `sa.Uuid` (not `postgresql.UUID`) so the same models work on Postgres (prod) and SQLite (tests).
- **Late-bound SessionLocal.** `app/services/jobs.py` uses `from app import db as db_module` then `db_module.SessionLocal(...)` — lets test fixtures swap the session factory.
- **Stateless JWT revocation.** `ver` claim in each token mirrors `users.token_version`. Logout bumps the version → invalidates all outstanding tokens without a deny-list table.
- **Two-tier LLM flow.** A cheap classifier call rejects non-recipe videos for ~$0.0001 before the expensive structuring call runs. The structuring prompt also receives the video title + description as ground truth so it doesn't follow Whisper hallucinations on music-only videos.
