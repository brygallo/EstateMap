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
import tempfile
import unicodedata
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import assets as asset_library
import brand
import catalog as catalog_store
import documents
from extensions import ExtensionCommands
import lessons as lessons_store
import media
import planner
import quality
import scene_cache
import renderer
import review_tools
import subtitles
import tts
import voice
import workflow


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
    # A number the catalogue skipped. `next_number` only ever counts forward, so
    # a piece that was planned and discarded leaves a hole nothing can fill.
    number: int | None = None

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


def master_path(directory: Path) -> Path:
    return directory / "exports" / f"{directory.name}.mp4"


def cover_path(directory: Path) -> Path:
    return directory / "exports" / f"{directory.name}-cover.png"


def create_video(catalog: dict[str, Any], request: VideoRequest) -> tuple[Path, dict[str, Any]]:
    slot = Slot(request.number or catalog_store.next_number(catalog))
    if any(int(item["number"]) == slot.number for item in catalog["videos"]):
        raise RuntimeError(f"The catalogue already owns number {slot.number}: {slot.identifier}")
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
        "brand": brand.current().id,
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
        "brand": brand.current().id,
        "id": identifier,
        "number": number,
        "state": "planned",
        "directory": str(directory.relative_to(ROOT)),
        "target_duration_seconds": duration,
        "created_at": catalog_store.now(),
        "updated_at": catalog_store.now(),
        **workflow.PlanCatalogMetadata.build(plan, duration),
        **(extra or {}),
    }
    catalog["videos"].append(item)
    # A reclaimed number would otherwise sit at the end of the list, where the
    # planner reads the last entries as "the most recent work".
    catalog["videos"].sort(key=lambda entry: int(entry["number"]))
    catalog_store.save(catalog)
    return directory, item


def plan_sha(directory: Path) -> str:
    return hashlib.sha256((directory / "plan.json").read_bytes()).hexdigest()


