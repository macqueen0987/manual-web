from pathlib import Path

import bleach

from app.core.config import get_settings
from app.schemas.site import HomeHeroTemplate

settings = get_settings()

_HERO_TAGS = [
    "section",
    "div",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "span",
    "a",
    "strong",
    "em",
    "br",
    "ul",
    "ol",
    "li",
    "img",
    "header",
]

_HERO_ATTRS = {
    "*": ["class", "id", "role", "aria-label", "aria-hidden"],
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "width", "height", "loading"],
}

def _normalize_locale(locale: str) -> str:
    raw = (locale or "").strip().lower()
    if raw in ("ko", "kr", "korean"):
        return "ko"
    return "en"


def _hero_template_path(locale: str) -> str:
    loc = _normalize_locale(locale)
    if loc == "ko":
        path = (settings.SITE_HOME_HERO_HTML_PATH_KO or "").strip()
    else:
        path = (settings.SITE_HOME_HERO_HTML_PATH_EN or "").strip()
    if not path:
        path = (settings.SITE_HOME_HERO_HTML_PATH or "").strip()
    return path


def sanitize_hero_html(html: str) -> str:
    cleaned = bleach.clean(
        html,
        tags=_HERO_TAGS,
        attributes=_HERO_ATTRS,
        protocols=["http", "https", "mailto"],
        strip=True,
    )
    return cleaned.strip()


def get_home_hero_template(locale: str) -> HomeHeroTemplate:
    path_str = _hero_template_path(locale)
    if not path_str:
        return HomeHeroTemplate(html=None)
    path = Path(path_str)
    if not path.is_file():
        return HomeHeroTemplate(html=None)
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError:
        return HomeHeroTemplate(html=None)
    if not raw.strip():
        return HomeHeroTemplate(html=None)
    return HomeHeroTemplate(html=sanitize_hero_html(raw))
