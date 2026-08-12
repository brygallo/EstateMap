#!/usr/bin/env python3
"""Speech synthesis and caption timing.

Captions are the unit of synthesis: narration is split into short breath groups,
each group is synthesised on its own and its measured length becomes its exact
time on screen. Word highlighting inside a group is interpolated by character
weight, which stays under one frame of error for groups this short and needs no
forced aligner.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

import media


ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache/voice"

# A caption has to be readable in one glance on a phone and short enough that
# the ear still hears one continuous phrase.
MAX_CAPTION_CHARS = 34
MAX_CAPTION_WORDS = 6
MIN_CAPTION_WORDS = 2

# Spanish function words that open a new breath group when a clause is too long.
BREAK_WORDS = {
    "y", "o", "u", "pero", "porque", "que", "para", "con", "sin", "sobre",
    "cuando", "donde", "mientras", "aunque", "desde", "hasta", "entre", "según",
}


def split_clauses(text: str) -> list[str]:
    cleaned = " ".join(text.split())
    pieces = re.split(r"(?<=[.,;:!?…])\s+", cleaned)
    return [piece.strip() for piece in pieces if piece.strip()]


def split_long_clause(clause: str) -> list[str]:
    words = clause.split()
    if len(words) <= MAX_CAPTION_WORDS and len(clause) <= MAX_CAPTION_CHARS:
        return [clause]
    groups: list[list[str]] = [[]]
    for word in words:
        current = groups[-1]
        bare = word.strip(".,;:!?¿¡…").lower()
        too_long = len(current) >= MAX_CAPTION_WORDS or len(" ".join(current + [word])) > MAX_CAPTION_CHARS
        opens_group = bare in BREAK_WORDS and len(current) >= MIN_CAPTION_WORDS
        if current and (too_long or opens_group):
            groups.append([word])
        else:
            current.append(word)
    return [" ".join(group) for group in groups if group]


def merge_fragments(groups: list[str]) -> list[str]:
    merged: list[str] = []
    for group in groups:
        short = len(group.split()) < MIN_CAPTION_WORDS
        if short and merged and len(f"{merged[-1]} {group}") <= MAX_CAPTION_CHARS + 8:
            merged[-1] = f"{merged[-1]} {group}"
        else:
            merged.append(group)
    if len(merged) > 1 and len(merged[0].split()) < MIN_CAPTION_WORDS:
        merged[1] = f"{merged[0]} {merged[1]}"
        merged.pop(0)
    return merged


def split_captions(text: str) -> list[str]:
    """Split narration into karaoke-sized breath groups."""
    groups: list[str] = []
    for clause in split_clauses(text):
        groups.extend(split_long_clause(clause))
    return merge_fragments(groups)


def word_timings(caption: str, duration: float) -> list[dict[str, Any]]:
    """Distribute a measured caption duration across its words by weight."""
    words = caption.split()
    weights = [len(word.strip(".,;:!?¿¡…")) + 1 for word in words]
    total = sum(weights) or 1
    timings = []
    cursor = 0.0
    for word, weight in zip(words, weights):
        span = duration * weight / total
        timings.append({"text": word, "start": round(cursor, 3), "end": round(cursor + span, 3)})
        cursor += span
    return timings


def provider() -> str:
    return os.environ.get("TTS_PROVIDER", "kokoro").lower()


def cache_key(text: str) -> str:
    signature = "|".join([
        provider(),
        os.environ.get("KOKORO_VOICE", "ef_dora"),
        os.environ.get("KOKORO_SPEED", "1.04"),
        os.environ.get("ELEVENLABS_VOICE_ID", ""),
        text,
    ])
    return hashlib.sha256(signature.encode("utf-8")).hexdigest()[:24]


def elevenlabs_clip(text: str, target: Path) -> None:
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID")
    if not api_key or not voice_id:
        raise RuntimeError("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required for TTS_PROVIDER=elevenlabs")
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=json.dumps({
            "text": text,
            "model_id": os.environ.get("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2"),
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.75, "speed": 1.04},
        }).encode("utf-8"),
        headers={"Content-Type": "application/json", "xi-api-key": api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            target.write_bytes(response.read())
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ElevenLabs request failed ({error.code}): {detail}") from error


def synthesize(texts: list[str]) -> list[Path]:
    """Return one trimmed mp3 per text, reusing cached clips when unchanged."""
    CACHE.mkdir(parents=True, exist_ok=True)
    targets = [CACHE / f"{cache_key(text)}.mp3" for text in texts]
    pending = [(text, target) for text, target in zip(texts, targets) if not target.exists()]
    if not pending:
        return targets
    engine = provider()
    if engine == "kokoro":
        python = ROOT / ".venv/bin/python"
        if not python.exists():
            raise RuntimeError("Kokoro environment is missing. See marketing/videos/README.md")
        manifest = []
        for text, target in pending:
            manifest.append({"text": text, "output": str(target.with_suffix(".raw.wav"))})
        manifest_path = CACHE / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
        environment = os.environ.copy()
        environment.setdefault("HF_HOME", str(ROOT / ".cache/huggingface"))
        completed = subprocess.run([
            str(python), str(ROOT / "kokoro_voice.py"),
            "--manifest", str(manifest_path),
            "--voice", os.environ.get("KOKORO_VOICE", "ef_dora"),
            "--speed", os.environ.get("KOKORO_SPEED", "1.04"),
        ], text=True, capture_output=True, env=environment)
        manifest_path.unlink(missing_ok=True)
        if completed.returncode:
            raise RuntimeError(f"Kokoro failed: {completed.stderr.strip()[-800:]}")
        for _, target in pending:
            raw = target.with_suffix(".raw.wav")
            media.trim_silence(raw, target)
            raw.unlink(missing_ok=True)
        return targets
    if engine == "macos":
        for text, target in pending:
            aiff = target.with_suffix(".aiff")
            media.run(["say", "-v", os.environ.get("LOCAL_VOICE", "Paulina"), "-r", "185", "-o", str(aiff), text])
            raw = target.with_suffix(".raw.mp3")
            media.run(["ffmpeg", "-y", "-i", str(aiff), "-codec:a", "libmp3lame", "-q:a", "2", str(raw)])
            media.trim_silence(raw, target)
            aiff.unlink(missing_ok=True)
            raw.unlink(missing_ok=True)
        return targets
    if engine != "elevenlabs":
        raise RuntimeError(f"Unknown TTS_PROVIDER: {engine}")
    for text, target in pending:
        raw = target.with_suffix(".raw.mp3")
        elevenlabs_clip(text, raw)
        media.trim_silence(raw, target)
        raw.unlink(missing_ok=True)
    return targets


def speak_scene(text: str, target: Path, gap: float = 0.14) -> list[dict[str, Any]]:
    """Synthesise a scene as timed captions and write its joined voice track.

    Returns one entry per caption with its exact start, end and word timings,
    measured from the audio rather than estimated from the plan.
    """
    captions = split_captions(text)
    clips = synthesize(captions)
    target.parent.mkdir(parents=True, exist_ok=True)
    parts: list[Path] = []
    timeline: list[dict[str, Any]] = []
    cursor = 0.0
    for index, (caption, clip) in enumerate(zip(captions, clips)):
        spoken = media.probe_duration(clip)
        parts.append(clip)
        entry = {
            "text": caption,
            "start": round(cursor, 3),
            "end": round(cursor + spoken, 3),
            "words": word_timings(caption, spoken),
        }
        cursor += spoken
        if index < len(clips) - 1:
            pause = target.parent / f"gap-{index:02}.mp3"
            media.silence(gap, pause)
            parts.append(pause)
            cursor += media.probe_duration(pause)
            entry["end"] = round(cursor, 3)
        timeline.append(entry)
    media.concat_audio(parts, target)
    for path in parts:
        if path.parent == target.parent and path.name.startswith("gap-"):
            path.unlink(missing_ok=True)
    return timeline


def estimate_seconds(text: str) -> float:
    """Cheap pre-render duration estimate used by the linter."""
    speed = float(os.environ.get("KOKORO_SPEED", "1.04"))
    characters = len(" ".join(text.split()))
    return round(characters / (15.0 * speed) + 0.25 * len(split_captions(text)), 2)
