#!/usr/bin/env python3
"""The footage a video can use, and what each clip is known to prove.

The planner chooses recordings by what they demonstrate rather than by filename,
so the manifest written by the capture harness travels with the files.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

import catalog as catalog_store
import renderer


ROOT = Path(__file__).resolve().parent

MEDIA_SUFFIXES = renderer.IMAGE_SUFFIXES | renderer.VIDEO_SUFFIXES


def copy_assets(source: Path | None, destination: Path) -> list[Path]:
    destination.mkdir(parents=True, exist_ok=True)
    copied = []
    for path in list_assets(source):
        shutil.copy2(path, destination / path.name)
        copied.append(destination / path.name)
    return copied


def list_assets(source: Path | None) -> list[Path]:
    if not source:
        return []
    source = source.expanduser()
    if not source.is_dir():
        raise RuntimeError(f"Assets directory does not exist: {source}")
    return sorted(
        path
        for path in source.iterdir()
        if path.is_file() and not path.name.startswith(".") and path.suffix.lower() in MEDIA_SUFFIXES
    )


def asset_manifest(assets: list[Path]) -> list[dict[str, Any]]:
    """Describe available footage for the planner.

    A capture harness writes assets/screens/manifest.json; anything copied by
    hand falls back to its filename, which is still better than nothing.
    """
    described = catalog_store.load_json(ROOT / "assets/screens/manifest.json", {"clips": []})
    by_name = {clip["file"]: clip for clip in described.get("clips", [])}
    manifest = []
    for path in assets:
        clip = by_name.get(path.name, {})
        manifest.append({
            "file": path.name,
            "description": clip.get("description", path.stem.replace("-", " ")),
            "proves": clip.get("proves", "sin nota de qué demuestra"),
            "requires_authorization": bool(clip.get("requires_authorization")),
        })
    return manifest


def screens_directory() -> Path:
    return ROOT / "assets/screens"
