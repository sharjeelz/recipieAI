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
"""
from __future__ import annotations

import os
from typing import Any


# Player clients to try, in order. yt-dlp will fall back through them if
# the first one fails. `tv_embedded` and `mweb` typically work without
# auth even on data-center IPs.
DEFAULT_PLAYER_CLIENTS = ["tv_embedded", "mweb", "web"]


def build_opts(*, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {
            "youtube": {"player_client": DEFAULT_PLAYER_CLIENTS},
        },
    }

    cookies = os.environ.get("YT_DLP_COOKIES_FILE", "").strip()
    if cookies and os.path.exists(cookies):
        opts["cookiefile"] = cookies

    if extra:
        opts.update(extra)
    return opts
