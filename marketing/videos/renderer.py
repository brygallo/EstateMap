#!/usr/bin/env python3
"""Remotion staging and invocation."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
REMOTION = ROOT / "remotion"
FONT = ROOT / "assets/fonts/PlusJakartaSans-ExtraBold.ttf"
BRAND_TILE = ROOT / "assets/brand/aents-brand-tile-1024.png"
FPS = 30
ACCENTS = ["#22C55E", "#14B8A6", "#6B5CF6", "#A78BFA"]
URL = "geopropiedadesecuador.com"
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm"}

# Silence held after the last caption so a scene never cuts on the final
# consonant.
SCENE_TAIL_SECONDS = 0.45


def executable() -> Path:
    path = REMOTION / "node_modules/.bin/remotion"
    if not path.exists():
        raise RuntimeError("Remotion dependencies are missing. Run marketing/videos/setup")
    return path


def frames(seconds: float) -> int:
    return max(1, round(seconds * FPS))


def asset_kind(path: Path) -> str:
    if path.suffix.lower() in IMAGE_SUFFIXES:
        return "image"
    if path.suffix.lower() in VIDEO_SUFFIXES:
        return "video"
    raise RuntimeError(f"Unsupported asset: {path.name}")


def stage(directory: Path) -> Path:
    """Copy everything a render needs into Remotion's public directory."""
    public = REMOTION / "public"
    (public / "fonts").mkdir(parents=True, exist_ok=True)
    shutil.copy2(FONT, public / "fonts" / FONT.name)
    if BRAND_TILE.exists():
        (public / "brand").mkdir(parents=True, exist_ok=True)
        shutil.copy2(BRAND_TILE, public / "brand" / BRAND_TILE.name)
    job = public / "jobs" / directory.name
    if job.exists():
        shutil.rmtree(job)
    (job / "audio").mkdir(parents=True)
    (job / "assets").mkdir()
    return job


def brand_tile_path() -> str | None:
    return f"brand/{BRAND_TILE.name}" if BRAND_TILE.exists() else None


def build_props(
    directory: Path,
    plan: dict[str, Any],
    timings: list[dict[str, Any]],
    music: Path | None,
) -> dict[str, Any]:
    job = stage(directory)
    name = directory.name
    scenes = []
    for index, (scene, timing) in enumerate(zip(plan["scenes"], timings)):
        voice_source = Path(timing["voice_file"])
        voice_target = job / "audio" / f"voice-{index + 1:02}.mp3"
        shutil.copy2(voice_source, voice_target)
        asset_relative = None
        asset_type = None
        if scene.get("asset"):
            source = directory / "assets/input" / scene["asset"]
            if not source.is_file():
                raise RuntimeError(f"Scene asset is missing: {scene['asset']}")
            shutil.copy2(source, job / "assets" / source.name)
            asset_relative = f"jobs/{name}/assets/{source.name}"
            asset_type = asset_kind(source)
        scenes.append({
            "purpose": scene["purpose"],
            "durationInFrames": frames(timing["render_seconds"]),
            "headline": scene["on_screen_text"],
            "captions": timing["captions"],
            "visualDirection": scene["visual_direction"],
            "transition": scene["transition"],
            "asset": asset_relative,
            "assetType": asset_type,
            "voiceFile": f"jobs/{name}/audio/{voice_target.name}",
            "accent": ACCENTS[index % len(ACCENTS)],
        })
    music_relative = None
    if music:
        shutil.copy2(music, job / "audio/music.mp3")
        music_relative = f"jobs/{name}/audio/music.mp3"
    return {
        "title": plan["title"],
        "coverText": plan["cover_text"],
        "cta": plan["cta"],
        "url": URL,
        "brandTile": brand_tile_path(),
        "musicFile": music_relative,
        "showSafeAreas": False,
        "scenes": scenes,
    }


def render_video(props_path: Path, target: Path, composition: str = "EstateMapVideo") -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    command = [
        str(executable()), "render", "src/index.ts", composition, str(target),
        "--props", str(props_path), "--codec", "h264", "--crf", "18",
    ]
    completed = subprocess.run(command, cwd=REMOTION, text=True, capture_output=True)
    if completed.returncode:
        raise RuntimeError(f"Remotion render failed:\n{completed.stdout[-2000:]}\n{completed.stderr[-2000:]}")
    return target


def render_cover(directory: Path, plan: dict[str, Any], target: Path) -> Path:
    job = REMOTION / "public/jobs" / directory.name
    asset = None
    asset_type = None
    for scene in plan["scenes"]:
        name = scene.get("asset")
        if name and (job / "assets" / name).is_file() and asset_kind(Path(name)) == "image":
            asset = f"jobs/{directory.name}/assets/{name}"
            asset_type = "image"
            break
    props = {
        "coverText": plan["cover_text"],
        "url": URL,
        "brandTile": brand_tile_path(),
        "accent": ACCENTS[0],
        "asset": asset,
        "assetType": asset_type,
    }
    props_path = directory / "cover-props.json"
    props_path.write_text(json.dumps(props, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    target.parent.mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(
        [str(executable()), "still", "src/index.ts", "EstateMapCover", str(target), "--props", str(props_path)],
        cwd=REMOTION,
        text=True,
        capture_output=True,
    )
    if completed.returncode:
        raise RuntimeError(f"Remotion cover failed:\n{completed.stdout[-1500:]}\n{completed.stderr[-1500:]}")
    return target
