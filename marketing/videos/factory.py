#!/usr/bin/env python3
"""Stateful command-line video production workflow."""

from __future__ import annotations

import argparse
import copy
import csv
import hashlib
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import assets as asset_library
import catalog as catalog_store
import documents
import lessons as lessons_store
import media
import planner
import quality
import renderer
import subtitles
import tts
import voice


ROOT = Path(__file__).resolve().parent


def slug(value: str, words: int = 4) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    parts = re.findall(r"[a-z0-9]+", normalized.lower())
    return "-".join(parts[:words]) or "video"








@dataclass(frozen=True)
class VideoRequest:
    """Everything a person asked for when they asked for a new video."""

    plan: dict[str, Any]
    brief: str
    duration: int
    assets_source: Path | None = None
    assets_from: Path | None = None
    extra: dict[str, Any] | None = None

    def assets(self) -> Path | None:
        """Where the footage comes from: a sibling video's input wins."""
        if self.assets_from and self.assets_from.is_dir():
            return self.assets_from
        return self.assets_source


@dataclass(frozen=True)
class Slot:
    """The number a new video claims in the catalogue, and where it lives."""

    number: int

    @property
    def identifier(self) -> str:
        return catalog_store.video_id(self.number)

    @property
    def directory(self) -> Path:
        return catalog_store.LIBRARY / self.identifier


def create_video(catalog: dict[str, Any], request: VideoRequest) -> tuple[Path, dict[str, Any]]:
    slot = Slot(catalog_store.next_number(catalog))
    if slot.directory.exists():
        raise RuntimeError(f"Video directory already exists: {slot.directory}")
    slot.directory.mkdir(parents=True)
    try:
        return populate_video(catalog, request, slot)
    except Exception:
        # Numbers come from the catalog, so a half-built directory with no entry
        # would collide with the next `new` for ever.
        shutil.rmtree(slot.directory, ignore_errors=True)
        raise


def populate_video(
    catalog: dict[str, Any], request: VideoRequest, slot: Slot
) -> tuple[Path, dict[str, Any]]:
    plan, directory = request.plan, slot.directory
    brief, duration = request.brief, request.duration
    number, identifier = slot.number, slot.identifier
    extra = request.extra
    (directory / "assets/generated").mkdir(parents=True)
    (directory / "audio").mkdir()
    (directory / "exports").mkdir()
    asset_library.copy_assets(request.assets(), directory / "assets/input")
    catalog_store.write_json(directory / "brief.json", {
        "brief": brief,
        "automatic_selection": not bool(brief.strip()),
        "target_duration_seconds": duration,
        "created_at": catalog_store.now(),
    })
    catalog_store.write_json(directory / "plan.json", plan)
    documents.write_script(plan, number, directory / "script.md")
    documents.write_storyboard(directory, plan)
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
        "created_at": catalog_store.now(),
        "updated_at": catalog_store.now(),
        **(extra or {}),
    }
    catalog["videos"].append(item)
    catalog_store.save(catalog)
    return directory, item


def plan_sha(directory: Path) -> str:
    return hashlib.sha256((directory / "plan.json").read_bytes()).hexdigest()


def run_lint(directory: Path, item: dict[str, Any], catalog: dict[str, Any]) -> dict[str, Any]:
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError(f"plan.json is missing in {directory}")
    target = int(item.get("target_duration_seconds", 20))
    report = quality.lint(plan, directory, target, catalog, item["id"])
    report["checked_at"] = catalog_store.now()
    catalog_store.write_json(directory / "lint.json", report)
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
    catalog = catalog_store.load()
    brief = args.brief or "Choose the next video that fills the most valuable gap in the existing catalog."
    manifest = asset_library.asset_manifest(asset_library.list_assets(args.assets))
    plan = planner.create_plan(brief, args.duration, manifest, catalog_store.summary(catalog))
    directory, item = create_video(catalog, VideoRequest(plan, brief, args.duration, args.assets))
    report = run_lint(directory, item, catalog)
    print(directory)
    print_lint(item["id"], report)


def cmd_docs(args: argparse.Namespace) -> None:
    """Rewrite the Markdown a person reads from the plan as it stands now.

    `new` writes the script and the storyboard once, but a plan is edited by
    hand between lint runs. Without this the reviewer approves a script that no
    longer describes the video that will be rendered.
    """
    directory, item, _ = catalog_store.find(args.video)
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError(f"plan.json is missing in {directory}")
    documents.write_script(plan, item["number"], directory / "script.md")
    documents.write_storyboard(directory, plan)
    (directory / "caption.txt").write_text(plan["caption"] + "\n", encoding="utf-8")
    print(f"{item['id']}: script.md, storyboard.md y caption.txt regenerados")


