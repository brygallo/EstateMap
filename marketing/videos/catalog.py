#!/usr/bin/env python3
"""The catalogue of videos and the state each one is in.

Every piece the factory has ever planned lives in one JSON file, and every
command reads or advances it. Keeping that here means the rules about which
states exist, and which one a video may move to, are stated once.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
LIBRARY = ROOT / "library"
OUTBOX = LIBRARY / "_outbox"
CATALOG = ROOT / "memory/catalog.json"

# The life of a piece, in order. A video only ever moves forward through these.
STATES = ["planned", "approved", "rendered", "reviewed", "signed", "published", "learned", "archived"]

# States a video can be rendered from: approved, or rendered before and being
# rebuilt after a correction.
RENDERABLE = {"approved", "rendered", "reviewed", "signed"}


def now() -> str:
    return datetime.now().astimezone().isoformat()


def load_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    """Write atomically, so an interrupted run cannot leave half a file behind."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def load() -> dict[str, Any]:
    return load_json(CATALOG, {"version": 1, "updated_at": now(), "videos": []})


def save(catalog: dict[str, Any]) -> None:
    catalog["updated_at"] = now()
    write_json(CATALOG, catalog)


def video_id(number: int) -> str:
    return f"video-{number:03}"


def next_number(catalog: dict[str, Any]) -> int:
    return max((int(item["number"]) for item in catalog["videos"]), default=0) + 1


def find(reference: str) -> tuple[Path, dict[str, Any], dict[str, Any]]:
    """Resolve "7", "video-007" or "video_007" to its directory and entry."""
    catalog = load()
    normalized = reference.lower().replace("_", "-")
    if normalized.isdigit():
        normalized = video_id(int(normalized))
    for item in catalog["videos"]:
        if item["id"] == normalized or str(item["number"]) == reference:
            return ROOT / item["directory"], item, catalog
    raise RuntimeError(f"Unknown video: {reference}")


def update(item: dict[str, Any], catalog: dict[str, Any], state: str | None = None, **fields: Any) -> None:
    if state:
        if state not in STATES:
            raise RuntimeError(f"Invalid state: {state}")
        item["state"] = state
    item.update(fields)
    item["updated_at"] = now()
    save(catalog)


def summary(catalog: dict[str, Any], limit: int = 40) -> str:
    """What the planner is shown about previous pieces, so it does not repeat one."""
    videos = catalog["videos"][-limit:]
    if not videos:
        return "No previous videos exist. Start with the highest-value foundational concept."
    fields = ["id", "title", "audience", "funnel_stage", "pillar", "series", "concept", "cta", "hook", "state"]
    return json.dumps([{key: item.get(key) for key in fields} for item in videos], ensure_ascii=False)
