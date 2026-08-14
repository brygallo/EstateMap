#!/usr/bin/env python3
"""FFmpeg and FFprobe helpers shared by the factory."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        raise RuntimeError(f"Required executable not found: {name}")


def run(command: list[str]) -> None:
    completed = subprocess.run(command, text=True, capture_output=True)
    if completed.returncode:
        raise RuntimeError(f"Command failed: {' '.join(command)}\n{completed.stderr}")


def probe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        text=True,
        capture_output=True,
    )
    if completed.returncode:
        raise RuntimeError(f"Could not inspect {path}: {completed.stderr.strip()}")
    return float(completed.stdout.strip())


def probe_dimensions(path: Path) -> tuple[int, int]:
    completed = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", str(path),
        ],
        text=True,
        capture_output=True,
    )
    if completed.returncode:
        raise RuntimeError(completed.stderr.strip())
    # The csv writer appends a trailing separator, so a vertical master reads
    # "1080x1920x". Dropping empty fields keeps the parse honest.
    parts = [value for value in completed.stdout.strip().split("x") if value]
    if len(parts) < 2:
        raise RuntimeError(f"Could not read dimensions from {path}: {completed.stdout!r}")
    return int(parts[0]), int(parts[1])


def trim_silence(source: Path, target: Path) -> None:
    """Remove leading and trailing silence so measured length equals speech."""
    run([
        "ffmpeg", "-y", "-i", str(source),
        "-af",
        "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB:"
        "detection=peak,areverse,"
        "silenceremove=start_periods=1:start_silence=0.02:start_threshold=-45dB:"
        "detection=peak,areverse",
        "-codec:a", "libmp3lame", "-q:a", "2", str(target),
    ])


def concat_audio(parts: list[Path], target: Path) -> None:
    if not parts:
        raise RuntimeError("No audio parts to concatenate")
    if len(parts) == 1:
        shutil.copy2(parts[0], target)
        return
    listing = target.with_suffix(".txt")
    escaped = (str(path.as_posix()).replace("'", "'\\''") for path in parts)
    listing.write_text("\n".join(f"file '{value}'" for value in escaped), encoding="utf-8")
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
        "-codec:a", "libmp3lame", "-q:a", "2", str(target),
    ])
    listing.unlink(missing_ok=True)


def silence(duration: float, target: Path) -> None:
    run([
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"anullsrc=r=44100:cl=mono:d={max(0.01, duration):.3f}",
        "-codec:a", "libmp3lame", "-q:a", "2", str(target),
    ])
