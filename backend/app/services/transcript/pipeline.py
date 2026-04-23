from dataclasses import dataclass
from typing import Literal

from app.config import Settings
from app.services.transcript.captions import fetch_captions
from app.services.transcript.metadata import fetch_metadata
from app.services.transcript.whisper import transcribe_with_whisper

TranscriptSource = Literal["captions", "description", "whisper"]

# Below this, a description is treated as promotional fluff and we fall through
# to Whisper. Most real recipe descriptions run several hundred chars.
MIN_DESCRIPTION_CHARS = 200

# Below this, Whisper output is treated as a failed transcription (music-only
# video, etc.) — prevents hallucinated recipes from silent clips.
MIN_WHISPER_CHARS = 100


@dataclass
class TranscriptResult:
    text: str
    source: TranscriptSource
    duration_seconds: float | None
    title: str | None = None
    description: str | None = None


class TranscriptUnavailableError(Exception):
    """Raised when no usable transcript source is available for a video."""


async def get_transcript(video_url: str, settings: Settings) -> TranscriptResult:
    meta = await fetch_metadata(video_url)

    captions = await fetch_captions(video_url)
    if captions:
        return TranscriptResult(
            text=captions,
            source="captions",
            duration_seconds=meta.duration_seconds,
            title=meta.title,
            description=meta.description,
        )

    if meta.description and len(meta.description) >= MIN_DESCRIPTION_CHARS:
        return TranscriptResult(
            text=meta.description,
            source="description",
            duration_seconds=meta.duration_seconds,
            title=meta.title,
            description=meta.description,
        )

    result = await transcribe_with_whisper(video_url, settings)
    if len(result.text.strip()) < MIN_WHISPER_CHARS:
        raise TranscriptUnavailableError(
            "This video has no captions, no description, and no clear narration. "
            "Try a video with a voice-over or a detailed description."
        )

    return TranscriptResult(
        text=result.text,
        source="whisper",
        duration_seconds=result.duration_seconds or meta.duration_seconds,
        title=meta.title,
        description=meta.description,
    )
