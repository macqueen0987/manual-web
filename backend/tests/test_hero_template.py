from pathlib import Path

from app.core.config import get_settings
from app.services import hero_template_service


def test_home_hero_empty_without_path():
    tpl = hero_template_service.get_home_hero_template("ko")
    assert tpl.html is None


def test_home_hero_loads_and_sanitizes(monkeypatch, tmp_path):
    html = tmp_path / "hero.html"
    html.write_text(
        "<section><h1>Hi</h1><script>alert(1)</script><p>OK</p></section>",
        encoding="utf-8",
    )
    monkeypatch.setattr(get_settings(), "SITE_HOME_HERO_HTML_PATH_KO", str(html))
    monkeypatch.setattr(hero_template_service.settings, "SITE_HOME_HERO_HTML_PATH_KO", str(html))

    tpl = hero_template_service.get_home_hero_template("ko")
    assert tpl.html is not None
    assert "<h1>Hi</h1>" in tpl.html
    assert "script" not in tpl.html.lower()
    assert "<p>OK</p>" in tpl.html


def test_home_hero_locale_specific_overrides_shared(monkeypatch, tmp_path):
    shared = tmp_path / "shared.html"
    shared.write_text("<section><p>shared</p></section>", encoding="utf-8")
    ko = tmp_path / "ko.html"
    ko.write_text("<section><p>ko only</p></section>", encoding="utf-8")

    monkeypatch.setattr(get_settings(), "SITE_HOME_HERO_HTML_PATH", str(shared))
    monkeypatch.setattr(hero_template_service.settings, "SITE_HOME_HERO_HTML_PATH", str(shared))
    monkeypatch.setattr(get_settings(), "SITE_HOME_HERO_HTML_PATH_KO", str(ko))
    monkeypatch.setattr(hero_template_service.settings, "SITE_HOME_HERO_HTML_PATH_KO", str(ko))

    assert "ko only" in hero_template_service.get_home_hero_template("ko").html or ""
    assert "shared" in hero_template_service.get_home_hero_template("en").html or ""


def test_home_hero_api(api_client, monkeypatch, tmp_path):
    html = tmp_path / "hero.html"
    html.write_text("<section><p>API hero</p></section>", encoding="utf-8")
    monkeypatch.setattr(get_settings(), "SITE_HOME_HERO_HTML_PATH", str(html))
    monkeypatch.setattr(hero_template_service.settings, "SITE_HOME_HERO_HTML_PATH", str(html))

    res = api_client.get("/api/site/home-hero", params={"locale": "en"})
    assert res.status_code == 200
    assert "API hero" in res.json()["html"]
