import shutil
from pathlib import Path

from app.core.config import get_settings
from app.schemas.site import SiteBranding

settings = get_settings()

_DEFAULT_TITLE = "Manual Web"
_DEFAULT_LETTER = "M"
_BRAND_DIR = "_site/brand"


def sync_brand_logo() -> None:
    """Copy an external logo file into uploads so /uploads can serve it."""
    raw = (settings.SITE_BRAND_LOGO_PATH or "").strip()
    if not raw or raw.startswith(("http://", "https://")):
        return
    src = Path(raw)
    if not src.is_file():
        return
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    try:
        src.resolve().relative_to(upload_root)
        return
    except ValueError:
        pass
    dest_dir = upload_root / _BRAND_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    suffix = src.suffix.lower() if src.suffix else ".png"
    dest = dest_dir / f"logo{suffix}"
    shutil.copy2(src, dest)


def _synced_logo_path() -> Path | None:
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    brand_dir = upload_root / _BRAND_DIR
    if not brand_dir.is_dir():
        return None
    for candidate in sorted(brand_dir.glob("logo.*")):
        if candidate.is_file():
            return candidate
    return None


def _brand_logo_url() -> str | None:
    raw = (settings.SITE_BRAND_LOGO_PATH or "").strip()
    if not raw:
        return None
    if raw.startswith(("http://", "https://")):
        return raw
    src = Path(raw)
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    if src.is_file():
        try:
            rel = src.resolve().relative_to(upload_root)
            return f"/uploads/{rel.as_posix()}"
        except ValueError:
            pass
    synced = _synced_logo_path()
    if synced:
        rel = synced.resolve().relative_to(upload_root)
        return f"/uploads/{rel.as_posix()}"
    return None


def _brand_logo_letter(title: str) -> str:
    letter = (settings.SITE_BRAND_LOGO_LETTER or "").strip()
    if letter:
        return letter[0]
    if title:
        return title[0].upper()
    return _DEFAULT_LETTER


def get_site_branding() -> SiteBranding:
    title = (settings.SITE_BRAND_TITLE or "").strip() or _DEFAULT_TITLE
    return SiteBranding(
        title=title,
        logo_url=_brand_logo_url(),
        logo_letter=_brand_logo_letter(title),
    )
