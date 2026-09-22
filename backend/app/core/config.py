"""Application settings, loaded from environment variables and an optional .env file."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql+asyncpg://mabat:change-me@localhost:5432/mabat",
        alias="DATABASE_URL",
    )
    storage_root: Path = Field(default=Path("./storage"), alias="MABAT_STORAGE_ROOT")
    secret_key: str = Field(default="dev-only-secret-change-me", alias="MABAT_SECRET_KEY")
    max_upload_mb: int = Field(default=512, alias="MABAT_MAX_UPLOAD_MB")
    session_hours: int = Field(default=72, alias="MABAT_SESSION_HOURS")
    secure_cookies: bool = Field(default=False, alias="MABAT_SECURE_COOKIES")
    initial_editor_username: str | None = Field(default=None, alias="MABAT_INITIAL_EDITOR_USERNAME")
    initial_editor_password: str | None = Field(default=None, alias="MABAT_INITIAL_EDITOR_PASSWORD")
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"], alias="MABAT_CORS_ORIGINS"
    )

    cookie_name: str = "mabat_session"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def projects_root(self) -> Path:
        return self.storage_root / "projects"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.storage_root = settings.storage_root.resolve()
    return settings
