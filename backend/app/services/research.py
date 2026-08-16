"""YouTube search, so users can find a video without leaving the app.

We reuse the same yt-dlp options as the transcript pipeline (bot-check
bypass, optional cookies) but run a *flat* extraction: `ytsearchN:<query>`
with `extract_flat` returns the search result page entries only — no
per-video player request. That keeps a 12-result search to a single
round trip instead of 12 challenge-solving ones.
"""
from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass, asdict
from urllib.parse import parse_qs, urlparse

MAX_RESULTS = 24

# Paths that carry the video id as the last segment rather than as ?v=.
_PATH_ID_PREFIXES = ("/shorts/", "/embed/", "/v/", "/live/")
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def youtube_video_id(url: str | None) -> str | None:
    """Extract the 11-char video id from any of YouTube's URL shapes.

    Recipes store whatever URL the user pasted — watch?v=, youtu.be/,
    /shorts/, with or without playlist and tracking params. Comparing raw
    URLs would miss those, so we compare ids instead.
    """
    if not url:
        return None
    try:
        parsed = urlparse(url)
    except ValueError:
        return None

    host = (parsed.hostname or "").lower().removeprefix("www.")
    if host == "youtu.be":
        candidate = parsed.path.lstrip("/").split("/", 1)[0]
        return candidate if _VIDEO_ID_RE.match(candidate) else None

    if host not in {"youtube.com", "m.youtube.com", "music.youtube.com"}:
        return None

    if parsed.path == "/watch":
        values = parse_qs(parsed.query).get("v") or []
        candidate = values[0] if values else ""
        return candidate if _VIDEO_ID_RE.match(candidate) else None

    for prefix in _PATH_ID_PREFIXES:
        if parsed.path.startswith(prefix):
            candidate = parsed.path[len(prefix):].split("/", 1)[0]
            return candidate if _VIDEO_ID_RE.match(candidate) else None

    return None


@dataclass
class SearchResult:
    video_id: str
    url: str
    title: str | None
    channel: str | None
    duration_seconds: float | None
    thumbnail_url: str | None
    view_count: int | None

    def as_dict(self) -> dict:
        return asdict(self)


def _pick_thumbnail(entry: dict) -> str | None:
    thumbs = entry.get("thumbnails")
    if isinstance(thumbs, list):
        sized = [
            t for t in thumbs
            if isinstance(t, dict) and isinstance(t.get("url"), str) and isinstance(t.get("width"), int)
        ]
        if sized:
            sized.sort(key=lambda t: t["width"], reverse=True)
            for t in sized:
                if t["width"] <= 1280:
                    return t["url"]
            return sized[-1]["url"]
        for t in reversed(thumbs):
            if isinstance(t, dict) and isinstance(t.get("url"), str):
                return t["url"]
    single = entry.get("thumbnail")
    return single if isinstance(single, str) and single else None


def _to_result(entry: dict) -> SearchResult | None:
    video_id = entry.get("id")
    if not isinstance(video_id, str) or not video_id:
        return None
    url = entry.get("url") or entry.get("webpage_url")
    if not isinstance(url, str) or not url.startswith("http"):
        url = f"https://www.youtube.com/watch?v={video_id}"
    duration = entry.get("duration")
    views = entry.get("view_count")
    title = entry.get("title")
    channel = entry.get("channel") or entry.get("uploader")
    return SearchResult(
        video_id=video_id,
        url=url,
        title=title if isinstance(title, str) else None,
        channel=channel if isinstance(channel, str) else None,
        duration_seconds=float(duration) if isinstance(duration, (int, float)) else None,
        thumbnail_url=_pick_thumbnail(entry),
        view_count=int(views) if isinstance(views, (int, float)) else None,
    )


def _search_sync(query: str, limit: int) -> list[SearchResult]:
    try:
        import yt_dlp
    except ImportError:
        return []

    from app.services.transcript.ytdlp_opts import build_opts

    opts = build_opts(extra={"skip_download": True, "extract_flat": True})
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
    except Exception:
        return []

    entries = info.get("entries") if isinstance(info, dict) else None
    if not isinstance(entries, list):
        return []

    out: list[SearchResult] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        r = _to_result(entry)
        if r is not None:
            out.append(r)
    return out


async def search_youtube(query: str, limit: int = 12) -> list[SearchResult]:
    limit = max(1, min(limit, MAX_RESULTS))
    return await asyncio.to_thread(_search_sync, query, limit)
