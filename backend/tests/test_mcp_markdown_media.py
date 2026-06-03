"""Unit tests for mcp/markdown_media.py (no API)."""

import sys
from pathlib import Path

import pytest

MCP_ROOT = Path(__file__).resolve().parents[2] / "mcp"
if str(MCP_ROOT) not in sys.path:
    sys.path.insert(0, str(MCP_ROOT))

from markdown_media import (  # noqa: E402
    is_uploaded_or_remote,
    resolve_local_media_path,
    rewrite_markdown_local_images,
)

from tests.mcp_tool_helpers import MINI_PNG  # noqa: E402


def test_is_uploaded_or_remote():
    assert is_uploaded_or_remote("/uploads/p/latest/a.png")
    assert is_uploaded_or_remote("https://cdn.example/x.png")
    assert not is_uploaded_or_remote("./img.png")


def test_resolve_local_media_path(tmp_path):
    img = tmp_path / "assets" / "shot.png"
    img.parent.mkdir()
    img.write_bytes(MINI_PNG)
    md_dir = tmp_path
    assert resolve_local_media_path("assets/shot.png", md_dir) == img.resolve()
    assert resolve_local_media_path("../etc/passwd", md_dir) is None


def test_rewrite_markdown_local_images(tmp_path):
    img = tmp_path / "pic.png"
    img.write_bytes(MINI_PNG)
    content = "# Hi\n\n![diagram](./pic.png)\n"
    uploaded: list[Path] = []

    def fake_upload(path: Path) -> str:
        uploaded.append(path)
        return "/uploads/demo/latest/fake-uuid.png"

    new_body, log = rewrite_markdown_local_images(content, tmp_path, fake_upload)
    assert len(uploaded) == 1
    assert "/uploads/demo/latest/fake-uuid.png" in new_body
    assert "./pic.png" not in new_body
    assert len(log) == 1
