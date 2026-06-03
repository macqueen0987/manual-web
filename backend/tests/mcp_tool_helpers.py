"""Helpers for MCP server tool integration tests."""

from __future__ import annotations

import json
from typing import Any

import pytest

from tests.api_helpers import seed_admin_user, seed_product_with_versions

MINI_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def tool_result(raw: str) -> dict[str, Any]:
    """Parse MCP tool JSON; fail the test when the tool returned an error payload."""
    data = json.loads(raw)
    if isinstance(data, dict) and data.get("error"):
        pytest.fail(str(data["error"]))
    return data


def seed_mcp_product(db, *, slug: str = "mcp-tools"):
    seed_admin_user(db)
    return seed_product_with_versions(db, slug=slug)


def media_ids(listing: dict) -> set[str]:
    return {item["id"] for item in listing.get("items", [])}


def tree_slugs(tree: list[dict]) -> set[str]:
    out: set[str] = set()

    def walk(nodes: list[dict]) -> None:
        for node in nodes:
            out.add(node["slug"])
            walk(node.get("children") or [])

    walk(tree)
    return out
