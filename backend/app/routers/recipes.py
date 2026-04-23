import secrets
import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DbSession, SettingsDep
from app.models.job import Job, JobStatus
from app.models.recipe import Recipe, RecipeTranslation, SavedRecipe, ShareToken, Visibility
from app.schemas.recipe import (
    CreateRecipeOut,
    RecipeCreate,
    RecipeOut,
    RecipePatch,
    RecipeSummary,
    ShareOut,
    TranslateIn,
    TranslationOut,
)
from app.services.llm import translator as translator_mod
from app.services.llm.pricing import llm_cost_usd

router = APIRouter()


async def _load_recipe(db, recipe_id: uuid.UUID) -> Recipe | None:
    return (
        await db.execute(
            select(Recipe)
            .where(Recipe.id == recipe_id)
            .options(selectinload(Recipe.ingredients), selectinload(Recipe.steps))
        )
    ).scalar_one_or_none()


def _can_view(recipe: Recipe, user_id: uuid.UUID | None) -> bool:
    if recipe.visibility != Visibility.private:
        return True
    return user_id is not None and recipe.owner_id == user_id


@router.post("", response_model=CreateRecipeOut, status_code=status.HTTP_202_ACCEPTED)
async def create_recipe(
    body: RecipeCreate,
    user: CurrentUser,
    db: DbSession,
    request: Request,
) -> CreateRecipeOut:
    job = Job(user_id=user.id, source_url=str(body.url), status=JobStatus.queued)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    runner = request.app.state.job_runner
    await runner.enqueue(job.id, str(body.url))
    return CreateRecipeOut(job_id=job.id)


@router.get("/mine", response_model=list[RecipeSummary])
async def list_mine(user: CurrentUser, db: DbSession) -> list[Recipe]:
    rows = (
        await db.execute(
            select(Recipe).where(Recipe.owner_id == user.id).order_by(Recipe.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


@router.get("/{recipe_id}", response_model=RecipeOut)
async def get_recipe(
    recipe_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> RecipeOut:
    recipe = await _load_recipe(db, recipe_id)
    if recipe is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")
    if not _can_view(recipe, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")
    langs = (
        await db.execute(
            select(RecipeTranslation.language).where(RecipeTranslation.recipe_id == recipe_id)
        )
    ).scalars().all()
    out = RecipeOut.model_validate(recipe)
    out.available_translations = list(langs)
    return out


@router.patch("/{recipe_id}", response_model=RecipeOut)
async def update_recipe(
    recipe_id: uuid.UUID, body: RecipePatch, user: CurrentUser, db: DbSession
) -> Recipe:
    recipe = await _load_recipe(db, recipe_id)
    if recipe is None or recipe.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(recipe, field, value)
    await db.commit()
    await db.refresh(recipe)
    return recipe


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(recipe_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    recipe = (
        await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    ).scalar_one_or_none()
    if recipe is None or recipe.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")
    await db.delete(recipe)
    await db.commit()


@router.post("/{recipe_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def save_recipe(recipe_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    recipe = (
        await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    ).scalar_one_or_none()
    if recipe is None or not _can_view(recipe, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")
    existing = (
        await db.execute(
            select(SavedRecipe).where(
                SavedRecipe.user_id == user.id, SavedRecipe.recipe_id == recipe_id
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return
    db.add(SavedRecipe(user_id=user.id, recipe_id=recipe_id))
    await db.commit()


@router.post("/{recipe_id}/translate", response_model=TranslationOut)
async def translate_recipe_endpoint(
    recipe_id: uuid.UUID,
    body: TranslateIn,
    user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
) -> TranslationOut:
    if not translator_mod.is_supported(body.language):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"unsupported language '{body.language}'",
        )

    recipe = await _load_recipe(db, recipe_id)
    if recipe is None or not _can_view(recipe, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")

    existing = (
        await db.execute(
            select(RecipeTranslation).where(
                RecipeTranslation.recipe_id == recipe_id,
                RecipeTranslation.language == body.language,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return _translation_to_out(existing)

    from app.services.llm.base import Ingredient as LlmIngredient
    from app.services.llm.base import Step as LlmStep
    from app.services.llm.base import StructuredRecipe

    source = StructuredRecipe(
        title=recipe.title,
        summary=recipe.summary,
        servings=recipe.servings,
        total_time_min=recipe.total_time_min,
        cuisine=recipe.cuisine,
        ingredients=[
            LlmIngredient(quantity=i.quantity, unit=i.unit, item=i.item, notes=i.notes)
            for i in recipe.ingredients
        ],
        steps=[
            LlmStep(text=s.text, duration_seconds=s.duration_seconds) for s in recipe.steps
        ],
    )
    result = await translator_mod.translate_recipe(source, body.language, settings)
    cost = round(llm_cost_usd(result.model, result.input_tokens, result.output_tokens), 6)

    row = RecipeTranslation(
        recipe_id=recipe_id,
        language=body.language,
        payload=result.recipe.model_dump(),
        llm_model=result.model,
        llm_input_tokens=result.input_tokens,
        llm_output_tokens=result.output_tokens,
        cost_usd=cost,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _translation_to_out(row)


def _translation_to_out(row: RecipeTranslation) -> TranslationOut:
    payload = row.payload or {}
    ingredients = payload.get("ingredients") or []
    steps = payload.get("steps") or []
    return TranslationOut(
        language=row.language,
        title=payload.get("title") or "",
        summary=payload.get("summary"),
        servings=payload.get("servings"),
        total_time_min=payload.get("total_time_min"),
        cuisine=payload.get("cuisine"),
        ingredients=[
            {
                "position": i,
                "quantity": ing.get("quantity"),
                "unit": ing.get("unit"),
                "item": ing.get("item") or "",
                "notes": ing.get("notes"),
            }
            for i, ing in enumerate(ingredients)
        ],
        steps=[
            {
                "position": i,
                "text": s.get("text") or "",
                "duration_seconds": s.get("duration_seconds"),
            }
            for i, s in enumerate(steps)
        ],
        cost_usd=row.cost_usd,
    )


@router.post("/{recipe_id}/share", response_model=ShareOut)
async def share_recipe(recipe_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ShareOut:
    recipe = (
        await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    ).scalar_one_or_none()
    if recipe is None or recipe.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")
    token = secrets.token_urlsafe(24)
    db.add(ShareToken(token=token, recipe_id=recipe_id))
    await db.commit()
    return ShareOut(token=token, url=f"/share/{token}")
