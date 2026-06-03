import logging
import mimetypes
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

from fastapi import HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

ALLOWED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".mp4",
    ".pdf",
    ".zip",
}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
VIDEO_EXTENSIONS = {".mp4"}
FILE_EXTENSIONS = {".pdf", ".zip"}


def extension_kind(ext: str) -> str:
    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in VIDEO_EXTENSIONS:
        return "video"
    if ext in FILE_EXTENSIONS:
        return "file"
    return "other"


def validate_extension(filename: str) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return ext


def validate_size(content: bytes) -> None:
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 50MB limit",
        )


UPLOAD_REF_RE = re.compile(
    r"(?:https?://[^\s\"'<>]+)?(/uploads/[^\s\"'<>)\]]+)",
    re.IGNORECASE,
)


def _upload_root() -> Path:
    return Path(settings.UPLOAD_DIR).resolve()


def _docs_dir(product_slug: str, version_slug: str) -> Path:
    return Path(settings.DOCS_DIR) / product_slug / version_slug


def _upload_dir(product_slug: str, version_slug: str) -> Path:
    return Path(settings.UPLOAD_DIR) / product_slug / version_slug


def normalize_media_id(raw: str) -> str:
    path = unquote(raw.strip().rstrip(".,;"))
    if path.startswith("/uploads/"):
        path = path[len("/uploads/") :]
    return path.replace("\\", "/")


def extract_media_ids_from_text(text: str) -> set[str]:
    ids: set[str] = set()
    for match in UPLOAD_REF_RE.finditer(text):
        media_id = normalize_media_id(match.group(1))
        if media_id and ".." not in Path(media_id).parts:
            ids.add(media_id)
    return ids


def collect_referenced_media_ids(product_slug: str, version_slug: str) -> set[str]:
    docs_dir = _docs_dir(product_slug, version_slug)
    if not docs_dir.is_dir():
        return set()

    referenced: set[str] = set()
    for md_path in docs_dir.rglob("*.md"):
        try:
            text = md_path.read_text(encoding="utf-8")
        except OSError:
            logger.warning("Could not read markdown file for media scan: %s", md_path)
            continue
        referenced.update(extract_media_ids_from_text(text))
    return referenced


def delete_orphan_uploads(product_slug: str, version_slug: str) -> list[str]:
    """Delete upload files under product/version not referenced in any markdown."""
    referenced = collect_referenced_media_ids(product_slug, version_slug)
    upload_dir = _upload_dir(product_slug, version_slug)
    if not upload_dir.is_dir():
        return []

    deleted: list[str] = []
    for path in upload_dir.iterdir():
        if not path.is_file():
            continue
        media_id = f"{product_slug}/{version_slug}/{path.name}"
        if media_id in referenced:
            continue
        try:
            path.unlink()
            deleted.append(media_id)
        except OSError:
            logger.warning("Could not delete orphan upload: %s", path)
    if deleted:
        logger.info(
            "Removed %d orphan upload(s) for %s/%s",
            len(deleted),
            product_slug,
            version_slug,
        )
    return deleted


def resolve_media_path(media_id: str) -> Path:
    """Resolve and validate a media id (relative path under uploads)."""
    root = _upload_root()
    candidate = (root / media_id).resolve()
    if not str(candidate).startswith(str(root)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid media path")
    if not candidate.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media not found")
    return candidate


def _meta_for_file(path: Path, root: Path, original_name: str | None = None) -> dict:
    relative = path.relative_to(root)
    parts = relative.parts
    if len(parts) < 3:
        raise ValueError(f"Unexpected upload path layout: {relative}")

    product_slug, version_slug, filename = parts[0], parts[1], parts[-1]
    ext = path.suffix.lower()
    stat = path.stat()
    mime, _ = mimetypes.guess_type(filename)
    media_id = relative.as_posix()

    return {
        "id": media_id,
        "product_slug": product_slug,
        "version_slug": version_slug,
        "filename": filename,
        "original_name": original_name,
        "url": f"/uploads/{media_id}",
        "size": stat.st_size,
        "content_type": mime or "application/octet-stream",
        "kind": extension_kind(ext),
        "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
    }


def save_upload(
    *,
    content: bytes,
    original_filename: str,
    product_slug: str,
    version_slug: str,
    stored_name: str,
) -> dict:
    validate_extension(original_filename)
    validate_size(content)

    upload_dir = Path(settings.UPLOAD_DIR) / product_slug / version_slug
    upload_dir.mkdir(parents=True, exist_ok=True)
    upload_path = upload_dir / stored_name
    upload_path.write_bytes(content)

    root = _upload_root()
    return _meta_for_file(upload_path.resolve(), root, original_name=original_filename)


def list_media(
    *,
    product_slug: str | None = None,
    version_slug: str | None = None,
    orphans_only: bool = False,
) -> list[dict]:
    root = _upload_root()
    if not root.exists():
        return []

    referenced: set[str] | None = None
    if product_slug and version_slug:
        referenced = collect_referenced_media_ids(product_slug, version_slug)

    items: list[dict] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        try:
            meta = _meta_for_file(path, root)
        except ValueError:
            continue
        if product_slug and meta["product_slug"] != product_slug:
            continue
        if version_slug and meta["version_slug"] != version_slug:
            continue
        is_referenced = referenced is not None and meta["id"] in referenced
        meta["referenced"] = is_referenced
        if orphans_only and is_referenced:
            continue
        items.append(meta)

    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items


def delete_media(media_id: str) -> None:
    path = resolve_media_path(media_id)
    path.unlink()
