from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings

_DEV_SECRET = "dev-local-secret-key-min-32-chars!!"


class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = "sqlite:///data/app.db"
    UPLOAD_DIR: str = "data/uploads"
    DOCS_DIR: str = "data/docs"
    ALGORITHM: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:5173,http://frontend:5173"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @field_validator("APP_ENV")
    @classmethod
    def normalize_env(cls, value: str) -> str:
        return value.lower().strip()

    @model_validator(mode="after")
    def validate_secret_key(self) -> "Settings":
        if not self.SECRET_KEY:
            if self.APP_ENV == "development":
                self.SECRET_KEY = _DEV_SECRET
            else:
                raise ValueError("SECRET_KEY environment variable is required in production")
        if len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
