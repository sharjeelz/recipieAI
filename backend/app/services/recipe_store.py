import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.recipe import Ingredient, Recipe, Step, Visibility
from app.services.llm.base import StructuredRecipe


async def persist_recipe(
    db: AsyncSession,
    *,
    source_url: str,
    owner_id: uuid.UUID | None,
    visibility: Visibility,
    llm_provider: str,
    llm_model: str | None,
    input_tokens: int | None,
    output_tokens: int | None,
    transcribe_seconds: float | None,
    cost_usd: float | None,
    structured: StructuredRecipe,
) -> Recipe:
    recipe = Recipe(
        owner_id=owner_id,
        source_url=source_url,
        title=structured.title,
        summary=structured.summary,
        servings=structured.servings,
        total_time_min=structured.total_time_min,
        cuisine=structured.cuisine,
        kcal_per_serving=structured.kcal_per_serving,
        tips=structured.tips or None,
        visibility=visibility,
        llm_provider=llm_provider,
        llm_model=llm_model,
        llm_input_tokens=input_tokens,
        llm_output_tokens=output_tokens,
        transcribe_seconds=transcribe_seconds,
        cost_usd=cost_usd,
    )
    for i, ing in enumerate(structured.ingredients):
        recipe.ingredients.append(
            Ingredient(
                position=i,
                quantity=ing.quantity,
                unit=ing.unit,
                item=ing.item,
                notes=ing.notes,
            )
        )
    for i, s in enumerate(structured.steps):
        recipe.steps.append(Step(position=i, text=s.text, duration_seconds=s.duration_seconds))
    db.add(recipe)
    await db.commit()
    await db.refresh(recipe)
    return recipe
