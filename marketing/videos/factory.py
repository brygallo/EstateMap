#!/usr/bin/env python3
"""Stateful command-line video production workflow."""

from __future__ import annotations

import argparse
import copy
import csv
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path
from typing import Any

import lessons as lessons_store
import media
import planner
import quality
import renderer
import subtitles
import voice


ROOT = Path(__file__).resolve().parent
LIBRARY = ROOT / "library"
OUTBOX = LIBRARY / "_outbox"
CATALOG = ROOT / "memory/catalog.json"
STATES = ["planned", "approved", "rendered", "reviewed", "signed", "published", "learned", "archived"]
RENDERABLE = {"approved", "rendered", "reviewed", "signed"}


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
    return max((int(item["number"]) for item in catalog["videos"]), default=0) + 1


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


def slug(value: str, words: int = 4) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    parts = re.findall(r"[a-z0-9]+", normalized.lower())
    return "-".join(parts[:words]) or "video"


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
    described = load_json(ROOT / "assets/screens/manifest.json", {"clips": []})
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


def catalog_summary(catalog: dict[str, Any], limit: int = 40) -> str:
    videos = catalog["videos"][-limit:]
    if not videos:
        return "No previous videos exist. Start with the highest-value foundational concept."
    fields = ["id", "title", "audience", "funnel_stage", "pillar", "series", "concept", "cta", "hook", "state"]
    return json.dumps([{key: item.get(key) for key in fields} for item in videos], ensure_ascii=False)


def write_storyboard(directory: Path, plan: dict[str, Any]) -> None:
    cursor = 0.0
    sections = [f"# Storyboard: {plan['title']}"]
    for index, scene in enumerate(plan["scenes"], 1):
        start = cursor
        cursor += float(scene["duration"])
        captions = voice.split_captions(scene["voice"])
        sections.append(f"""
## Escena {index:02} · {start:.1f}–{cursor:.1f} s · {scene['purpose']}

- Visual: {scene['visual_direction']}
- Recurso: {scene.get('asset') or 'Fondo de marca'}
- Rótulo: {scene['on_screen_text']}
- Voz: {scene['voice']}
- Subtítulos: {' / '.join(captions)}
- Entrada: {scene['transition']}
""")
    (directory / "storyboard.md").write_text("\n".join(sections).strip() + "\n", encoding="utf-8")


def write_script(plan: dict[str, Any], number: int, target: Path) -> None:
    rows = []
    cursor = 0.0
    for index, scene in enumerate(plan["scenes"], 1):
        start = cursor
        cursor += float(scene["duration"])
        asset = scene.get("asset") or "Fondo de marca"
        rows.append(
            f"| {index} | {start:.1f}–{cursor:.1f} s | {scene['purpose']} | {scene['visual_direction']} | "
            f"{scene['voice']} | {scene['on_screen_text']} | {asset} | {scene['transition']} |"
        )
    target.write_text(f"""# Video {number:03}: {plan['title']}

Estado: `planificado`

## Estrategia

- Público: {plan['audience']}
- Etapa: {plan['funnel_stage']}
- Objetivo: {plan['objective']}
- Conversión: {plan['conversion_event']}
- Pilar: {plan['pillar']}
- Serie: {plan['series']}
- Concepto: {plan['concept']}
- Promesa: {plan['promise']}
- CTA: {plan['cta']}
- Hipótesis: {plan['hypothesis']}
- Portada: {plan['cover_text']}

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(rows)}

## Voz completa

{plan['narration']}

## Caption

{plan['caption']}

## Verificación antes de publicar

{chr(10).join(f'- [ ] {note}' for note in plan['verification_notes']) or '- [ ] Sin afirmaciones adicionales.'}
""", encoding="utf-8")


