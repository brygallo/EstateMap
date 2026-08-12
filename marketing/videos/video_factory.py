#!/usr/bin/env python3
"""Generate a complete vertical social video from a terminal brief."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import textwrap
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
WIDTH = 1080
HEIGHT = 1920
FPS = 30
FONT = ROOT.parent.parent / "frontend/public/fonts/PlusJakartaSans-ExtraBold.ttf"
COLORS = ["0x0F1020", "0x6B5CF6", "0x14B8A6", "0x1B8648"]


PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "title", "audience", "funnel_stage", "objective", "conversion_event",
        "pillar", "series", "concept", "promise", "cta", "hypothesis",
        "cover_text", "caption", "music_prompt", "narration",
        "verification_notes", "scenes"
    ],
    "properties": {
        "title": {"type": "string"},
        "audience": {"type": "string"},
        "funnel_stage": {"type": "string", "enum": ["descubrimiento", "consideración", "conversión"]},
        "objective": {"type": "string"},
        "conversion_event": {"type": "string"},
        "pillar": {"type": "string"},
        "series": {"type": "string"},
        "concept": {"type": "string"},
        "promise": {"type": "string"},
        "cta": {"type": "string"},
        "hypothesis": {"type": "string"},
        "cover_text": {"type": "string"},
        "caption": {"type": "string"},
        "music_prompt": {"type": "string"},
        "narration": {"type": "string"},
        "verification_notes": {"type": "array", "items": {"type": "string"}},
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["purpose", "duration", "voice", "on_screen_text", "asset", "visual_direction", "transition", "sfx"],
                "properties": {
                    "purpose": {"type": "string"},
                    "duration": {"type": "number"},
                    "voice": {"type": "string"},
                    "on_screen_text": {"type": "string"},
                    "asset": {"type": ["string", "null"]},
                    "visual_direction": {"type": "string"},
                    "transition": {"type": "string", "enum": ["cut", "fade"]},
                    "sfx": {"type": "string", "enum": ["none", "click", "whoosh"]},
                },
            },
        },
    },
}


def api_request(url: str, headers: dict[str, str], payload: dict[str, Any]) -> bytes:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API request failed ({error.code}): {detail}") from error


def run(command: list[str]) -> None:
    completed = subprocess.run(command, text=True, capture_output=True)
    if completed.returncode:
        raise RuntimeError(f"Command failed: {' '.join(command)}\n{completed.stderr}")


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        raise RuntimeError(f"Required executable not found: {name}")


def read_context() -> str:
    files = [
        "CLAUDE.md",
        "product-context.md",
        "strategy.md",
        "production-guide.md",
        "creative-system.md",
        "memory/lessons.md",
        "memory/lessons.json",
        "memory/content-gaps.json",
        "memory/decisions.md",
    ]
    return "\n\n".join((ROOT / name).read_text(encoding="utf-8") for name in files)


def read_catalog(limit: int = 40) -> str:
    stateful_catalog = ROOT / "memory/catalog.json"
    if stateful_catalog.exists():
        data = json.loads(stateful_catalog.read_text(encoding="utf-8"))
        videos = data.get("videos", [])[-limit:]
        return json.dumps(videos, ensure_ascii=False) if videos else "No previous videos exist."
    catalog = ROOT / "memory/video-catalog.jsonl"
    if not catalog.exists():
        return "No previous videos exist. Start with the highest-value foundational concept."
    lines = catalog.read_text(encoding="utf-8").splitlines()[-limit:]
    return "\n".join(lines) or "No previous videos exist."


def append_run_log(status: str, brief: str, output_dir: Path | None, detail: str = "") -> None:
    log = ROOT / "memory/run-log.jsonl"
    record = {
        "created_at": datetime.now().astimezone().isoformat(),
        "status": status,
        "brief": brief,
        "output": str(output_dir) if output_dir else None,
        "detail": detail,
    }
    with log.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def create_plan(brief: str, duration: int, assets: list[Path]) -> dict[str, Any]:
    asset_names = [path.name for path in assets]
    prompt = f"""Create one production-ready Spanish social video for Geo Propiedades Ecuador.
