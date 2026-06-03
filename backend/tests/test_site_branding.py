from pathlib import Path

import pytest

from app.core.config import get_settings
from app.services import brand_service


def test_get_site_branding_defaults(monkeypatch):
    monkeypatch.setattr(get_settings(), "SITE_BRAND_TITLE", "Manual Web")
    monkeypatch.setattr(brand_service.settings, "SITE_BRAND_TITLE", "Manual Web")
    monkeypatch.setattr(get_settings(), "SITE_BRAND_LOGO_PATH", "")
    monkeypatch.setattr(brand_service.settings, "SITE_BRAND_LOGO_PATH", "")
    monkeypatch.setattr(get_settings(), "SITE_BRAND_LOGO_LETTER", "")
    monkeypatch.setattr(brand_service.settings, "SITE_BRAND_LOGO_LETTER", "")
    branding = brand_service.get_site_branding()
    assert branding.title == "Manual Web"
    assert branding.logo_url is None
    assert branding.logo_letter == "M"


def test_branding_with_title_and_letter(monkeypatch):
    monkeypatch.setattr(get_settings(), "SITE_BRAND_TITLE", "Acme Docs")
    monkeypatch.setattr(brand_service.settings, "SITE_BRAND_TITLE", "Acme Docs")
    monkeypatch.setattr(get_settings(), "SITE_BRAND_LOGO_LETTER", "A")
    monkeypatch.setattr(brand_service.settings, "SITE_BRAND_LOGO_LETTER", "A")
    monkeypatch.setattr(get_settings(), "SITE_BRAND_LOGO_PATH", "")
    monkeypatch.setattr(brand_service.settings, "SITE_BRAND_LOGO_PATH", "")
    branding = brand_service.get_site_branding()
    assert branding.title == "Acme Docs"
    assert branding.logo_letter == "A"


def test_branding_logo_under_uploads(monkeypatch, tmp_path):
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    logo = uploads / "_site" / "custom.png"
    logo.parent.mkdir(parents=True)
    logo.write_bytes(b"\x89PNG\r\n\x1a\n")

    monkeypatch.setattr(get_settings(), "UPLOAD_DIR", str(uploads))
    monkeypatch.setattr(brand_service.settings, "UPLOAD_DIR", str(uploads))
    monkeypatch.setattr(get_settings(), "SITE_BRAND_LOGO_PATH", str(logo))
    monkeypatch.setattr(brand_service.settings, "SITE_BRAND_LOGO_PATH", str(logo))

    branding = brand_service.get_site_branding()
    assert branding.logo_url == "/uploads/_site/custom.png"


def test_sync_brand_logo_copies_external_file(monkeypatch, tmp_path):
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    external = tmp_path / "branding" / "logo.svg"
    external.parent.mkdir()
    external.write_text("<svg/>")

    monkeypatch.setattr(get_settings(), "UPLOAD_DIR", str(uploads))
    monkeypatch.setattr(brand_service.settings, "UPLOAD_DIR", str(uploads))
    monkeypatch.setattr(get_settings(), "SITE_BRAND_LOGO_PATH", str(external))
    monkeypatch.setattr(brand_service.settings, "SITE_BRAND_LOGO_PATH", str(external))

    brand_service.sync_brand_logo()
    synced = uploads / "_site" / "brand" / "logo.svg"
    assert synced.is_file()

    branding = brand_service.get_site_branding()
    assert branding.logo_url == "/uploads/_site/brand/logo.svg"


def test_branding_remote_logo_url(monkeypatch):
    url = "https://cdn.example.com/logo.png"
    monkeypatch.setattr(get_settings(), "SITE_BRAND_LOGO_PATH", url)
    monkeypatch.setattr(brand_service.settings, "SITE_BRAND_LOGO_PATH", url)
    branding = brand_service.get_site_branding()
    assert branding.logo_url == url
