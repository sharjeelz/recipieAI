import json

from app.services.llm.base import StructuredRecipe, StructureResult
from app.services.llm.prompt import RECIPE_SCHEMA, SYSTEM, USER_TEMPLATE


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model

    async def structure_recipe(
        self,
        transcript: str,
        source_url: str,
        *,
        title: str | None = None,
        description: str | None = None,
        transcript_source: str = "transcript",
    ) -> StructureResult:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=self.api_key)
        tool = {
            "name": "emit_recipe",
            "description": "Emit the extracted structured recipe.",
            "input_schema": RECIPE_SCHEMA,
        }
        user = USER_TEMPLATE.format(
            url=source_url,
            title=title or "(not available)",
            description=description or "(not available)",
            transcript_source=transcript_source,
            transcript=transcript,
        )
        msg = await client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=SYSTEM,
            tools=[tool],
            tool_choice={"type": "tool", "name": "emit_recipe"},
            messages=[{"role": "user", "content": user}],
        )
        for block in msg.content:
            if getattr(block, "type", None) == "tool_use" and block.name == "emit_recipe":
                data = block.input if isinstance(block.input, dict) else json.loads(block.input)
                return StructureResult(
                    recipe=StructuredRecipe.model_validate(data),
                    model=self.model,
                    input_tokens=getattr(msg.usage, "input_tokens", 0) or 0,
                    output_tokens=getattr(msg.usage, "output_tokens", 0) or 0,
                )
        raise RuntimeError("anthropic response did not include the emit_recipe tool call")
