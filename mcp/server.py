#!/usr/bin/env python3
"""Manual Web MCP server — import and manage markdown docs via AI tools.

Docker (SSE, auto admin on first boot):
  docker compose -f docker-compose.dev.yml up -d
  docker compose -f docker-compose.dev.yml --profile mcp up -d mcp
  Cursor: "url": "http://127.0.0.1:8001/sse"  (.cursor/mcp.json.example)

Local stdio: pip install -r mcp/requirements.txt && python mcp/server.py
  Run mcp/ensure_setup.py once if /api/setup/status is false.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from mcp.server.fastmcp import FastMCP

from client import ManualWebClient, ManualWebError
from markdown_media import UPLOADABLE_EXTENSIONS, rewrite_markdown_local_images

mcp = FastMCP(
    "manual-web",
    host=os.environ.get("MCP_HOST", "127.0.0.1"),
    port=int(os.environ.get("MCP_PORT", "8000")),
)
client = ManualWebClient()


def _title_from_markdown(content: str, fallback: str) -> str:
    for line in content.splitlines():
        m = re.match(r"^#\s+(.+)$", line.strip())
        if m:
            return m.group(1).strip()
    return fallback.replace("-", " ").replace("_", " ").title()


def _slug_ok(slug: str) -> bool:
    return bool(re.fullmatch(r"[a-zA-Z0-9._-]+", slug))


def _prepare_markdown_content(
    content: str,
    base_dir: Path,
    product_slug: str,
    version_slug: str,
    *,
    upload_local_images: bool,
) -> tuple[str, list[dict]]:
    if not upload_local_images:
        return content, []

    def _upload(local_path: Path) -> str:
        meta = client.upload_media(local_path, product_slug, version_slug)
        return meta["url"]

    return rewrite_markdown_local_images(content, base_dir, _upload)


@mcp.tool()
def list_products() -> str:
    """List all products (manuals) in Manual Web."""
    products = client.list_products()
    return json.dumps(products, ensure_ascii=False, indent=2)


@mcp.tool()
def list_documents(product_slug: str, version_slug: str = "latest") -> str:
    """List document tree for a product version."""
    tree = client.list_document_tree(product_slug, version_slug)
    return json.dumps(tree, ensure_ascii=False, indent=2)


@mcp.tool()
def get_document(product_slug: str, doc_slug: str, version_slug: str = "latest") -> str:
    """Read a document's markdown content and metadata."""
    doc = client.get_document(product_slug, doc_slug, version_slug)
    return json.dumps(doc, ensure_ascii=False, indent=2)


