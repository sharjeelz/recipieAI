import secrets
import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DbSession, SettingsDep
from app.models.job import Job, JobStatus
from app.models.recipe import (
    Recipe,
    RecipeNote,
    RecipeTranslation,
    SavedRecipe,
    ShareToken,
    Visibility,
)
from app.models.user import User
from app.schemas.recipe import (
    CreateRecipeOut,
    DiscoverRecipe,
    NoteIn,
    NoteOut,
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


# NOTE: /public and /saved must be declared before /{recipe_id} — FastAPI
# matches routes in declaration order, and the parameterised route would
# otherwise swallow both and fail trying to parse them as a UUID.


@router.get("/public", response_model=list[DiscoverRecipe])
async def list_public(
    user: CurrentUser,
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 24,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[DiscoverRecipe]:
    stmt = (
        select(Recipe, User.display_name)
        .join(User, User.id == Recipe.owner_id, isouter=True)
        .where(Recipe.visibility == Visibility.public)
    )

    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Recipe.title.ilike(term), Recipe.cuisine.ilike(term))
        )

    stmt = stmt.order_by(Recipe.created_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).all()

    saved_ids = set(
        (
            await db.execute(
                select(SavedRecipe.recipe_id).where(SavedRecipe.user_id == user.id)
            )
        ).scalars().all()
    )

    out = []
    for recipe, author in rows:
        item = DiscoverRecipe.model_validate(recipe)
        item.author = author
        item.is_mine = recipe.owner_id == user.id
        item.saved = recipe.id in saved_ids
        out.append(item)
    return out


@router.get("/saved", response_model=list[DiscoverRecipe])
async def list_saved(user: CurrentUser, db: DbSession) -> list[DiscoverRecipe]:
    rows = (
        await db.execute(
            select(Recipe, User.display_name)
            .join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id)
            .join(User, User.id == Recipe.owner_id, isouter=True)
            .where(SavedRecipe.user_id == user.id)
            .order_by(SavedRecipe.saved_at.desc())
        )
    ).all()

    out = []
    for recipe, author in rows:
        # A recipe can be un-shared after you saved it; don't keep serving
        # something the owner has since made private.
        if recipe.visibility == Visibility.private and recipe.owner_id != user.id:
            continue
        item = DiscoverRecipe.model_validate(recipe)
        item.author = author
        item.is_mine = recipe.owner_id == user.id
        item.saved = True
        out.append(item)
    return out


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
    note_row = (
        await db.execute(
            select(RecipeNote.note).where(
                RecipeNote.user_id == user.id,
                RecipeNote.recipe_id == recipe_id,
            )
        )
    ).scalar_one_or_none()
    out = RecipeOut.model_validate(recipe)
    out.available_translations = list(langs)
    out.my_note = note_row
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


@router.delete("/{recipe_id}/save", status_code=status.HTTP_204_NO_CONTENT)
async def unsave_recipe(recipe_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    row = (
        await db.execute(
            select(SavedRecipe).where(
                SavedRecipe.user_id == user.id, SavedRecipe.recipe_id == recipe_id
            )
        )
    ).scalar_one_or_none()
    # Idempotent: unsaving something you never saved is a no-op, not a 404.
    if row is None:
        return
    await db.delete(row)
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
        kcal_per_serving=recipe.kcal_per_serving,
        ingredients=[
            LlmIngredient(quantity=i.quantity, unit=i.unit, item=i.item, notes=i.notes)
            for i in recipe.ingredients
        ],
        steps=[
            LlmStep(text=s.text, duration_seconds=s.duration_seconds) for s in recipe.steps
        ],
        tips=recipe.tips or [],
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
        kcal_per_serving=payload.get("kcal_per_serving"),
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
        tips=payload.get("tips") or None,
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


@router.put("/{recipe_id}/note", response_model=NoteOut)
async def upsert_note(
    recipe_id: uuid.UUID, body: NoteIn, user: CurrentUser, db: DbSession
) -> NoteOut:
    """Create/update the current user's note for this recipe. Empty string
    deletes the row so the column doesn't accumulate empties."""
    recipe = (
        await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    ).scalar_one_or_none()
    if recipe is None or not _can_view(recipe, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")

    existing = (
        await db.execute(
            select(RecipeNote).where(
                RecipeNote.user_id == user.id,
                RecipeNote.recipe_id == recipe_id,
            )
        )
    ).scalar_one_or_none()

    text = body.note.strip()

    if not text:
        if existing is not None:
            await db.delete(existing)
            await db.commit()
        from datetime import datetime, timezone
        return NoteOut(note="", updated_at=datetime.now(timezone.utc))

    if existing is None:
        existing = RecipeNote(user_id=user.id, recipe_id=recipe_id, note=text)
        db.add(existing)
    else:
        existing.note = text

    await db.commit()
    await db.refresh(existing)
    return NoteOut(note=existing.note, updated_at=existing.updated_at)
