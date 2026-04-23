"""Cheap eligibility check before the full structuring call — rejects
non-recipe transcripts (news, vlogs, product reviews, etc.) so we don't waste
the expensive structuring model on them."""

import json
from dataclasses import dataclass

from app.config import Settings

CLASSIFIER_MODELS = {
    "anthropic": "claude-haiku-4-5",
    "openai": "gpt-4o-mini",
}

MAX_SNIPPET_CHARS = 2500

_SYSTEM = (
    "You decide whether a transcript is a cooking recipe that can be turned "
    "into a structured list of ingredients and steps. A cooking tutorial, "
    "recipe demo, or chef showing how to make a dish counts as a recipe. "
    "Product reviews, food vlogs with no instructions, restaurant visits, "
    "news, interviews, and anything that does not teach how to cook a dish "
    "do not count. Be strict — if you are unsure, say no."
)

_USER_TEMPLATE = (
    "Transcript (possibly truncated):\n\n{snippet}\n\n"
    "Respond by calling the provided tool / producing JSON with:\n"
    "  is_recipe: true if this is a cookable recipe, false otherwise\n"
    "  reason: one short sentence — if false, explain what it is instead"
)

_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["is_recipe", "reason"],
    "properties": {
        "is_recipe": {"type": "boolean"},
        "reason": {"type": "string"},
    },
}


@dataclass
class ClassifyResult:
    is_recipe: bool
    reason: str
    model: str
    input_tokens: int
    output_tokens: int


class NotARecipeError(Exception):
    def __init__(self, reason: str, classify: ClassifyResult) -> None:
        super().__init__(reason)
        self.reason = reason
        self.classify = classify


async def classify_recipe(transcript: str, settings: Settings) -> ClassifyResult:
    snippet = transcript[:MAX_SNIPPET_CHARS]
    if settings.llm_provider == "anthropic":
        return await _classify_anthropic(snippet, settings)
    return await _classify_openai(snippet, settings)


async def _classify_anthropic(snippet: str, settings: Settings) -> ClassifyResult:
    from anthropic import AsyncAnthropic

    model = CLASSIFIER_MODELS["anthropic"]
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    tool = {
        "name": "report",
        "description": "Report whether the transcript is a cooking recipe.",
        "input_schema": _SCHEMA,
    }
    msg = await client.messages.create(
        model=model,
        max_tokens=256,
        system=_SYSTEM,
        tools=[tool],
        tool_choice={"type": "tool", "name": "report"},
        messages=[{"role": "user", "content": _USER_TEMPLATE.format(snippet=snippet)}],
    )
    for block in msg.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "report":
            data = block.input if isinstance(block.input, dict) else json.loads(block.input)
            return ClassifyResult(
                is_recipe=bool(data.get("is_recipe")),
                reason=str(data.get("reason") or ""),
                model=model,
                input_tokens=getattr(msg.usage, "input_tokens", 0) or 0,
                output_tokens=getattr(msg.usage, "output_tokens", 0) or 0,
            )
    raise RuntimeError("anthropic classifier response did not include report tool call")


async def _classify_openai(snippet: str, settings: Settings) -> ClassifyResult:
    from openai import AsyncOpenAI

    model = CLASSIFIER_MODELS["openai"]
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": _USER_TEMPLATE.format(snippet=snippet)},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "classify", "schema": _SCHEMA, "strict": True},
        },
    )
    data = json.loads(resp.choices[0].message.content or "{}")
    usage = resp.usage
    return ClassifyResult(
        is_recipe=bool(data.get("is_recipe")),
        reason=str(data.get("reason") or ""),
        model=model,
        input_tokens=getattr(usage, "prompt_tokens", 0) or 0,
        output_tokens=getattr(usage, "completion_tokens", 0) or 0,
    )
