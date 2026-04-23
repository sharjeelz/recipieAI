"""Cheap YouTube metadata fetch (no audio download)."""

import asyncio
from dataclasses import dataclass


@dataclass
class VideoMetadata:
    title: str | None
    description: str | None
    duration_seconds: float | None


def _fetch_sync(video_url: str) -> VideoMetadata:
    try:
        import yt_dlp
    except ImportError:
        return VideoMetadata(None, None, None)

    opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
    except Exception:
        return VideoMetadata(None, None, None)

    if not isinstance(info, dict):
        return VideoMetadata(None, None, None)

    duration = info.get("duration")
    return VideoMetadata(
        title=info.get("title"),
        description=info.get("description"),
        duration_seconds=float(duration) if isinstance(duration, (int, float)) else None,
    )


async def fetch_metadata(video_url: str) -> VideoMetadata:
    return await asyncio.to_thread(_fetch_sync, video_url)
