import asyncio
import re

_YT_ID = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)

_BRACKET_MARKER = re.compile(r"\[[^\]]*\]")  # [Music], [Applause], [Foreign], ...

# Below this many non-marker chars, treat the captions as empty (music-only
# videos often produce transcripts that are 99% "[Music]").
MIN_CAPTION_CONTENT_CHARS = 50


def extract_video_id(url: str) -> str | None:
    m = _YT_ID.search(url)
    return m.group(1) if m else None


def _strip_markers(text: str) -> str:
    return _BRACKET_MARKER.sub("", text).strip()


def _fetch_sync(video_id: str) -> str | None:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import (
            NoTranscriptFound,
            TranscriptsDisabled,
            VideoUnavailable,
        )
    except Exception:
        return None

    try:
        entries = YouTubeTranscriptApi.get_transcript(video_id)
    except (NoTranscriptFound, TranscriptsDisabled, VideoUnavailable):
        return None
    except Exception:
        return None

    text = " ".join(e["text"] for e in entries if e.get("text"))
    if len(_strip_markers(text)) < MIN_CAPTION_CONTENT_CHARS:
        return None
    return text


async def fetch_captions(video_url: str) -> str | None:
    video_id = extract_video_id(video_url)
    if not video_id:
        return None
    return await asyncio.to_thread(_fetch_sync, video_id)
