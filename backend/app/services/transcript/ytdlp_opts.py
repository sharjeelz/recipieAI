"""Shared yt-dlp option builder.

YouTube has rolled out two anti-bot mechanisms that affect us:

1. The default `web` player client is challenged with "Sign in to
   confirm you're not a bot" even from residential IPs. We work around
   this by overriding `player_client` to `mweb` first, then `web` as
   fallback. `mweb` uses a different auth path that's challenged less
   aggressively. We deliberately exclude `tv_embedded` — it bypasses
   the bot check too, but its manifest typically only carries DRM/
   merged-only formats that don't satisfy our format selector.

2. Most modern formats now require a GVS PO Token AND solving a
   per-page JS challenge (n-sig). Without both, yt-dlp drops every
   playable format and only storyboard images remain — which surfaces
   as "Requested format is not available." We don't have a PO Token
   provider, but `remote_components=['ejs:github']` lets yt-dlp pull
   the EJS challenge-solver script from GitHub on first use, run it
   under the deno runtime baked into the image, and recover the
   legacy progressive format 18 (360p combined MP4). That's enough
   for whisper — FFmpegExtractAudio strips the audio out anyway.

3. Optional cookies file as an escape hatch: set YT_DLP_COOKIES_FILE
   to a Netscape-format export from a logged-in browser. No-op when
   unset.

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


# `mweb` is the bot-check bypass that still returns audio-only formats.
# `web` is the last-ditch fallback if YouTube changes mweb's manifest.
DEFAULT_PLAYER_CLIENTS = ["mweb", "web"]


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
        "remote_components": ["ejs:github"],
    }

    source = os.environ.get("YT_DLP_COOKIES_FILE", "").strip()
    if source and os.path.exists(source):
        scratch = _scratch_cookie_copy(source)
        if scratch is not None:
            opts["cookiefile"] = scratch

    if extra:
        opts.update(extra)
    return opts