def create_video(
    catalog: dict[str, Any],
    plan: dict[str, Any],
    brief: str,
    duration: int,
    assets_source: Path | None,
    extra: dict[str, Any] | None = None,
    assets_from: Path | None = None,
) -> tuple[Path, dict[str, Any]]:
    number = next_number(catalog)
    identifier = video_id(number)
    directory = LIBRARY / identifier
    if directory.exists():
        raise RuntimeError(f"Video directory already exists: {directory}")
    directory.mkdir(parents=True)
    (directory / "assets/generated").mkdir(parents=True)
    (directory / "audio").mkdir()
    (directory / "exports").mkdir()
    if assets_from and assets_from.is_dir():
        copy_assets(assets_from, directory / "assets/input")
    else:
        copy_assets(assets_source, directory / "assets/input")
    write_json(directory / "brief.json", {
        "brief": brief,
        "automatic_selection": not bool(brief.strip()),
        "target_duration_seconds": duration,
        "created_at": now(),
    })
    write_json(directory / "plan.json", plan)
    write_script(plan, number, directory / "script.md")
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
        "target_duration_seconds": duration,
        "created_at": now(),
        "updated_at": now(),
        **(extra or {}),
    }
    catalog["videos"].append(item)
    save_catalog(catalog)
    return directory, item


def run_lint(directory: Path, item: dict[str, Any], catalog: dict[str, Any]) -> dict[str, Any]:
    plan = load_json(directory / "plan.json")
    target = int(item.get("target_duration_seconds", 20))
    report = quality.lint(plan, directory, target, catalog, item["id"])
    report["checked_at"] = now()
    write_json(directory / "lint.json", report)
    return report


def print_lint(identifier: str, report: dict[str, Any]) -> None:
    status = "OK" if report["passed"] else "FALLA"
    print(f"{identifier}: lint {status} · {report['errors']} errores, {report['warnings']} avisos "
          f"· locución estimada {report['estimated_seconds']} s / objetivo {report['target_seconds']} s")
    for item in report["findings"]:
        mark = "✗" if item["level"] == "error" else "!"
        print(f"  {mark} [{item['rule']}] {item['detail']}")


def cmd_new(args: argparse.Namespace) -> None:
    media.require_tool("claude")
    catalog = load_catalog()
    brief = args.brief or "Choose the next video that fills the most valuable gap in the existing catalog."
    manifest = asset_manifest(list_assets(args.assets))
    plan = planner.create_plan(brief, args.duration, manifest, catalog_summary(catalog))
    directory, item = create_video(catalog, plan, brief, args.duration, args.assets)
    report = run_lint(directory, item, catalog)
    print(directory)
    print_lint(item["id"], report)


