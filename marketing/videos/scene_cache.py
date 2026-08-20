#!/usr/bin/env python3
"""Render the master one scene at a time, and keep what did not change.

A change to four seconds of a piece used to cost the whole piece: sixty seconds
of video at 2160 x 3840, about an hour. Most of that hour re-drew frames that
were already correct, which is why iterating on an opening happened in previews
instead of in masters — and a preview is not what ships.

The idea is the one Remotion's own distributed renderer uses. A frame range of a
composition is interchangeable with the same frames of a full render, because
the props handed to Remotion are always the complete plan: the composition still
knows how long the piece is and where this stretch sits in it, so the progress
cue, the scene index and an animation whose arc spans a cut all come out
identical. Each scene is therefore rendered as its own range, kept under a
fingerprint of everything that could change its pixels, and the master is
assembled from the ranges.

What this must never do is ship a stale frame, so:

* the fingerprint is deliberately over-inclusive — anything uncertain is counted
  as a change, and a false miss only costs time;
* the audio is not assembled here. It comes from one Remotion render of the whole
  composition, which is the same code path that produced it before, so voice
  placement and music cannot drift at a seam;
* the assembled master is measured against the plan before it is accepted. A
  frame count that does not match is an error, not a warning;
* `production.json` records which scenes were re-rendered and which were reused,
  so a master can always answer where it came from.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import time
from pathlib import Path
from typing import Any

import media
import renderer


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "remotion/src"

# A cached scene survives this long without being used. Long enough that going
# back to yesterday's version of a composition is still free; short enough that
# a library of 4K intermediates does not grow without limit.
CACHE_DAYS = 7

# Tabs a stalled scene is retried with. Low enough that no machine this
# factory runs on can be short of memory for it.
RETRY_CONCURRENCY = 2

# Files every scene depends on, however they are edited. Everything that is not
# a brand's animation module is treated as shared, including the registry: it is
# cheaper to re-render than to reason about which registry edit reached which
# composition.
BRAND_MODULE = re.compile(r".*-simulations\.tsx$")


def _digest(*parts: Any) -> str:
    payload = json.dumps(parts, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _file_digest(path: Path) -> str:
    if not path.is_file():
        return "missing"
    return hashlib.sha256(path.read_bytes()).hexdigest()


class SourceIndex:
    """Which module draws each animation.

    Without this, editing any composition would invalidate every scene of every
    piece. With it, a fix inside `aents-system-simulations.tsx` re-renders the
    scenes that use those animations and leaves the rest alone.
    """

    def __init__(self, source: Path = SOURCE) -> None:
        self.source = source
        self._modules = self._read_modules()
        self.shared = self._shared_digest()

    def _files(self) -> list[Path]:
        return sorted(path for path in self.source.rglob("*") if path.suffix in {".ts", ".tsx"})

    def _shared_digest(self) -> str:
        return _digest(*[
            (path.name, _file_digest(path))
            for path in self._files()
            if not BRAND_MODULE.match(path.name)
        ])

    def _read_modules(self) -> dict[str, str]:
        """Map each `sim:*` to the module file that exports its component."""
        registry = self.source / "simulations.tsx"
        if not registry.is_file():
            return {}
        text = registry.read_text(encoding="utf-8")
        component_module: dict[str, str] = {}
        for names, module in re.findall(r"import\s*\{([^}]+)\}\s*from\s*'\./([\w-]+)'", text):
            for name in names.split(","):
                cleaned = name.strip()
                if cleaned:
                    component_module[cleaned] = f"{module}.tsx"
        block = text.split("export const SIMULATIONS")[-1]
        modules = {}
        for identifier, component in re.findall(r"'(sim:[\w-]+)':\s*(\w+)", block):
            modules[identifier] = component_module.get(component, "simulations.tsx")
        return modules

    def digest_for(self, asset: str | None) -> str:
        """The source fingerprint a scene using `asset` depends on."""
        module = self._modules.get(asset or "")
        if not module or not BRAND_MODULE.match(module):
            # Drawn by a shared module, or not an animation at all: the shared
            # digest already covers it.
            return self.shared
        return _digest(self.shared, module, _file_digest(self.source / module))


class SceneRenderCache:
    """The scene-by-scene render, and the record of what it reused."""

    def __init__(
        self,
        directory: Path,
        *,
        fresh: bool = False,
        concurrency: int | None = None,
        index: SourceIndex | None = None,
    ) -> None:
        self.directory = directory
        self.fresh = fresh
        self.concurrency = concurrency
        self.store = directory / ".cache/scenes"
        self.index = index or SourceIndex()
        self.rendered: list[int] = []
        self.reused: list[int] = []

    # -- fingerprints ----------------------------------------------------- #

    def _asset_digest(self, scene: dict[str, Any]) -> str:
        """The bytes of any footage the scene shows, not just its filename."""
        name = scene.get("asset")
        if not name or scene.get("assetType") == "simulation":
            return "none"
        return _file_digest(self.directory / "assets/input" / Path(str(name)).name)

    def fingerprint(self, props: dict[str, Any], index: int, span: tuple[int, int]) -> str:
        scene = props["scenes"][index]
        shell = {key: value for key, value in props.items() if key != "scenes"}
        return _digest(
            scene,
            shell,
            span,
            sum(item["durationInFrames"] for item in props["scenes"]),
            self.index.digest_for(scene.get("asset")),
            self._asset_digest(scene),
            renderer.SUPERSAMPLE_SCALE,
            renderer.ENCODER_FLAGS,
            renderer.open_gl(),
        )

    # -- the pieces ------------------------------------------------------- #

    def spans(self, props: dict[str, Any]) -> list[tuple[int, int]]:
        """The inclusive frame range of every scene, in order."""
        ranges, cursor = [], 0
        for scene in props["scenes"]:
            length = int(scene["durationInFrames"])
            ranges.append((cursor, cursor + length - 1))
            cursor += length
        return ranges

    def chunk(self, props_path: Path, props: dict[str, Any], index: int, span: tuple[int, int]) -> Path:
        total = len(props["scenes"])
        target = self.store / f"{self.fingerprint(props, index, span)}.mp4"
        if target.is_file() and not self.fresh:
            # Touched so the pruning below keeps what is still in use.
            target.touch()
            self.reused.append(index + 1)
            print(f"  escena {index + 1}/{total}: sin cambios", flush=True)
            return target
        # Said before the work, not after: a render that stalls on one frame
        # should say which shot it stalled on while it is still stalling.
        print(f"  escena {index + 1}/{total}: renderizando {span[0]}-{span[1]}", flush=True)
        self.store.mkdir(parents=True, exist_ok=True)
        pending = target.with_suffix(".pending.mp4")
        pending.unlink(missing_ok=True)
        try:
            self._draw(props_path, pending, span, self.concurrency)
        except RuntimeError:
            # A stall is not a broken composition. The frames that killed
            # `sim:aents-etapas` twice render on their own in seconds, at both
            # sizes: what runs out is the machine, holding several 2160 x 3840
            # frames at once late in a long invocation. Fewer tabs is the fix
            # that has always worked here, and the retry costs one scene because
            # every other one is already on disk.
            print(f"  escena {index + 1}/{total}: se atascó, reintento con {RETRY_CONCURRENCY} pestañas", flush=True)
            pending.unlink(missing_ok=True)
            self._draw(props_path, pending, span, RETRY_CONCURRENCY)
        # Named only once it is complete: an interrupted render must not leave
        # a half-written file under a fingerprint that says it is finished.
        pending.replace(target)
        self.rendered.append(index + 1)
        return target

    def _draw(self, props_path: Path, target: Path, span: tuple[int, int], concurrency: int | None) -> None:
        renderer.remotion_render(
            props_path,
            target,
            supersample=True,
            concurrency=concurrency,
            frames=span,
            muted=True,
        )

    def audio(self, props_path: Path) -> Path:
        """The whole soundtrack, from the composition itself.

        Assembling the voice clips by hand here would be a second implementation
        of something the composition already does — and the place a seam would
        appear. One audio-only render costs seconds because no frame is drawn,
        and it keeps music, volumes and placement in exactly one code path.
        """
        target = self.store / "audio.wav"
        self.store.mkdir(parents=True, exist_ok=True)
        renderer.remotion_render(props_path, target, codec="wav", concurrency=self.concurrency)
        return target

    # -- assembly --------------------------------------------------------- #

    def build(self, props_path: Path, props: dict[str, Any], target: Path) -> Path:
        spans = self.spans(props)
        chunks = [self.chunk(props_path, props, index, span) for index, span in enumerate(spans)]
        listing = self.store / "master.txt"
        listing.write_text(
            "".join(f"file '{chunk.resolve()}'\n" for chunk in chunks), encoding="utf-8"
        )
        joined = self.store / "master.mp4"
        joined.unlink(missing_ok=True)
        media.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(joined)
        ])
        self.verify(joined, spans[-1][1] + 1, "el vídeo unido")
        renderer.deliver(joined, target, audio=self.audio(props_path))
        self.verify(target, spans[-1][1] + 1, "el máster")
        joined.unlink(missing_ok=True)
        self.prune(chunks)
        return target

    def verify(self, video: Path, expected_frames: int, what: str) -> None:
        """A master assembled from parts has to prove it is the whole thing.

        Cheap, and it is the difference between a cache and a liability: a chunk
        that failed to render, a concat that dropped a segment or a fingerprint
        collision all show up here as a length that does not match the plan.
        """
        seconds = media.probe_duration(video)
        measured = round(seconds * renderer.FPS)
        if abs(measured - expected_frames) > 1:
            raise RuntimeError(
                f"La caché por escena produjo {what} con {measured} fotogramas y el plan tiene "
                f"{expected_frames}. No se acepta un máster que no cuadra: vuelve a renderizar "
                f"con --fresh y avisa si se repite"
            )

    def prune(self, keep: list[Path]) -> None:
        """Drop intermediates nothing has asked for in a week."""
        current = {chunk.resolve() for chunk in keep}
        cutoff = time.time() - CACHE_DAYS * 86400
        for pattern in ("*.mp4", "*.log"):
            for path in self.store.glob(pattern):
                if path.resolve() not in current and path.stat().st_mtime < cutoff:
                    path.unlink(missing_ok=True)

    # -- what the master should record about itself ----------------------- #

    @property
    def report(self) -> dict[str, Any]:
        return {
            "scenes_rendered": self.rendered,
            "scenes_reused": self.reused,
        }


def discard(directory: Path) -> None:
    """Forget everything cached for a piece."""
    shutil.rmtree(directory / ".cache/scenes", ignore_errors=True)
