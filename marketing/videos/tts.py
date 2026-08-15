#!/usr/bin/env python3
"""The speech providers, one class each.

A provider owns three things that must never disagree: the settings that change
the audio, the signature those settings hash into, and the code that produces
the audio. Keeping them apart is what once let an unrelated Kokoro setting
invalidate clips ElevenLabs had already charged for, so they live together here
and nowhere else.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import elevenlabs
import media


ROOT = Path(__file__).resolve().parent
VOICE_PROFILES = ROOT / "system/voice-profiles.json"


@dataclass(frozen=True)
class Clip:
    """One caption and the file it must end up in."""

    text: str
    target: Path


@dataclass(frozen=True)
class Bill:
    """What a batch would cost before any of it is bought."""

    texts: list[str]
    characters: int
    ceiling: int

    @property
    def over_budget(self) -> bool:
        return self.characters > self.ceiling


class VoiceProvider:
    """Turns captions into mp3 files at paths the cache chose.

    Free providers inherit everything below: nothing is billed, nothing is kept
    beyond the finished clip, and no budget can be exceeded.
    """

    name = ""
    paid = False

    def __init__(self, profile_id: str | None = None, profile_settings: dict[str, str] | None = None):
        self.profile_id = profile_id or self.name
        self.profile_settings = profile_settings or {}

    def configured(self, key: str, environment: str, default: str = "") -> str:
        """Resolve a profile value first, then an environment override."""
        return str(self.profile_settings.get(key) or os.environ.get(environment, default))

    def settings(self) -> dict[str, str]:
        """Every knob that changes the audio, and nothing else."""
        raise NotImplementedError

    def signature(self) -> str:
        """The cache signature: same settings, same clips, no new spending."""
        parts = [f"{key}={value}" for key, value in sorted(self.settings().items())]
        return "|".join([self.name, f"profile={self.profile_id}", *parts])

    def speed(self) -> float:
        return float(self.settings().get("speed", "1.04"))

    def check_ready(self) -> None:
        """Raise before anything is rendered if this provider cannot run."""

    def bill(self, texts: list[str]) -> Bill:
        return Bill([], 0, 0)

    def already_bought(self, target: Path) -> bool:
        """Whether a clip exists that was paid for and can be reused as is."""
        return False

    def synthesize(self, clips: list[Clip]) -> None:
        raise NotImplementedError


class AudioClipValidator:
    """Reject header-only and corrupt audio before it enters the shared cache."""

    MINIMUM_SECONDS = 0.08

    @classmethod
    def is_valid(cls, path: Path) -> bool:
        if not path.is_file() or path.stat().st_size == 0:
            return False
        try:
            return media.probe_duration(path) >= cls.MINIMUM_SECONDS
        except (RuntimeError, ValueError):
            return False

    @classmethod
    def require(cls, path: Path, provider: str) -> None:
        if not cls.is_valid(path):
            raise RuntimeError(f"{provider} produced no valid audio: {path}")


class KokoroVoice(VoiceProvider):
    """Local open-weights Spanish speech. Free and unlimited, so drafts use it."""

    name = "kokoro"

    def settings(self) -> dict[str, str]:
        return {
            "voice": self.configured("voice", "KOKORO_VOICE", "ef_dora"),
            "speed": self.configured("speed", "KOKORO_SPEED", "1.04"),
        }

    def check_ready(self) -> None:
        if not self.interpreter().exists():
            raise RuntimeError("Kokoro environment is missing. See marketing/videos/README.md")

    def interpreter(self) -> Path:
        return ROOT / ".venv/bin/python"

    def synthesize(self, clips: list[Clip]) -> None:
        self.check_ready()
        # The model is loaded once for the whole batch instead of once per
        # caption, which is the difference between seconds and minutes.
        manifest = [{"text": clip.text, "output": str(clip.target.with_suffix(".raw.wav"))} for clip in clips]
        # The cache is shared, so two renders running at once used to write and
        # then delete the same manifest.json. The loser synthesised the other
        # batch and its own clips never appeared, which surfaced much later as
        # ffmpeg failing on a missing .raw.wav.
        directory = clips[0].target.parent
        directory.mkdir(parents=True, exist_ok=True)
        manifest_path = directory / f"manifest-{os.getpid()}.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
        environment = os.environ.copy()
        environment.setdefault("HF_HOME", str(ROOT / ".cache/huggingface"))
        settings = self.settings()
        completed = subprocess.run([
            str(self.interpreter()), str(ROOT / "kokoro_voice.py"),
            "--manifest", str(manifest_path),
            "--voice", settings["voice"],
            "--speed", settings["speed"],
        ], text=True, capture_output=True, env=environment)
        manifest_path.unlink(missing_ok=True)
        if completed.returncode:
            raise RuntimeError(f"Kokoro failed: {completed.stderr.strip()[-800:]}")
        for clip in clips:
            raw = clip.target.with_suffix(".raw.wav")
            media.trim_silence(raw, clip.target)
            raw.unlink(missing_ok=True)


class MacOSVoice(VoiceProvider):
    """The system `say` voice: a fallback when Kokoro is not installed."""

    name = "macos"

    def settings(self) -> dict[str, str]:
        return {
            "voice": self.configured("voice", "LOCAL_VOICE", "Paulina"),
            "rate": self.configured("rate", "LOCAL_VOICE_RATE", "185"),
        }

    def synthesize(self, clips: list[Clip]) -> None:
        voice = self.settings()["voice"]
        for clip in clips:
            aiff = clip.target.with_suffix(".aiff")
            try:
                media.run(["say", "-v", voice, "-r", self.settings()["rate"], "-o", str(aiff), clip.text])
                AudioClipValidator.require(aiff, f"macOS voice {voice}")
                media.trim_silence(aiff, clip.target)
                AudioClipValidator.require(clip.target, f"macOS voice {voice}")
            finally:
                aiff.unlink(missing_ok=True)


class ElevenLabsVoice(VoiceProvider):
    """The paid voice. Every byte it charges for is kept and never bought twice."""

    name = "elevenlabs"
    paid = True

    # The exact API responses, untouched. The clips the render consumes are
    # post-processed copies, so a bad trim or an interrupted render costs
    # nothing to recover from.
    PAID = ROOT / ".cache/voice/paid"
    LEDGER = ROOT / ".cache/voice/elevenlabs-usage.jsonl"

    def settings(self) -> dict[str, str]:
        return {
            "voice_id": self._voice_id(),
            "model_id": self.configured("model_id", "ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2"),
            "output_format": self.configured("output_format", "ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128"),
            "stability": self.configured("stability", "ELEVENLABS_STABILITY", "0.62"),
            "similarity_boost": self.configured("similarity_boost", "ELEVENLABS_SIMILARITY", "0.55"),
            "speed": self.configured("speed", "ELEVENLABS_SPEED", "1.02"),
        }

    def _voice_id(self) -> str:
        environment = str(self.profile_settings.get("voice_id_env", "ELEVENLABS_VOICE_ID"))
        return str(self.profile_settings.get("voice_id") or os.environ.get(environment, ""))

    def check_ready(self, require_key: bool = True) -> None:
        if not self.settings()["voice_id"]:
            raise RuntimeError("ELEVENLABS_VOICE_ID is not set. See marketing/videos/.env.example")
        if require_key and not os.environ.get("ELEVENLABS_API_KEY"):
            raise RuntimeError(
                "ELEVENLABS_API_KEY is not set, so the final voice cannot be bought. "
                "Add it to marketing/videos/.env — it is git-ignored."
            )

    def ceiling(self) -> int:
        """Characters one run may buy before it has to be re-authorised.

        A 60-second piece is around 900 characters, so the default passes any
        honest master and stops a loop that has started buying the library.
        """
        return int(os.environ.get("ELEVENLABS_MAX_CHARS_PER_RUN", "2000"))

    def paid_copy(self, target: Path) -> Path:
        return self.PAID / target.name

    def already_bought(self, target: Path) -> bool:
        return self.paid_copy(target).exists()

    def bill(self, texts: list[str]) -> Bill:
        return Bill(list(texts), sum(len(text) for text in texts), self.ceiling())

    def synthesize(self, clips: list[Clip]) -> None:
        self.check_ready()
        self.PAID.mkdir(parents=True, exist_ok=True)
        bill = self.bill([clip.text for clip in clips if not self.already_bought(clip.target)])
        if bill.over_budget:
            raise RuntimeError(
                f"This render would buy {bill.characters} characters of speech, over the "
                f"{bill.ceiling} allowed per run. Check the script is what you meant to say, "
                f"then raise ELEVENLABS_MAX_CHARS_PER_RUN for this run only."
            )
        if bill.characters:
            print(f"ElevenLabs: buying {len(bill.texts)} clips, {bill.characters} characters", file=sys.stderr)
        for clip in clips:
            paid = self.paid_copy(clip.target)
            if not paid.exists():
                self.buy(clip.text, paid)
            try:
                media.trim_silence(paid, clip.target)
            except RuntimeError as error:
                # The clip is already paid for; keeping it untrimmed costs a
                # little timing accuracy, discarding it costs the credits again.
                print(f"Warning: could not trim {paid.name}, using it as is ({error})", file=sys.stderr)
                shutil.copy2(paid, clip.target)

    def buy(self, text: str, target: Path) -> None:
        settings = self.settings()
        audio = elevenlabs.request_audio(
            f"text-to-speech/{settings['voice_id']}?output_format={settings['output_format']}",
            {
                "text": text,
                "model_id": settings["model_id"],
                "voice_settings": {
                    "stability": float(settings["stability"]),
                    "similarity_boost": float(settings["similarity_boost"]),
                    "speed": float(settings["speed"]),
                },
            },
        )
        # Written only after a complete response, so a half-downloaded file can
        # never be mistaken for a paid clip on the next run.
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(audio)
        self.record(text, settings)

    def record(self, text: str, settings: dict[str, str]) -> None:
        self.LEDGER.parent.mkdir(parents=True, exist_ok=True)
        entry = {
            "at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "characters": len(text),
            "voice_id": settings["voice_id"],
            "model_id": settings["model_id"],
        }
        with self.LEDGER.open("a", encoding="utf-8") as ledger:
            ledger.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def spent_characters(self) -> int:
        if not self.LEDGER.exists():
            return 0
        return sum(
            json.loads(line).get("characters", 0)
            for line in self.LEDGER.read_text(encoding="utf-8").splitlines()
            if line.strip()
        )


PROVIDERS: dict[str, type[VoiceProvider]] = {
    provider.name: provider for provider in (KokoroVoice, MacOSVoice, ElevenLabsVoice)
}


def profile_catalog(path: Path = VOICE_PROFILES) -> dict:
    if not path.exists():
        return {"version": 1, "defaults": {"draft": "kokoro", "final": "elevenlabs"}, "profiles": {}}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data.get("profiles"), dict) or not isinstance(data.get("defaults"), dict):
        raise RuntimeError(f"Invalid voice profile catalog: {path}")
    return data


def build(name: str) -> VoiceProvider:
    catalog = profile_catalog()
    profile = catalog["profiles"].get(name)
    provider_name = str(profile.get("provider")) if profile else name.lower()
    try:
        provider = PROVIDERS[provider_name]
    except KeyError:
        known = sorted(set(PROVIDERS) | set(catalog["profiles"]))
        raise RuntimeError(f"Unknown voice profile or provider: {name}. Known: {', '.join(known)}") from None
    settings = dict(profile.get("settings") or {}) if profile else {}
    return provider(profile_id=name, profile_settings=settings)


def legacy_profile(name: str, stage: str, catalog: dict) -> str:
    """Translate the pre-catalog `*_TTS_PROVIDER` variables into a profile id.

    Those variables named a provider, not a profile, and `DRAFT_TTS_PROVIDER=macos`
    is still the documented way to fall back when Kokoro is not installed. So a
    bare provider name resolves to the profile of this stage that already speaks
    with it, instead of bypassing the catalog and losing that profile's settings.
    """
    profiles = catalog["profiles"]
    if name in profiles:
        return name
    preferred = catalog["defaults"].get(stage)
    if profiles.get(preferred, {}).get("provider") == name:
        return preferred
    for profile_id, profile in profiles.items():
        if profile.get("provider") == name:
            return profile_id
    return name


def select(profile_id: str | None, final_master: bool) -> VoiceProvider:
    """Resolve an explicit profile or the configured default for this render stage."""
    catalog = profile_catalog()
    stage = "final" if final_master else "draft"
    selected = profile_id or os.environ.get(f"{stage.upper()}_VOICE_PROFILE")
    legacy = os.environ.get(f"{stage.upper()}_TTS_PROVIDER")
    if not selected and legacy:
        selected = legacy_profile(legacy, stage, catalog)
    selected = selected or catalog["defaults"][stage]
    provider = build(selected)
    if not final_master and provider.paid:
        raise RuntimeError(f"Draft voice profile {selected} is paid; drafts must use a free provider")
    return provider


def draft() -> VoiceProvider:
    """The voice every draft speaks with: free, local and unlimited.

    A script is rewritten many times before anyone is happy with it, and none of
    those takes should cost credits — so this ignores whatever the paid settings
    say.
    """
    return select(None, final_master=False)


def final() -> VoiceProvider:
    """The voice a master is bought with. Only an explicit request may ask."""
    return select(None, final_master=True)
