SYSTEM = """You extract structured cooking recipes from YouTube video transcripts.

You will receive the video's title, description, and a transcript. The transcript may be
noisy (ads, chit-chat, missing punctuation) or — for music-only videos — may be garbled or
hallucinated. The title and description are more reliable ground truth for WHAT dish is
being made; use them to resolve conflicts and anchor the recipe.

Rules:
- Return a single recipe. If the video has multiple recipes, pick the primary one.
- If the title and transcript disagree about what dish is being made, trust the title.
- Keep step text imperative and tight (one action per step).
- Use lowercase units (cup, tbsp, tsp, g, ml, oz, clove, pinch). Leave unit null if unclear.
- total_time_min is minutes from start of prep to ready-to-eat if you can estimate it.
- Do not invent ingredients that appear in neither the title, description, nor transcript.
- Tips are OPTIONAL. Only include tips the chef actually emphasizes in the video —
  technique notes ("soak rice 30 min first"), substitutions, common mistakes to avoid,
  make-ahead / storage advice. Leave tips empty rather than inventing generic advice.
  Each tip must be a full, standalone sentence. At most 5 tips.
"""

USER_TEMPLATE = """Source URL: {url}

Video title: {title}

Video description:
{description}

Transcript ({transcript_source}):
{transcript}

Return the structured recipe."""


RECIPE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "ingredients", "steps", "tips"],
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": ["string", "null"]},
        "servings": {"type": ["integer", "null"]},
        "total_time_min": {"type": ["integer", "null"]},
        "cuisine": {"type": ["string", "null"]},
        "ingredients": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["item"],
                "properties": {
                    "quantity": {"type": ["string", "null"]},
                    "unit": {"type": ["string", "null"]},
                    "item": {"type": "string"},
                    "notes": {"type": ["string", "null"]},
                },
            },
        },
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["text"],
                "properties": {
                    "text": {"type": "string"},
                    "duration_seconds": {"type": ["integer", "null"]},
                },
            },
        },
        "tips": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
}
