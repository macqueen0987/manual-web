"""MCP SQLite admin provisioning."""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

_mcp = Path(__file__).resolve().parents[2] / "mcp"
if str(_mcp) not in sys.path:
    sys.path.insert(0, str(_mcp))

from provision_admin import (  # noqa: E402
    LEGACY_MCP_EMAIL,
    provision_mcp_admin,
    _migrate_legacy_mcp_email,
)


def _create_users_table(db_path: Path) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                hashed_password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                is_active BOOLEAN DEFAULT 1,
                is_superuser BOOLEAN DEFAULT 0,
                created_at DATETIME,
                updated_at DATETIME
            )
            """
        )
        conn.commit()


def test_provision_creates_superuser(tmp_path):
    db = tmp_path / "app.db"
    _create_users_table(db)
    action = provision_mcp_admin(
        db, email="mcp@test.local", password="mcp-dev-password-min-16-chars", full_name="MCP"
    )
    assert action == "created"
    with sqlite3.connect(db) as conn:
        row = conn.execute(
            "SELECT is_superuser, is_active FROM users WHERE email = ?", ("mcp@test.local",)
        ).fetchone()
    assert row == (1, 1)


def test_migrate_legacy_local_email(tmp_path):
    db = tmp_path / "app.db"
    _create_users_table(db)
    now = "2026-06-03 12:00:00"
    with sqlite3.connect(db) as conn:
        conn.execute(
            """
            INSERT INTO users (email, hashed_password, full_name, is_active, is_superuser, created_at, updated_at)
            VALUES (?, 'x', 'Legacy', 1, 1, ?, ?)
            """,
            (LEGACY_MCP_EMAIL, now, now),
        )
        conn.commit()
        assert _migrate_legacy_mcp_email(conn, "mcp-admin@example.com")
        row = conn.execute("SELECT email FROM users").fetchone()
    assert row[0] == "mcp-admin@example.com"


def test_provision_updates_password(tmp_path):
    db = tmp_path / "app.db"
    _create_users_table(db)
    provision_mcp_admin(db, email="mcp@test.local", password="old-password-min-16-chars!!", full_name="MCP")
    action = provision_mcp_admin(
        db, email="mcp@test.local", password="new-password-min-16-chars!!", full_name="MCP"
    )
    assert action == "updated"