Target duration: {duration} seconds. Use only asset filenames from this list or null: {asset_names}.
The first scene must hook in two seconds. Use one audience, one promise, and one CTA.
Scene durations must total approximately {duration} seconds. Narration must fit naturally.
The music prompt must request a short instrumental commercial track without artist names.
Every voice field is the exact narration spoken during that scene. The narration field joins all voice fields.

PREVIOUS VIDEO CATALOG:
{read_catalog()}

Study the catalog before planning. Complement missing audiences, funnel stages, pillars or objections. Do not repeat a previous hook or concept unless the brief explicitly requests a new variant. Keep the shared creative system unchanged.

USER BRIEF:
{brief}
"""
    command = [
        "claude",
        "-p",
        "--output-format",
        "json",
        "--json-schema",
        json.dumps(PLAN_SCHEMA),
        "--system-prompt",
        read_context(),
        "--max-turns",
        "1",
    ]
    model = os.environ.get("CLAUDE_MODEL")
    if model:
        command.extend(["--model", model])
    completed = subprocess.run(command, input=prompt, text=True, capture_output=True)
    if completed.returncode:
        raise RuntimeError(f"Claude CLI failed: {completed.stderr.strip()}")
    response = json.loads(completed.stdout)
    structured = response.get("structured_output")
    if isinstance(structured, dict):
        return structured
    result = response.get("result")
    if isinstance(result, str):
        return json.loads(result)
    if all(key in response for key in PLAN_SCHEMA["required"]):
        return response
    raise RuntimeError(f"Claude returned no structured plan: {response}")


def write_plan_markdown(plan: dict[str, Any], video_number: int, target: Path) -> None:
    rows = []
    cursor = 0.0
    for index, scene in enumerate(plan["scenes"], 1):
        start = cursor
        cursor += float(scene["duration"])
        asset = scene.get("asset") or "Fondo de marca"
        rows.append(
            f"| {index} | {start:.1f}–{cursor:.1f} s | {scene['purpose']} | {scene['visual_direction']} | "
            f"{scene['voice']} | {scene['on_screen_text']} | {asset} | {scene['transition']} / {scene['sfx']} |"
        )
    content = f"""# Video {video_number:03}: {plan['title']}

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

| Escena | Tiempo | Función | Visual | Voz | Texto en pantalla | Recurso | Transición / SFX |
| --- | --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(rows)}

## Voz completa

{plan['narration']}

## Música

{plan['music_prompt']}

## Caption

{plan['caption']}

## Verificación antes de publicar

