"""Shared yt-dlp option builder.

Consolidates the anti-bot workarounds in one place so metadata fetch and
audio download stay in sync.

YouTube has been increasingly aggressive about flagging requests from
data-center IPs (AWS, GCP, etc.) with "Sign in to confirm you're not a
bot." Two layers of defense:

1. Use alternate `player_client` extractors that aren't subject to the
   same throttling as the default `web` client. `tv_embedded` and
   `mweb` are the most reliable as of mid-2025.
2. If that's not enough, mount a Netscape-format cookies file from a
   logged-in browser and point YT_DLP_COOKIES_FILE at it.

IMPORTANT: yt-dlp writes the cookie jar back to disk at exit (it
refreshes session tokens). If you point it at the source file, it
overwrites your hand-exported cookies with its own (often-empty) jar.
We avoid that by copying the source to a per-process scratch path
under /tmp on every call, and pointing yt-dlp at the scratch copy.
The source file on disk stays pristine and can be safely mounted :ro.
"""
from __future__ import annotations

import os
import shutil
import tempfile
from typing import Any


# Player clients to try, in order. yt-dlp will fall back through them if
# the first one fails. `tv_embedded` and `mweb` typically work without
# auth even on data-center IPs.
DEFAULT_PLAYER_CLIENTS = ["tv_embedded", "mweb", "web"]


def _scratch_cookie_copy(source: str) -> str | None:
    """Copy the source cookies to /tmp so yt-dlp can read+write freely
    without touching the original. Returns the scratch path, or None if
    the copy failed."""
    try:
        # Stable per-pid path — workers are single-process so no race; the
        # file gets overwritten on each call rather than leaked.
        scratch = os.path.join(tempfile.gettempdir(), f"ytdlp_cookies_{os.getpid()}.txt")
        shutil.copyfile(source, scratch)
        return scratch
    except OSError:
        return None


def build_opts(*, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {
            "youtube": {"player_client": DEFAULT_PLAYER_CLIENTS},
        },
    }

    source = os.environ.get("YT_DLP_COOKIES_FILE", "").strip()
    if source and os.path.exists(source):
        scratch = _scratch_cookie_copy(source)
        if scratch is not None:
            opts["cookiefile"] = scratch

    if extra:
        opts.update(extra)
    return opts