def cmd_lint(args: argparse.Namespace) -> None:
    directory, item, catalog = catalog_store.find(args.video)
    report = run_lint(directory, item, catalog)
    print_lint(item["id"], report)
    if not report["passed"]:
        raise RuntimeError("El plan no pasa el control de calidad")


def plan_captions(plan: dict[str, Any]) -> list[str]:
    captions: list[str] = []
    for scene in plan.get("scenes") or []:
        text = quality.text_of(scene, "voice")
        if text:
            captions.append(text)
    return captions


def agree_to_spend(question: str, assumed: bool) -> None:
    """Get a human yes before buying, or a deliberate one recorded in the command.

    Without a terminal there is nobody to ask, so the answer is no unless --yes
    said so in advance. Treating silence as consent is how an unattended script
    empties an account.
    """
    if assumed:
        return
    if not sys.stdin.isatty():
        raise RuntimeError(
            "This would spend credits and there is no terminal to confirm on. "
            "Re-run with --yes if you mean it."
        )
    if input(f"{question} [y/N] ").strip().lower() not in {"y", "s", "yes", "si", "sí"}:
        raise RuntimeError("Cancelled before spending any credits")


def confirm_voice_spend(plan: dict[str, Any], provider: tts.VoiceProvider, assumed: bool) -> None:
    """Show what this master will buy and let a person stop it."""
    report = voice.quote(plan_captions(plan), provider)
    if not report["billable_characters"]:
        print("Final voice: every line is already paid for and cached; this costs nothing.")
        return
    print(
        f"Final voice: {report['billable_captions']} of {report['captions']} lines are new, "
        f"{report['billable_characters']} characters to buy."
    )
    agree_to_spend("Buy them?", assumed)


def cmd_voice_cost(args: argparse.Namespace) -> None:
    """Report what a final master would buy, before buying any of it."""
    directory, item, _ = catalog_store.find(args.video)
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")
    provider = tts.final()
    captions = plan_captions(plan)
    report = voice.quote(captions, provider)
    print(f"{item['id']}: {report['provider']}")
    print(f"  captions          {report['captions']}")
    print(f"  already cached    {report['cached']}")
    print(f"  to synthesise     {report['billable_captions']}")
    if provider.paid:
        print(f"  characters to buy {report['billable_characters']} (limit {report['ceiling']} per run)")
        print(f"  spent so far      {provider.spent_characters()} characters")


def music_license(track: Path) -> dict[str, Any]:
    """Require proof that a track is free for commercial use."""
    sidecar = track.with_suffix(track.suffix + ".license.json")
    data = catalog_store.load_json(sidecar)
    required = ["title", "author", "source_url", "license"]
    if not isinstance(data, dict) or any(not str(data.get(key, "")).strip() for key in required):
        raise RuntimeError(
            f"Music requires {sidecar.name} with title, author, source_url and license"
        )
    if data.get("commercial_use") is not True or data.get("paid") is not False:
        raise RuntimeError("Music must declare commercial_use=true and paid=false")
    return data


def cmd_approve(args: argparse.Namespace) -> None:
    directory, item, catalog = catalog_store.find(args.video)
    if item["state"] not in {"planned", "approved"}:
        raise RuntimeError(f"Only a planned video can be approved; current state: {item['state']}")
    report = run_lint(directory, item, catalog)
    if not report["passed"] and not args.force:
        print_lint(item["id"], report)
        raise RuntimeError("Corrige el plan o aprueba con --force dejando constancia en las notas")
    approval = {
        "approved_at": catalog_store.now(),
        "approved_by": args.by,
        "notes": args.notes,
        "lint_passed": report["passed"],
        "forced": bool(args.force),
        "plan_sha": plan_sha(directory),
    }
    catalog_store.write_json(directory / "approval.json", approval)
    catalog_store.update(item, catalog, "approved")
    print(f"{item['id']}: approved")


