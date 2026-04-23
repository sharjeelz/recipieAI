import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ShoppingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    item: str
    recipe_id: uuid.UUID | None = None
    checked_at: datetime | None = None
    created_at: datetime


class AddItemIn(BaseModel):
    item: str = Field(min_length=1, max_length=255)


class ToggleItemIn(BaseModel):
    checked: bool


class AddRecipeOut(BaseModel):
    added: int
    skipped: int
