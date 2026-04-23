"""Translate a structured recipe into another language. Lazy + cached on the
DB side (see routers/recipes.py) — this module just does the LLM call."""

import json
from dataclasses import dataclass

from app.config import Settings
from app.services.llm.base import StructuredRecipe
from app.services.llm.prompt import RECIPE_SCHEMA

# Cheap-tier models — translation is straightforward, no need for Sonnet.
TRANSLATOR_MODELS = {
    "anthropic": "claude-haiku-4-5",
    "openai": "gpt-4o-mini",
}

LANGUAGES: dict[str, str] = {
    "ur": "Urdu (اردو)",
    "ar": "Arabic (العربية)",
}


def language_name(code: str) -> str:
    return LANGUAGES[code]


def is_supported(code: str) -> bool:
    return code in LANGUAGES


@dataclass
class TranslateResult:
    recipe: StructuredRecipe
    model: str
    input_tokens: int
    output_tokens: int


def _system(lang_name: str) -> str:
    return (
        f"You translate structured cooking recipes from English to {lang_name}. "
        "Output the translated recipe using the provided schema. Preserve the "
        "structure exactly — every ingredient and every step must appear in the "
        "same order, with the same field shape.\n\n"
        "Translate: title, summary, ingredient item names, ingredient notes, and "
        "step text. Use natural, everyday language that a home cook would speak.\n\n"
        "Do NOT translate: numeric quantities ('200', '1/2', '3'), common unit "
        "abbreviations (cup, tbsp, tsp, g, ml, oz, clove, pinch), or the cuisine "
        "label (keep it as a lowercase English word like 'italian')."
    )


def _user(recipe: StructuredRecipe, lang_name: str) -> str:
    return (
        f"Translate this recipe to {lang_name}. Return the translated recipe via "
        "the tool / JSON schema.\n\n"
        f"{json.dumps(recipe.model_dump(), ensure_ascii=False, indent=2)}"
    )


async def translate_recipe(
    recipe: StructuredRecipe, language: str, settings: Settings
) -> TranslateResult:
    if not is_supported(language):
        raise ValueError(f"unsupported language: {language}")

    lang_name = LANGUAGES[language]
    if settings.llm_provider == "anthropic":
        return await _anthropic(recipe, lang_name, settings)
    return await _openai(recipe, lang_name, settings)


async def _anthropic(
    recipe: StructuredRecipe, lang_name: str, settings: Settings
) -> TranslateResult:
    from anthropic import AsyncAnthropic

    model = TRANSLATOR_MODELS["anthropic"]
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    tool = {
        "name": "emit_recipe",
        "description": "Emit the translated recipe.",
        "input_schema": RECIPE_SCHEMA,
    }
    msg = await client.messages.create(
        model=model,
        max_tokens=4096,
        system=_system(lang_name),
        tools=[tool],
        tool_choice={"type": "tool", "name": "emit_recipe"},
        messages=[{"role": "user", "content": _user(recipe, lang_name)}],
    )
    for block in msg.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "emit_recipe":
            data = block.input if isinstance(block.input, dict) else json.loads(block.input)
            return TranslateResult(
                recipe=StructuredRecipe.model_validate(data),
                model=model,
                input_tokens=getattr(msg.usage, "input_tokens", 0) or 0,
                output_tokens=getattr(msg.usage, "output_tokens", 0) or 0,
            )
    raise RuntimeError("anthropic translator response missing emit_recipe tool call")


async def _openai(
    recipe: StructuredRecipe, lang_name: str, settings: Settings
) -> TranslateResult:
    from openai import AsyncOpenAI

    model = TRANSLATOR_MODELS["openai"]
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _system(lang_name)},
            {"role": "user", "content": _user(recipe, lang_name)},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "recipe", "schema": RECIPE_SCHEMA, "strict": True},
        },
    )
    data = json.loads(resp.choices[0].message.content or "{}")
    usage = resp.usage
    return TranslateResult(
        recipe=StructuredRecipe.model_validate(data),
        model=model,
        input_tokens=getattr(usage, "prompt_tokens", 0) or 0,
        output_tokens=getattr(usage, "completion_tokens", 0) or 0,
    )