def cmd_render(args: argparse.Namespace) -> None:
    media.require_tool("node")
    media.require_tool("ffmpeg")
    directory, item, catalog = catalog_store.find(args.video)
    if item["state"] not in catalog_store.RENDERABLE:
        raise RuntimeError("Approve the video before rendering it")
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")
    approval = catalog_store.load_json(directory / "approval.json", {})
    if approval.get("plan_sha") and approval["plan_sha"] != plan_sha(directory):
        raise RuntimeError("plan.json changed after approval; approve it again before rendering")
    # Drafts are free and finals are bought once, at the end, on purpose.
    provider = tts.final() if args.final else tts.draft()
    provider.check_ready()
    if args.final:
        confirm_voice_spend(plan, provider, args.yes)
    # A new master invalidates the review that was signed off on the old one.
    (directory / "review.json").unlink(missing_ok=True)
    timings = []
    for index, scene in enumerate(plan["scenes"]):
        target = directory / "audio" / f"voice-{index + 1:02}.mp3"
        captions = voice.speak_scene(scene["voice"], target, provider)
        spoken = captions[-1]["end"] if captions else 0.0
        # Remotion works in whole frames; rounding here too keeps the burned
        # captions and subtitles.srt from drifting apart across scenes.
        render_seconds = renderer.frames(spoken + renderer.SCENE_TAIL_SECONDS) / renderer.FPS
        timings.append({
            "scene": index + 1,
            "voice_file": str(target),
            "voice_seconds": round(spoken, 3),
            "render_seconds": render_seconds,
            "captions": captions,
        })
    subtitles.write_srt(timings, directory / "subtitles.srt")
    music = Path(args.music).expanduser().resolve() if args.music else None
    if music and not music.is_file():
        raise RuntimeError(f"Music track not found: {music}")
    license_data = music_license(music) if music else None
    props = renderer.build_props(directory, plan, timings, music)
    props_path = directory / "render-props.json"
    catalog_store.write_json(props_path, props)
    final = renderer.render_video(props_path, directory / "exports/video.mp4")
    cover = renderer.render_cover(directory, plan, directory / "exports/cover.png")
    duration = round(media.probe_duration(final), 3)
    catalog_store.write_json(directory / "production.json", {
        "rendered_at": catalog_store.now(),
        "renderer": "remotion",
        "remotion_version": "4.0.509",
        # The encoder tag of the finished MP4 says only "libx264", so the
        # quality a published piece was made with is unverifiable from the file.
        "encoder_flags": renderer.ENCODER_FLAGS,
        "tts_provider": provider.name,
        "is_final_voice": bool(args.final),
        "music": str(music) if music else None,
        "music_license": license_data,
        "duration_seconds": duration,
        "target_duration_seconds": item.get("target_duration_seconds"),
        "caption_count": sum(len(timing["captions"]) for timing in timings),
        "scene_timings": [{key: value for key, value in timing.items() if key != "captions"} for timing in timings],
        "output": str(final.relative_to(directory)),
        "cover": str(cover.relative_to(directory)),
    })
    catalog_store.update(item, catalog, "rendered", duration_seconds=duration)
    print(final)
    print(cover)


def cmd_review(args: argparse.Namespace) -> None:
    directory, item, catalog = catalog_store.find(args.video)
    final = directory / "exports/video.mp4"
    if not final.exists():
        raise RuntimeError("Render the video before reviewing it")
    plan = catalog_store.load_json(directory / "plan.json")
    lint_report = catalog_store.load_json(directory / "lint.json", {"passed": False})
    width, height = media.probe_dimensions(final)
    duration = media.probe_duration(final)
    target = float(item.get("target_duration_seconds", 20))
    checks = {
        "vertical_1080x1920": width == 1080 and height == 1920,
        # The same window `video new` accepts, so a story that was planned at
        # ninety seconds is not failed for being ninety seconds long.
        "duration_8_to_120_seconds": 8 <= duration <= 120,
        "duration_close_to_target": abs(duration - target) <= max(4.0, target * 0.25),
        "plan_lint_passed": bool(lint_report.get("passed")),
        "cover_exists": (directory / "exports/cover.png").is_file(),
        "subtitles_exist": (directory / "subtitles.srt").is_file(),
        "all_assets_resolve": all(
            not scene.get("asset")
            or scene["asset"] in renderer.SIMULATIONS
            or (directory / "assets/input" / scene["asset"]).is_file()
            for scene in plan["scenes"]
        ),
        "approval_exists": (directory / "approval.json").exists(),
    }
    passed = all(checks.values())
    review = {
        "reviewed_at": catalog_store.now(),
        "passed": passed,
        "checks": checks,
        "measured_duration_seconds": round(duration, 3),
        "target_duration_seconds": target,
        "human_review": None,
        "notes": args.notes,
    }
    catalog_store.write_json(directory / "review.json", review)
    catalog_store.update(item, catalog, "reviewed" if passed else "rendered", automated_review_passed=passed)
    print(json.dumps(review, ensure_ascii=False, indent=2))
    if not passed:
        raise RuntimeError("Automated review failed")


