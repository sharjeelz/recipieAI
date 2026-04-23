from dataclasses import dataclass
from typing import Literal

from app.config import Settings
from app.services.llm.classifier import ClassifyResult, NotARecipeError, classify_recipe
from app.services.transcript.captions import fetch_captions
from app.services.transcript.metadata import fetch_metadata
from app.services.transcript.whisper import transcribe_with_whisper

TranscriptSource = Literal["captions", "description", "whisper"]

# Descriptions shorter than this are assumed to be promotional fluff and skipped
# before we spend a classifier call on them.
MIN_DESCRIPTION_CHARS = 200

# Whisper output shorter than this is treated as failed transcription (silent /
# music-only video) — prevents hallucinated recipes from empty audio. Set low
# enough to let short TikToks through (15–30s clips can produce ~40 chars).
MIN_WHISPER_CHARS = 40


def _for_classifier(text: str, title: str | None) -> str:
    """Prepend the video title when classifying a candidate source. Gives the
    classifier context — e.g. a TikTok description of '#chicken #garlic' is
    ambiguous alone but obviously a recipe when paired with title 'Creamy
    Tuscan Chicken Recipe'."""
    if title:
        return f"Video title: {title}\n\nContent:\n{text}"
    return text


@dataclass
class TranscriptResult:
    text: str
    source: TranscriptSource
    duration_seconds: float | None
    title: str | None = None
    description: str | None = None
    # cumulative classifier cost across all sources we tried (includes the
    # accepted source itself). The final cost pill shows this + structuring.
    classify_model: str = ""
    classify_input_tokens: int = 0
    classify_output_tokens: int = 0


async def get_transcript(video_url: str, settings: Settings) -> TranscriptResult:
    """Try each candidate source (captions → description → whisper) and run the
    cheap classifier on each. Return the first one the classifier accepts as a
    cookable recipe. If none qualify, raise NotARecipeError carrying the
    cumulative classifier token usage so the caller can still bill the job."""
    meta = await fetch_metadata(video_url)

    classify_in = 0
    classify_out = 0
    classify_model = ""
    last: ClassifyResult | None = None

    def _result(text: str, source: TranscriptSource, duration: float | None) -> TranscriptResult:
        return TranscriptResult(
            text=text,
            source=source,
            duration_seconds=duration,
            title=meta.title,
            description=meta.description,
            classify_model=classify_model,
            classify_input_tokens=classify_in,
            classify_output_tokens=classify_out,
        )

    async def _try(text: str) -> ClassifyResult:
        nonlocal classify_in, classify_out, classify_model, last
        c = await classify_recipe(_for_classifier(text, meta.title), settings)
        classify_in += c.input_tokens
        classify_out += c.output_tokens
        classify_model = c.model
        last = c
        return c

    captions = await fetch_captions(video_url)
    if captions:
        c = await _try(captions)
        if c.is_recipe:
            return _result(captions, "captions", meta.duration_seconds)

    if meta.description and len(meta.description) >= MIN_DESCRIPTION_CHARS:
        c = await _try(meta.description)
        if c.is_recipe:
            return _result(meta.description, "description", meta.duration_seconds)

    # Only worth running Whisper if captions are missing. If captions were
    # present and rejected, the video probably isn't a recipe and Whisper would
    # just confirm it at $0.02+. Descriptions are often promotional fluff
    # unrelated to the video content, so we do fall through them.
    if not captions:
        whisper = await transcribe_with_whisper(video_url, settings)
        if len(whisper.text.strip()) >= MIN_WHISPER_CHARS:
            c = await _try(whisper.text)
            if c.is_recipe:
                return _result(
                    whisper.text,
                    "whisper",
                    whisper.duration_seconds or meta.duration_seconds,
                )

    reason = (
        last.reason
        if last and last.reason
        else "this video does not appear to be a cooking recipe"
    )
    raise NotARecipeError(
        reason,
        ClassifyResult(
            is_recipe=False,
            reason=reason,
            model=classify_model or "unknown",
            input_tokens=classify_in,
            output_tokens=classify_out,
        ),
    )