def file_sha(path: Path) -> str:
    """Return the digest used to bind a human approval to exact preview props."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_lint(directory: Path, item: dict[str, Any], catalog: dict[str, Any]) -> dict[str, Any]:
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError(f"plan.json is missing in {directory}")
    target = int(item.get("target_duration_seconds", 20))
    report = quality.lint(plan, directory, target, catalog, item["id"])
    consistency = workflow.PlanConsistencyAudit.findings(plan, set(renderer.SIMULATIONS))
    report["findings"].extend(consistency)
    report["errors"] += sum(finding["level"] == "error" for finding in consistency)
    report["warnings"] += sum(finding["level"] == "warning" for finding in consistency)
    report["passed"] = report["errors"] == 0
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
    directory, item = create_video(
        catalog, VideoRequest(plan, brief, args.duration, args.assets, number=args.number)
    )
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
    workflow.StatePolicy.require_mutable(item, "rewrite documents")
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


def scene_providers(plan: dict[str, Any], final_master: bool, override: str | None = None) -> list[tts.VoiceProvider]:
    """Resolve the one narrator every scene in a video must share."""
    provider = tts.select(override or plan.get("voice_profile"), final_master)
    return [provider for _ in plan.get("scenes") or []]


def provider_batches(plan: dict[str, Any], providers: list[tts.VoiceProvider]) -> list[tuple[tts.VoiceProvider, list[str]]]:
    """Group lines by exact voice signature so quotes and consent stay accurate."""
    batches: dict[str, tuple[tts.VoiceProvider, list[str]]] = {}
    for scene, provider in zip(plan.get("scenes") or [], providers):
        signature = provider.signature()
        batches.setdefault(signature, (provider, []))[1].append(quality.text_of(scene, "voice"))
    return list(batches.values())


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


def confirm_voice_spend(plan: dict[str, Any], providers: list[tts.VoiceProvider], assumed: bool) -> None:
    """Show what this master will buy and let a person stop it."""
    narration = " ".join(scene["voice"].strip() for scene in plan["scenes"])
    reports = [(provider, voice.quote([narration], provider)) for provider in list(dict.fromkeys(providers))]
    billable = [(provider, report) for provider, report in reports if report["billable_characters"]]
    if not billable:
        print("Final voice: the continuous take is already paid for and cached; this costs nothing.")
        return
    for provider, report in billable:
        print(
            f"Final voice {provider.profile_id}: {report['billable_captions']} continuous take is new, "
            f"{report['billable_characters']} characters to buy."
        )
    agree_to_spend("Buy them?", assumed)


def previous_final_voice(catalog: dict[str, Any], number: int) -> tuple[int, str] | None:
    """The voice the piece before this one was bought with, if any was."""
    bought = []
    for item in catalog.get("videos", []):
        if int(item.get("number", 0)) >= number:
            continue
        lock = catalog_store.load_json(ROOT / item["directory"] / "voice-lock.json")
        if lock and lock.get("voice_profile"):
            bought.append((int(item["number"]), str(lock["voice_profile"])))
    return max(bought) if bought else None


def final_voice_providers(
    directory: Path,
    plan: dict[str, Any],
    item: dict[str, Any],
    catalog: dict[str, Any],
    override: str | None,
) -> list[tts.VoiceProvider]:
    """Decide which voice a master is bought with, and refuse to repeat one.

    Three rules meet here. A piece that already paid keeps its voice for ever,
    including on a re-render. A piece that has not paid yet takes the rotation's
    turn unless the person naming the command chose another profile. And either
    way the choice cannot be the voice of the previous piece — which is the part
    that used to depend on remembering it.
    """
    locked = catalog_store.load_json(directory / "voice-lock.json")
    if locked:
        return scene_providers(plan, final_master=True, override=locked.get("voice_profile"))
    pool = workflow.FinalVoiceRotation.pool(tts.profile_catalog())
    chosen = override or workflow.FinalVoiceRotation.assign(int(item["number"]), pool)
    workflow.FinalVoiceRotation.enforce(chosen, previous_final_voice(catalog, int(item["number"])))
    return scene_providers(plan, final_master=True, override=chosen)


def enforce_voice_lock(directory: Path, provider: tts.VoiceProvider) -> None:
    """A final voice and its paid settings become immutable for this video."""
    target = directory / "voice-lock.json"
    locked = catalog_store.load_json(target)
    if locked:
        if locked.get("signature") != provider.signature():
            raise RuntimeError(
                f"This video is locked to voice profile {locked.get('voice_profile')}; "
                f"create a new video or variant instead of buying another voice"
            )
        return
    catalog_store.write_json(target, {
        "locked_at": catalog_store.now(),
        "voice_profile": provider.profile_id,
        "tts_provider": provider.name,
        "signature": provider.signature(),
    })


def cmd_voice_cost(args: argparse.Namespace) -> None:
    """Report what a final master would buy, before buying any of it."""
    directory, item, _ = catalog_store.find(args.video)
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")
    providers = scene_providers(plan, final_master=True, override=args.voice_profile)
    print(f"{item['id']}:")
    for provider in list(dict.fromkeys(providers)):
        narration = " ".join(scene["voice"].strip() for scene in plan["scenes"])
        report = voice.quote([narration], provider)
        print(f"  {provider.profile_id} ({report['provider']})")
        print(f"    captions          {report['captions']}")
        print(f"    already cached    {report['cached']}")
        print(f"    to synthesise     {report['billable_captions']}")
        if provider.paid:
            print(f"    characters to buy {report['billable_characters']} (limit {report['ceiling']} per run)")
            print(f"    spent so far      {provider.spent_characters()} characters")


def cmd_voices(args: argparse.Namespace) -> None:
    """List configured profiles without contacting or charging a provider."""
    catalog = tts.profile_catalog()
    print(f"draft default: {catalog['defaults']['draft']}")
    print(f"final default: {catalog['defaults']['final']}")
    for profile_id, profile in catalog["profiles"].items():
        print(f"{profile_id:18} {profile['provider']:12} {profile.get('label', '')}")
        if profile.get("description"):
            print(f"{'':18} {'':12} {profile['description']}")


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
    if getattr(args, "final_voice", False):
        preview = catalog_store.load_json(directory / "final-voice-preview.json")
        props_path = directory / "studio-props.json"
        locked = catalog_store.load_json(directory / "voice-lock.json")
        if not preview or not props_path.is_file() or not locked:
            raise RuntimeError("Open `video studio --final-voice` before approving final timing")
        if preview.get("plan_sha") != plan_sha(directory):
            raise RuntimeError("plan.json changed after the final-voice Studio preview")
        if preview.get("props_sha") != file_sha(props_path):
            raise RuntimeError("Studio props changed after the final-voice preview")
        if preview.get("voice_signature") != locked.get("signature"):
            raise RuntimeError("The locked voice does not match the Studio preview")
        catalog_store.write_json(directory / "final-voice-approval.json", {
            "approved_at": catalog_store.now(),
            "approved_by": args.by,
            "notes": args.notes,
            **preview,
        })
        print(f"{item['id']}: final voice timing approved")
        return
    workflow.ApprovalPolicy.require_approvable(item["state"])
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")
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
    metadata = workflow.PlanCatalogMetadata.build(
        plan,
        int(item.get("target_duration_seconds", 20)),
    )
    catalog_store.update(item, catalog, "approved", **metadata)
    print(f"{item['id']}: approved")


@workflow.RenderLock.serialized
def cmd_studio(args: argparse.Namespace) -> None:
    """Open the piece in Remotion Studio, with its voice, before anything is rendered.

    A master takes half an hour and buys nothing you can act on: by the time it
    exists the mistakes are already in it. The studio plays the same
    composition, with the same props and the same voice, and reacts to a saved
    file in a second — so that is where a piece is judged, and a render happens
    once, at the end, with the narration already bought.

    The default voice is free and local. `--final-voice` is the deliberate
    spending gate: it buys or reuses the locked final voice, recalculates every
    scene from that audio, and writes the exact props a person must approve
    before the expensive render is allowed to start.
    """
    media.require_tool("node")
    directory, item, catalog = catalog_store.find(args.video)
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")

    final_preview = bool(getattr(args, "final_voice", False))
    providers = (
        final_voice_providers(directory, plan, item, catalog, args.voice_profile)
        if final_preview
        else scene_providers(plan, final_master=False, override=args.voice_profile)
    )
    for provider, _ in provider_batches(plan, providers):
        provider.check_ready()
    if final_preview:
        locked = catalog_store.load_json(directory / "voice-lock.json")
        if locked and locked.get("signature") != providers[0].signature():
            raise RuntimeError(
                f"This video is locked to voice profile {locked.get('voice_profile')}; "
                "create a new video or variant instead of buying another voice"
            )
        confirm_voice_spend(plan, providers, args.yes)
        enforce_voice_lock(directory, providers[0])

    narration = directory / "audio" / ("narration-final.mp3" if final_preview else "narration-draft.mp3")
    timings = voice.speak_video([scene["voice"] for scene in plan["scenes"]], narration, providers[0])
    for timing in timings:
        timing["render_seconds"] = renderer.frames(timing["voice_seconds"]) / renderer.FPS
    timings[-1]["render_seconds"] += renderer.SCENE_TAIL_SECONDS

    music = Path(args.music).expanduser().resolve() if args.music else None
    if music and not music.is_file():
        raise RuntimeError(f"Music track not found: {music}")
    if music:
        music_license(music)
    props = renderer.build_props(directory, plan, timings, music, narration=narration)
    props_path = directory / "studio-props.json"
    catalog_store.write_json(props_path, props)
    if final_preview:
        subtitles.write_srt(timings, directory / "subtitles.pending.srt")
        catalog_store.write_json(directory / "final-voice-preview.json", {
            "prepared_at": catalog_store.now(),
            "plan_sha": plan_sha(directory),
            "props_sha": file_sha(props_path),
            "voice_signature": providers[0].signature(),
        })
        (directory / "final-voice-approval.json").unlink(missing_ok=True)

    total = sum(scene["durationInFrames"] for scene in props["scenes"])
    print(f"{item['id']}: {len(props['scenes'])} escenas · {total / renderer.FPS:.1f} s")
    print(f"props: {props_path}")
    if final_preview:
        print("Final voice timing loaded. Approve it only after watching the whole piece in Studio.")
    if args.props_only:
        return

    root = Path(__file__).resolve().parent / "remotion"
    command = [
        "npx", "remotion", "studio", "src/index.ts",
        f"--props={props_path}",
        f"--port={args.port}",
    ]
    print(f"\nhttp://localhost:{args.port}/EstateMapVideo\n")
    print("Míralo entero. El render se hace después de que una persona lo apruebe aquí.")
    subprocess.run(command, cwd=root, check=False)


def cmd_render(args: argparse.Namespace) -> None:
    media.require_tool("node")
    media.require_tool("ffmpeg")
    directory, item, catalog = catalog_store.find(args.video)
    if item["state"] not in catalog_store.RENDERABLE:
        raise RuntimeError("Approve the video before rendering it")
    # A master costs half an hour of machine time, so it is not where a piece
    # gets looked at any more: `video studio` is. A draft render is still there
    # for debugging the renderer itself, and it has to be asked for by name.
    if not args.final and not getattr(args, "draft", False):
        raise RuntimeError(
            "El borrador ya no es parte del ciclo: mira la pieza con `video studio "
            f"{item['id']}`, y cuando una persona la apruebe ahí, compra la voz y "
            f"renderiza una sola vez con `video render {item['id']} --final`. "
            "Para depurar el renderer, `--draft`."
        )
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")
    approval = catalog_store.load_json(directory / "approval.json", {})
    if approval.get("plan_sha") and approval["plan_sha"] != plan_sha(directory):
        raise RuntimeError("plan.json changed after approval; approve it again before rendering")
    # Drafts are free and finals are bought once, at the end, on purpose. A
    # final also picks its narrator by rotation, so the account does not end up
    # sounding like one person reading every piece.
    providers = (
        final_voice_providers(directory, plan, item, catalog, args.voice_profile)
        if args.final
        else scene_providers(plan, final_master=False, override=args.voice_profile)
    )
    for provider, _ in provider_batches(plan, providers):
        provider.check_ready()
    if args.final:
        locked = catalog_store.load_json(directory / "voice-lock.json")
        if locked and locked.get("signature") != providers[0].signature():
            raise RuntimeError(
                f"This video is locked to voice profile {locked.get('voice_profile')}; "
                f"create a new video or variant instead of buying another voice"
            )
        final_approval = catalog_store.load_json(directory / "final-voice-approval.json")
        preview = catalog_store.load_json(directory / "final-voice-preview.json")
        studio_props = directory / "studio-props.json"
        if (
            not final_approval
            or not preview
            or not studio_props.is_file()
            or final_approval.get("plan_sha") != plan_sha(directory)
            or final_approval.get("props_sha") != file_sha(studio_props)
            or final_approval.get("voice_signature") != providers[0].signature()
        ):
            raise RuntimeError(
                "Review the bought voice with `video studio --final-voice`, then record "
                "human approval with `video approve --final-voice` before rendering"
            )
        confirm_voice_spend(plan, providers, args.yes)
        enforce_voice_lock(directory, providers[0])
    narration = None
    if args.final:
        narration = directory / "audio" / "narration-final.mp3"
        timings = voice.speak_video([scene["voice"] for scene in plan["scenes"]], narration, providers[0])
        for timing in timings:
            timing["render_seconds"] = renderer.frames(timing["voice_seconds"]) / renderer.FPS
        timings[-1]["render_seconds"] += renderer.SCENE_TAIL_SECONDS
    else:
        timings = []
        for index, (scene, provider) in enumerate(zip(plan["scenes"], providers)):
            target = directory / "audio" / f"voice-{index + 1:02}.mp3"
            captions = voice.speak_scene(scene["voice"], target, provider)
            spoken = captions[-1]["end"] if captions else 0.0
            render_seconds = renderer.frames(spoken + renderer.SCENE_TAIL_SECONDS) / renderer.FPS
            timings.append({
                "scene": index + 1,
                "voice_file": str(target),
                "voice_seconds": round(spoken, 3),
                "voice_profile": provider.profile_id,
                "tts_provider": provider.name,
                "render_seconds": render_seconds,
                "captions": captions,
            })
    pending_subtitles = directory / "subtitles.pending.srt"
    subtitles.write_srt(timings, pending_subtitles)
    music = Path(args.music).expanduser().resolve() if args.music else None
    if music and not music.is_file():
        raise RuntimeError(f"Music track not found: {music}")
    license_data = music_license(music) if music else None
    props = renderer.build_props(directory, plan, timings, music, narration=narration)
    props_path = directory / "render-props.pending.json"
    catalog_store.write_json(props_path, props)
    pending_final = directory / "exports" / f"{directory.name}.pending.mp4"
    pending_cover = directory / "exports" / f"{directory.name}-cover.pending.png"
    workflow.RenderCleanupPolicy.discard(pending_final, pending_cover)
    # The master is assembled scene by scene so a correction to one shot does
    # not re-draw the fifty-five seconds that were already right. A frame range
    # of this composition is interchangeable with the same frames of a single
    # pass, and `scene_cache` refuses to hand over a master whose length does not
    # match the plan.
    cache = scene_cache.SceneRenderCache(
        directory,
        fresh=bool(getattr(args, "fresh", False)),
        concurrency=getattr(args, "concurrency", None),
    )
    try:
        cache.build(props_path, props, pending_final)
        renderer.render_cover(directory, plan, pending_cover)
    except Exception:
        workflow.RenderCleanupPolicy.discard(
            pending_final,
            pending_cover,
            pending_subtitles,
            props_path,
        )
        raise
    final = master_path(directory)
    cover = cover_path(directory)
    pending_final.replace(final)
    pending_cover.replace(cover)
    pending_subtitles.replace(directory / "subtitles.srt")
    props_path.replace(directory / "render-props.json")
    # Only a complete replacement invalidates the review of the old master.
    (directory / "review.json").unlink(missing_ok=True)
    duration = round(media.probe_duration(final), 3)
    catalog_store.write_json(directory / "production.json", {
        "rendered_at": catalog_store.now(),
        "renderer": "remotion",
        "remotion_version": "4.0.509",
        # The encoder tag of the finished MP4 says only "libx264", so the
        # quality a published piece was made with is unverifiable from the file.
        "encoder_flags": renderer.ENCODER_FLAGS,
        # The master is rendered at 2x and resampled down, so the flags above
        # describe the intermediate, not the file that ships.
        "supersample_scale": renderer.SUPERSAMPLE_SCALE,
        "delivery_flags": renderer.DELIVERY_FLAGS,
        "tts_provider": providers[0].name if len({provider.name for provider in providers}) == 1 else "mixed",
        "voice_profiles": list(dict.fromkeys(provider.profile_id for provider in providers)),
        "is_final_voice": bool(args.final),
        "music": str(music) if music else None,
        "music_license": license_data,
        "duration_seconds": duration,
        "target_duration_seconds": item.get("target_duration_seconds"),
        "caption_count": sum(len(timing["captions"]) for timing in timings),
        "scene_timings": [{key: value for key, value in timing.items() if key != "captions"} for timing in timings],
        "output": str(final.relative_to(directory)),
        "cover": str(cover.relative_to(directory)),
        # Which shots this master actually re-drew. A piece assembled from
        # cached scenes has to be able to say so.
        **cache.report,
    })
    catalog_store.update(item, catalog, "rendered", duration_seconds=duration)
    print(final)
    print(cover)


def cmd_review(args: argparse.Namespace) -> None:
    directory, item, catalog = catalog_store.find(args.video)
    workflow.StatePolicy.require_mutable(item, "review it again")
    final = master_path(directory)
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
        f"duration_8_to_{quality.MAX_DURATION_SECONDS}_seconds": 8 <= duration <= quality.MAX_DURATION_SECONDS,
        "plan_lint_passed": bool(lint_report.get("passed")),
        "cover_exists": cover_path(directory).is_file(),
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
    production = catalog_store.load_json(directory / "production.json", {})
    review["visual_review"] = review_tools.VisualReview(ROOT, directory, brand.current().memory).build(
        plan, production.get("scene_timings") or [], item["id"]
    )
    checks["text_minimum_declared"] = review["visual_review"]["text"]["passed"]
    # A figure that counts up to its value is false in every frame but the last,
    # and the piece states it as fact while it climbs. It is not a warning.
    checks["no_interpolated_figures"] = review["visual_review"]["animated_figures"]["passed"]
    # The opening scene is the only one every viewer sees. It is measured on the
    # finished file and it fails the master, because a hook that reads as a slide
    # has already answered the question the piece was asking.
    hero = review["visual_review"]["hero_scene"]
    if hero.get("measured"):
        checks["hero_scene_holds_attention"] = hero["passed"]
    passed = all(checks.values())
    review["passed"] = passed
    catalog_store.write_json(directory / "review.json", review)
    page = review_tools.ReviewPage(directory).write(item, plan, review)
    catalog_store.update(
        item,
        catalog,
        "reviewed" if passed else "rendered",
        automated_review_passed=passed,
        duration_seconds=round(duration, 3),
    )
    print(json.dumps(review, ensure_ascii=False, indent=2))
    print(page)
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
    workflow.StatePolicy.require_mutable(item, "replace the cover")
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")
    renderer.stage_fonts()
    print(renderer.render_cover(directory, plan, cover_path(directory)))


def cmd_pack(args: argparse.Namespace) -> None:
    directory, item, catalog = catalog_store.find(args.video)
    final = master_path(directory)
    if not final.exists():
        raise RuntimeError("Render the video before packing it")
    if item["state"] not in {"signed", "published", "learned"} and not args.force:
        raise RuntimeError("Sign the human review before packing, or use --force")
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")
    publishing_copy = workflow.PublishingCopy.build(
        plan["caption"],
        plan.get("hashtags") or brand.current().default_hashtags,
    )
    stamp = date.today().isoformat()
    name = "_".join([
        stamp,
        slug(plan["audience"], 1),
        slug(plan["pillar"], 2),
        slug(plan["concept"], 3),
        f"{slug(item.get('hook_label') or plan['scenes'][0]['purpose'], 2)}-v01",
    ])
    outbox = catalog_store.OUTBOX / name
    if outbox.exists():
        raise RuntimeError(f"Publishing package already exists and is immutable: {outbox}")
    catalog_store.OUTBOX.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f".{name}-", dir=catalog_store.OUTBOX) as temporary:
        staging = Path(temporary)
        shutil.copy2(final, staging / f"{name}.mp4")
        cover = cover_path(directory)
        if cover.exists():
            media.run(["ffmpeg", "-y", "-i", str(cover), "-q:v", "3", str(staging / f"{name}.jpg")])
        shutil.copy2(directory / "caption.txt", staging / f"{name}.txt")
        (staging / "texto-para-publicar.txt").write_text(
            publishing_copy["text"], encoding="utf-8"
        )
        if (directory / "subtitles.srt").exists():
            shutil.copy2(directory / "subtitles.srt", staging / f"{name}.srt")
        catalog_store.write_json(staging / "publish.json", {
            "video": item["id"],
            "title": plan["title"],
            "audience": plan["audience"],
            "funnel_stage": plan["funnel_stage"],
            "cta": plan["cta"],
            "cover_text": plan["cover_text"],
            "duration_seconds": item.get("duration_seconds"),
            "verification_notes": plan["verification_notes"],
            "hashtags": publishing_copy["hashtags"],
            "publication_text_file": "texto-para-publicar.txt",
            "packed_at": catalog_store.now(),
        })
        staging.replace(outbox)
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


def cmd_voice_variant(args: argparse.Namespace) -> None:
    """Create an exact production variant when a paid voice must change."""
    directory, item, catalog = catalog_store.find(args.video)
    plan = catalog_store.load_json(directory / "plan.json")
    if plan is None:
        raise RuntimeError("plan.json is missing")
    variant = copy.deepcopy(plan)
    variant["title"] = f"{plan['title']} · voz continua"
    child_directory, child = create_video(catalog, VideoRequest(
        plan=variant,
        brief=f"Variante de voz continua de {item['id']}",
        duration=int(item.get("target_duration_seconds", 20)),
        assets_from=directory / "assets/input",
        extra={"experiment": "voice", "parent": item["id"], "voice_variant": True},
    ))
    report = run_lint(child_directory, child, catalog)
    catalog_store.update(item, catalog, variants=sorted(set(item.get("variants", []) + [child["id"]])))
    print(f"{child['id']}: continuous-voice variant of {item['id']}")
    print_lint(child["id"], report)


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
    if item["state"] not in {"published", "learned"}:
        raise RuntimeError("Synchronise a confirmed publication before recording results")
    if not args.file.is_file():
        raise RuntimeError(f"Results file not found: {args.file}")
    rows = workflow.ResultsTable.read(args.file)
    shutil.copy2(args.file, directory / "results.csv")
    catalog_store.update(item, catalog, result_rows=len(rows), results_updated_at=catalog_store.now())
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
    catalog_store.write_json(brand.current().memory / "content-gaps.json", gaps)
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
        catalog_store.write_json(brand.current().memory / "content-gaps.json", gaps)
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
    root = argparse.ArgumentParser(description="Aents multi-brand video factory")
    root.add_argument(
        "--brand",
        choices=brand.available(),
        default=brand.DEFAULT_BRAND,
        help="Brand workspace (default: geo)",
    )
    commands = root.add_subparsers(dest="command", required=True)
    extensions = ExtensionCommands(ROOT)

    new = commands.add_parser("new", help="Plan the next video")
    new.add_argument("brief", nargs="?")
    # Above 45 s the piece is a story and above 120 a lesson; the gate switches
    # budgets at each threshold. See quality.scene_budget.
    new.add_argument(
        "--duration",
        type=int,
        default=20,
        choices=range(8, quality.MAX_DURATION_SECONDS + 1),
        metavar=f"8-{quality.MAX_DURATION_SECONDS}",
    )
    new.add_argument("--number", type=int, help="Claim a specific catalog number instead of the next one")
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
    voice_cost.add_argument("--voice-profile", help="Override the video voice profile for every scene")
    voice_cost.set_defaults(handler=cmd_voice_cost)

    voices = commands.add_parser("voices", help="List configured voice profiles without synthesising")
    voices.set_defaults(handler=cmd_voices)

    approve = commands.add_parser("approve", help="Approve a plan before rendering")
    approve.add_argument("video")
    approve.add_argument("--by", default="human")
    approve.add_argument("--notes", default="")
    approve.add_argument("--force", action="store_true", help="Approve despite lint errors")
    approve.add_argument(
        "--final-voice",
        action="store_true",
        help="Approve the exact bought voice timing currently loaded in Studio",
    )
    approve.set_defaults(handler=cmd_approve)

    studio = commands.add_parser("studio", help="Open the piece in Remotion Studio before rendering")
    studio.add_argument("video")
    studio.add_argument("--port", type=int, default=3210)
    studio.add_argument("--voice-profile")
    studio.add_argument("--music", help="Licensed music track to audition with the final voice")
    studio.add_argument(
        "--final-voice",
        action="store_true",
        help="Buy/reuse final voice and load its exact timing in Studio before rendering",
    )
    studio.add_argument(
        "--yes",
        action="store_true",
        help="Confirm final-voice spend in advance when no terminal can ask",
    )
    studio.add_argument("--props-only", action="store_true", help="Write the props and stop")
    studio.set_defaults(handler=cmd_studio)

    render = commands.add_parser("render", help="Render an approved video")
    render.add_argument("video")
    render.add_argument(
        "--draft",
        action="store_true",
        help="Render with the free voice. For debugging the renderer; the studio is where a piece is judged",
    )
    render.add_argument("--voice-profile", help="Override the video voice profile for every scene")
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
    render.add_argument(
        "--fresh",
        action="store_true",
        help="Ignore the scene cache and re-draw every shot",
    )
    render.add_argument(
        "--concurrency",
        type=int,
        help="Browser tabs Remotion may render into at once. Lower it when the machine runs out of memory",
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

    voice_variant = commands.add_parser("voice-variant", help="Create an exact variant for a different paid voice")
    voice_variant.add_argument("video")
    voice_variant.set_defaults(handler=cmd_voice_variant)

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

    sync = commands.add_parser("sync", help="Reconcile confirmed external publications from JSON")
    sync.add_argument("file", type=Path)
    sync.add_argument("--dry-run", action="store_true")
    sync.set_defaults(handler=extensions.sync)

    experiment = commands.add_parser("experiment", help="Decide a hook experiment from comparable results")
    experiment.add_argument("video")
    experiment.add_argument("--metric", required=True, choices=sorted(workflow.ResultsTable.NUMERIC_FIELDS))
    experiment.add_argument("--minimum-views", type=int, default=100)
    experiment.set_defaults(handler=extensions.experiment)

    preview = commands.add_parser("preview", help="Render one scene from existing draft props")
    preview.add_argument("video")
    preview.add_argument("--scene", type=int, required=True)
    preview.add_argument("--overlay", action="store_true", help="Show platform safe areas")
    preview.set_defaults(handler=extensions.preview)

    learn = commands.add_parser("learn", help="Update coverage and learn from published videos")
    learn.set_defaults(handler=cmd_learn)

    status = commands.add_parser("status", help="List video states")
    status.set_defaults(handler=cmd_status)
    return root


def main() -> int:
    voice.load_env()
    args = parser().parse_args()
    try:
        profile = brand.configure(args.brand)
        catalog_store.configure(profile)
        lessons_store.configure(profile)
        quality.configure(profile)
        renderer.configure(profile)
        args.handler(args)
        return 0
    except (RuntimeError, OSError, ValueError, TypeError, AttributeError, KeyError, subprocess.CalledProcessError) as error:
        print(f"video-factory: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
