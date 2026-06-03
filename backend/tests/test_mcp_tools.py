"""MCP server tools: create/upload → verify → delete/cleanup."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_here = Path(__file__).resolve()
for _candidate in (_here.parents[2] / "mcp", Path("/mcp"), _here.parents[1] / "mcp"):
    if (_candidate / "client.py").is_file():
        if str(_candidate) not in sys.path:
            sys.path.insert(0, str(_candidate))
        break
else:
    pytest.skip("mcp package not found", allow_module_level=True)

from client import ManualWebClient, ManualWebError  # noqa: E402

from tests.mcp_tool_helpers import (  # noqa: E402
    MINI_PNG,
    media_ids,
    seed_mcp_product,
    tool_result,
    tree_slugs,
)

pytest.importorskip("mcp")


@pytest.fixture()
def mcp_tools(mcp_client, monkeypatch):
    import server as srv  # noqa: E402

    monkeypatch.setattr(srv, "client", mcp_client)
    return srv


@pytest.fixture()
def mcp_product(db):
    return seed_mcp_product(db, slug="mcp-tools")


def test_tool_upload_media_then_delete(mcp_tools, mcp_client, mcp_product, tmp_path):
    img = tmp_path / "one.png"
    img.write_bytes(MINI_PNG)

    meta = tool_result(mcp_tools.upload_media(str(img), "mcp-tools", "latest"))
    media_id = meta["id"]
    assert media_id in media_ids(tool_result(mcp_tools.list_media("mcp-tools", "latest")))

    tool_result(mcp_tools.delete_media(media_id))
    assert media_id not in media_ids(tool_result(mcp_tools.list_media("mcp-tools", "latest")))


def test_tool_orphan_upload_cleanup(mcp_tools, mcp_product, tmp_path):
    orphan = tmp_path / "orphan.png"
    orphan.write_bytes(MINI_PNG)
    meta = tool_result(mcp_tools.upload_media(str(orphan), "mcp-tools", "latest"))

    orphans = tool_result(mcp_tools.list_media("mcp-tools", "latest", orphans_only=True))
    assert meta["id"] in media_ids(orphans)

    cleaned = tool_result(mcp_tools.cleanup_orphan_media("mcp-tools", "latest"))
    assert meta["id"] in cleaned["deleted"]
    assert meta["id"] not in media_ids(tool_result(mcp_tools.list_media("mcp-tools", "latest")))


def test_tool_create_document_then_delete(mcp_tools, mcp_client, mcp_product):
    created = tool_result(
        mcp_tools.create_document(
            "mcp-tools",
            title="Temp",
            slug="temp-doc",
            content="# Temp\n",
        )
    )
    doc_id = created["id"]
    tree = tool_result(mcp_tools.list_documents("mcp-tools", "latest"))
    assert "temp-doc" in tree_slugs(tree)

    tool_result(mcp_tools.delete_document(doc_id))
    tree_after = tool_result(mcp_tools.list_documents("mcp-tools", "latest"))
    assert "temp-doc" not in tree_slugs(tree_after)

    with pytest.raises(ManualWebError):
        mcp_client.get_document("mcp-tools", "temp-doc", "latest")


def test_tool_import_with_images_then_cleanup(mcp_tools, mcp_client, mcp_product, tmp_path):
    img = tmp_path / "fig.png"
    img.write_bytes(MINI_PNG)
    md = tmp_path / "guide.md"
    md.write_text("# Guide\n\n![fig](./fig.png)\n", encoding="utf-8")

    imported = tool_result(
        mcp_tools.import_markdown_file(str(md), "mcp-tools", upload_local_images=True)
    )
    doc_id = imported["document"]["id"]
    upload_url = imported["media_uploads"][0]["url"]
    assert upload_url.startswith("/uploads/")

    doc = mcp_client.get_document("mcp-tools", "guide", "latest")
    assert upload_url in doc["content"]
    before_delete = tool_result(mcp_tools.list_media("mcp-tools", "latest"))
    assert any(item["url"] == upload_url for item in before_delete["items"])

    # delete_document also runs orphan upload cleanup on the server
    tool_result(mcp_tools.delete_document(doc_id))
    assert "guide" not in tree_slugs(tool_result(mcp_tools.list_documents("mcp-tools", "latest")))
    after_delete = tool_result(mcp_tools.list_media("mcp-tools", "latest"))
    assert not any(item["url"] == upload_url for item in after_delete["items"])


def test_tool_upload_media_directory_then_delete_all(mcp_tools, mcp_product, tmp_path):
    assets = tmp_path / "assets"
    assets.mkdir()
    (assets / "a.png").write_bytes(MINI_PNG)
    (assets / "b.png").write_bytes(MINI_PNG)

    batch = tool_result(
        mcp_tools.upload_media_directory(str(assets), "mcp-tools", "latest")
    )
    assert batch["uploaded"] == 2
    ids = [item["id"] for item in batch["items"]]

    for mid in ids:
        tool_result(mcp_tools.delete_media(mid))

    listing = tool_result(mcp_tools.list_media("mcp-tools", "latest"))
    assert not media_ids(listing).intersection(set(ids))


def test_tool_errors_are_json_not_raised(mcp_tools, mcp_product, tmp_path):
    missing = json.loads(mcp_tools.upload_media(str(tmp_path / "nope.png"), "mcp-tools"))
    assert "error" in missing

    bad_ext = tmp_path / "readme.txt"
    bad_ext.write_text("x", encoding="utf-8")
    rejected = json.loads(mcp_tools.upload_media(str(bad_ext), "mcp-tools"))
    assert "error" in rejected

    gone = json.loads(mcp_tools.delete_media("mcp-tools/latest/does-not-exist.png"))
    assert "error" in gone


def test_tool_import_skips_local_images_when_disabled(mcp_tools, mcp_client, mcp_product, tmp_path):
    img = tmp_path / "local.png"
    img.write_bytes(MINI_PNG)
    md = tmp_path / "plain.md"
    md.write_text("# Plain\n\n![x](./local.png)\n", encoding="utf-8")

    imported = tool_result(
        mcp_tools.import_markdown_file(
            str(md), "mcp-tools", upload_local_images=False
        )
    )
    assert imported["media_uploads"] == []
    doc = mcp_client.get_document("mcp-tools", "plain", "latest")
    assert "./local.png" in doc["content"]

    tool_result(mcp_tools.delete_document(imported["document"]["id"]))


def test_mcp_server_exposes_agent_instructions(mcp_tools):
    import server as srv  # noqa: E402
    from instructions import SERVER_INSTRUCTIONS  # noqa: E402

    assert srv.mcp.instructions == SERVER_INSTRUCTIONS
    assert "version_slug" in SERVER_INSTRUCTIONS
    assert "latest" in SERVER_INSTRUCTIONS
    assert mcp_tools.list_products.__doc__