def cmd_sign(args: argparse.Namespace) -> None:
    directory, item, catalog = catalog_store.find(args.video)
    if item["state"] != "reviewed":
        raise RuntimeError(f"Only a reviewed video can be signed; current state: {item['state']}")
    review = catalog_store.load_json(directory / "review.json")
    if not review or not review.get("passed"):
        raise RuntimeError("Run the automated review before signing it")
    review["human_review"] = {"signed_at": catalog_store.now(), "signed_by": args.by, "notes": args.notes}
    catalog_store.write_json(directory / "review.json", review)
    catalog_store.update(item, catalog, "signed", signed_by=args.by)
    print(f"{item['id']}: signed by {args.by}")


def cmd_cover(args: argparse.Namespace) -> None:
    directory, item, _ = catalog_store.find(args.video)
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")
    renderer.stage_fonts()
    print(renderer.render_cover(directory, plan, directory / "exports/cover.png"))


def cmd_pack(args: argparse.Namespace) -> None:
    directory, item, catalog = catalog_store.find(args.video)
    final = directory / "exports/video.mp4"
    if not final.exists():
        raise RuntimeError("Render the video before packing it")
    if item["state"] not in {"signed", "published", "learned"} and not args.force:
        raise RuntimeError("Sign the human review before packing, or use --force")
    plan = catalog_store.load_json(directory / "plan.json")
    stamp = date.today().isoformat()
    name = "_".join([
        stamp,
        slug(plan["audience"], 1),
        slug(plan["pillar"], 2),
        slug(plan["concept"], 3),
        f"{slug(item.get('hook_label') or plan['scenes'][0]['purpose'], 2)}-v01",
    ])
    outbox = catalog_store.OUTBOX / name
    outbox.mkdir(parents=True, exist_ok=True)
    shutil.copy2(final, outbox / f"{name}.mp4")
    cover = directory / "exports/cover.png"
    if cover.exists():
        media.run(["ffmpeg", "-y", "-i", str(cover), "-q:v", "3", str(outbox / f"{name}.jpg")])
    shutil.copy2(directory / "caption.txt", outbox / f"{name}.txt")
    if (directory / "subtitles.srt").exists():
        shutil.copy2(directory / "subtitles.srt", outbox / f"{name}.srt")
    catalog_store.write_json(outbox / "publish.json", {
        "video": item["id"],
        "title": plan["title"],
        "audience": plan["audience"],
        "funnel_stage": plan["funnel_stage"],
        "cta": plan["cta"],
        "cover_text": plan["cover_text"],
        "duration_seconds": item.get("duration_seconds"),
        "verification_notes": plan["verification_notes"],
        "packed_at": catalog_store.now(),
    })
    catalog_store.update(item, catalog, packed_at=catalog_store.now(), package=str(outbox.relative_to(ROOT)))
    print(outbox)


def cmd_variants(args: argparse.Namespace) -> None:
    media.require_tool("claude")
    directory, item, catalog = catalog_store.find(args.video)
    plan = catalog_store.load_json(directory / "plan.json")
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
        child_directory, child = create_video(catalog, VideoRequest(
            plan=variant,
            brief=f"Variante de gancho de {item['id']}: {hook['label']}",
            duration=int(item.get("target_duration_seconds", 20)),
            assets_from=directory / "assets/input",
            extra={"experiment": "hook", "parent": item["id"], "hook_label": hook["label"]},
        ))
        report = run_lint(child_directory, child, catalog)
        created.append(child["id"])
        print(f"{child['id']}: {hook['label']} — {hook['on_screen_text']}")
        print_lint(child["id"], report)
    catalog_store.update(item, catalog, variants=sorted(set(item.get("variants", []) + created)))


