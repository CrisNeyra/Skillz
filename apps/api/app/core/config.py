from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_JWT_SECRETS = frozenset(
    {
        "dev-secret-change-me",
        "change-me-to-a-long-random-secret",
        "dev-secret-change-me-skillz-local",
    }
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    database_url: str = "sqlite:///./skillz.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:3000"
    api_public_url: str = "http://localhost:8000"
    redis_url: str = ""
    sentry_dsn: str = ""
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_folder: str = "skillz"

    allowed_fonts: list[str] = [
        "Space Grotesk",
        "DM Sans",
        "Instrument Serif",
        "IBM Plex Mono",
        "Outfit",
        "Sora",
        "Fraunces",
    ]

    @field_validator("environment")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        return value.strip().lower()

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def has_insecure_jwt_secret(self) -> bool:
        secret = self.jwt_secret.strip()
        return secret in INSECURE_JWT_SECRETS or len(secret) < 32

    def validate_security(self) -> None:
        if self.is_production and self.has_insecure_jwt_secret:
            raise RuntimeError(
                "JWT_SECRET inseguro en production: usá un secreto aleatorio de al menos 32 caracteres."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
