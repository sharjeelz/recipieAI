from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel


class Ingredient(BaseModel):
    quantity: str | None = None
    unit: str | None = None
    item: str
    notes: str | None = None


class Step(BaseModel):
    text: str
    duration_seconds: int | None = None


class StructuredRecipe(BaseModel):
    title: str
    summary: str | None = None
    servings: int | None = None
    total_time_min: int | None = None
    cuisine: str | None = None
    ingredients: list[Ingredient]
    steps: list[Step]


@dataclass
class StructureResult:
    recipe: StructuredRecipe
    model: str
    input_tokens: int
    output_tokens: int


class LLMProvider(Protocol):
    name: str

    async def structure_recipe(
        self,
        transcript: str,
        source_url: str,
        *,
        title: str | None = None,
        description: str | None = None,
        transcript_source: str = "transcript",
    ) -> StructureResult: ...
