from app.config import Settings
from app.services.llm.anthropic import AnthropicProvider
from app.services.llm.base import LLMProvider
from app.services.llm.openai import OpenAIProvider


def get_llm_provider(settings: Settings) -> LLMProvider:
    if settings.llm_provider == "anthropic":
        return AnthropicProvider(settings.anthropic_api_key, settings.anthropic_model)
    if settings.llm_provider == "openai":
        return OpenAIProvider(settings.openai_api_key, settings.openai_model)
    raise ValueError(f"unknown llm_provider: {settings.llm_provider}")
