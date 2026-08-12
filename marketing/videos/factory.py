#!/usr/bin/env python3
"""Stateful command-line video production workflow."""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import subprocess
import sys
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Any

import video_factory as legacy


ROOT = Path(__file__).resolve().parent
LIBRARY = ROOT / "library"
CATALOG = ROOT / "memory/catalog.json"
STATES = ["planned", "approved", "rendered", "reviewed", "published", "learned", "archived"]


def now() -> str:
    return datetime.now().astimezone().isoformat()


def load_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def load_catalog() -> dict[str, Any]:
    return load_json(CATALOG, {"version": 1, "updated_at": now(), "videos": []})


def save_catalog(catalog: dict[str, Any]) -> None:
    catalog["updated_at"] = now()
    write_json(CATALOG, catalog)


def video_id(number: int) -> str:
    return f"video-{number:03}"


def next_number(catalog: dict[str, Any]) -> int:
    numbers = [int(item["number"]) for item in catalog["videos"]]
    return max(numbers, default=0) + 1


def find_video(reference: str) -> tuple[Path, dict[str, Any], dict[str, Any]]:
    catalog = load_catalog()
    normalized = reference.lower().replace("_", "-")
    if normalized.isdigit():
        normalized = video_id(int(normalized))
    for item in catalog["videos"]:
        if item["id"] == normalized or str(item["number"]) == reference:
            return ROOT / item["directory"], item, catalog
    raise RuntimeError(f"Unknown video: {reference}")


def update_video(item: dict[str, Any], catalog: dict[str, Any], state: str | None = None, **fields: Any) -> None:
    if state:
        if state not in STATES:
            raise RuntimeError(f"Invalid state: {state}")
        item["state"] = state
    item.update(fields)
    item["updated_at"] = now()
    save_catalog(catalog)


def copy_assets(source: Path | None, destination: Path) -> list[Path]:
    destination.mkdir(parents=True, exist_ok=True)
    if not source:
        return []
    if not source.is_dir():
        raise RuntimeError(f"Assets directory does not exist: {source}")
    copied = []
    for path in sorted(source.iterdir()):
        if not path.is_file() or path.name.startswith("."):
            continue
        target = destination / path.name
        shutil.copy2(path, target)
        copied.append(target)
    return copied


def write_brief(directory: Path, brief: str, duration: int, automatic: bool) -> None:
    write_json(directory / "brief.json", {
        "brief": brief,
        "automatic_selection": automatic,
        "target_duration_seconds": duration,
        "created_at": now(),
    })


def write_storyboard(directory: Path, plan: dict[str, Any]) -> None:
    cursor = 0.0
    sections = [f"# Storyboard: {plan['title']}"]
    for index, scene in enumerate(plan["scenes"], 1):
        start = cursor
        cursor += float(scene["duration"])
        sections.append(f"""
## Escena {index:02} · {start:.1f}–{cursor:.1f} s · {scene['purpose']}

- Visual: {scene['visual_direction']}
- Recurso: {scene.get('asset') or 'Fondo de marca'}
- Voz: {scene['voice']}
- Texto: {scene['on_screen_text']}
- Entrada: {scene['transition']}
- SFX: {scene['sfx']}
""")
    (directory / "storyboard.md").write_text("\n".join(sections).strip() + "\n", encoding="utf-8")


def cmd_new(args: argparse.Namespace) -> None:
    catalog = load_catalog()
    number = next_number(catalog)
    identifier = video_id(number)
    directory = LIBRARY / identifier
    if directory.exists():
        raise RuntimeError(f"Video directory already exists: {directory}")
    brief = args.brief or "Choose the next video that fills the most valuable gap in the existing catalog."
    directory.mkdir(parents=True)
    assets = copy_assets(args.assets, directory / "assets/input")
    (directory / "assets/generated").mkdir(parents=True)
    (directory / "audio").mkdir()
    (directory / "scenes").mkdir()
    (directory / "exports").mkdir()
    write_brief(directory, brief, args.duration, not bool(args.brief))
    plan = legacy.create_plan(brief, args.duration, assets)
    write_json(directory / "plan.json", plan)
    legacy.write_plan_markdown(plan, number, directory / "script.md")
    write_storyboard(directory, plan)
    (directory / "caption.txt").write_text(plan["caption"] + "\n", encoding="utf-8")
    shutil.copyfile(ROOT / "templates/results.csv", directory / "results.csv")
    item = {
        "id": identifier,
        "number": number,
        "title": plan["title"],
        "state": "planned",
        "directory": str(directory.relative_to(ROOT)),
        "audience": plan["audience"],
        "funnel_stage": plan["funnel_stage"],
        "pillar": plan["pillar"],
        "series": plan["series"],
        "concept": plan["concept"],
        "hook": plan["scenes"][0]["voice"],
        "cta": plan["cta"],
        "created_at": now(),
        "updated_at": now(),
    }
    catalog["videos"].append(item)
    save_catalog(catalog)
    print(directory)


