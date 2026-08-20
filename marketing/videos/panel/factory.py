"""Read-only view of the video factory.

The factory already owns the truth: `brands/<brand>/profile.json` describes a
brand, `memory/catalog.json` lists every piece and the state it is in, and the
piece's own directory holds the artefacts each stage leaves behind. This module
only reads those files, so the panel cannot drift from the factory.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Any

FACTORY_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = FACTORY_ROOT.parents[1]
BRANDS_ROOT = FACTORY_ROOT / "brands"

# The life of a piece, in the order the factory moves it through. Mirrors
# catalog.STATES; the panel adds the label a person reads.
STATES: list[tuple[str, str]] = [
    ("planned", "Planificado"),
    ("approved", "Aprobado"),
    ("rendered", "Renderizado"),
    ("reviewed", "Revisado"),
    ("signed", "Firmado"),
    ("published", "Publicado"),
    ("learned", "Aprendido"),
]
STATE_LABELS = dict(STATES)
STATE_LABELS["archived"] = "Archivado"
STATE_ORDER = {state: index for index, (state, _) in enumerate(STATES)}

# Artefacts a stage leaves behind, in the order they appear in the pipeline.
ARTEFACTS: list[tuple[str, str, str]] = [
    ("brief.json", "Brief", "json"),
    ("plan.json", "Plan", "json"),
    ("script.md", "Guion", "text"),
    ("storyboard.md", "Storyboard", "text"),
    ("caption.txt", "Caption", "text"),
    ("lint.json", "Lint", "json"),
    ("approval.json", "Aprobación", "json"),
    ("voice-lock.json", "Voz", "json"),
    ("production.json", "Producción", "json"),
    ("subtitles.srt", "Subtítulos", "text"),
    ("review.json", "Revisión", "json"),
    ("results.csv", "Resultados", "csv"),
]

MAX_TEXT_BYTES = 200_000


@dataclass(frozen=True)
class Brand:
    id: str
    name: str
    domain: str
    tagline: str
    library: Path
    memory: Path


def _read_json(path: Path, default: Any = None) -> Any:
    if not path.is_file():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return default


def _read_text(path: Path) -> str | None:
    if not path.is_file():
        return None
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:MAX_TEXT_BYTES]
    except OSError:
        return None


def _modified_at(path: Path) -> str | None:
    if not path.exists():
        return None
    return datetime.fromtimestamp(path.stat().st_mtime).astimezone().isoformat()


def brands() -> list[Brand]:
    """Every brand workspace the factory knows about."""
    found: list[Brand] = []
    if not BRANDS_ROOT.is_dir():
        return found
    for profile_path in sorted(BRANDS_ROOT.glob("*/profile.json")):
        data = _read_json(profile_path, {})
        if not data:
            continue
        root = profile_path.parent
        storage = data.get("storage") or {}
        library = (FACTORY_ROOT / storage.get("library", f"brands/{root.name}/library")).resolve()
        memory = (FACTORY_ROOT / storage.get("memory", f"brands/{root.name}/memory")).resolve()
        found.append(
            Brand(
                id=str(data.get("id") or root.name),
                name=str(data.get("name") or root.name),
                domain=str(data.get("domain") or ""),
                tagline=str(data.get("tagline") or ""),
                library=library,
                memory=memory,
            )
        )
    return found


def brand(brand_id: str) -> Brand | None:
    for item in brands():
        if item.id == brand_id:
            return item
    return None


def default_brand_id() -> str:
    available = brands()
    for item in available:
        if item.id == "geo":
            return item.id
    return available[0].id if available else "geo"


def _video_directory(active: Brand, entry: dict[str, Any]) -> Path:
    relative = entry.get("directory")
    if relative:
        return (FACTORY_ROOT / relative).resolve()
    return active.library / str(entry.get("id"))


def _export_files(directory: Path) -> list[dict[str, Any]]:
    exports = directory / "exports"
    if not exports.is_dir():
        return []
    files: list[dict[str, Any]] = []
    for path in sorted(exports.iterdir()):
        if path.name.startswith(".") or not path.is_file():
            continue
        files.append(
            {
                "name": path.name,
                "size_bytes": path.stat().st_size,
                "modified_at": _modified_at(path),
                "is_video": path.suffix.lower() in {".mp4", ".mov", ".webm"},
                "is_image": path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"},
            }
        )
    return files


def _progress(state: str) -> int:
    """How far along the pipeline a piece is, as a percentage."""
    if state == "archived":
        return 100
    index = STATE_ORDER.get(state)
    if index is None:
        return 0
    return round((index + 1) / len(STATES) * 100)


def videos(brand_id: str) -> list[dict[str, Any]]:
    """The catalogue of a brand, enriched with what is on disk."""
    active = brand(brand_id)
    if active is None:
        return []
    catalog = _read_json(active.memory / "catalog.json", {"videos": []}) or {"videos": []}
    listed: list[dict[str, Any]] = []
    for entry in catalog.get("videos", []):
        directory = _video_directory(active, entry)
        state = str(entry.get("state") or "planned")
        exports = _export_files(directory)
        listed.append(
            {
                "id": str(entry.get("id")),
                "number": entry.get("number"),
                "title": entry.get("title") or "",
                "state": state,
                "state_label": STATE_LABELS.get(state, state),
                "progress": _progress(state),
                "audience": entry.get("audience") or "",
                "funnel_stage": entry.get("funnel_stage") or "",
                "pillar": entry.get("pillar") or "",
                "series": entry.get("series") or "",
                "hook": entry.get("hook") or "",
                "cta": entry.get("cta") or "",
                "concept": entry.get("concept") or "",
                "editorial_format": entry.get("editorial_format") or "",
                "duration_seconds": entry.get("duration_seconds"),
                "target_duration_seconds": entry.get("target_duration_seconds"),
                "experiment": entry.get("experiment") or "",
                "parent": entry.get("parent") or "",
                "automated_review_passed": entry.get("automated_review_passed"),
                "created_at": entry.get("created_at"),
                "updated_at": entry.get("updated_at"),
                "directory": str(directory),
                "relative_directory": str(directory.relative_to(REPO_ROOT))
                if directory.is_relative_to(REPO_ROOT)
                else str(directory),
                "exists": directory.is_dir(),
                "has_export": any(item["is_video"] for item in exports),
                "raw": entry,
            }
        )
    listed.sort(key=lambda item: (item.get("number") or 0), reverse=True)
    return listed


def _artefacts(directory: Path) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    for name, label, kind in ARTEFACTS:
        path = directory / name
        item: dict[str, Any] = {
            "name": name,
            "label": label,
            "kind": kind,
            "present": path.is_file(),
            "modified_at": _modified_at(path),
            "content": None,
        }
        if item["present"]:
            if kind == "json":
                item["content"] = _read_json(path)
            elif kind == "csv":
                raw = _read_text(path) or ""
                rows = list(csv.reader(StringIO(raw)))
                item["content"] = {"header": rows[0] if rows else [], "rows": rows[1:]}
            else:
                item["content"] = _read_text(path)
        collected.append(item)
    return collected


def video(brand_id: str, video_id: str) -> dict[str, Any] | None:
    """Everything the factory knows about one piece."""
    for item in videos(brand_id):
        if item["id"] == video_id:
            directory = Path(item["directory"])
            detail = dict(item)
            detail["artefacts"] = _artefacts(directory)
            detail["exports"] = _export_files(directory)
            detail["stages"] = _stages(item["state"], directory)
            return detail
    return None


def _stages(state: str, directory: Path) -> list[dict[str, Any]]:
    """The pipeline as a checklist: reached, current, or still ahead."""
    current = STATE_ORDER.get(state, -1 if state != "archived" else len(STATES) - 1)
    evidence = {
        "planned": "plan.json",
        "approved": "approval.json",
        "rendered": "production.json",
        "reviewed": "review.json",
        "signed": "review.json",
        "published": "results.csv",
        "learned": "results.csv",
    }
    built: list[dict[str, Any]] = []
    for index, (name, label) in enumerate(STATES):
        source = directory / evidence[name]
        built.append(
            {
                "state": name,
                "label": label,
                "reached": index <= current,
                "current": index == current,
                "at": _modified_at(source) if index <= current else None,
            }
        )
    return built


def script_of(brand_id: str, video_id: str) -> str | None:
    """The guion, read straight from the piece's directory."""
    detail = video(brand_id, video_id)
    if detail is None:
        return None
    return _read_text(Path(detail["directory"]) / "script.md")