{chr(10).join(f'- [ ] {note}' for note in plan['verification_notes']) or '- [ ] Sin afirmaciones adicionales.'}
"""
    target.write_text(content, encoding="utf-8")


def next_video_number() -> int:
    catalog = ROOT / "memory/video-catalog.jsonl"
    if not catalog.exists():
        return 1
    return sum(1 for line in catalog.read_text(encoding="utf-8").splitlines() if line.strip()) + 1


def append_catalog(video_number: int, plan: dict[str, Any], brief: str, output_dir: Path) -> None:
    record = {
        "video": video_number,
        "title": plan["title"],
        "brief": brief,
        "audience": plan["audience"],
        "funnel_stage": plan["funnel_stage"],
        "pillar": plan["pillar"],
        "series": plan["series"],
        "concept": plan["concept"],
        "cta": plan["cta"],
        "hook": plan["scenes"][0]["voice"] if plan.get("scenes") else "",
        "caption": plan["caption"],
        "output": str(output_dir),
        "status": "planned",
    }
    with (ROOT / "memory/video-catalog.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def generate_voice(text: str, target: Path) -> None:
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID")
    if not api_key or not voice_id:
        local_voice = os.environ.get("LOCAL_VOICE", "Paulina")
        aiff = target.with_suffix(".aiff")
        run(["say", "-v", local_voice, "-r", "185", "-o", str(aiff), text])
        run(["ffmpeg", "-y", "-i", str(aiff), "-codec:a", "libmp3lame", "-q:a", "2", str(target)])
        aiff.unlink(missing_ok=True)
        return
    audio = api_request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        {"xi-api-key": api_key},
        {
            "text": text,
            "model_id": os.environ.get("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2"),
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.75, "speed": 1.04},
        },
    )
    target.write_bytes(audio)


def generate_music(prompt: str, duration: int, target: Path) -> None:
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        # A restrained, locally synthesized pulse keeps the free workflow fully
        # offline. It is intentionally simple so it never competes with speech.
        run([
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"sine=frequency=110:sample_rate=44100:duration={duration}",
            "-f", "lavfi", "-i", f"sine=frequency=220:sample_rate=44100:duration={duration}",
            "-filter_complex", "[0:a]volume=0.35[a0];[1:a]volume=0.08,tremolo=f=2.2:d=0.35[a1];[a0][a1]amix=inputs=2,afade=t=in:st=0:d=0.4,afade=t=out:st=1:d=1",
            "-codec:a", "libmp3lame", "-q:a", "4", str(target),
        ])
        return
    audio = api_request(
        "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
        {"xi-api-key": api_key},
        {
            "prompt": prompt,
            "music_length_ms": max(3000, duration * 1000),
            "force_instrumental": True,
        },
    )
    target.write_bytes(audio)


def ffmpeg_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def render_scene(scene: dict[str, Any], index: int, assets_by_name: dict[str, Path], target: Path) -> None:
    duration = max(1.0, float(scene["duration"]))
    asset = assets_by_name.get(scene.get("asset") or "")
    wrapped = "\n".join(textwrap.wrap(scene["on_screen_text"].strip(), width=22))
    text_filter = (
        f"drawtext=fontfile='{ffmpeg_escape(str(FONT))}':text='{ffmpeg_escape(wrapped)}':"
        "fontcolor=white:fontsize=78:line_spacing=18:x=(w-text_w)/2:y=(h-text_h)/2:"
        "box=1:boxcolor=0x0F1020AA:boxborderw=36"
    )
    common = ["-t", str(duration), "-r", str(FPS), "-pix_fmt", "yuv420p", "-an", str(target)]
    if asset and asset.suffix.lower() in {".mp4", ".mov", ".m4v", ".webm"}:
        run(["ffmpeg", "-y", "-stream_loop", "-1", "-i", str(asset), "-vf", f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT},{text_filter}", *common])
    elif asset and asset.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
        run(["ffmpeg", "-y", "-loop", "1", "-i", str(asset), "-vf", f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT},zoompan=z='min(zoom+0.0008,1.08)':d=1:s={WIDTH}x{HEIGHT}:fps={FPS},{text_filter}", *common])
    else:
        run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={COLORS[index % len(COLORS)]}:s={WIDTH}x{HEIGHT}:r={FPS}", "-vf", text_filter, *common])


def write_srt(scenes: list[dict[str, Any]], target: Path) -> None:
    def stamp(seconds: float) -> str:
        milliseconds = round(seconds * 1000)
        hours, remainder = divmod(milliseconds, 3_600_000)
        minutes, remainder = divmod(remainder, 60_000)
        secs, ms = divmod(remainder, 1000)
        return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"

    cursor = 0.0
    blocks = []
    for index, scene in enumerate(scenes, 1):
        end = cursor + float(scene["duration"])
        blocks.append(f"{index}\n{stamp(cursor)} --> {stamp(end)}\n{scene['voice'].strip()}\n")
        cursor = end
    target.write_text("\n".join(blocks), encoding="utf-8")


def assemble_video(plan: dict[str, Any], assets: list[Path], output_dir: Path, with_music: bool) -> Path:
    scenes_dir = output_dir / "scenes"
    scenes_dir.mkdir(parents=True, exist_ok=True)
    assets_by_name = {path.name: path for path in assets}
    rendered = []
    for index, scene in enumerate(plan["scenes"]):
        target = scenes_dir / f"scene-{index + 1:02}.mp4"
        render_scene(scene, index, assets_by_name, target)
        rendered.append(target)
    concat_file = output_dir / "concat.txt"
    concat_file.write_text("\n".join(f"file '{path.as_posix()}'" for path in rendered), encoding="utf-8")
    silent = output_dir / "silent.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(silent)])
    audio_dir = output_dir / "audio"
    audio_dir.mkdir(exist_ok=True)
    voice = audio_dir / "voice.mp3"
    generate_voice(plan["narration"], voice)
    subtitles = output_dir / "subtitles.srt"
    write_srt(plan["scenes"], subtitles)
    exports_dir = output_dir / "exports"
    exports_dir.mkdir(exist_ok=True)
    final = exports_dir / "video.mp4"
    if with_music:
        music = audio_dir / "music.mp3"
        duration = round(sum(float(scene["duration"]) for scene in plan["scenes"]))
        generate_music(plan["music_prompt"], duration, music)
        run(["ffmpeg", "-y", "-i", str(silent), "-i", str(voice), "-stream_loop", "-1", "-i", str(music), "-filter_complex", "[1:a]volume=1.0[voice];[2:a]volume=0.12[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]", "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)])
    else:
        run(["ffmpeg", "-y", "-i", str(silent), "-i", str(voice), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)])
    return final


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a scripted, voiced and edited 9:16 social video.")
    parser.add_argument("brief", nargs="?", help="Video idea or path to a UTF-8 brief file")
    parser.add_argument("--auto", action="store_true", help="Choose the next missing video from catalog gaps")
    parser.add_argument("--assets", type=Path, help="Directory with approved images and clips")
    parser.add_argument("--duration", type=int, default=20, choices=range(8, 61), metavar="8-60")
    parser.add_argument("--output", type=Path, help="Output directory")
    parser.add_argument("--no-music", action="store_true", help="Skip AI music generation")
    parser.add_argument("--plan-only", action="store_true", help="Generate the Claude plan without paid audio calls")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    require_tool("ffmpeg")
    require_tool("claude")
    if not os.environ.get("ELEVENLABS_API_KEY"):
        require_tool("say")
    if not args.brief and not args.auto:
        raise RuntimeError("Provide a brief or use --auto")
    if args.auto:
        brief = "Choose the next video that best complements the existing catalog and advances the content system."
    else:
        brief_path = Path(args.brief)
        brief = brief_path.read_text(encoding="utf-8") if brief_path.is_file() else args.brief
    assets = []
    if args.assets:
        assets = sorted(path for path in args.assets.iterdir() if path.is_file())
    video_number = next_video_number()
    output_dir = args.output or ROOT / "library" / f"video-{video_number:03}"
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "assets/input").mkdir(parents=True, exist_ok=True)
    (output_dir / "assets/generated").mkdir(parents=True, exist_ok=True)
    results_template = ROOT / "templates/results.csv"
    results_target = output_dir / "results.csv"
    if not results_target.exists():
        shutil.copyfile(results_template, results_target)
    plan = create_plan(brief, args.duration, assets)
    (output_dir / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    write_plan_markdown(plan, video_number, output_dir / f"video-{video_number:03}.md")
    (output_dir / "caption.txt").write_text(plan["caption"] + "\n", encoding="utf-8")
    append_catalog(video_number, plan, brief, output_dir)
    if args.plan_only:
        append_run_log("planned", brief, output_dir)
        print(output_dir / "plan.json")
        return 0
    final = assemble_video(plan, assets, output_dir, not args.no_music)
    append_run_log("completed", brief, output_dir)
    print(final)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError, ValueError) as error:
        try:
            append_run_log("failed", " ".join(sys.argv[1:]), None, str(error))
        except OSError:
            pass
        print(f"video-factory: {error}", file=sys.stderr)
        raise SystemExit(1)
