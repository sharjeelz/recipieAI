"""Per-model USD pricing, expressed in dollars per million tokens (LLMs) or per
second of audio (Whisper). Update when vendor pricing changes."""

from __future__ import annotations

# USD per 1M tokens (input, output)
_LLM_PRICES: dict[str, tuple[float, float]] = {
    # Anthropic
    "claude-opus-4-7": (15.0, 75.0),
    "claude-opus-4-6": (15.0, 75.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-sonnet-4-5": (3.0, 15.0),
    "claude-haiku-4-5": (1.0, 5.0),
    # OpenAI
    "gpt-4o": (2.5, 10.0),
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4.1": (2.0, 8.0),
    "gpt-4.1-mini": (0.40, 1.60),
}

# USD per audio second
_WHISPER_API_USD_PER_SECOND = 0.006 / 60.0  # $0.006 / minute


def llm_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """Cost in USD for an LLM call. Returns 0 for unknown models."""
    price = _LLM_PRICES.get(model)
    if price is None:
        return 0.0
    in_rate, out_rate = price
    return (input_tokens * in_rate + output_tokens * out_rate) / 1_000_000.0


def whisper_cost_usd(seconds: float | None) -> float:
    if seconds is None:
        return 0.0
    return seconds * _WHISPER_API_USD_PER_SECOND
