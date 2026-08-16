from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models.recipe import Recipe
from app.services.research import MAX_RESULTS, search_youtube, youtube_video_id

router = APIRouter()


async def _existing_by_video_id(db, user_id) -> dict[str, str]:
    """Map video id -> recipe id for everything this user has already
    extracted, so the UI can mark results instead of re-scraping them."""
    rows = (
        await db.execute(
            select(Recipe.id, Recipe.source_url).where(Recipe.owner_id == user_id)
        )
    ).all()
    out: dict[str, str] = {}
    for recipe_id, source_url in rows:
        vid = youtube_video_id(source_url)
        # First writer wins — if the same video was extracted twice, link the
        # older recipe rather than flip-flopping between duplicates.
        if vid and vid not in out:
            out[vid] = str(recipe_id)
    return out


@router.get("/search")
async def search(
    user: CurrentUser,
    db: DbSession,
    q: Annotated[str, Query(min_length=2, max_length=200)],
    limit: Annotated[int, Query(ge=1, le=MAX_RESULTS)] = 12,
) -> dict:
    query = q.strip()
    if not query:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "empty query")

    results = await search_youtube(query, limit)
    existing = await _existing_by_video_id(db, user.id)

    payload = []
    for r in results:
        item = r.as_dict()
        item["existing_recipe_id"] = existing.get(r.video_id)
        payload.append(item)

    return {"query": query, "results": payload}
