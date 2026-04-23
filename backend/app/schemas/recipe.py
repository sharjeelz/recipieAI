import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.models.recipe import Visibility


class IngredientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    position: int
    quantity: str | None
    unit: str | None
    item: str
    notes: str | None


class StepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    position: int
    text: str
    duration_seconds: int | None


class RecipeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID | None
    source_url: str
    title: str
    summary: str | None
    servings: int | None
    total_time_min: int | None
    cuisine: str | None
    visibility: Visibility
    llm_provider: str | None
    llm_model: str | None = None
    llm_input_tokens: int | None = None
    llm_output_tokens: int | None = None
    transcribe_seconds: float | None = None
    cost_usd: float | None = None
    ingredients: list[IngredientOut]
    steps: list[StepOut]
    tips: list[str] | None = None
    available_translations: list[str] = []
    created_at: datetime
    updated_at: datetime


class RecipeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    summary: str | None
    total_time_min: int | None
    cuisine: str | None
    visibility: Visibility
    created_at: datetime


class RecipeCreate(BaseModel):
    url: HttpUrl
    visibility: Visibility = Visibility.private


class RecipePatch(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    summary: str | None = None
    servings: int | None = None
    total_time_min: int | None = None
    cuisine: str | None = Field(default=None, max_length=100)
    visibility: Visibility | None = None


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    recipe_id: uuid.UUID | None
    error: str | None
    llm_input_tokens: int | None = None
    llm_output_tokens: int | None = None
    transcribe_seconds: float | None = None
    cost_usd: float | None = None
    created_at: datetime
    updated_at: datetime


class CreateRecipeOut(BaseModel):
    job_id: uuid.UUID


class TranslateIn(BaseModel):
    language: str = Field(min_length=2, max_length=5)


class TranslationOut(BaseModel):
    language: str
    title: str
    summary: str | None = None
    servings: int | None = None
    total_time_min: int | None = None
    cuisine: str | None = None
    ingredients: list[IngredientOut]
    steps: list[StepOut]
    tips: list[str] | None = None
    cost_usd: float | None = None


class ShareOut(BaseModel):
    token: str
    url: str
