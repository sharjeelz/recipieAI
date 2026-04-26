import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ShoppingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    item: str
    recipe_id: uuid.UUID | None = None
    recipe_title: str | None = None
    checked_at: datetime | None = None
    created_at: datetime


class AddItemIn(BaseModel):
    item: str = Field(min_length=1, max_length=255)


class UpdateItemIn(BaseModel):
    """PATCH body for a shopping list item. Either or both fields may be set."""

    checked: bool | None = None
    item: str | None = Field(default=None, min_length=1, max_length=255)


# kept as an alias so any old import sites still work
ToggleItemIn = UpdateItemIn


class AddRecipeOut(BaseModel):
    added: int
    skipped: int
