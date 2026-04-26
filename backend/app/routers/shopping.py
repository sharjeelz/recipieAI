import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DbSession
from app.models.recipe import Recipe, Visibility
from app.models.shopping import ShoppingListItem, normalize
from app.schemas.shopping import (
    AddItemIn,
    AddRecipeOut,
    ShoppingItemOut,
    UpdateItemIn,
)

router = APIRouter()


@router.get("", response_model=list[ShoppingItemOut])
async def list_items(user: CurrentUser, db: DbSession) -> list[ShoppingItemOut]:
    rows = (
        await db.execute(
            select(ShoppingListItem, Recipe.title)
            .outerjoin(Recipe, Recipe.id == ShoppingListItem.recipe_id)
            .where(ShoppingListItem.user_id == user.id)
            .order_by(
                ShoppingListItem.checked_at.is_not(None),
                ShoppingListItem.created_at.desc(),
            )
        )
    ).all()
    return [
        ShoppingItemOut(
            id=item.id,
            item=item.item,
            recipe_id=item.recipe_id,
            recipe_title=title,
            checked_at=item.checked_at,
            created_at=item.created_at,
        )
        for item, title in rows
    ]


@router.post("", response_model=ShoppingItemOut, status_code=status.HTTP_201_CREATED)
async def add_item(body: AddItemIn, user: CurrentUser, db: DbSession) -> ShoppingListItem:
    norm = normalize(body.item)
    existing = (
        await db.execute(
            select(ShoppingListItem).where(
                ShoppingListItem.user_id == user.id,
                ShoppingListItem.item_normalized == norm,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    row = ShoppingListItem(user_id=user.id, item=body.item.strip(), item_normalized=norm)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/from-recipe/{recipe_id}", response_model=AddRecipeOut)
async def add_from_recipe(
    recipe_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> AddRecipeOut:
    recipe = (
        await db.execute(
            select(Recipe)
            .where(Recipe.id == recipe_id)
            .options(selectinload(Recipe.ingredients))
        )
    ).scalar_one_or_none()
    if recipe is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")
    if recipe.visibility == Visibility.private and recipe.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipe not found")

    existing_norms = set(
        (
            await db.execute(
                select(ShoppingListItem.item_normalized).where(
                    ShoppingListItem.user_id == user.id
                )
            )
        ).scalars().all()
    )

    added = 0
    skipped = 0
    seen_in_batch: set[str] = set()
    for ing in recipe.ingredients:
        norm = normalize(ing.item)
        if not norm or norm in existing_norms or norm in seen_in_batch:
            skipped += 1
            continue
        seen_in_batch.add(norm)
        db.add(
            ShoppingListItem(
                user_id=user.id,
                item=ing.item.strip(),
                item_normalized=norm,
                recipe_id=recipe_id,
            )
        )
        added += 1

    if added:
        await db.commit()
    return AddRecipeOut(added=added, skipped=skipped)


@router.patch("/{item_id}", response_model=ShoppingItemOut)
async def update_item(
    item_id: uuid.UUID, body: UpdateItemIn, user: CurrentUser, db: DbSession
) -> ShoppingListItem:
    row = (
        await db.execute(
            select(ShoppingListItem).where(
                ShoppingListItem.id == item_id, ShoppingListItem.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")

    if body.item is not None:
        new_text = body.item.strip()
        if not new_text:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "item cannot be empty")
        new_norm = normalize(new_text)
        if new_norm != row.item_normalized:
            # guard against the unique (user_id, item_normalized) constraint —
            # if the user is renaming to something already on their list,
            # surface a friendly 409 instead of a raw IntegrityError.
            clash = (
                await db.execute(
                    select(ShoppingListItem).where(
                        ShoppingListItem.user_id == user.id,
                        ShoppingListItem.item_normalized == new_norm,
                        ShoppingListItem.id != item_id,
                    )
                )
            ).scalar_one_or_none()
            if clash is not None:
                raise HTTPException(
                    status.HTTP_409_CONFLICT, "already on your list"
                )
            row.item = new_text
            row.item_normalized = new_norm

    if body.checked is not None:
        row.checked_at = datetime.now(timezone.utc) if body.checked else None

    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    row = (
        await db.execute(
            select(ShoppingListItem).where(
                ShoppingListItem.id == item_id, ShoppingListItem.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "item not found")
    await db.delete(row)
    await db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_list(user: CurrentUser, db: DbSession) -> None:
    await db.execute(
        delete(ShoppingListItem).where(ShoppingListItem.user_id == user.id)
    )
    await db.commit()


@router.delete("/checked/all", status_code=status.HTTP_204_NO_CONTENT)
async def clear_checked(user: CurrentUser, db: DbSession) -> None:
    await db.execute(
        delete(ShoppingListItem).where(
            ShoppingListItem.user_id == user.id,
            ShoppingListItem.checked_at.is_not(None),
        )
    )
    await db.commit()
