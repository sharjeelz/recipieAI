from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.deps import CurrentUser
from app.services.research import MAX_RESULTS, search_youtube

router = APIRouter()


@router.get("/search")
async def search(
    user: CurrentUser,
    q: Annotated[str, Query(min_length=2, max_length=200)],
    limit: Annotated[int, Query(ge=1, le=MAX_RESULTS)] = 12,
) -> dict:
    query = q.strip()
    if not query:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "empty query")
    results = await search_youtube(query, limit)
    return {"query": query, "results": [r.as_dict() for r in results]}
