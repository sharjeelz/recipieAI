import json

from app.services.llm.base import StructuredRecipe, StructureResult
from app.services.llm.prompt import RECIPE_SCHEMA, SYSTEM, USER_TEMPLATE


class OpenAIProvider:
    name = "openai"

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
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)
        user = USER_TEMPLATE.format(
            url=source_url,
            title=title or "(not available)",
            description=description or "(not available)",
            transcript_source=transcript_source,
            transcript=transcript,
        )
        resp = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": user},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "recipe",
                    "schema": RECIPE_SCHEMA,
                    "strict": True,
                },
            },
        )
        content = resp.choices[0].message.content or "{}"
        usage = resp.usage
        return StructureResult(
            recipe=StructuredRecipe.model_validate(json.loads(content)),
            model=self.model,
            input_tokens=getattr(usage, "prompt_tokens", 0) or 0,
            output_tokens=getattr(usage, "completion_tokens", 0) or 0,
        )
