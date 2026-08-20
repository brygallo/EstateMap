"""What the agent in a terminal is actually doing.

Both CLIs already write their session to a JSONL log — Claude Code under
`~/.claude/projects/<slug>/`, Codex under `~/.codex/sessions/<date>/`. Reading
those logs gives the panel a faithful timeline without instrumenting either
tool: no wrapper, no parsing of terminal output, nothing to keep in sync.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from . import factory

CLAUDE_PROJECTS = Path.home() / ".claude" / "projects"
CODEX_SESSIONS = Path.home() / ".codex" / "sessions"

# Only the tail of a log is read: a long session reaches megabytes because a
# single line can carry a whole screenshot, and the panel only ever shows the
# most recent steps. The tail is generous for that reason — a mean 500 KB would
# hold a handful of image reads and nothing else.
TAIL_BYTES = 3_000_000
MAX_STEPS = 60
IDLE_AFTER_SECONDS = 45

# Parsed steps, keyed by log path and invalidated by size and mtime: polling
# every few seconds must not re-parse megabytes when nothing has been written.
_cache: dict[str, tuple[tuple[int, float], list[dict[str, Any]]]] = {}


def _project_slug(path: Path) -> str:
    return re.sub(r"[^A-Za-z0-9]", "-", str(path))


def _tail_lines(path: Path) -> Iterable[str]:
    try:
        with path.open("rb") as handle:
            handle.seek(0, 2)
            size = handle.tell()
            handle.seek(max(0, size - TAIL_BYTES))
            raw = handle.read()
    except OSError:
        return []
    text = raw.decode("utf-8", errors="replace")
    lines = text.splitlines()
    if size > TAIL_BYTES and lines:
        lines = lines[1:]
    return lines


def _shorten(value: Any, limit: int = 240) -> str:
    text = " ".join(str(value or "").split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _relative(path_text: str) -> str:
    try:
        return str(Path(path_text).resolve().relative_to(factory.REPO_ROOT))
    except (ValueError, OSError):
        return path_text


def find_claude_log(started_at: float) -> Path | None:
    directory = CLAUDE_PROJECTS / _project_slug(factory.FACTORY_ROOT)
    if not directory.is_dir():
        return None
    candidates = [
        path
        for path in directory.glob("*.jsonl")
        if path.stat().st_mtime >= started_at - 2
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda path: path.stat().st_mtime)


def find_codex_log(started_at: float) -> Path | None:
    if not CODEX_SESSIONS.is_dir():
        return None
    candidates = [
        path
        for path in CODEX_SESSIONS.glob("*/*/*/*.jsonl")
        if path.stat().st_mtime >= started_at - 2
    ]
    for path in sorted(candidates, key=lambda item: item.stat().st_mtime, reverse=True):
        try:
            with path.open(encoding="utf-8") as handle:
                first = json.loads(handle.readline() or "{}")
        except (OSError, json.JSONDecodeError):
            continue
        payload = first.get("payload") or {}
        if str(payload.get("cwd") or "") == str(factory.FACTORY_ROOT):
            return path
    return None


def _tool_summary(name: str, payload: dict[str, Any]) -> str:
    if not isinstance(payload, dict):
        return name
    for key in ("file_path", "notebook_path", "path"):
        if payload.get(key):
            return _relative(str(payload[key]))
    if payload.get("command"):
        return _shorten(payload["command"], 160)
    if payload.get("pattern"):
        return _shorten(payload["pattern"], 120)
    if payload.get("prompt"):
        return _shorten(payload["prompt"], 160)
    if payload.get("url"):
        return _shorten(payload["url"], 120)
    return ""


def _claude_steps(path: Path) -> list[dict[str, Any]]:
    steps: list[dict[str, Any]] = []
    for line in _tail_lines(path):
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        kind = record.get("type")
        at = record.get("timestamp")
        message = record.get("message") or {}
        if kind == "user" and not record.get("isSidechain"):
            content = message.get("content")
            if isinstance(content, str) and content.strip():
                steps.append({"at": at, "kind": "prompt", "title": "Pediste", "detail": _shorten(content, 400)})
        elif kind == "assistant":
            for block in message.get("content") or []:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "text" and block.get("text", "").strip():
                    steps.append({"at": at, "kind": "say", "title": "Dice", "detail": _shorten(block["text"], 400)})
                elif block.get("type") == "tool_use":
                    name = str(block.get("name") or "")
                    steps.append(
                        {
                            "at": at,
                            "kind": "tool",
                            "title": name,
                            "detail": _tool_summary(name, block.get("input") or {}),
                        }
                    )
    return steps[-MAX_STEPS:]


def _codex_steps(path: Path) -> list[dict[str, Any]]:
    steps: list[dict[str, Any]] = []
    for line in _tail_lines(path):
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        at = record.get("timestamp")
        payload = record.get("payload") or {}
        if record.get("type") != "event_msg" or not isinstance(payload, dict):
            continue
        event = payload.get("type")
        if event == "user_message":
            steps.append({"at": at, "kind": "prompt", "title": "Pediste", "detail": _shorten(payload.get("message"), 400)})
        elif event == "agent_message":
            steps.append({"at": at, "kind": "say", "title": "Dice", "detail": _shorten(payload.get("message"), 400)})
        elif event == "exec_command_begin":
            command = payload.get("command")
            if isinstance(command, list):
                command = " ".join(str(part) for part in command)
            steps.append({"at": at, "kind": "tool", "title": "exec", "detail": _shorten(command, 160)})
        elif event == "patch_apply_end":
            files = re.findall(r"^[AMD] (.+)$", str(payload.get("stdout") or ""), flags=re.MULTILINE)
            steps.append(
                {
                    "at": at,
                    "kind": "edit",
                    "title": "Editó",
                    "detail": _shorten(", ".join(_relative(item) for item in files) or "cambios aplicados", 240),
                }
            )
        elif event == "task_complete":
            steps.append({"at": at, "kind": "done", "title": "Terminó el turno", "detail": ""})
    return steps[-MAX_STEPS:]


def timeline(terminal) -> dict[str, Any]:
    """The steps an agent has taken, plus whether it is working right now."""
    if terminal is None:
        return {"steps": [], "busy": False, "log": None, "last_activity": None}

    if terminal.session_file is None or not terminal.session_file.is_file():
        finder = find_claude_log if terminal.cli == "claude" else find_codex_log
        terminal.session_file = finder(terminal.started_at)

    log = terminal.session_file
    if log is None or not log.is_file():
        return {"steps": [], "busy": False, "log": None, "last_activity": None}

    stamp = (log.stat().st_size, log.stat().st_mtime)
    cached = _cache.get(str(log))
    if cached is not None and cached[0] == stamp:
        steps = cached[1]
    else:
        steps = _claude_steps(log) if terminal.cli == "claude" else _codex_steps(log)
        _cache[str(log)] = (stamp, steps)
    modified = log.stat().st_mtime
    return {
        "steps": steps,
        "busy": (datetime.now().timestamp() - modified) < IDLE_AFTER_SECONDS,
        "log": str(log),
        "last_activity": datetime.fromtimestamp(modified).astimezone().isoformat(),
    }