@mcp.tool()
def create_document(
    product_slug: str,
    title: str,
    slug: str,
    content: str = "",
    parent_slug: str | None = None,
    version_slug: str = "latest",
    sort_order: int = 0,
) -> str:
    """Create a new document (requires admin login env vars)."""
    if not _slug_ok(slug):
        return json.dumps({"error": "Invalid slug — use letters, numbers, . _ - only"})
    try:
        version_id = client.resolve_version_id(product_slug, version_slug)
        parent_id = None
        if parent_slug:
            parent = client.find_doc_by_slug(product_slug, parent_slug, version_slug)
            if not parent:
                return json.dumps({"error": f"Parent slug '{parent_slug}' not found"})
            parent_id = parent["id"]
        doc = client.create_document(
            version_id=version_id,
            title=title,
            slug=slug,
            content=content,
            parent_id=parent_id,
            sort_order=sort_order,
        )
        return json.dumps(doc, ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def update_document(
    document_id: int,
    title: str | None = None,
    content: str | None = None,
) -> str:
    """Update document title and/or markdown content by ID."""
    try:
        doc = client.update_document(document_id, title=title, content=content)
        return json.dumps(doc, ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def delete_document(document_id: int) -> str:
    """Delete a document by ID (fails if it has child documents)."""
    try:
        return json.dumps(client.delete_document(document_id), ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def upload_media(
    file_path: str,
    product_slug: str,
    version_slug: str = "latest",
) -> str:
    """Upload an image or file (png, jpg, gif, webp, mp4, pdf, zip) to /uploads/{product}/{version}/."""
    path = Path(file_path).expanduser().resolve()
    if not path.is_file():
        return json.dumps({"error": f"File not found: {path}"})
    if path.suffix.lower() not in UPLOADABLE_EXTENSIONS:
        return json.dumps(
            {"error": f"Unsupported type '{path.suffix}'. Allowed: {sorted(UPLOADABLE_EXTENSIONS)}"}
        )
    try:
        meta = client.upload_media(path, product_slug, version_slug)
        return json.dumps(meta, ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def upload_media_directory(
    directory_path: str,
    product_slug: str,
    version_slug: str = "latest",
) -> str:
    """Upload all allowed media files under a directory (recursive)."""
    root = Path(directory_path).expanduser().resolve()
    if not root.is_dir():
        return json.dumps({"error": f"Directory not found: {root}"})

    uploaded: list[dict] = []
    errors: list[dict] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in UPLOADABLE_EXTENSIONS:
            continue
        try:
            meta = client.upload_media(path, product_slug, version_slug)
            uploaded.append({"file": str(path), "url": meta["url"], "id": meta["id"]})
        except ManualWebError as e:
            errors.append({"file": str(path), "error": str(e)})

    return json.dumps(
        {"uploaded": len(uploaded), "failed": len(errors), "items": uploaded, "errors": errors},
        ensure_ascii=False,
        indent=2,
    )


@mcp.tool()
def list_media(
    product_slug: str,
    version_slug: str = "latest",
    orphans_only: bool = False,
) -> str:
    """List uploaded media for a product version."""
    try:
        data = client.list_media(product_slug, version_slug, orphans_only=orphans_only)
        return json.dumps(data, ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def delete_media(media_id: str) -> str:
    """Delete one upload by id (e.g. product/latest/uuid.png)."""
    try:
        return json.dumps(client.delete_media(media_id), ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def cleanup_orphan_media(product_slug: str, version_slug: str = "latest") -> str:
    """Delete uploads not referenced in any document markdown for this version."""
    try:
        return json.dumps(
            client.cleanup_orphan_media(product_slug, version_slug),
            ensure_ascii=False,
            indent=2,
        )
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def import_markdown_file(
    file_path: str,
    product_slug: str,
    doc_slug: str | None = None,
    title: str | None = None,
    parent_slug: str | None = None,
    version_slug: str = "latest",
    upload_local_images: bool = True,
) -> str:
    """Import a single local .md file into Manual Web (create or overwrite by slug).

    When upload_local_images is true, ![alt](relative/path) refs next to the .md file
    are uploaded and rewritten to /uploads/... URLs.
    """
    path = Path(file_path).expanduser().resolve()
    if not path.is_file():
        return json.dumps({"error": f"File not found: {path}"})
    if path.suffix.lower() != ".md":
        return json.dumps({"error": "Only .md files are supported"})

    content = path.read_text(encoding="utf-8")
    slug = doc_slug or (path.stem if path.stem != "index" else "index")
    if not _slug_ok(slug):
        return json.dumps({"error": f"Invalid slug '{slug}' derived from filename"})

    try:
        content, media_uploads = _prepare_markdown_content(
            content, path.parent, product_slug, version_slug, upload_local_images=upload_local_images
        )
    except ManualWebError as e:
        return json.dumps({"error": str(e)})

    doc_title = title or _title_from_markdown(content, slug)
    try:
        doc = client.upsert_document(
            product_slug,
            title=doc_title,
            slug=slug,
            content=content,
            parent_slug=parent_slug,
            version_slug=version_slug,
        )
        return json.dumps(
            {"imported": str(path), "media_uploads": media_uploads, "document": doc},
            ensure_ascii=False,
            indent=2,
        )
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def import_markdown_directory(
    directory_path: str,
    product_slug: str,
    version_slug: str = "latest",
    parent_slug: str | None = None,
    upload_local_images: bool = True,
) -> str:
    """Bulk-import all .md files under a directory. Folder structure maps to parent slugs.

    Local image refs in each .md are resolved relative to that file's directory.

    Examples:
      docs/index.md           → slug index
      docs/guide/install.md   → slug install, parent guide
      docs/guide/index.md     → slug guide (section home)
    """
    root = Path(directory_path).expanduser().resolve()
    if not root.is_dir():
        return json.dumps({"error": f"Directory not found: {root}"})

    md_files = sorted(root.rglob("*.md"), key=lambda p: (len(p.relative_to(root).parts), str(p)))
    if not md_files:
        return json.dumps({"error": "No .md files found", "directory": str(root)})

    results: list[dict] = []
    errors: list[dict] = []

    for path in md_files:
        rel = path.relative_to(root)
        parts = rel.parts

        if path.name == "index.md":
            slug = parts[-2] if len(parts) > 1 else "index"
            parent = parts[-3] if len(parts) > 2 else parent_slug
        else:
            slug = path.stem
            parent = parts[-2] if len(parts) > 1 else parent_slug

        if not _slug_ok(slug):
            errors.append({"file": str(path), "error": f"Invalid slug '{slug}'"})
            continue

        content = path.read_text(encoding="utf-8")
        title = _title_from_markdown(content, slug)

        try:
            content, media_uploads = _prepare_markdown_content(
                content, path.parent, product_slug, version_slug, upload_local_images=upload_local_images
            )
            doc = client.upsert_document(
                product_slug,
                title=title,
                slug=slug,
                content=content,
                parent_slug=parent,
                version_slug=version_slug,
            )
            results.append(
                {
                    "file": str(path),
                    "slug": slug,
                    "parent": parent,
                    "id": doc["id"],
                    "media_uploads": len(media_uploads),
                }
            )
        except ManualWebError as e:
            errors.append({"file": str(path), "error": str(e)})

    return json.dumps(
        {"imported": len(results), "failed": len(errors), "results": results, "errors": errors},
        ensure_ascii=False,
        indent=2,
    )


if __name__ == "__main__":
    transport = os.environ.get("MCP_TRANSPORT", "stdio")
    mcp.run(transport=transport)  # type: ignore[arg-type]
