import os
from functools import lru_cache
from urllib.parse import urlparse

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
    seed_demo_user: bool = False

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

    @property
    def looks_deployed(self) -> bool:
        if self.is_production:
            return True
        if os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_PUBLIC_DOMAIN"):
            return True
        db = self.database_url.lower()
        if "postgres" in db:
            if "localhost" not in db and "127.0.0.1" not in db:
                return True
        for origin in self.cors_origin_list:
            host = urlparse(origin).hostname or ""
            if origin.startswith("https://") and host not in {"localhost", "127.0.0.1"}:
                return True
        return False

    @property
    def is_local_api(self) -> bool:
        host = (urlparse(self.api_public_url).hostname or "").lower()
        return host in {"localhost", "127.0.0.1"}

    def can_seed_demo(self) -> bool:
        return (
            self.seed_demo_user
            and not self.is_production
            and not self.looks_deployed
            and self.is_local_api
        )

    def validate_security(self) -> None:
        if self.has_insecure_jwt_secret and (self.is_production or self.looks_deployed):
            raise RuntimeError(
                "JWT_SECRET inseguro en un entorno desplegado: usá un secreto aleatorio de al menos 32 caracteres."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
