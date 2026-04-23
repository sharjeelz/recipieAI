from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import DbSession
from app.models.recipe import Recipe, ShareToken
from app.schemas.recipe import RecipeOut

router = APIRouter()


@router.get("/{token}", response_model=RecipeOut)
async def read_share(token: str, db: DbSession) -> Recipe:
    share = (
        await db.execute(select(ShareToken).where(ShareToken.token == token))
    ).scalar_one_or_none()
    if share is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "share not found")

    recipe = (
        await db.execute(
            select(Recipe)
            .where(Recipe.id == share.recipe_id)
            .options(selectinload(Recipe.ingredients), selectinload(Recipe.steps))
        )
    ).scalar_one_or_none()
    if recipe is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")
    return recipe
