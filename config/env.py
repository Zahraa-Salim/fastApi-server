"""
Environment configuration.

Loads variables from the .env file using python-dotenv and exposes them
as a Settings class. All config (PORT, DATABASE_URL, JWT_SECRET, Cloudinary,
CORS origins, etc.) is accessed via the singleton `settings` object.

Raises RuntimeError at import time when required settings are missing or invalid.
"""

import os
from dotenv import load_dotenv

load_dotenv()


def _parse_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    APP_ENV: str = os.getenv("APP_ENV", "development").strip().lower()
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_EXPIRES_IN: int = int(os.getenv("JWT_EXPIRES_IN", "7").rstrip("dD"))  # days
    AUTO_CREATE_TABLES: bool = os.getenv("AUTO_CREATE_TABLES", "").strip().lower() in {"1", "true", "yes", "on"}
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "").strip().rstrip("/")
    CORS_ORIGINS: list[str] = _parse_csv(
        os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
        )
    )

    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")
    CLOUDINARY_FOLDER: str = os.getenv("CLOUDINARY_FOLDER", "posts")

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def should_auto_create_tables(self) -> bool:
        if self.AUTO_CREATE_TABLES:
            return True
        return self.APP_ENV in {"development", "test"}

    @property
    def effective_base_url(self) -> str:
        if self.APP_BASE_URL:
            return self.APP_BASE_URL
        return f"http://localhost:{self.PORT}"


settings = Settings()

if settings.APP_ENV not in {"development", "production", "staging", "test"}:
    raise RuntimeError("APP_ENV must be one of: development, production, staging, test")

if not settings.DATABASE_URL:
    raise RuntimeError("DATABASE_URL missing in .env file (e.g. postgresql+asyncpg://user:pass@localhost:5432/blog)")

if not settings.JWT_SECRET:
    raise RuntimeError("JWT_SECRET missing in .env file")

if not settings.CORS_ORIGINS:
    raise RuntimeError("CORS_ORIGINS must include at least one allowed origin")

if settings.is_production and any(origin == "*" for origin in settings.CORS_ORIGINS):
    raise RuntimeError("CORS_ORIGINS cannot contain '*' in production")

if settings.is_production and not settings.APP_BASE_URL:
    raise RuntimeError("APP_BASE_URL is required in production")
