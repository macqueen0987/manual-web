from pathlib import Path

import bleach

from app.core.config import get_settings
from app.schemas.site import SiteFooterTemplate

settings = get_settings()

_FOOTER_TAGS = [
    "footer",
    "div",
    "p",
    "span",
    "a",
    "strong",
    "em",
    "br",
    "ul",
    "ol",
    "li",
    "small",
    "nav",
    "time",
]

_FOOTER_ATTRS = {
    "*": ["class", "id", "role", "aria-label", "aria-hidden"],
    "a": ["href", "title", "target", "rel"],
    "time": ["datetime"],
}


def _normalize_locale(locale: str) -> str:
    raw = (locale or "").strip().lower()
    if raw in ("ko", "kr", "korean"):
        return "ko"
    return "en"


def _footer_template_path(locale: str) -> str:
    loc = _normalize_locale(locale)
    if loc == "ko":
        path = (settings.SITE_FOOTER_HTML_PATH_KO or "").strip()
    else:
        path = (settings.SITE_FOOTER_HTML_PATH_EN or "").strip()
    if not path:
        path = (settings.SITE_FOOTER_HTML_PATH or "").strip()
    return path


def sanitize_footer_html(html: str) -> str:
    cleaned = bleach.clean(
        html,
        tags=_FOOTER_TAGS,
        attributes=_FOOTER_ATTRS,
        protocols=["http", "https", "mailto"],
        strip=True,
    )
    return cleaned.strip()


def get_site_footer_template(locale: str) -> SiteFooterTemplate:
    path_str = _footer_template_path(locale)
    if not path_str:
        return SiteFooterTemplate(html=None)
    path = Path(path_str)
    if not path.is_file():
        return SiteFooterTemplate(html=None)
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError:
        return SiteFooterTemplate(html=None)
    if not raw.strip():
        return SiteFooterTemplate(html=None)
    return SiteFooterTemplate(html=sanitize_footer_html(raw))
