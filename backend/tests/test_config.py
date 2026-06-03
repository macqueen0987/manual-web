import pytest

from app.core.config import Settings, get_settings


def test_settings_requires_secret_in_production():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(APP_ENV="production", SECRET_KEY="")


def test_settings_rejects_short_secret():
    with pytest.raises(ValueError, match="at least 32"):
        Settings(APP_ENV="production", SECRET_KEY="too-short")


def test_settings_dev_fallback_secret():
    settings = Settings(APP_ENV="development", SECRET_KEY="")
    assert len(settings.SECRET_KEY) >= 32


def test_get_settings_cached():
    get_settings.cache_clear()
    a = get_settings()
    b = get_settings()
    assert a is b
    get_settings.cache_clear()