def cmd_batch(args: argparse.Namespace) -> None:
    media.require_tool("claude")
    entries = catalog_store.load_json(args.file)
    if not isinstance(entries, list) or not entries:
        raise RuntimeError("The batch file must be a non-empty JSON list of {brief, duration, assets}")
    catalog = catalog_store.load()
    for entry in entries:
        brief = entry.get("brief", "").strip()
        duration = int(entry.get("duration", 20))
        assets = Path(entry["assets"]).expanduser() if entry.get("assets") else None
        plan = planner.create_plan(
            brief or "Choose the next video that fills the most valuable gap in the existing catalog.",
            duration,
            asset_library.asset_manifest(asset_library.list_assets(assets)),
            catalog_store.summary(catalog),
        )
        directory, item = create_video(catalog, VideoRequest(plan, brief, duration, assets))
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
    directory, item, catalog = catalog_store.find(args.video)
    if item["state"] not in {"signed", "published", "learned"}:
        raise RuntimeError("Sign the human review before recording publication results")
    if not args.file.is_file():
        raise RuntimeError(f"Results file not found: {args.file}")
    with args.file.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise RuntimeError("Results CSV has no data rows")
    shutil.copy2(args.file, directory / "results.csv")
    catalog_store.update(item, catalog, "published", published_at=rows[0].get("published_at"), result_rows=len(rows))
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
    return {"updated_at": catalog_store.now(), "video_count": len(active), "coverage": dimensions}


def cmd_learn(_: argparse.Namespace) -> None:
    catalog = catalog_store.load()
    gaps = calculate_gaps(catalog)
    catalog_store.write_json(ROOT / "memory/content-gaps.json", gaps)
    pending = []
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
        catalog_store.write_json(directory / "learning.json", summary)
        evidence.append(summary)
        pending.append(item)
    added = 0
    # The videos stay `published` until the lesson pass succeeds. Marking them
    # `learned` first would make a failed Claude call swallow the evidence: the
    # retry would skip them and those results would never produce a lesson.
    if evidence:
        analysis = planner.create_lessons(evidence, gaps)
        for lesson in analysis.get("lessons", []):
            lessons_store.add({**lesson, "origin": "metrics"})
            added += 1
        gaps["recommended_gaps"] = analysis.get("recommended_gaps", [])
        catalog_store.write_json(ROOT / "memory/content-gaps.json", gaps)
    for item in pending:
        item["state"] = "learned"
        item["updated_at"] = catalog_store.now()
    catalog_store.save(catalog)
    print(json.dumps({"videos_learned": len(pending), "lessons_added": added, "gaps": gaps}, ensure_ascii=False, indent=2))


def cmd_status(_: argparse.Namespace) -> None:
    catalog = catalog_store.load()
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
    # Above 45 s the piece is a story and the gate switches budgets; see
    # quality.scene_budget.
    new.add_argument("--duration", type=int, default=20, choices=range(8, 121), metavar="8-120")
    new.add_argument("--assets", type=Path)
    new.set_defaults(handler=cmd_new)

    docs = commands.add_parser("docs", help="Rewrite script.md, storyboard.md and caption.txt from plan.json")
    docs.add_argument("video")
    docs.set_defaults(handler=cmd_docs)

    lint = commands.add_parser("lint", help="Check a plan before spending a render on it")
    lint.add_argument("video")
    lint.set_defaults(handler=cmd_lint)

    voice_cost = commands.add_parser("voice-cost", help="Show what the voice track would cost before rendering")
    voice_cost.add_argument("video")
    voice_cost.set_defaults(handler=cmd_voice_cost)

    approve = commands.add_parser("approve", help="Approve a plan before rendering")
    approve.add_argument("video")
    approve.add_argument("--by", default="human")
    approve.add_argument("--notes", default="")
    approve.add_argument("--force", action="store_true", help="Approve despite lint errors")
    approve.set_defaults(handler=cmd_approve)

    render = commands.add_parser("render", help="Render an approved video")
    render.add_argument("video")
    render.add_argument("--music", help="Free commercial-use track with a .license.json sidecar")
    render.add_argument(
        "--yes",
        action="store_true",
        help="Confirm the spend in advance, for runs with no terminal to ask on",
    )
    render.add_argument(
        "--final",
        action="store_true",
        help="Buy the paid voice for the master. Without it, drafts use the free local voice",
    )
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
    voice.load_env()
    args = parser().parse_args()
    try:
        args.handler(args)
        return 0
    except (RuntimeError, OSError, ValueError, TypeError, AttributeError, KeyError, subprocess.CalledProcessError) as error:
        print(f"video-factory: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
