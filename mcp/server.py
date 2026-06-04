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
from instructions import SERVER_INSTRUCTIONS
from markdown_media import UPLOADABLE_EXTENSIONS, rewrite_markdown_local_images

mcp = FastMCP(
    "manual-web",
    instructions=SERVER_INSTRUCTIONS,
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
    """Manual Web 제품(매뉴얼) 목록. 각 항목의 `slug`가 다른 도구의 `product_slug`입니다."""
    products = client.list_products()
    return json.dumps(products, ensure_ascii=False, indent=2)


@mcp.tool()
def list_documents(product_slug: str, version_slug: str = "latest") -> str:
    """제품·버전의 문서 트리. `version_slug=\"latest\"`는 관리자 작업중(working copy)입니다."""
    tree = client.list_document_tree(product_slug, version_slug)
    return json.dumps(tree, ensure_ascii=False, indent=2)


@mcp.tool()
def get_document(product_slug: str, doc_slug: str, version_slug: str = "latest") -> str:
    """문서 한 페이지의 마크다운 본문·메타데이터 조회 (`doc_slug` 기준)."""
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
    sort_order: int | None = None,
) -> str:
    """새 문서 생성(관리자 env 필요). slug가 이미 있으면 실패 — 덮어쓰기는 import 도구 사용.

    붙여넣기 md에 로컬 상대 이미지가 있으면 먼저 `upload_media`로 URL을 넣으세요.
    `version_slug` 기본 `latest` = 작업중."""
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
    """`document_id`로 제목·마크다운 본문 수정(관리자 env). 이미지는 create와 동일 규칙."""
    try:
        doc = client.update_document(document_id, title=title, content=content)
        return json.dumps(doc, ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def delete_document(document_id: int) -> str:
    """문서 삭제. 하위 문서가 있으면 실패. 서버가 고아 업로드 정리를 할 수 있습니다."""
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
    """미디어 1개 업로드 → JSON의 `url`을 마크다운에 사용 (png/jpg/gif/webp/mp4/pdf/zip).

    `create_document` 본문에 넣기 전 단계로 쓰거나, import 없이 이미지만 올릴 때 사용."""
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
    """디렉터리 아래 허용 확장자 파일을 재귀 업로드. 항목별 `url`·`id` 반환."""
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
    """버전별 업로드 목록. `orphans_only=true`면 어떤 문서 md에도 안 쓰인 파일만."""
    try:
        data = client.list_media(product_slug, version_slug, orphans_only=orphans_only)
        return json.dumps(data, ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def delete_media(media_id: str) -> str:
    """업로드 1건 삭제. `media_id` 예: `product-slug/latest/uuid.png`."""
    try:
        return json.dumps(client.delete_media(media_id), ensure_ascii=False, indent=2)
    except ManualWebError as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def cleanup_orphan_media(product_slug: str, version_slug: str = "latest") -> str:
    """이 버전 문서 마크다운 어디에도 참조되지 않은 업로드를 일괄 삭제."""
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
    """로컬 `.md` 1개를 slug 기준으로 생성·덮어쓰기(upsert). 작업중은 `version_slug=\"latest\"`.

    `upload_local_images=true`(기본): md와 같은 폴더의 상대 이미지를 업로드 후 `/uploads/...`로 치환.
    Docker MCP는 `/workspace/...` 경로 사용."""
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
    """디렉터리 아래 모든 `.md` 일괄 import. 폴더 구조 → parent slug.

    파일별 이미지는 그 md가 있는 디렉터리 기준. 예: `docs/guide/install.md` → slug `install`, parent `guide`;
    `docs/guide/index.md` → slug `guide`; `docs/index.md` → slug `index`."""
    root = Path(directory_path).expanduser().resolve()
    if not root.is_dir():
        return json.dumps({"error": f"Directory not found: {root}"})

    md_files = sorted(root.rglob("*.md"), key=lambda p: (len(p.relative_to(root).parts), str(p)))
    if not md_files:
        return json.dumps({"error": "No .md files found", "directory": str(root)})

    results: list[dict] = []
    errors: list[dict] = []
    sibling_order: dict[str | None, int] = {}

    def next_sort_order(parent_key: str | None) -> int:
        order = sibling_order.get(parent_key, 0)
        sibling_order[parent_key] = order + 1
        return order

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
            parent_key = parent if isinstance(parent, str) else parent_slug
            doc = client.upsert_document(
                product_slug,
                title=title,
                slug=slug,
                content=content,
                parent_slug=parent,
                version_slug=version_slug,
                sort_order=next_sort_order(parent_key),
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
