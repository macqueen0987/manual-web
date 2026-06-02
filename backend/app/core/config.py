from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = "sqlite:///data/app.db"
    UPLOAD_DIR: str = "data/uploads"
    DOCS_DIR: str = "data/docs"
    ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
