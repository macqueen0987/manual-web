#!/usr/bin/env python3
"""
Agent Gate lifecycle hooks — shared by Cursor (.cursor/hooks.json) and Kimi ([[hooks]] in config.toml).

Usage:
  python hooks/agent_gate_hook.py session
  python hooks/agent_gate_hook.py pre_edit   # auto-claim via REST if needed
  python hooks/agent_gate_hook.py pre_build
  python hooks/agent_gate_hook.py stop       # auto-release agent scopes

Env:
  AGENT_GATE_URL       default http://localhost:8765
  AGENT_GATE_AGENT     default cursor (set kimi in Kimi install)
  AGENT_GATE_WORKSPACE override workspace id (else .agent-gate/workspace.toml)
  AGENT_GATE_STRICT    1 = block when auto-claim fails (conflict/server); 0 = warn on non-conflict misses
  AGENT_GATE_AUTO_CLAIM 0 to disable REST auto-claim (default 1)
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from workspace import load_workspace, workspace_from_env


def _base_url() -> str:
    return os.environ.get("AGENT_GATE_URL", "http://localhost:8765").rstrip("/")


def _agent() -> str:
    return os.environ.get("AGENT_GATE_AGENT", "cursor")


def _strict() -> bool:
    return os.environ.get("AGENT_GATE_STRICT", "0").strip() in ("1", "true", "yes")


def _auto_claim_enabled() -> bool:
    return os.environ.get("AGENT_GATE_AUTO_CLAIM", "1").strip() not in ("0", "false", "no")


def _resolve_workspace(payload: dict[str, Any] | None = None) -> tuple[str, str]:
    if os.environ.get("AGENT_GATE_WORKSPACE", "").strip():
        wid = workspace_from_env()
        return wid, wid
    start = None
    if payload:
        cwd = payload.get("cwd") or payload.get("workspace_roots")
        if isinstance(cwd, list) and cwd:
            start = Path(cwd[0])
        elif cwd:
            start = Path(str(cwd))
    return load_workspace(start)[:2]


def _api_headers(workspace_id: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Agent-Gate-Workspace": workspace_id,
    }


def _read_stdin_json() -> dict[str, Any]:
    raw = sys.stdin.read().lstrip("\ufeff")
    if not raw.strip():
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Cursor may invoke hooks with empty/malformed stdin (e.g. manual test, race).
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _emit(obj: dict[str, Any]) -> None:
    out = json.dumps(obj, ensure_ascii=False) + "\n"
    # Windows console (cp949) safe: write UTF-8 bytes to stdout buffer
    if hasattr(sys.stdout, "buffer"):
        sys.stdout.buffer.write(out.encode("utf-8"))
        sys.stdout.buffer.flush()
    else:
        print(out, end="")


def _fail_open() -> None:
    _emit({"permission": "allow"})
    sys.exit(0)


def _api_get(path: str, workspace_id: str) -> dict[str, Any] | None:
    try:
        sep = "&" if "?" in path else "?"
        url = f"{_base_url()}{path}{sep}workspace_id={urllib.parse.quote(workspace_id)}"
        req = urllib.request.Request(url, headers=_api_headers(workspace_id))
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None


def _api_post(path: str, body: dict[str, Any], workspace_id: str) -> dict[str, Any] | None:
    body = {**body, "workspace_id": workspace_id}
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{_base_url()}{path}",
        data=data,
        headers=_api_headers(workspace_id),
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {"ok": False, "error": f"HTTP {e.code}"}
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def _format_team_context(data: dict[str, Any], ws_id: str, ws_name: str) -> str:
    lines = [
        "<agent_gate_team_feed>",
        f"Workspace: {ws_name} (id={ws_id}) — pass workspace_id=\"{ws_id}\" on every MCP call.",
        "Agent Gate team activity (who is working / planned / recent history):",
    ]
    now = data.get("now") or {}
    working = now.get("working") or []
    planned = now.get("planned") or []
    if working:
        lines.append("\n## Now working")
        for w in working:
            files = ", ".join(w.get("files") or []) or "(no files listed)"
            lines.append(f"- {w.get('agent')}: {w.get('message')} [{files}]")
    else:
        lines.append("\n## Now working\n(none)")
    if planned:
        lines.append("\n## Planned (not yet claimed)")
        for p in planned:
            files = ", ".join(p.get("files") or []) or "-"
            lines.append(f"- {p.get('agent')}: {p.get('message')} [{files}]")
    recent = now.get("recent") or []
    if recent:
        lines.append("\n## Recent (last few minutes)")
        for r in recent:
            files = ", ".join(r.get("files") or []) or "-"
            kind = r.get("kind") or "working"
            lines.append(f"- [{kind}] {r.get('agent')}: {r.get('message')} [{files}]")
    history = data.get("history") or []
    if history:
        lines.append("\n## Recent history")
        for h in history[:8]:
            files = ", ".join(h.get("files") or [])[:80]
            suffix = f" [{files}]" if files else ""
            lines.append(f"- [{h.get('kind')}] {h.get('agent')}: {h.get('message')}{suffix}")
    lines.append(
        "\nFile edits are auto-claimed via hooks (REST). MCP claim_scope is optional but preferred for explicit reasons. "
        "Scopes auto-release on session stop."
    )
    lines.append("</agent_gate_team_feed>")
    return "\n".join(lines)


def cmd_session() -> None:
    payload = _read_stdin_json()
    ws_id, ws_name = _resolve_workspace(payload)
    data = _api_get("/api/activity?limit=25", ws_id)
    if not data:
        _emit({
            "additional_context": f"<agent_gate> Server unreachable; workspace_id={ws_id}. MCP rules still apply.</agent_gate>",
            "env": {"AGENT_GATE_WORKSPACE": ws_id, "AGENT_GATE_URL": _base_url(), "AGENT_GATE_AGENT": _agent()},
        })
        sys.exit(0)
    ctx = _format_team_context(data, ws_id, ws_name)
    _emit(
        {
            "additional_context": ctx,
            "env": {
                "AGENT_GATE_URL": _base_url(),
                "AGENT_GATE_AGENT": _agent(),
                "AGENT_GATE_WORKSPACE": ws_id,
            },
        }
    )
    sys.exit(0)


def _extract_edit_paths(payload: dict[str, Any]) -> list[str]:
    tool = payload.get("tool_input") or {}
    if isinstance(tool, str):
        try:
            tool = json.loads(tool)
        except json.JSONDecodeError:
            return []
    paths: list[str] = []
    for key in ("path", "file_path", "target_file", "filePath"):
        v = tool.get(key)
        if v:
            paths.append(str(v))
    # StrReplace / multi-file
    for key in ("file", "filename"):
        v = tool.get(key)
        if v:
            paths.append(str(v))
    cwd = payload.get("cwd") or "."
    rel_paths = []
    for p in paths:
        path = Path(p)
        if path.is_absolute():
            try:
                rel = path.resolve().relative_to(Path(cwd).resolve())
                rel_paths.append(rel.as_posix())
            except ValueError:
                rel_paths.append(path.name)
        else:
            rel_paths.append(path.as_posix().replace("\\", "/"))
    return rel_paths


def _agent_has_scope_for_files(scopes: list[dict], agent: str, files: list[str]) -> bool:
    mine = [s for s in scopes if s.get("agent") == agent and s.get("status", "active") == "active"]
    if not mine:
        return False
    if not files:
        return True
    scope_files: list[str] = []
    for s in mine:
        scope_files.extend(s.get("files") or [])
    if not scope_files:
        return True
    # import db overlap logic — duplicate minimal check
    for f in files:
        matched = False
        for sf in scope_files:
            if f == sf or f.startswith(sf.rstrip("/") + "/"):
                matched = True
                break
            if "*" in sf or "**" in sf:
                import fnmatch

                if fnmatch.fnmatch(f, sf.replace("\\", "/")):
                    matched = True
                    break
        if not matched:
            return False
    return True


def _git_branch(payload: dict[str, Any]) -> str | None:
    cwd = payload.get("cwd") or "."
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=3,
        )
        if r.returncode == 0:
            branch = (r.stdout or "").strip()
            if branch and branch != "HEAD":
                return branch
    except (OSError, subprocess.TimeoutExpired):
        pass
    return None


def _deny(msg: str) -> None:
    _emit({"permission": "deny", "user_message": msg, "agent_message": msg})
    sys.exit(2)


def _auto_claim(payload: dict[str, Any], ws_id: str, agent: str, files: list[str]) -> dict[str, Any] | None:
    file_list = ", ".join(files[:5])
    if len(files) > 5:
        file_list += f" (+{len(files) - 5})"
    return _api_post(
        "/api/claim",
        {
            "agent": agent,
            "files": files,
            "branch": _git_branch(payload),
            "reason": f"hook:auto-claim before edit ({file_list})",
        },
        ws_id,
    )


def cmd_pre_edit() -> None:
    payload = _read_stdin_json()
    ws_id, _ = _resolve_workspace(payload)
    files = _extract_edit_paths(payload)
    if not files:
        _fail_open()

    status = _api_get("/api/status", ws_id)
    if not status:
        _fail_open()

    active = status.get("active_scopes") or []
    agent = _agent()
    if _agent_has_scope_for_files(active, agent, files):
        _emit({"permission": "allow"})
        sys.exit(0)

    if not _auto_claim_enabled():
        msg = (
            f"[{ws_id}] No claim for {agent} on {', '.join(files[:5])}. "
            f"Enable AGENT_GATE_AUTO_CLAIM or call claim_scope."
        )
        if _strict():
            _deny(msg)
        _emit({"permission": "allow", "agent_message": f"⚠️ {msg}"})
        sys.exit(0)

    res = _auto_claim(payload, ws_id, agent, files)
    if res and res.get("ok"):
        scope = res.get("scope") or {}
        sid = scope.get("id", "?")
        _emit(
            {
                "permission": "allow",
                "agent_message": f"Agent Gate auto-claimed scope {sid} for {agent} on {', '.join(files[:3])}.",
            }
        )
        sys.exit(0)

    if res is None:
        if _strict():
            _deny(f"[{ws_id}] Agent Gate unreachable; cannot auto-claim.")
        _fail_open()

    conflicts = res.get("conflicts") or []
    if conflicts:
        who = ", ".join({c.get("agent", "?") for c in conflicts})
        msg = (
            f"[{ws_id}] Edit blocked: {who} already working on overlapping files "
            f"({', '.join(files[:3])})."
        )
        _deny(msg)

    err = res.get("message") or res.get("error") or "auto-claim failed"
    msg = f"[{ws_id}] Agent Gate auto-claim failed: {err}"
    if _strict():
        _deny(msg)
    _emit({"permission": "allow", "agent_message": f"⚠️ {msg}"})
    sys.exit(0)


def _list_my_scopes(ws_id: str, agent: str) -> list[dict[str, Any]]:
    data = _api_get(f"/api/scopes?agent={urllib.parse.quote(agent)}", ws_id)
    if not data:
        return []
    return data.get("scopes") or []


def cmd_stop() -> None:
    payload = _read_stdin_json()
    ws_id, _ = _resolve_workspace(payload)
    agent = _agent()
    scopes = _list_my_scopes(ws_id, agent)
    released = []
    for scope in scopes:
        sid = scope.get("id")
        if not sid:
            continue
        res = _api_post(
            "/api/release",
            {
                "scope_id": sid,
                "agent": agent,
                "note": "hook:auto-release on session stop",
            },
            ws_id,
        )
        if res and res.get("ok"):
            released.append(sid)
    # stop hook: optional follow-up for agent (Cursor)
    if released:
        _emit(
            {
                "followup_message": (
                    f"Agent Gate released scopes: {', '.join(released)}. "
                    f"No manual release_scope needed."
                )
            }
        )
    else:
        _emit({})
    sys.exit(0)


def _files_touch_scope(files: list[str], scope: dict) -> bool:
    scope_files = scope.get("files") or []
    for f in files:
        for sf in scope_files:
            if f == sf or f.startswith(sf.rstrip("/") + "/"):
                return True
    return False


_BASE_BUILD_PATTERN = (
    r"(pytest|npm\s+(run\s+)?(test|build)|pnpm\s+(run\s+)?(test|build)|"
    r"yarn\s+(test|build)|make\b|mvn\b|gradle\b|"
    r"docker[\s-]+compose\b.*?\b(?:up|build)\b|"
    r"docker\s+buildx\b.*?\b(?:build|bake)\b|docker\s+build\b|"
    r"cargo\s+(build|test)|go\s+(build|test))"
)

_OPTIONAL_BUILD_REGEX: dict[str, str] = {
    "docker_restart": r"docker\s+restart\b",
    "docker_compose_restart": r"docker[\s-]+compose\b.*?\brestart\b",
}

_BUILD_RE_CACHE: dict[str, tuple[float, re.Pattern[str]]] = {}
_BUILD_SETTINGS_TTL_SEC = 30.0


def _default_build_settings() -> dict[str, Any]:
    return {
        "optional_build": {
            "docker_restart": False,
            "docker_compose_restart": False,
        },
        "custom_build_patterns": [],
    }


def _merge_build_settings(stored: dict[str, Any] | None) -> dict[str, Any]:
    out = _default_build_settings()
    if not stored:
        return out
    opt = stored.get("optional_build")
    if isinstance(opt, dict):
        for key in out["optional_build"]:
            if key in opt:
                out["optional_build"][key] = bool(opt[key])
    custom = stored.get("custom_build_patterns")
    if isinstance(custom, list):
        out["custom_build_patterns"] = [str(p) for p in custom if str(p).strip()]
    return out


def _fetch_build_settings(ws_id: str) -> dict[str, Any]:
    data = _api_get("/api/settings", ws_id)
    if not data:
        return _default_build_settings()
    return _merge_build_settings(data.get("settings"))


def _compile_build_re(settings: dict[str, Any]) -> re.Pattern[str]:
    parts = [_BASE_BUILD_PATTERN]
    for key, enabled in settings.get("optional_build", {}).items():
        if enabled and key in _OPTIONAL_BUILD_REGEX:
            parts.append(_OPTIONAL_BUILD_REGEX[key])
    for p in settings.get("custom_build_patterns") or []:
        parts.append(f"(?:{p})")
    return re.compile("|".join(parts), re.I)


def _build_re_for_workspace(ws_id: str) -> re.Pattern[str]:
    now = time.monotonic()
    cached = _BUILD_RE_CACHE.get(ws_id)
    if cached and now - cached[0] < _BUILD_SETTINGS_TTL_SEC:
        return cached[1]
    settings = _fetch_build_settings(ws_id)
    compiled = _compile_build_re(settings)
    _BUILD_RE_CACHE[ws_id] = (now, compiled)
    return compiled


# Default regex when settings API unavailable (base patterns only)
_BUILD_RE = re.compile(_BASE_BUILD_PATTERN, re.I)


def _shell_command(payload: dict[str, Any]) -> str:
    cmd = payload.get("command")
    if cmd:
        return str(cmd)
    tool = payload.get("tool_input") or {}
    if isinstance(tool, str):
        try:
            tool = json.loads(tool)
        except json.JSONDecodeError:
            return ""
    if isinstance(tool, dict):
        return str(tool.get("command") or "")
    return ""


def _record_build_check(ws_id: str) -> dict[str, Any] | None:
    return _api_post(
        "/api/check-build",
        {"requester": _agent(), "files": None, "branch": None},
        ws_id,
    )


def cmd_pre_build() -> None:
    payload = _read_stdin_json()
    ws_id, _ = _resolve_workspace(payload)
    command = _shell_command(payload)
    if not _build_re_for_workspace(ws_id).search(command):
        _fail_open()

    res = _record_build_check(ws_id)
    if not res:
        _fail_open()

    if res.get("result") == "blocked":
        check = res.get("check") or {}
        reason = check.get("reason") or "other agents have active scopes"
        msg = f"[{ws_id}] Agent Gate: build/test blocked — {reason}."
        if _strict():
            _emit(
                {
                    "permission": "deny",
                    "user_message": msg,
                    "agent_message": msg,
                }
            )
            sys.exit(2)
        _emit({"permission": "allow", "agent_message": f"⚠️ {msg}"})
        sys.exit(0)

    _emit({"permission": "allow"})
    sys.exit(0)


def cmd_post_build() -> None:
    """Post-shell audit: record build_checks after Shell/Bash (Kimi PostToolUse)."""
    payload = _read_stdin_json()
    ws_id, _ = _resolve_workspace(payload)
    command = _shell_command(payload)
    if _build_re_for_workspace(ws_id).search(command):
        _record_build_check(ws_id)
    sys.exit(0)


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "usage: agent_gate_hook.py <session|pre_edit|pre_build|post_build|stop>",
            file=sys.stderr,
        )
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "session":
        cmd_session()
    elif cmd == "pre_edit":
        cmd_pre_edit()
    elif cmd == "pre_build":
        cmd_pre_build()
    elif cmd == "post_build":
        cmd_post_build()
    elif cmd == "stop":
        cmd_stop()
    else:
        print(f"unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
