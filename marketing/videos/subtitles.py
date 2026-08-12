#!/usr/bin/env python3
"""SRT output built from measured caption timings."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def stamp(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, ms = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{ms:03}"


def write_srt(timings: list[dict[str, Any]], target: Path) -> None:
    """One cue per caption, so the file matches what is burned on screen."""
    blocks = []
    index = 0
    offset = 0.0
    for scene in timings:
        for caption in scene["captions"]:
            index += 1
            start = offset + caption["start"]
            end = offset + caption["end"]
            blocks.append(f"{index}\n{stamp(start)} --> {stamp(end)}\n{caption['text'].strip()}\n")
        offset += scene["render_seconds"]
    target.write_text("\n".join(blocks), encoding="utf-8")
