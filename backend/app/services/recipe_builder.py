from dataclasses import dataclass

from app.config import Settings
from app.services.llm.base import StructuredRecipe
from app.services.llm.classifier import NotARecipeError, classify_recipe
from app.services.llm.pricing import llm_cost_usd, whisper_cost_usd
from app.services.llm.registry import get_llm_provider
from app.services.transcript.pipeline import TranscriptSource, get_transcript


@dataclass
class BuildResult:
    recipe: StructuredRecipe
    transcript_source: TranscriptSource
    llm_provider: str
    llm_model: str
    input_tokens: int
    output_tokens: int
    transcribe_seconds: float | None
    cost_usd: float


async def build_recipe(video_url: str, settings: Settings) -> BuildResult:
    transcript = await get_transcript(video_url, settings)

    transcribe_usd = (
        whisper_cost_usd(transcript.duration_seconds)
        if transcript.source == "whisper" and settings.whisper_backend == "openai"
        else 0.0
    )

    classification = await classify_recipe(transcript.text, settings)
    classify_usd = llm_cost_usd(
        classification.model, classification.input_tokens, classification.output_tokens
    )

    if not classification.is_recipe:
        raise NotARecipeError(
            classification.reason or "this video does not look like a cooking recipe",
            classification,
        )

    provider = get_llm_provider(settings)
    result = await provider.structure_recipe(
        transcript.text,
        video_url,
        title=transcript.title,
        description=transcript.description,
        transcript_source=transcript.source,
    )
    structure_usd = llm_cost_usd(result.model, result.input_tokens, result.output_tokens)

    return BuildResult(
        recipe=result.recipe,
        transcript_source=transcript.source,
        llm_provider=provider.name,
        llm_model=result.model,
        input_tokens=classification.input_tokens + result.input_tokens,
        output_tokens=classification.output_tokens + result.output_tokens,
        transcribe_seconds=transcript.duration_seconds,
        cost_usd=round(classify_usd + structure_usd + transcribe_usd, 6),
    )
