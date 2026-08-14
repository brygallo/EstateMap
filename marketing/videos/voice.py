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
import os
import re
import shutil
from pathlib import Path
from typing import Any

import media
import tts


ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache/voice"

# A caption has to be readable in one glance on a phone and short enough that
# the ear still hears one continuous phrase.
MAX_CAPTION_CHARS = 34
MAX_CAPTION_WORDS = 6
MIN_CAPTION_WORDS = 2

# Determiners and pronouns that bind to the word after them: breaking between
# "lo" and "que" reads as a stutter on screen.
GLUED_BEFORE_BREAK = {"lo", "la", "el", "los", "las", "un", "una", "unos", "unas", "al", "del", "algo", "todo", "nada"}

# Spanish function words that open a new breath group when a clause is too long.
BREAK_WORDS = {
    "y", "o", "u", "pero", "porque", "que", "para", "con", "sin", "sobre",
    "cuando", "donde", "mientras", "aunque", "desde", "hasta", "entre", "según",
}

# Words that lean on whatever comes after them, so a caption must not end on
# one. The rule about not *opening* a group after a determiner already existed;
# a line can close on the same word and read just as badly — "que nadie me
# contestaba era la" held on screen while the ear waits for the noun.
TRAILING_BINDERS = GLUED_BEFORE_BREAK | {
    "a", "de", "en", "con", "por", "para", "sin", "sobre", "hasta", "desde", "entre",
    "y", "e", "o", "u", "ni", "que", "si", "pero", "porque",
    "su", "sus", "mi", "mis", "tu", "tus", "este", "esta", "estos", "estas", "ese", "esa",
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
        previous = current[-1].strip(".,;:!?¿¡…").lower() if current else ""
        too_long = len(current) >= MAX_CAPTION_WORDS or len(" ".join(current + [word])) > MAX_CAPTION_CHARS
        # A conjunction may open a group, but not when the word before it leans
        # forward too: "¿Qué esperas para" / "que sea la siguiente" splits the
        # phrase at its weakest point instead of its joint.
        opens_group = (
            bare in BREAK_WORDS
            and len(current) >= MIN_CAPTION_WORDS + 1
            and previous not in TRAILING_BINDERS
        )
        if current and (too_long or opens_group):
            # A break forced by length lands wherever the character count runs
            # out, which is often between a word and the one it leans on. Carry
            # that word over instead of stranding it at the end of the line.
            if too_long and not opens_group and previous in TRAILING_BINDERS and len(current) > MIN_CAPTION_WORDS:
                groups.append([current.pop(), word])
            else:
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


def load_env(path: Path | None = None) -> None:
    """Read KEY=value lines from .env without overriding the real environment."""
    source = path or ROOT / ".env"
    if not source.exists():
        return
    for line in source.read_text(encoding="utf-8").splitlines():
        entry = line.strip()
        if not entry or entry.startswith("#") or "=" not in entry:
            continue
        key, _, value = entry.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def cache_key(text: str, provider: tts.VoiceProvider) -> str:
    """Where this exact line, spoken this exact way, is cached."""
    signature = "|".join([provider.signature(), text])
    return hashlib.sha256(signature.encode("utf-8")).hexdigest()[:24]


def clip_path(text: str, provider: tts.VoiceProvider) -> Path:
    return CACHE / f"{cache_key(text, provider)}.mp3"


def quote(texts: list[str], provider: tts.VoiceProvider) -> dict[str, Any]:
    """What synthesising these texts would cost right now, without spending it."""
    unique = list(dict.fromkeys(texts))
    fresh = [
        text for text in unique
        if not clip_path(text, provider).exists()
        and not provider.already_bought(clip_path(text, provider))
    ]
    bill = provider.bill(fresh)
    return {
        "provider": provider.name,
        "captions": len(unique),
        "cached": len(unique) - len(fresh),
        "billable_captions": len(bill.texts),
        "billable_characters": bill.characters,
        "ceiling": bill.ceiling,
    }


def synthesize(texts: list[str], provider: tts.VoiceProvider) -> list[Path]:
    """Return one trimmed mp3 per text, reusing cached clips when unchanged."""
    CACHE.mkdir(parents=True, exist_ok=True)
    targets = [clip_path(text, provider) for text in texts]
    # A caption repeated across scenes hashes to one file, so it is synthesised
    # once no matter how many times the script says it.
    pending = list(dict.fromkeys(
        tts.Clip(text, target) for text, target in zip(texts, targets) if not target.exists()
    ))
    if pending:
        provider.synthesize(pending)
    return targets


def speak_scene(text: str, target: Path, provider: tts.VoiceProvider) -> list[dict[str, Any]]:
    """Synthesise a scene in one take and derive readable caption timings.

    Returns one entry per caption with its exact start, end and word timings,
    measured from the complete audio take. Captions never define synthesis
    boundaries: punctuation and sentence cadence stay under the voice model's
    control instead of becoming artificial pauses between separate clips.
    """
    captions = split_captions(text)
    if not captions:
        raise RuntimeError("Cannot synthesise a scene with no narration")
    clip = synthesize([text], provider)[0]
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(clip, target)
    spoken = media.probe_duration(clip)
    weights = [sum(len(word.strip(".,;:!?¿¡…")) + 1 for word in caption.split()) for caption in captions]
    total_weight = sum(weights) or 1
    timeline: list[dict[str, Any]] = []
    cursor = 0.0
    for index, (caption, weight) in enumerate(zip(captions, weights)):
        end = spoken if index == len(captions) - 1 else cursor + spoken * weight / total_weight
        duration = end - cursor
        entry = {
            "text": caption,
            "start": round(cursor, 3),
            "end": round(end, 3),
            "words": word_timings(caption, duration),
        }
        timeline.append(entry)
        cursor = end
    return timeline


# Characters of narration spoken per second at speed 1.0, measured against the
# renders of videos 001 to 007: they land between 16.1 and 18.3 characters per
# second, so the rate below sits just under the slowest of them and the estimate
# errs long. The previous pair of numbers — 15 characters per second plus a
# quarter second of pause per caption — assumed breaths the voice does not take
# and over-predicted every one of those renders by about a third, which is how a
# script written for ninety seconds came out at sixty-nine.
CHARACTERS_PER_SECOND = 16.2


def estimate_seconds(text: str, provider: tts.VoiceProvider | None = None) -> float:
    """Cheap pre-render duration estimate used by the linter.

    Drafts are what the linter runs against, so the draft voice sets the pace
    unless a caller is asking about a different one. This measures speech only:
    the render also holds `renderer.SCENE_TAIL_SECONDS` after each scene.
    """
    speed = (provider or tts.draft()).speed()
    characters = len(" ".join(text.split()))
    return round(characters / (CHARACTERS_PER_SECOND * speed), 2)
