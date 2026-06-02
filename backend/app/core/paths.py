"""Normalize document paths under DOCS_DIR."""

from pathlib import Path

from app.core.config import get_settings

settings = get_settings()


def docs_root() -> Path:
    return Path(settings.DOCS_DIR).resolve()


def resolve_doc_path(file_path: str) -> Path:
    path = Path(file_path)
    if path.is_absolute():
        return path
    return docs_root() / path


def to_stored_doc_path(file_path: Path | str) -> str:
    path = Path(file_path).resolve()
    root = docs_root()
    try:
        rel = path.relative_to(root)
    except ValueError:
        return str(path).replace("\\", "/")
    return str(rel).replace("\\", "/")


def remap_version_in_path(file_path: str, product_slug: str, from_slug: str, to_slug: str) -> str:
    stored = to_stored_doc_path(resolve_doc_path(file_path))
    from_seg = f"{product_slug}/{from_slug}/"
    to_seg = f"{product_slug}/{to_slug}/"
    if from_seg in stored:
        return stored.replace(from_seg, to_seg, 1)
    return stored
