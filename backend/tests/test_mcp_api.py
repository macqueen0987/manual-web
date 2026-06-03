"""MCP HTTP client + tool helpers against the same in-memory API app."""

import json
import sys
from pathlib import Path

import pytest
from starlette.testclient import TestClient

def _find_mcp_root() -> Path | None:
    here = Path(__file__).resolve()
    for candidate in (
        here.parents[2] / "mcp",  # repo root when running from backend/tests
        Path("/mcp"),  # docker-compose mount
        here.parents[1] / "mcp",
    ):
        if (candidate / "client.py").is_file():
            return candidate
    return None


MCP_ROOT = _find_mcp_root()
if MCP_ROOT is None:
    pytest.skip("mcp package not found (mount ./mcp:/mcp in Docker)", allow_module_level=True)
if str(MCP_ROOT) not in sys.path:
    sys.path.insert(0, str(MCP_ROOT))

from client import ManualWebClient, ManualWebError  # noqa: E402

from tests.api_helpers import seed_admin_user, seed_product_with_versions  # noqa: E402

pytest.importorskip("mcp")


def test_mcp_list_products(mcp_client, db):
    seed_product_with_versions(db, slug="mcp-prod")
    products = mcp_client.list_products()
    assert any(p["slug"] == "mcp-prod" for p in products)


def test_mcp_resolve_latest_version_id(mcp_client, db):
    seed_admin_user(db)
    seed_product_with_versions(db, slug="mcp-ver")
    version_id = mcp_client.resolve_version_id("mcp-ver", "latest")
    assert isinstance(version_id, int)


def test_mcp_create_and_get_document(mcp_client, db):
    seed_admin_user(db)
    seed_product_with_versions(db, slug="mcp-doc")
    created = mcp_client.create_document(
        version_id=mcp_client.resolve_version_id("mcp-doc", "latest"),
        title="MCP Page",
        slug="mcp-page",
        content="# MCP Page\n\nfrom mcp client\n",
    )
    assert created["slug"] == "mcp-page"
    doc = mcp_client.get_document("mcp-doc", "mcp-page", "latest")
    assert "from mcp client" in doc["content"]


def test_mcp_upsert_updates_existing(mcp_client, db):
    seed_admin_user(db)
    seed_product_with_versions(db, slug="mcp-upsert")
    mcp_client.upsert_document(
        "mcp-upsert",
        title="First",
        slug="upsert-me",
        content="# First\n",
        version_slug="latest",
    )
    mcp_client.upsert_document(
        "mcp-upsert",
        title="Second",
        slug="upsert-me",
        content="# Second\n\nupdated body\n",
        version_slug="latest",
    )
    doc = mcp_client.get_document("mcp-upsert", "upsert-me", "latest")
    assert "updated body" in doc["content"]


def test_mcp_login_failure(mcp_http, monkeypatch):
    monkeypatch.setenv("MANUAL_WEB_EMAIL", "nobody@example.com")
    monkeypatch.setenv("MANUAL_WEB_PASSWORD", "wrong-password-32chars-minimum!!")
    client = ManualWebClient(base_url="http://testserver", http_client=mcp_http)
    with pytest.raises(ManualWebError, match="Login failed"):
        client.login()


MINI_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def test_mcp_upload_list_delete_media(mcp_client, db, tmp_path):
    seed_admin_user(db)
    seed_product_with_versions(db, slug="mcp-media")
    img = tmp_path / "diagram.png"
    img.write_bytes(MINI_PNG)

    meta = mcp_client.upload_media(img, "mcp-media", "latest")
    assert meta["url"].startswith("/uploads/mcp-media/latest/")
    assert meta["kind"] == "image"

    listing = mcp_client.list_media("mcp-media", "latest")
    assert meta["id"] in {item["id"] for item in listing["items"]}

    mcp_client.delete_media(meta["id"])
    after = mcp_client.list_media("mcp-media", "latest")
    assert meta["id"] not in {item["id"] for item in after["items"]}


def test_mcp_create_delete_document(mcp_client, db):
    seed_admin_user(db)
    seed_product_with_versions(db, slug="mcp-del-doc")
    vid = mcp_client.resolve_version_id("mcp-del-doc", "latest")
    created = mcp_client.create_document(
        version_id=vid,
        title="Disposable",
        slug="disposable",
        content="# Disposable\n",
    )
    mcp_client.delete_document(created["id"])
    with pytest.raises(ManualWebError):
        mcp_client.get_document("mcp-del-doc", "disposable", "latest")


def test_mcp_import_rewrites_local_images(mcp_client, db, tmp_path, monkeypatch):
    seed_admin_user(db)
    seed_product_with_versions(db, slug="mcp-img-md")
    img = tmp_path / "fig.png"
    img.write_bytes(MINI_PNG)
    md = tmp_path / "page.md"
    md.write_text("# Page\n\n![fig](./fig.png)\n", encoding="utf-8")

    import server  # noqa: E402

    monkeypatch.setattr(server, "client", mcp_client)
    out = json.loads(
        server.import_markdown_file(
            str(md),
            "mcp-img-md",
            upload_local_images=True,
        )
    )
    assert out.get("error") is None
    assert len(out["media_uploads"]) == 1
    doc = mcp_client.get_document("mcp-img-md", "page", "latest")
    assert "/uploads/mcp-img-md/latest/" in doc["content"]
    assert "./fig.png" not in doc["content"]

    doc_id = out["document"]["id"]
    mcp_client.delete_document(doc_id)
    mcp_client.cleanup_orphan_media("mcp-img-md", "latest")
    with pytest.raises(ManualWebError):
        mcp_client.get_document("mcp-img-md", "page", "latest")


def test_mcp_server_slug_helpers():
    from server import _slug_ok, _title_from_markdown  # noqa: E402

    assert _slug_ok("page-8779a905")
    assert not _slug_ok("bad slug")
    assert _title_from_markdown("# Hello World\n\nx", "fallback") == "Hello World"
    assert _title_from_markdown("no heading", "my-slug") == "My Slug"
