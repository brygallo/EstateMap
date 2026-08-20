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

import brand


ROOT = Path(__file__).resolve().parent
LIBRARY = ROOT / "brands/geo/library"
OUTBOX = LIBRARY / "_outbox"
CATALOG = ROOT / "brands/geo/memory/catalog.json"


def configure(profile: brand.BrandProfile) -> None:
    """Select storage owned by the active brand."""
    global LIBRARY, OUTBOX, CATALOG
    LIBRARY = profile.library
    OUTBOX = LIBRARY / "_outbox"
    CATALOG = profile.memory / "catalog.json"

# The life of a piece, in order. A video only ever moves forward through these.
STATES = ["planned", "approved", "rendered", "reviewed", "signed", "published", "learned", "archived"]

# States a video can be rendered from: approved, or rendered before and being
# rebuilt after a correction.
RENDERABLE = {"approved", "rendered", "reviewed", "signed"}
IMMUTABLE_STATES = {"published", "learned"}


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


def merge_concurrent(mine: list[dict[str, Any]], theirs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep every video, preferring the copy the caller is holding.

    A video the caller does not know about was written by somebody else after
    this snapshot was loaded, so it is kept as it is on disk. A video both sides
    have is the one being updated right now, and the caller's copy wins.
    """
    known = {str(item.get("id")) for item in mine}
    extra = [item for item in theirs if str(item.get("id")) not in known]
    return sorted([*mine, *extra], key=lambda item: int(item.get("number") or 0))


def save(catalog: dict[str, Any]) -> None:
    """Write the catalogue back without dropping another writer's work.

    Every command loads the whole catalogue, changes one entry and writes the
    whole thing back. Two agents work this repository at the same time, so each
    of those snapshots is stale by the time it is written, and a plain overwrite
    deletes whatever the other one planned in between. That is exactly how
    `aents-003` vanished from the catalogue while its directory, its approval
    and its synthesised voice stayed on disk: the next command could no longer
    find a video that was entirely there.

    Re-reading immediately before writing does not make this atomic — two writes
    in the same instant can still race — but it turns the common case, two
    sessions minutes apart, from silent data loss into a merge.
    """
    catalog["videos"] = merge_concurrent(
        catalog.get("videos") or [], (load_json(CATALOG, {}) or {}).get("videos") or []
    )
    catalog["updated_at"] = now()
    write_json(CATALOG, catalog)


def video_id(number: int) -> str:
    return f"{brand.current().id}-{number:03}"


def next_number(catalog: dict[str, Any]) -> int:
    return max((int(item["number"]) for item in catalog["videos"]), default=0) + 1


def find(reference: str) -> tuple[Path, dict[str, Any], dict[str, Any]]:
    """Resolve a number or a brand-qualified identifier in the active catalog."""
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
        current = item.get("state")
        if current in IMMUTABLE_STATES and state != current:
            raise RuntimeError(f"A {current} video is immutable; create a variant instead")
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
