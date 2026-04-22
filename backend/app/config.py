from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://packer:packer_secret@localhost:5432/destinationpacker"
    redis_url: str = "redis://localhost:6379"

    # Security (self-hosted JWT auth)
    secret_key: str = "dev_secret_key_change_in_production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # AI — Ollama (primary, free self-hosted), OpenRouter (free models), or Claude API (optional fallback)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    openrouter_api_key: str = ""  # optional — set to use free OpenRouter models
    openrouter_model: str = "meta-llama/llama-3.1-8b-instruct:free"
    anthropic_api_key: str = ""  # optional — leave empty to use Ollama only

    # RevenueCat
    revenuecat_webhook_secret: str = ""

    # App
    environment: str = "development"

    # Free tier limits
    free_trip_limit: int = 3

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def use_openrouter(self) -> bool:
        return bool(self.openrouter_api_key)

    @property
    def use_claude(self) -> bool:
        """Use Claude API only if a key is explicitly configured."""
        return bool(self.anthropic_api_key)


settings = Settings()