def cmd_lint(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    report = run_lint(directory, item, catalog)
    print_lint(item["id"], report)
    if not report["passed"]:
        raise RuntimeError("El plan no pasa el control de calidad")


def cmd_approve(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    if item["state"] not in {"planned", "approved"}:
        raise RuntimeError(f"Only a planned video can be approved; current state: {item['state']}")
    report = run_lint(directory, item, catalog)
    if not report["passed"] and not args.force:
        print_lint(item["id"], report)
        raise RuntimeError("Corrige el plan o aprueba con --force dejando constancia en las notas")
    approval = {
        "approved_at": now(),
        "approved_by": args.by,
        "notes": args.notes,
        "lint_passed": report["passed"],
        "forced": bool(args.force),
        "plan_sha": subprocess.run(
            ["shasum", "-a", "256", str(directory / "plan.json")],
            text=True, capture_output=True, check=True,
        ).stdout.split()[0],
    }
    write_json(directory / "approval.json", approval)
    update_video(item, catalog, "approved")
    print(f"{item['id']}: approved")


def cmd_render(args: argparse.Namespace) -> None:
    media.require_tool("node")
    media.require_tool("ffmpeg")
    directory, item, catalog = find_video(args.video)
    if item["state"] not in RENDERABLE:
        raise RuntimeError("Approve the video before rendering it")
    plan = load_json(directory / "plan.json")
    timings = []
    for index, scene in enumerate(plan["scenes"]):
        target = directory / "audio" / f"voice-{index + 1:02}.mp3"
        captions = voice.speak_scene(scene["voice"], target)
        spoken = captions[-1]["end"] if captions else 0.0
        timings.append({
            "scene": index + 1,
            "voice_file": str(target),
            "voice_seconds": round(spoken, 3),
            "render_seconds": round(spoken + renderer.SCENE_TAIL_SECONDS, 3),
            "captions": captions,
        })
    subtitles.write_srt(timings, directory / "subtitles.srt")
    music = Path(args.music).expanduser().resolve() if args.music else None
    if music and not music.is_file():
        raise RuntimeError(f"Music track not found: {music}")
    props = renderer.build_props(directory, plan, timings, music)
    props_path = directory / "render-props.json"
    write_json(props_path, props)
    final = renderer.render_video(props_path, directory / "exports/video.mp4")
    cover = renderer.render_cover(directory, plan, directory / "exports/cover.png")
    duration = round(media.probe_duration(final), 3)
    write_json(directory / "production.json", {
        "rendered_at": now(),
        "renderer": "remotion",
        "remotion_version": "4.0.509",
        "tts_provider": voice.provider(),
        "music": str(music) if music else None,
        "duration_seconds": duration,
        "target_duration_seconds": item.get("target_duration_seconds"),
        "caption_count": sum(len(timing["captions"]) for timing in timings),
        "scene_timings": [{key: value for key, value in timing.items() if key != "captions"} for timing in timings],
        "output": str(final.relative_to(directory)),
        "cover": str(cover.relative_to(directory)),
    })
    update_video(item, catalog, "rendered", duration_seconds=duration)
    print(final)
    print(cover)


def cmd_review(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    final = directory / "exports/video.mp4"
    if not final.exists():
        raise RuntimeError("Render the video before reviewing it")
    plan = load_json(directory / "plan.json")
    lint_report = load_json(directory / "lint.json", {"passed": False})
    width, height = media.probe_dimensions(final)
    duration = media.probe_duration(final)
    target = float(item.get("target_duration_seconds", 20))
    checks = {
        "vertical_1080x1920": width == 1080 and height == 1920,
        "duration_8_to_60_seconds": 8 <= duration <= 60,
        "duration_close_to_target": abs(duration - target) <= max(4.0, target * 0.25),
        "plan_lint_passed": bool(lint_report.get("passed")),
        "cover_exists": (directory / "exports/cover.png").is_file(),
        "subtitles_exist": (directory / "subtitles.srt").is_file(),
        "all_assets_resolve": all(
            not scene.get("asset") or (directory / "assets/input" / scene["asset"]).is_file()
            for scene in plan["scenes"]
        ),
        "approval_exists": (directory / "approval.json").exists(),
    }
    passed = all(checks.values())
    review = {
        "reviewed_at": now(),
        "passed": passed,
        "checks": checks,
        "measured_duration_seconds": round(duration, 3),
        "target_duration_seconds": target,
        "human_review": None,
        "notes": args.notes,
    }
    write_json(directory / "review.json", review)
    update_video(item, catalog, "reviewed" if passed else "rendered", automated_review_passed=passed)
    print(json.dumps(review, ensure_ascii=False, indent=2))
    if not passed:
        raise RuntimeError("Automated review failed")


def cmd_sign(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    review = load_json(directory / "review.json")
    if not review:
        raise RuntimeError("Run the automated review before signing it")
    if not review.get("passed"):
        raise RuntimeError("The automated review did not pass")
    review["human_review"] = {"signed_at": now(), "signed_by": args.by, "notes": args.notes}
    write_json(directory / "review.json", review)
    update_video(item, catalog, "signed", signed_by=args.by)
    print(f"{item['id']}: signed by {args.by}")


def cmd_cover(args: argparse.Namespace) -> None:
    directory, item, _ = find_video(args.video)
    plan = load_json(directory / "plan.json")
    renderer.stage(directory)
    print(renderer.render_cover(directory, plan, directory / "exports/cover.png"))


def cmd_pack(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    final = directory / "exports/video.mp4"
    if not final.exists():
        raise RuntimeError("Render the video before packing it")
    if item["state"] not in {"signed", "published", "learned"} and not args.force:
        raise RuntimeError("Sign the human review before packing, or use --force")
    plan = load_json(directory / "plan.json")
    stamp = date.today().isoformat()
    name = "_".join([
        stamp,
        slug(plan["audience"], 1),
        slug(plan["pillar"], 2),
        slug(plan["concept"], 3),
        f"{slug(item.get('hook_label') or plan['scenes'][0]['purpose'], 2)}-v01",
    ])
    outbox = OUTBOX / name
    outbox.mkdir(parents=True, exist_ok=True)
    shutil.copy2(final, outbox / f"{name}.mp4")
    cover = directory / "exports/cover.png"
    if cover.exists():
        media.run(["ffmpeg", "-y", "-i", str(cover), "-q:v", "3", str(outbox / f"{name}.jpg")])
    shutil.copy2(directory / "caption.txt", outbox / f"{name}.txt")
    if (directory / "subtitles.srt").exists():
        shutil.copy2(directory / "subtitles.srt", outbox / f"{name}.srt")
    write_json(outbox / "publish.json", {
        "video": item["id"],
        "title": plan["title"],
        "audience": plan["audience"],
        "funnel_stage": plan["funnel_stage"],
        "cta": plan["cta"],
        "cover_text": plan["cover_text"],
        "duration_seconds": item.get("duration_seconds"),
        "verification_notes": plan["verification_notes"],
        "packed_at": now(),
    })
    update_video(item, catalog, packed_at=now(), package=str(outbox.relative_to(ROOT)))
    print(outbox)


def cmd_variants(args: argparse.Namespace) -> None:
    media.require_tool("claude")
    directory, item, catalog = find_video(args.video)
    plan = load_json(directory / "plan.json")
    hooks = planner.create_hooks(plan, args.hooks)
    created = []
    for hook in hooks:
        variant = copy.deepcopy(plan)
        variant["scenes"][0]["voice"] = hook["voice"]
        variant["scenes"][0]["on_screen_text"] = hook["on_screen_text"]
        variant["cover_text"] = hook["cover_text"]
        variant["title"] = f"{plan['title']} · gancho {hook['label']}"
        variant["narration"] = " ".join(scene["voice"] for scene in variant["scenes"])
        variant["hypothesis"] = hook["rationale"]
        child_directory, child = create_video(
            catalog,
            variant,
            f"Variante de gancho de {item['id']}: {hook['label']}",
            int(item.get("target_duration_seconds", 20)),
            None,
            extra={"experiment": "hook", "parent": item["id"], "hook_label": hook["label"]},
            assets_from=directory / "assets/input",
        )
        report = run_lint(child_directory, child, catalog)
        created.append(child["id"])
        print(f"{child['id']}: {hook['label']} — {hook['on_screen_text']}")
        print_lint(child["id"], report)
    update_video(item, catalog, variants=created)


def cmd_batch(args: argparse.Namespace) -> None:
    media.require_tool("claude")
    entries = load_json(args.file)
    if not isinstance(entries, list) or not entries:
        raise RuntimeError("The batch file must be a non-empty JSON list of {brief, duration, assets}")
    catalog = load_catalog()
    for entry in entries:
        brief = entry.get("brief", "").strip()
        duration = int(entry.get("duration", 20))
        assets = Path(entry["assets"]).expanduser() if entry.get("assets") else None
        plan = planner.create_plan(
            brief or "Choose the next video that fills the most valuable gap in the existing catalog.",
            duration,
            asset_manifest(list_assets(assets)),
            catalog_summary(catalog),
        )
        directory, item = create_video(catalog, plan, brief, duration, assets)
        report = run_lint(directory, item, catalog)
        print(f"{item['id']}: {plan['title']}")
        print_lint(item["id"], report)


def cmd_feedback(args: argparse.Namespace) -> None:
    lessons_store.add({
        "source": args.video,
        "scope": args.scope,
        "applies_to": args.video if args.scope in {"one-off", "series", "audience"} else None,
        "observation": args.problem.strip(),
        "rule": args.fix.strip(),
        "origin": "human",
    })
    print(lessons_store.VIEW)


def cmd_results(args: argparse.Namespace) -> None:
    directory, item, catalog = find_video(args.video)
    if item["state"] not in {"signed", "published", "learned"}:
        raise RuntimeError("Sign the human review before recording publication results")
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


def cmd_learn(_: argparse.Namespace) -> None:
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
        summary = {
            "video": item["id"],
            "rows": rows,
            "concept": item["concept"],
            "hook": item["hook"],
            "experiment": item.get("experiment"),
            "parent": item.get("parent"),
        }
        write_json(directory / "learning.json", summary)
        evidence.append(summary)
        item["state"] = "learned"
        item["updated_at"] = now()
        learned += 1
    save_catalog(catalog)
    added = 0
    if evidence:
        analysis = planner.create_lessons(evidence, gaps)
        for lesson in analysis.get("lessons", []):
            lessons_store.add({**lesson, "origin": "metrics"})
            added += 1
        gaps["recommended_gaps"] = analysis.get("recommended_gaps", [])
        write_json(ROOT / "memory/content-gaps.json", gaps)
    print(json.dumps({"videos_learned": learned, "lessons_added": added, "gaps": gaps}, ensure_ascii=False, indent=2))


def cmd_status(_: argparse.Namespace) -> None:
    catalog = load_catalog()
    if not catalog["videos"]:
        print("No videos yet")
        return
    for item in catalog["videos"]:
        marks = []
        if item.get("experiment") == "hook":
            marks.append(f"gancho de {item.get('parent')}")
        if item.get("duration_seconds"):
            marks.append(f"{item['duration_seconds']:.1f}s")
        suffix = f"  ({', '.join(marks)})" if marks else ""
        print(f"{item['id']}\t{item['state']:<9}\t{item['title']}{suffix}")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Geo Propiedades video factory")
    commands = root.add_subparsers(dest="command", required=True)

    new = commands.add_parser("new", help="Plan the next video")
    new.add_argument("brief", nargs="?")
    new.add_argument("--duration", type=int, default=20, choices=range(8, 61), metavar="8-60")
    new.add_argument("--assets", type=Path)
    new.set_defaults(handler=cmd_new)

    lint = commands.add_parser("lint", help="Check a plan before spending a render on it")
    lint.add_argument("video")
    lint.set_defaults(handler=cmd_lint)

    approve = commands.add_parser("approve", help="Approve a plan before rendering")
    approve.add_argument("video")
    approve.add_argument("--by", default="human")
    approve.add_argument("--notes", default="")
    approve.add_argument("--force", action="store_true", help="Approve despite lint errors")
    approve.set_defaults(handler=cmd_approve)

    render = commands.add_parser("render", help="Render an approved video")
    render.add_argument("video")
    render.add_argument("--music", help="Licensed instrumental track to lay under the voice")
    render.set_defaults(handler=cmd_render)

    review = commands.add_parser("review", help="Run technical review")
    review.add_argument("video")
    review.add_argument("--notes", default="")
    review.set_defaults(handler=cmd_review)

    sign = commands.add_parser("sign", help="Record the human pre-publication review")
    sign.add_argument("video")
    sign.add_argument("--by", required=True)
    sign.add_argument("--notes", default="")
    sign.set_defaults(handler=cmd_sign)

    cover = commands.add_parser("cover", help="Re-export the still cover")
    cover.add_argument("video")
    cover.set_defaults(handler=cmd_cover)

    pack = commands.add_parser("pack", help="Build the publishing package")
    pack.add_argument("video")
    pack.add_argument("--force", action="store_true")
    pack.set_defaults(handler=cmd_pack)

    variants = commands.add_parser("variants", help="Create hook variants of an existing plan")
    variants.add_argument("video")
    variants.add_argument("--hooks", type=int, default=3, choices=range(1, 6), metavar="1-5")
    variants.set_defaults(handler=cmd_variants)

    batch = commands.add_parser("batch", help="Plan a whole week from a JSON list")
    batch.add_argument("file", type=Path)
    batch.set_defaults(handler=cmd_batch)

    feedback = commands.add_parser("feedback", help="Record a human correction as a lesson")
    feedback.add_argument("video")
    feedback.add_argument("--problem", required=True)
    feedback.add_argument("--fix", required=True)
    feedback.add_argument("--scope", choices=["global", "audience", "series", "one-off"], default="global")
    feedback.set_defaults(handler=cmd_feedback)

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
