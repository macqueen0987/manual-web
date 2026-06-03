from pathlib import Path

from app.core.config import get_settings
from app.services import footer_template_service


def test_site_footer_empty_without_path():
    tpl = footer_template_service.get_site_footer_template("ko")
    assert tpl.html is None


def test_site_footer_loads_and_sanitizes(monkeypatch, tmp_path):
    html = tmp_path / "footer.html"
    html.write_text(
        "<footer><p>OK</p><script>alert(1)</script></footer>",
        encoding="utf-8",
    )
    monkeypatch.setattr(get_settings(), "SITE_FOOTER_HTML_PATH_KO", str(html))
    monkeypatch.setattr(footer_template_service.settings, "SITE_FOOTER_HTML_PATH_KO", str(html))

    tpl = footer_template_service.get_site_footer_template("ko")
    assert tpl.html is not None
    assert "<p>OK</p>" in tpl.html
    assert "script" not in tpl.html.lower()


def test_site_footer_locale_specific_overrides_shared(monkeypatch, tmp_path):
    shared = tmp_path / "shared.html"
    shared.write_text("<footer><p>shared</p></footer>", encoding="utf-8")
    ko = tmp_path / "ko.html"
    ko.write_text("<footer><p>ko only</p></footer>", encoding="utf-8")

    monkeypatch.setattr(get_settings(), "SITE_FOOTER_HTML_PATH", str(shared))
    monkeypatch.setattr(footer_template_service.settings, "SITE_FOOTER_HTML_PATH", str(shared))
    monkeypatch.setattr(get_settings(), "SITE_FOOTER_HTML_PATH_KO", str(ko))
    monkeypatch.setattr(footer_template_service.settings, "SITE_FOOTER_HTML_PATH_KO", str(ko))

    assert "ko only" in footer_template_service.get_site_footer_template("ko").html or ""
    assert "shared" in footer_template_service.get_site_footer_template("en").html or ""


def test_site_footer_api(api_client, monkeypatch, tmp_path):
    html = tmp_path / "footer.html"
    html.write_text("<footer><p>API footer</p></footer>", encoding="utf-8")
    monkeypatch.setattr(get_settings(), "SITE_FOOTER_HTML_PATH", str(html))
    monkeypatch.setattr(footer_template_service.settings, "SITE_FOOTER_HTML_PATH", str(html))

    res = api_client.get("/api/site/footer", params={"locale": "en"})
    assert res.status_code == 200
    assert "API footer" in res.json()["html"]
