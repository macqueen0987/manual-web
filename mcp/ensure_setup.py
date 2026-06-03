"""Ensure Manual Web has an admin account for MCP (via /api/setup/init when empty)."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import httpx
import sqlite3

from provision_admin import provision_mcp_admin, resolve_sqlite_path

API_URL = os.environ.get("MANUAL_WEB_API_URL", "http://localhost:8000").rstrip("/")
ADMIN_EMAIL = (
    os.environ.get("MCP_ADMIN_EMAIL")
    or os.environ.get("MANUAL_WEB_EMAIL")
    or "mcp-admin@example.com"
)
ADMIN_PASSWORD = os.environ.get("MCP_ADMIN_PASSWORD") or os.environ.get(
    "MANUAL_WEB_PASSWORD", "mcp-dev-password-min-16-chars"
)
ADMIN_NAME = os.environ.get("MCP_ADMIN_NAME", "MCP Admin")
PRODUCT_NAME = os.environ.get("MCP_BOOTSTRAP_PRODUCT_NAME", "MCP Workspace")
PRODUCT_SLUG = os.environ.get("MCP_BOOTSTRAP_PRODUCT_SLUG", "mcp-workspace")
WAIT_SECONDS = int(os.environ.get("MCP_SETUP_WAIT_SECONDS", "90"))


def _wait_for_api(client: httpx.Client) -> None:
    deadline = time.monotonic() + WAIT_SECONDS
    while time.monotonic() < deadline:
        try:
            res = client.get(f"{API_URL}/health", timeout=5)
            if res.status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(1)
    print(f"ensure_setup: API not ready at {API_URL} after {WAIT_SECONDS}s", file=sys.stderr)
    sys.exit(1)


def _provision_admin_in_db() -> bool:
    """Create or sync MCP admin in SQLite when API setup is already complete."""
    if os.environ.get("MCP_PROVISION_DB", "1").lower() in ("0", "false", "no"):
        return False
    db_path = resolve_sqlite_path()
    if db_path is None:
        print("ensure_setup: DB provision skipped (set MCP_DATABASE_PATH for SQLite)", file=sys.stderr)
        return False
    try:
        action = provision_mcp_admin(
            Path(db_path),
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            full_name=ADMIN_NAME,
        )
        print(f"ensure_setup: DB provision {action} superuser {ADMIN_EMAIL} ({db_path})")
        return True
    except FileNotFoundError as e:
        print(f"ensure_setup: DB provision failed — {e}", file=sys.stderr)
        return False
    except sqlite3.Error as e:
        print(f"ensure_setup: DB provision failed — {e}", file=sys.stderr)
        return False


def _try_login(client: httpx.Client) -> bool:
    res = client.post(
        f"{API_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    return res.status_code == 200


def main() -> None:
    with httpx.Client() as client:
        _wait_for_api(client)
        status = client.get(f"{API_URL}/api/setup/status", timeout=30)
        status.raise_for_status()
        if status.json().get("is_setup_complete"):
            if _try_login(client):
                print(f"ensure_setup: setup complete; admin login OK ({ADMIN_EMAIL})")
                return
            print(
                f"ensure_setup: setup complete but login failed for {ADMIN_EMAIL}; provisioning DB…",
                file=sys.stderr,
            )
            _provision_admin_in_db()
            if _try_login(client):
                print(f"ensure_setup: admin login OK after DB provision ({ADMIN_EMAIL})")
                return
            print(
                "ensure_setup: login still failed after DB provision. "
                "Check MCP_ADMIN_EMAIL/PASSWORD and MCP_DATABASE_PATH.",
                file=sys.stderr,
            )
            if os.environ.get("MCP_SETUP_STRICT", "").lower() in ("1", "true", "yes"):
                sys.exit(1)
            return

        init = client.post(
            f"{API_URL}/api/setup/init",
            json={
                "admin": {
                    "email": ADMIN_EMAIL,
                    "password": ADMIN_PASSWORD,
                    "full_name": ADMIN_NAME,
                },
                "product": {
                    "name": PRODUCT_NAME,
                    "slug": PRODUCT_SLUG,
                    "description": "Bootstrap product for MCP tooling",
                },
            },
            timeout=60,
        )
        if init.status_code not in (200, 201):
            print(f"ensure_setup: setup/init failed ({init.status_code}): {init.text}", file=sys.stderr)
            sys.exit(1)

        if not _try_login(client):
            print("ensure_setup: setup/init succeeded but login failed", file=sys.stderr)
            sys.exit(1)

        print(f"ensure_setup: created admin {ADMIN_EMAIL} and product '{PRODUCT_SLUG}'")


if __name__ == "__main__":
    main()
