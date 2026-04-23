import asyncio
import re

_YT_ID = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)


def extract_video_id(url: str) -> str | None:
    m = _YT_ID.search(url)
    return m.group(1) if m else None


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

    return " ".join(e["text"] for e in entries if e.get("text"))


async def fetch_captions(video_url: str) -> str | None:
    video_id = extract_video_id(video_url)
    if not video_id:
        return None
    return await asyncio.to_thread(_fetch_sync, video_id)
