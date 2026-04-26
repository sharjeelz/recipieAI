from dataclasses import dataclass

from app.config import Settings
from app.services.llm.base import StructuredRecipe
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
    thumbnail_url: str | None = None


async def build_recipe(video_url: str, settings: Settings) -> BuildResult:
    # get_transcript runs the eligibility classifier on each candidate source
    # and only returns a transcript the classifier accepts as a cooking recipe.
    # If no source qualifies, it raises NotARecipeError.
    transcript = await get_transcript(video_url, settings)

    classify_usd = llm_cost_usd(
        transcript.classify_model,
        transcript.classify_input_tokens,
        transcript.classify_output_tokens,
    )
    transcribe_usd = (
        whisper_cost_usd(transcript.duration_seconds)
        if transcript.source == "whisper" and settings.whisper_backend == "openai"
        else 0.0
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
        input_tokens=transcript.classify_input_tokens + result.input_tokens,
        output_tokens=transcript.classify_output_tokens + result.output_tokens,
        transcribe_seconds=transcript.duration_seconds,
        cost_usd=round(classify_usd + structure_usd + transcribe_usd, 6),
        thumbnail_url=transcript.thumbnail_url,
    )