def cmd_approve(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    if item["state"] not in {"planned", "approved"}:
        raise RuntimeError(f"Only a planned video can be approved; current state: {item['state']}")
    approval = {
        "approved_at": now(),
        "approved_by": args.by,
        "notes": args.notes,
        "plan_sha": subprocess.run(
            ["shasum", "-a", "256", str(directory / "plan.json")],
            text=True,
            capture_output=True,
            check=True,
        ).stdout.split()[0],
    }
    write_json(directory / "approval.json", approval)
    update_video(item, catalog, "approved")
    print(f"{item['id']}: approved")


def probe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        text=True,
        capture_output=True,
    )
    if completed.returncode:
        raise RuntimeError(f"Could not inspect {path}: {completed.stderr.strip()}")
    return float(completed.stdout.strip())


def escape_drawtext(value: str) -> str:
    return value.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def render_scene(
    scene: dict[str, Any], index: int, asset: Path | None, voice: Path, duration: float, target: Path
) -> None:
    headline = "\n".join(textwrap.wrap(scene["on_screen_text"], width=22))
    subtitle = "\n".join(textwrap.wrap(scene["voice"], width=34))
    headline_filter = (
        f"drawtext=fontfile='{escape_drawtext(str(legacy.FONT))}':text='{escape_drawtext(headline)}':"
        "fontcolor=white:fontsize=76:line_spacing=16:x=(w-text_w)/2:y=h*0.28:"
        "box=1:boxcolor=0x0F1020BB:boxborderw=30"
    )
    subtitle_filter = (
        f"drawtext=fontfile='{escape_drawtext(str(legacy.FONT))}':text='{escape_drawtext(subtitle)}':"
        "fontcolor=white:fontsize=42:line_spacing=12:x=(w-text_w)/2:y=h*0.72:"
        "box=1:boxcolor=0x0F1020DD:boxborderw=22"
    )
    fade = min(0.18, duration / 8)
    video_filters = [headline_filter, subtitle_filter]
    if scene.get("transition") == "fade":
        video_filters.extend([f"fade=t=in:st=0:d={fade}", f"fade=t=out:st={max(0, duration-fade)}:d={fade}"])
    filters = ",".join(video_filters)
    output = ["-t", f"{duration:.3f}", "-r", str(legacy.FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "44100", "-shortest", str(target)]
    if asset and asset.suffix.lower() in {".mp4", ".mov", ".m4v", ".webm"}:
        legacy.run(["ffmpeg", "-y", "-stream_loop", "-1", "-i", str(asset), "-i", str(voice), "-vf", f"scale={legacy.WIDTH}:{legacy.HEIGHT}:force_original_aspect_ratio=increase,crop={legacy.WIDTH}:{legacy.HEIGHT},{filters}", *output])
    elif asset and asset.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
        legacy.run(["ffmpeg", "-y", "-loop", "1", "-i", str(asset), "-i", str(voice), "-vf", f"scale={legacy.WIDTH}:{legacy.HEIGHT}:force_original_aspect_ratio=increase,crop={legacy.WIDTH}:{legacy.HEIGHT},zoompan=z='min(zoom+0.0008,1.08)':d=1:s={legacy.WIDTH}x{legacy.HEIGHT}:fps={legacy.FPS},{filters}", *output])
    else:
        color = legacy.COLORS[index % len(legacy.COLORS)]
        legacy.run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={color}:s={legacy.WIDTH}x{legacy.HEIGHT}:r={legacy.FPS}", "-i", str(voice), "-vf", filters, *output])


def cmd_render(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    if item["state"] not in {"approved", "rendered", "reviewed"}:
        raise RuntimeError("Approve the video before rendering it")
    plan = load_json(directory / "plan.json")
    assets = {path.name: path for path in (directory / "assets/input").iterdir() if path.is_file()}
    rendered = []
    scene_timings = []
    for index, scene in enumerate(plan["scenes"]):
        voice = directory / "audio" / f"voice-{index + 1:02}.mp3"
        legacy.generate_voice(scene["voice"], voice)
        voice_duration = probe_duration(voice)
        duration = max(1.0, voice_duration + 0.35)
        target = directory / "scenes" / f"scene-{index + 1:02}.mp4"
        render_scene(scene, index, assets.get(scene.get("asset") or ""), voice, duration, target)
        rendered.append(target)
        scene_timings.append({"scene": index + 1, "voice_seconds": voice_duration, "render_seconds": duration})
    timed_scenes = []
    for scene, timing in zip(plan["scenes"], scene_timings):
        timed_scenes.append({**scene, "duration": timing["render_seconds"]})
    legacy.write_srt(timed_scenes, directory / "subtitles.srt")
    concat = directory / "scenes" / "concat.txt"
    concat.write_text("\n".join(f"file '{path.as_posix()}'" for path in rendered), encoding="utf-8")
    base = directory / "exports" / "video-with-voice.mp4"
    legacy.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(base)])
    final = directory / "exports" / "video.mp4"
    if args.no_music:
        shutil.copy2(base, final)
    else:
        duration = probe_duration(base)
        music = directory / "audio" / "music.mp3"
        legacy.generate_music(plan["music_prompt"], max(3, round(duration)), music)
        legacy.run(["ffmpeg", "-y", "-i", str(base), "-stream_loop", "-1", "-i", str(music), "-filter_complex", "[0:a]volume=1.0[v];[1:a]volume=0.08[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[a]", "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)])
    write_json(directory / "production.json", {
        "rendered_at": now(),
        "scene_timings": scene_timings,
        "music": not args.no_music,
        "output": str(final.relative_to(directory)),
    })
    update_video(item, catalog, "rendered", duration_seconds=round(probe_duration(final), 3))
    print(final)


def media_dimensions(path: Path) -> tuple[int, int]:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", str(path)],
        text=True,
        capture_output=True,
    )
    if completed.returncode:
        raise RuntimeError(completed.stderr.strip())
    width, height = completed.stdout.strip().split("x")
    return int(width), int(height)


def cmd_review(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    final = directory / "exports/video.mp4"
    if not final.exists():
        raise RuntimeError("Render the video before reviewing it")
    plan = load_json(directory / "plan.json")
    width, height = media_dimensions(final)
    duration = probe_duration(final)
    checks = {
        "vertical_1080x1920": width == 1080 and height == 1920,
        "duration_8_to_60_seconds": 8 <= duration <= 60,
        "has_scenes": bool(plan.get("scenes")),
        "has_single_cta": bool(plan.get("cta")),
        "has_verification_notes": "verification_notes" in plan,
        "all_assets_resolve": all(not scene.get("asset") or (directory / "assets/input" / scene["asset"]).is_file() for scene in plan["scenes"]),
        "approval_exists": (directory / "approval.json").exists(),
    }
    passed = all(checks.values())
    review = {"reviewed_at": now(), "passed": passed, "checks": checks, "human_review_required": True, "notes": args.notes}
    write_json(directory / "review.json", review)
    update_video(item, catalog, "reviewed" if passed else "rendered", automated_review_passed=passed)
    print(json.dumps(review, ensure_ascii=False, indent=2))
    if not passed:
        raise RuntimeError("Automated review failed")


def cmd_results(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    if item["state"] not in {"reviewed", "published", "learned"}:
        raise RuntimeError("Review the video before recording publication results")
    if not args.file.is_file():
        raise RuntimeError(f"Results file not found: {args.file}")
    with args.file.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise RuntimeError("Results CSV has no data rows")
    shutil.copy2(args.file, directory / "results.csv")
    update_video(item, catalog, "published", published_at=rows[0].get("published_at"), result_rows=len(rows))
    print(directory / "results.csv")


def calculate_gaps(catalog: dict[str, Any]) -> dict[str, Any]:
    active = [item for item in catalog["videos"] if item["state"] != "archived"]
    dimensions = {}
    for field in ["audience", "funnel_stage", "pillar", "series"]:
        counts: dict[str, int] = {}
        for item in active:
            value = item.get(field, "unknown")
            counts[value] = counts.get(value, 0) + 1
        dimensions[field] = counts
    return {"updated_at": now(), "video_count": len(active), "coverage": dimensions}


def cmd_learn(args: argparse.Namespace) -> None:
    catalog = load_catalog()
    gaps = calculate_gaps(catalog)
    write_json(ROOT / "memory/content-gaps.json", gaps)
    learned = 0
    evidence = []
    for item in catalog["videos"]:
        if item["state"] != "published":
            continue
        directory = ROOT / item["directory"]
        with (directory / "results.csv").open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
        summary = {"video": item["id"], "rows": rows, "concept": item["concept"], "hook": item["hook"]}
        write_json(directory / "learning.json", summary)
        evidence.append(summary)
        item["state"] = "learned"
        item["updated_at"] = now()
        learned += 1
    save_catalog(catalog)
    generated_lessons = []
    if evidence:
        schema = {
            "type": "object",
            "additionalProperties": False,
            "required": ["lessons", "recommended_gaps"],
            "properties": {
                "lessons": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["scope", "applies_to", "observation", "rule", "evidence_video"],
                        "properties": {
                            "scope": {"type": "string", "enum": ["global", "audience", "series"]},
                            "applies_to": {"type": ["string", "null"]},
                            "observation": {"type": "string"},
                            "rule": {"type": "string"},
                            "evidence_video": {"type": "string"},
                        },
                    },
                },
                "recommended_gaps": {"type": "array", "items": {"type": "string"}},
            },
        }
        prompt = (
            "Analyze these social video results for Geo Propiedades Ecuador. Produce cautious, actionable Spanish lessons. "
            "Do not infer causality without a controlled comparison; label limited evidence in the observation. "
            "Recommend content gaps that complement the catalog.\n\n"
            + json.dumps({"evidence": evidence, "coverage": gaps}, ensure_ascii=False)
        )
        command = ["claude", "-p", "--output-format", "json", "--json-schema", json.dumps(schema), "--max-turns", "1"]
        completed = subprocess.run(command, input=prompt, text=True, capture_output=True)
        if completed.returncode:
            raise RuntimeError(f"Claude learning pass failed: {completed.stderr.strip()}")
        response = json.loads(completed.stdout)
        analysis = response.get("structured_output") or json.loads(response.get("result", "{}"))
        generated_lessons = analysis.get("lessons", [])
        lessons = load_json(ROOT / "memory/lessons.json", {"version": 1, "lessons": []})
        for lesson in generated_lessons:
            lessons["lessons"].append({
                **lesson,
                "created_at": now(),
                "status": "active",
                "origin": "metrics",
            })
        write_json(ROOT / "memory/lessons.json", lessons)
        gaps["recommended_gaps"] = analysis.get("recommended_gaps", [])
        write_json(ROOT / "memory/content-gaps.json", gaps)
    print(json.dumps({"videos_learned": learned, "lessons_added": len(generated_lessons), "gaps": gaps}, ensure_ascii=False, indent=2))


def cmd_status(_: argparse.Namespace) -> None:
    catalog = load_catalog()
    if not catalog["videos"]:
        print("No videos yet")
        return
    for item in catalog["videos"]:
        print(f"{item['id']}\t{item['state']}\t{item['title']}")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Geo Propiedades video factory")
    commands = root.add_subparsers(dest="command", required=True)
    new = commands.add_parser("new", help="Plan the next video")
    new.add_argument("brief", nargs="?")
    new.add_argument("--duration", type=int, default=20, choices=range(8, 61), metavar="8-60")
    new.add_argument("--assets", type=Path)
    new.set_defaults(handler=cmd_new)
    approve = commands.add_parser("approve", help="Approve a plan before rendering")
    approve.add_argument("video")
    approve.add_argument("--by", default="human")
    approve.add_argument("--notes", default="")
    approve.set_defaults(handler=cmd_approve)
    render = commands.add_parser("render", help="Render an approved video")
    render.add_argument("video")
    render.add_argument("--no-music", action="store_true")
    render.set_defaults(handler=cmd_render)
    review = commands.add_parser("review", help="Run technical review")
    review.add_argument("video")
    review.add_argument("--notes", default="")
    review.set_defaults(handler=cmd_review)
    results = commands.add_parser("results", help="Attach publication results")
    results.add_argument("video")
    results.add_argument("file", type=Path)
    results.set_defaults(handler=cmd_results)
    learn = commands.add_parser("learn", help="Update coverage and learn from published videos")
    learn.set_defaults(handler=cmd_learn)
    status = commands.add_parser("status", help="List video states")
    status.set_defaults(handler=cmd_status)
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        args.handler(args)
        return 0
    except (RuntimeError, OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f"video-factory: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
