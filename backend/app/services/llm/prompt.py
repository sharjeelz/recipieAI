SYSTEM = """You extract structured cooking recipes from YouTube video transcripts.

You will receive the video's title, description, and a transcript. The transcript may be
noisy (ads, chit-chat, missing punctuation) or — for music-only videos — may be garbled or
hallucinated. The title and description are more reliable ground truth for WHAT dish is
being made; use them to resolve conflicts and anchor the recipe.

Rules:
- Return a single recipe. If the video has multiple recipes, pick the primary one.
- If the title and transcript disagree about what dish is being made, trust the title.
- Keep step text imperative and tight (one action per step).
- duration_seconds for a step is OPTIONAL and STRICT. Only set it when the step has
  an EXPLICIT, fixed time ("simmer 10 minutes", "rest 5 min", "bake 25 minutes").
  Leave it null for ANY step where time is variable: "bring to a boil", "until
  golden brown", "until tender", "stir constantly", "to taste", "as needed",
  "until reduced by half". Do not guess. A wrong duration is worse than no duration.
- Use lowercase units (cup, tbsp, tsp, g, ml, oz, clove, pinch). Leave unit null if unclear.
- total_time_min is minutes from start of prep to ready-to-eat if you can estimate it.
- Do not invent ingredients that appear in neither the title, description, nor transcript.
- Tips are OPTIONAL. Only include tips the chef actually emphasizes in the video —
  technique notes ("soak rice 30 min first"), substitutions, common mistakes to avoid,
  make-ahead / storage advice. Leave tips empty rather than inventing generic advice.
  Each tip must be a full, standalone sentence. At most 5 tips.
- kcal_per_serving is your best estimate of energy per serving, in kilocalories,
  derived from the ingredient list and quantities. It's an approximation, not a
  lab measurement — round to the nearest 10. If servings is unknown, leave it null.
  Account for typical absorption (e.g. only count the oil that ends up in the dish).
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
    "required": ["title", "ingredients", "steps", "tips", "kcal_per_serving"],
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": ["string", "null"]},
        "servings": {"type": ["integer", "null"]},
        "total_time_min": {"type": ["integer", "null"]},
        "cuisine": {"type": ["string", "null"]},
        "kcal_per_serving": {"type": ["integer", "null"]},
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
