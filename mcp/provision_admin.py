"""Ensure MCP admin exists in the Manual Web SQLite DB (create or reset password)."""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

import bcrypt

_BCRYPT_ROUNDS = 12


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=_BCRYPT_ROUNDS),
    ).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False

# Pydantic EmailStr rejects `.local` domains; breaks GET /api/auth/me after login.
LEGACY_MCP_EMAIL = "mcp-admin@manual.local"
DEFAULT_MCP_EMAIL = "mcp-admin@example.com"


def resolve_sqlite_path() -> Path | None:
    """Resolve SQLite file path from MCP_DATABASE_PATH or DATABASE_URL."""
    explicit = os.environ.get("MCP_DATABASE_PATH", "").strip()
    if explicit:
        return Path(explicit)

    url = os.environ.get("DATABASE_URL", "").strip()
    if not url.startswith("sqlite"):
        return None

    parsed = urlparse(url)
    if parsed.path in ("", "/"):
        return None
    # sqlite:////absolute/path → path is /absolute/path
    raw = unquote(parsed.path)
    if os.name == "nt" and raw.startswith("/") and len(raw) > 2 and raw[2] == ":":
        raw = raw[1:]
    return Path(raw)


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ", timespec="seconds")


def _migrate_legacy_mcp_email(conn: sqlite3.Connection, target_email: str) -> bool:
    """Rename legacy MCP admin email so API UserOut validation succeeds."""
    if target_email == LEGACY_MCP_EMAIL:
        return False
    legacy = conn.execute(
        "SELECT id FROM users WHERE email = ?", (LEGACY_MCP_EMAIL,)
    ).fetchone()
    if legacy is None:
        return False
    occupant = conn.execute(
        "SELECT id FROM users WHERE email = ?", (target_email,)
    ).fetchone()
    if occupant is not None and occupant[0] != legacy[0]:
        conn.execute("DELETE FROM users WHERE email = ?", (LEGACY_MCP_EMAIL,))
        conn.commit()
        return True
    conn.execute(
        "UPDATE users SET email = ?, updated_at = ? WHERE email = ?",
        (target_email, _now_iso(), LEGACY_MCP_EMAIL),
    )
    conn.commit()
    return True


def provision_mcp_admin(
    db_path: Path,
    *,
    email: str,
    password: str,
    full_name: str,
) -> str:
    """Create or update a superuser. Returns 'created', 'updated', or 'unchanged'."""
    if not db_path.is_file():
        raise FileNotFoundError(f"SQLite database not found: {db_path}")

    hashed = _hash_password(password)
    now = _now_iso()

    with sqlite3.connect(db_path) as conn:
        if _migrate_legacy_mcp_email(conn, email):
            print(f"provision_admin: migrated {LEGACY_MCP_EMAIL} → {email}")

        row = conn.execute("SELECT id, hashed_password FROM users WHERE email = ?", (email,)).fetchone()
        if row is None:
            conn.execute(
                """
                INSERT INTO users (email, hashed_password, full_name, is_active, is_superuser, created_at, updated_at)
                VALUES (?, ?, ?, 1, 1, ?, ?)
                """,
                (email, hashed, full_name, now, now),
            )
            conn.commit()
            return "created"

        user_id, old_hash = row
        if _verify_password(password, old_hash):
            conn.execute(
                "UPDATE users SET is_active = 1, is_superuser = 1, full_name = ?, updated_at = ? WHERE id = ?",
                (full_name, now, user_id),
            )
            conn.commit()
            return "unchanged"

        conn.execute(
            """
            UPDATE users
            SET hashed_password = ?, full_name = ?, is_active = 1, is_superuser = 1, updated_at = ?
            WHERE id = ?
            """,
            (hashed, full_name, now, user_id),
        )
        conn.commit()
        return "updated"
