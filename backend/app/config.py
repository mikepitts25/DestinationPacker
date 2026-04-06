from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://packer:packer_secret@localhost:5432/destinationpacker"
    redis_url: str = "redis://localhost:6379"

    # Security
    secret_key: str = "dev_secret_key_change_in_production"
    algorithm: str = "HS256"

    # Firebase
    firebase_project_id: str = ""
    firebase_service_account_json: str = "{}"

    # Anthropic
    anthropic_api_key: str = ""

    # OpenWeatherMap
    openweather_api_key: str = ""

    # Google Places
    google_places_api_key: str = ""

    # RevenueCat
    revenuecat_webhook_secret: str = ""

    # App
    environment: str = "development"

    # Free tier limits
    free_trip_limit: int = 3

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
