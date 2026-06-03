"""Resolve local image refs in markdown and rewrite to /uploads/ URLs."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Callable

# ![alt](path) or ![alt](path "title")
IMAGE_MD_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")

UPLOADABLE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".mp4",
    ".pdf",
    ".zip",
}


def _strip_ref(path_in_md: str) -> str:
    """Path portion inside markdown parentheses (no title quote)."""
    return path_in_md.strip().split()[0].strip("<>")


def is_uploaded_or_remote(ref: str) -> bool:
    p = _strip_ref(ref)
    lower = p.lower()
    return lower.startswith("/uploads/") or lower.startswith("http://") or lower.startswith("https://")


def resolve_local_media_path(ref: str, base_dir: Path) -> Path | None:
    """Resolve a markdown media ref to a file under base_dir (md file directory)."""
    if is_uploaded_or_remote(ref):
        return None
    raw = _strip_ref(ref)
    if not raw:
        return None
    base = base_dir.resolve()
    candidate = (base / raw).resolve() if not Path(raw).is_absolute() else Path(raw).resolve()
    try:
        candidate.relative_to(base)
    except ValueError:
        return None
    if not candidate.is_file():
        return None
    if candidate.suffix.lower() not in UPLOADABLE_EXTENSIONS:
        return None
    return candidate


def rewrite_markdown_local_images(
    content: str,
    base_dir: Path,
    upload_file: Callable[[Path], str],
) -> tuple[str, list[dict]]:
    """Upload local files and replace markdown refs with returned URLs."""
    uploads: list[dict] = []
    seen: dict[str, str] = {}

    def repl(match: re.Match[str]) -> str:
        alt, path_in_md = match.group(1), match.group(2)
        local = resolve_local_media_path(path_in_md, base_dir)
        if local is None:
            return match.group(0)
        key = str(local)
        if key not in seen:
            url = upload_file(local)
            seen[key] = url
            uploads.append({"local_path": key, "url": url})
        new_url = seen[key]
        return f"![{alt}]({new_url})"

    new_content = IMAGE_MD_RE.sub(repl, content)
    return new_content, uploads
