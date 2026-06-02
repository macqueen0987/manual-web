"""
Per-repo workspace identity (.git-style `.agent-gate/workspace.toml`).

Walk up from cwd to find `.agent-gate/workspace.toml` and read stable `id`.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Optional, Tuple

WORKSPACE_DIR = ".agent-gate"
WORKSPACE_FILE = "workspace.toml"
DEFAULT_WORKSPACE_ID = "default"


def slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "workspace"


def find_workspace_root(start: Optional[Path] = None) -> Optional[Path]:
    """Return repo root containing `.agent-gate/workspace.toml`, else None."""
    cur = (start or Path.cwd()).resolve()
    if cur.is_file():
        cur = cur.parent
    for directory in (cur, *cur.parents):
        if (directory / WORKSPACE_DIR / WORKSPACE_FILE).is_file():
            return directory
    return None


def load_workspace(start: Optional[Path] = None) -> Tuple[str, str, Optional[Path]]:
    """
    Returns (workspace_id, workspace_name, root_path).
    Falls back to DEFAULT_WORKSPACE_ID if no marker file.
    """
    root = find_workspace_root(start)
    if not root:
        return DEFAULT_WORKSPACE_ID, "default", None

    path = root / WORKSPACE_DIR / WORKSPACE_FILE
    data = _read_toml(path)
    ws = data.get("workspace") or {}
    ws_id = (ws.get("id") or "").strip() or slugify(root.name)
    ws_name = (ws.get("name") or "").strip() or root.name
    return ws_id, ws_name, root


def load_workspace_id(start: Optional[Path] = None) -> str:
    return load_workspace(start)[0]


def ensure_workspace_marker(
    project_root: Path,
    workspace_id: Optional[str] = None,
    name: Optional[str] = None,
) -> Path:
    """Create `.agent-gate/workspace.toml` if missing. Returns path to file."""
    project_root = project_root.resolve()
    gate_dir = project_root / WORKSPACE_DIR
    gate_dir.mkdir(parents=True, exist_ok=True)
    path = gate_dir / WORKSPACE_FILE
    if path.exists():
        return path

    ws_id = (workspace_id or "").strip() or slugify(project_root.name)
    ws_name = (name or "").strip() or project_root.name
    content = f'''# Agent Gate workspace identity (like .git for coordination scope)
# Do not share this id across unrelated repos.

[workspace]
id = "{ws_id}"
name = "{ws_name}"
'''
    path.write_text(content, encoding="utf-8")
    return path


def _read_toml(path: Path) -> dict:
    try:
        import tomllib

        with open(path, "rb") as f:
            return tomllib.load(f)
    except Exception:
        return {}


def workspace_from_env() -> str:
    return os.environ.get("AGENT_GATE_WORKSPACE", "").strip() or load_workspace_id()
