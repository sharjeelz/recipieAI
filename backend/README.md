# RecipyAI backend

FastAPI + Postgres + Redis + ARQ. Python 3.11+.

## Dev

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Local (no docker)

```bash
python -m venv .venv
source .venv/bin/activate   # on Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Migrations

```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

## Layout

```
app/
  main.py                # FastAPI app + CORS + router wiring
  config.py              # Pydantic Settings
  db.py                  # async SQLAlchemy engine/session
  deps.py                # shared FastAPI deps
  routers/               # auth, recipes, jobs, shares
  models/                # SQLAlchemy models
  schemas/               # Pydantic I/O schemas
  services/
    llm/                 # Anthropic + OpenAI adapters behind one Protocol
    transcript/          # captions → whisper fallback pipeline
    recipe_builder.py    # orchestrates transcript → LLM → persist
  workers/tasks.py       # ARQ background tasks
alembic/                 # migrations
tests/
```
