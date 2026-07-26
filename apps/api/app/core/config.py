from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./skillz.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    # MVP sin password: sesión larga para no cortar uploads
    access_token_expire_minutes: int = 60 * 24 * 7
    refresh_token_expire_days: int = 30
    cors_origins: str = "http://localhost:3000"
    api_public_url: str = "http://localhost:8000"

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

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
