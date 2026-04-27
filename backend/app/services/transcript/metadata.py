"""Cheap YouTube metadata fetch (no audio download)."""

import asyncio
from dataclasses import dataclass


@dataclass
class VideoMetadata:
    title: str | None
    description: str | None
    duration_seconds: float | None
    thumbnail_url: str | None = None


def _pick_thumbnail(info: dict) -> str | None:
    """yt-dlp returns either a single 'thumbnail' URL or a 'thumbnails' list
    sorted by preference. We prefer the largest sane one (most platforms cap
    at ~1280px wide; anything larger tends to be a synthetic upscale)."""
    thumbs = info.get("thumbnails")
    if isinstance(thumbs, list) and thumbs:
        # Filter to entries with a width and pick the biggest one ≤ 1920
        sized = [
            t
            for t in thumbs
            if isinstance(t, dict)
            and isinstance(t.get("url"), str)
            and isinstance(t.get("width"), int)
        ]
        if sized:
            sized.sort(key=lambda t: t["width"], reverse=True)
            for t in sized:
                if t["width"] <= 1920:
                    return t["url"]
            return sized[-1]["url"]
        # No widths — last entry is usually the largest in yt-dlp's order
        for t in reversed(thumbs):
            if isinstance(t, dict) and isinstance(t.get("url"), str):
                return t["url"]
    single = info.get("thumbnail")
    if isinstance(single, str) and single:
        return single
    return None


def _fetch_sync(video_url: str) -> VideoMetadata:
    try:
        import yt_dlp
    except ImportError:
        return VideoMetadata(None, None, None)

    from app.services.transcript.ytdlp_opts import build_opts

    opts = build_opts(extra={"skip_download": True})
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
        thumbnail_url=_pick_thumbnail(info),
    )


async def fetch_metadata(video_url: str) -> VideoMetadata:
    return await asyncio.to_thread(_fetch_sync, video_url)
