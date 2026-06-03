#!/usr/bin/env python3
"""Manual Web MCP server — import and manage markdown docs via AI tools.

Cursor (.cursor/mcp.json):
  "manual-web": {
    "command": "python",
    "args": ["mcp/server.py"],
    "env": {
      "MANUAL_WEB_API_URL": "http://localhost:8000",
      "MANUAL_WEB_EMAIL": "admin@example.com",
      "MANUAL_WEB_PASSWORD": "your-password"
    }
  }

Install deps: pip install -r mcp/requirements.txt
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from mcp.server.fastmcp import FastMCP

from client import ManualWebClient, ManualWebError

mcp = FastMCP("manual-web")
client = ManualWebClient()


def _title_from_markdown(content: str, fallback: str) -> str:
    for line in content.splitlines():
        m = re.match(r"^#\s+(.+)$", line.strip())
        if m:
            return m.group(1).strip()
    return fallback.replace("-", " ").replace("_", " ").title()


def _slug_ok(slug: str) -> bool:
    return bool(re.fullmatch(r"[a-zA-Z0-9._-]+", slug))


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
def import_markdown_file(
    file_path: str,
    product_slug: str,
    doc_slug: str | None = None,
    title: str | None = None,
    parent_slug: str | None = None,
    version_slug: str = "latest",
) -> str:
    """Import a single local .md file into Manual Web (create or overwrite by slug)."""
    path = Path(file_path).expanduser().resolve()
    if not path.is_file():
        return json.dumps({"error": f"File not found: {path}"})
    if path.suffix.lower() != ".md":
        return json.dumps({"error": "Only .md files are supported"})

    content = path.read_text(encoding="utf-8")
    slug = doc_slug or (path.stem if path.stem != "index" else "index")
    if not _slug_ok(slug):
        return json.dumps({"error": f"Invalid slug '{slug}' derived from filename"})

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
        return json.dumps({"imported": str(path), "document": doc}, ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def import_markdown_directory(
    directory_path: str,
    product_slug: str,
    version_slug: str = "latest",
    parent_slug: str | None = None,
) -> str:
    """Bulk-import all .md files under a directory. Folder structure maps to parent slugs.

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
            doc = client.upsert_document(
                product_slug,
                title=title,
                slug=slug,
                content=content,
                parent_slug=parent,
                version_slug=version_slug,
            )
            results.append({"file": str(path), "slug": slug, "parent": parent, "id": doc["id"]})
        except ManualWebError as e:
            errors.append({"file": str(path), "error": str(e)})

    return json.dumps(
        {"imported": len(results), "failed": len(errors), "results": results, "errors": errors},
        ensure_ascii=False,
        indent=2,
    )


if __name__ == "__main__":
    mcp.run()
