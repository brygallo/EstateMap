#!/usr/bin/env python3
"""Class-based visual-review artifacts built from an existing master."""

from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any


def master_path(directory: Path) -> Path:
    return directory / "exports" / f"{directory.name}.mp4"


class CriticalFrameExtractor:
    """Extract scene midpoints without re-rendering the master."""

    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def extract(self, timings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        video = master_path(self.directory)
        target = self.directory / "review/frames"
        target.mkdir(parents=True, exist_ok=True)
        elapsed = 0.0
        frames = []
        for index, timing in enumerate(timings, 1):
            duration = float(timing["render_seconds"])
            timestamp = elapsed + duration / 2
            output = target / f"scene-{index:02}.jpg"
            completed = subprocess.run(
                ["ffmpeg", "-y", "-ss", f"{timestamp:.3f}", "-i", str(video), "-frames:v", "1", "-q:v", "2", str(output)],
                text=True,
                capture_output=True,
            )
            if completed.returncode:
                raise RuntimeError(f"Could not extract scene {index}: {completed.stderr[-800:]}")
            frames.append({"scene": index, "timestamp": round(timestamp, 3), "path": output})
            elapsed += duration
        return frames


class TextLegibilityAudit:
    """Gate editorial text and report simulation microcopy separately."""

    MINIMUM_PX = 22

    def __init__(self, root: Path) -> None:
        self.root = root

    def report(self) -> dict[str, Any]:
        editorial_values = self._literal_sizes("scene.tsx")
        simulation_values = self._literal_sizes("simulations.tsx")
        editorial_minimum = min(editorial_values) if editorial_values else None
        simulation_minimum = min(simulation_values) if simulation_values else None
        return {
            "declared_floor_px": self.MINIMUM_PX,
            "editorial_minimum_literal_px": editorial_minimum,
            "simulation_minimum_literal_px": simulation_minimum,
            "simulation_small_literal_count": sum(
                value < self.MINIMUM_PX for value in simulation_values
            ),
            "passed": editorial_minimum is None or editorial_minimum >= self.MINIMUM_PX,
            "note": "Simulation microcopy and dynamic fitted text are verified in the critical-frame contact sheet.",
        }

    def _literal_sizes(self, filename: str) -> list[int]:
        text = (self.root / "remotion/src" / filename).read_text(encoding="utf-8")
        return [int(value) for value in re.findall(r"fontSize(?:=|:)\s*\{?(\d+)", text)]


class MotionAudit:
    """Flag long scenes that have no declared visual resource."""

    BUILT_IN_VISUAL_PURPOSES = frozenset({"cta"})

    @classmethod
    def warnings(cls, plan: dict[str, Any], timings: list[dict[str, Any]]) -> list[str]:
        findings = []
        for index, (scene, timing) in enumerate(zip(plan["scenes"], timings), 1):
            duration = float(timing["render_seconds"])
            has_built_in_visual = scene.get("purpose") in cls.BUILT_IN_VISUAL_PURPOSES
            if not scene.get("asset") and not has_built_in_visual and duration > 3:
                findings.append(f"Scene {index} has no visual asset for {duration:.1f} seconds")
        return findings


class MotionStripExtractor:
    """Sample every scene as a strip, because a midpoint hides the movement.

    Video-010 shipped a master where a figure counted up from zero: for about a
    second the card read "$0/m²", and the intermediate values it printed on the
    way up were simply false. One frame per scene could not see it — the
    midpoint lands after the count is over. A defect that only exists while
    something moves needs more than one sample to be seen at all.
    """

    SAMPLE_SECONDS = 0.5
    COLUMNS = 4
    TILE_WIDTH = 300

    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def build(self, timings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        video = master_path(self.directory)
        if not video.exists():
            return []
        target = self.directory / "review/strips"
        target.mkdir(parents=True, exist_ok=True)
        elapsed = 0.0
        strips = []
        for index, timing in enumerate(timings, 1):
            duration = float(timing["render_seconds"])
            samples = max(4, min(16, int(duration / self.SAMPLE_SECONDS)))
            step = (duration - 0.3) / max(1, samples - 1)
            rows = -(-samples // self.COLUMNS)
            frames_dir = target / f"scene-{index:02}"
            # The directory is emptied, not just created. A re-render that
            # shortens a scene samples fewer frames, and the leftovers from the
            # previous pass stay behind: `tile` then receives more images than
            # the grid holds, emits a second sheet and dies on the single output
            # filename. The review failed with exit 234 instead of reporting on
            # the video that had just been rendered.
            if frames_dir.exists():
                shutil.rmtree(frames_dir)
            frames_dir.mkdir(parents=True)
            for position in range(samples):
                timestamp = elapsed + 0.15 + position * step
                subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{timestamp:.3f}", "-i", str(video),
                     "-frames:v", "1", "-vf", f"scale={self.TILE_WIDTH}:-1", "-q:v", "3",
                     str(frames_dir / f"{position:02}.jpg")],
                    check=True, capture_output=True, text=True,
                )
            sheet = target / f"scene-{index:02}.jpg"
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(frames_dir / "%02d.jpg"),
                 "-filter_complex", f"tile={self.COLUMNS}x{rows}:margin=8:padding=8:color=#0B0D1C",
                 "-q:v", "3", str(sheet)],
                check=True, capture_output=True, text=True,
            )
            strips.append({
                "scene": index,
                "samples": samples,
                "from": round(elapsed, 3),
                "to": round(elapsed + duration, 3),
                "path": str(sheet.relative_to(self.directory / "review")),
            })
            elapsed += duration
        return strips


class MotionDefectAudit:
    """Ask ffmpeg what a person would notice: what froze, and what jumped.

    Both detectors run on the finished master, so they see exactly what the
    platform will play. `freezedetect` catches a composition that stopped
    telling its story; the scene-change score catches a pop — a cut inside a
    scene that should have been a transition.
    """

    # Calibrated against geo-010, whose dead stretches were found by eye
    # first: 0.0025 saw nothing at all, and 0.01 lands on exactly the moments a
    # person calls empty — the held card in scene 2 and the parked receipt in
    # scene 3. A rest of a couple of seconds before a cut is composition; two
    # and a half is a scene that stopped telling its story.
    FREEZE_NOISE = 0.01
    FREEZE_SECONDS = 2.5
    STILL_RATIO = 0.35
    POP_SCORE = 0.24
    CUT_TOLERANCE_SECONDS = 0.4

    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def warnings(self, timings: list[dict[str, Any]]) -> list[str]:
        video = master_path(self.directory)
        if not video.exists() or not timings:
            return []
        cuts, elapsed = [], 0.0
        for timing in timings:
            cuts.append(elapsed)
            elapsed += float(timing["render_seconds"])
        findings = []
        findings.extend(self._frozen(video, cuts))
        findings.extend(self._pops(video, cuts))
        return findings

    def _run(self, video: Path, filters: str) -> str:
        completed = subprocess.run(
            ["ffmpeg", "-i", str(video), "-vf", filters, "-an", "-f", "null", "-"],
            capture_output=True, text=True,
        )
        return completed.stderr

    def _scene_of(self, timestamp: float, cuts: list[float]) -> int:
        return sum(1 for cut in cuts if cut <= timestamp + 1e-6)

    def _frozen(self, video: Path, cuts: list[float]) -> list[str]:
        # A shorter probe than the reported threshold, so short rests can be
        # added up per scene even when none of them is long enough to report.
        stills = freeze_spans(video, self.FREEZE_NOISE)
        findings = []
        for begin, length in stills:
            if length >= self.FREEZE_SECONDS:
                findings.append(
                    f"Scene {self._scene_of(begin, cuts)} holds a still image for {length:.1f} s from {begin:.1f} s"
                )
        ends = cuts[1:] + [float("inf")]
        for index, (begin, end) in enumerate(zip(cuts, ends), 1):
            span = (end - begin) if end != float("inf") else None
            if not span or span <= 0:
                continue
            still = sum(length for start_at, length in stills if begin <= start_at < end)
            if still / span > self.STILL_RATIO:
                findings.append(
                    f"Scene {index} is still for {still:.1f} s of its {span:.1f} s ({still / span:.0%})"
                )
        return findings

    def _pops(self, video: Path, cuts: list[float]) -> list[str]:
        log = self._run(video, f"select='gt(scene,{self.POP_SCORE})',showinfo")
        findings = []
        for match in re.finditer(r"pts_time:([0-9.]+)", log):
            timestamp = float(match.group(1))
            if any(abs(timestamp - cut) <= self.CUT_TOLERANCE_SECONDS for cut in cuts):
                continue
            findings.append(
                f"Scene {self._scene_of(timestamp, cuts)} changes abruptly at {timestamp:.1f} s, away from any cut"
            )
        return findings


def freeze_spans(video: Path, noise: float, probe_seconds: float = 1.0) -> list[tuple[float, float]]:
    """Every stretch the master holds the same picture, as (start, length).

    Shared by the scene-level warning and the hook gate so both are talking
    about the same thing when they disagree with each other.
    """
    completed = subprocess.run(
        ["ffmpeg", "-i", str(video), "-vf", f"freezedetect=n={noise}:d={probe_seconds}", "-an", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    spans: list[tuple[float, float]] = []
    start = None
    for match in re.finditer(r"freeze_(start|duration|end): ([0-9.]+)", completed.stderr):
        kind, value = match.group(1), float(match.group(2))
        if kind == "start":
            start = value
        elif kind == "duration" and start is not None:
            spans.append((start, value))
            start = None
    return spans


class HeroSceneAudit:
    """The opening scene is measured, not taken on trust.

    Everything else in this file reports; this one fails the master. The reason
    is not that the first scene is prettier than the others — it is that it is
    the only one every viewer sees, the frame the feed freezes on, and, in a
    piece whose subject is the building of software, the sample of the work. A
    hook that reads as a slide has already answered the question the piece was
    asking, and no amount of script recovers it.

    Two numbers decide it, both taken off the finished file rather than the
    source: how often something starts happening, and how much of the scene is
    the same picture. `HERO_MIN_EVENTS_PER_SECOND` in `hero-stage.tsx` is the
    same floor, stated where the compositions can read it.

    The floor also ratchets. Whatever the best opening a brand has ever shipped
    measured becomes the bar the next one has to clear, less a margin, and it is
    kept in the brand's own memory — so the standard is fed by the work instead
    of by whoever remembers to raise it.
    """

    MIN_EVENTS_PER_SECOND = 3.0
    MAX_STILL_RATIO = 0.12
    # An event is a rise over the level the scene was already running at, not
    # over zero: a shot with a camera in it never sits at zero, and a threshold
    # measured from there finds the camera and misses everything else.
    #
    # Calibrated against two masters of the same scene, one a person called flat
    # and one they called right: the flat opening scores 1.25 events per second
    # and the rebuilt one 3.49, so the threshold sits in a wide gap rather than
    # on a guess. A rise of a fifth over the running level is what a viewer reads
    # as something starting; asking for a third missed events that overlapped.
    EVENT_WINDOW_FRAMES = 5
    EVENT_RISE_RATIO = 1.2
    # And the rise has to be worth something in absolute terms, so grain in a
    # dark frame is not counted as rhythm.
    EVENT_RISE_FLOOR = 0.12
    # Two peaks closer together than this are one event seen twice.
    EVENT_GAP_FRAMES = 3
    # How much of the best-ever opening a new one has to match. Slack enough
    # that an exceptional piece does not make the next brief impossible.
    RATCHET = 0.85
    FREEZE_NOISE = 0.01

    def __init__(self, directory: Path, memory: Path | None = None) -> None:
        self.directory = directory
        self.memory = memory

    def report(self, timings: list[dict[str, Any]], video_id: str) -> dict[str, Any]:
        video = master_path(self.directory)
        if not video.exists() or not timings:
            return {"measured": False}
        seconds = float(timings[0]["render_seconds"])
        energy = self._energy(video, seconds)
        events = self._events(energy)
        still = sum(length for start, length in freeze_spans(video, self.FREEZE_NOISE) if start < seconds)
        rate = round(events / seconds, 2) if seconds else 0.0
        still_ratio = round(min(1.0, still / seconds), 3) if seconds else 1.0
        required = self.required_rate()
        findings = []
        if rate < required:
            findings.append(
                f"El gancho tiene {rate} eventos por segundo; el mínimo es {required}. "
                f"Un evento es algo que empieza: una llegada, una confirmación, un estado que cambia"
            )
        if still_ratio > self.MAX_STILL_RATIO:
            findings.append(
                f"El gancho repite la misma imagen el {still_ratio:.0%} de su duración; el máximo es "
                f"{self.MAX_STILL_RATIO:.0%}"
            )
        passed = not findings
        if passed:
            self._raise_bar(rate, video_id)
        return {
            "measured": True,
            "scene_seconds": round(seconds, 3),
            "events": events,
            "events_per_second": rate,
            "required_events_per_second": required,
            "still_seconds": round(still, 2),
            "still_ratio": still_ratio,
            "max_still_ratio": self.MAX_STILL_RATIO,
            "passed": passed,
            "findings": findings,
        }

    # -- the bar the brand has already cleared ---------------------------- #

    def _bar_path(self) -> Path | None:
        return self.memory / "hero-bar.json" if self.memory else None

    def best(self) -> dict[str, Any]:
        path = self._bar_path()
        if not path or not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

    def required_rate(self) -> float:
        best = float(self.best().get("events_per_second") or 0)
        return round(max(self.MIN_EVENTS_PER_SECOND, best * self.RATCHET), 2)

    def _raise_bar(self, rate: float, video_id: str) -> None:
        path = self._bar_path()
        if not path or rate <= float(self.best().get("events_per_second") or 0):
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps({"events_per_second": rate, "set_by": video_id}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    # -- measurement ------------------------------------------------------ #

    def _energy(self, video: Path, seconds: float) -> list[float]:
        """Per-frame movement, as the average luma of the difference frame."""
        completed = subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-nostats", "-t", f"{seconds:.3f}", "-i", str(video),
                "-vf", "scale=192:-2,tblend=all_mode=difference,signalstats,metadata=print",
                "-an", "-f", "null", "/dev/null",
            ],
            capture_output=True, text=True,
        )
        stream = completed.stdout + completed.stderr
        return [float(value) for value in re.findall(r"lavfi\.signalstats\.YAVG=([0-9.]+)", stream)]

    def _events(self, energy: list[float]) -> int:
        """How many times something starts, counted as rises over the local level.

        A fixed threshold was tried first and it measures the wrong thing. A shot
        with a camera in it runs at a constant level of change, so a global
        threshold either sits under that level and counts every frame, or over it
        and counts nothing — the second version of this hook was visibly three
        times busier than the first and scored identically.

        What a person reads as «something started» is a rise above what the shot
        was already doing, which is what this measures: each frame against the
        average of the handful before it.
        """
        window = self.EVENT_WINDOW_FRAMES
        if len(energy) <= window:
            return 0
        events, last, armed = 0, -self.EVENT_GAP_FRAMES, True
        for index in range(window, len(energy)):
            local = sum(energy[index - window:index]) / window
            value = energy[index]
            rising = value >= local * self.EVENT_RISE_RATIO and value - local >= self.EVENT_RISE_FLOOR
            if not rising:
                # Back at the level the shot was running at: the next rise is a
                # new event. Without this, one long burst is counted again as
                # soon as the trailing window drops back under it.
                armed = True
            elif armed and index - last >= self.EVENT_GAP_FRAMES:
                events += 1
                last = index
                armed = False
        return events


class AnimatedFigureAudit:
    """No figure may be interpolated on its way to the truth.

    A number that counts up is wrong in every frame but the last, and the video
    states it as a fact while it climbs. The check reads the source instead of
    the pixels: rounding or formatting an animated value exists only to print a
    figure that is still moving.
    """

    ANIMATED = r"(?:ease|interpolate|spring)\s*\("
    FORMATTERS = r"(?:Math\.round|Math\.floor|Math\.ceil|grouped|toLocaleString|toFixed)"
    # Only a figure the viewer reads can lie. The same rounding that picks the
    # month out of a list or trims a path to its drawn length says nothing, so
    # the value has to sit in a text position: right after a currency sign or
    # opening a JSX text node.
    RENDERED = r"(?<![=<])[$>]\s*\{?\s*"

    # These shipped before the rule existed and their masters are frozen. They
    # stay on the list so the gate stays green, and none of them may be reused.
    FROZEN_LINES = frozenset({
        # The `sim:ficha` price used to live here. Video-012 reused that card in
        # its hook, which is precisely what the note above forbids, so the
        # counter was replaced by a printed constant and the exemption is gone.
        "const value = Math.round(ease(frame, fps * 0.2, fps * 1.8, 0, 305));",
        "const value = Math.round(ease(progress, 0.08, 0.32, 0, 305));",
        # sim:dividir, the plot piece geo-009 signed. It is not reused.
        "<div style={{marginTop: 4, fontSize: 70, fontWeight: 800, letterSpacing: '-.06em'}}>${Math.round(result)}"
        "<span style={{fontSize: 28}}>/m²</span></div>",
    })

    def __init__(self, root: Path) -> None:
        self.root = root

    def findings(self) -> list[dict[str, Any]]:
        source = (self.root / "remotion/src/simulations.tsx").read_text(encoding="utf-8")
        lines = source.splitlines()
        declared = re.compile(rf"const\s+\w+\s*=\s*{self.FORMATTERS}\s*\(\s*{self.ANIMATED}")
        printed_directly = re.compile(rf"{self.RENDERED}{self.FORMATTERS}\s*\(\s*{self.ANIMATED}")
        # A value built from an animation, however many steps later it is printed.
        animated_names = set(re.findall(rf"const\s+(\w+)\s*=[^;]*{self.ANIMATED}", source))
        printed_later = re.compile(
            rf"{self.RENDERED}{self.FORMATTERS}\s*\(\s*({'|'.join(map(re.escape, animated_names))})\s*[),]"
        ) if animated_names else None
        results = []
        for number, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped in self.FROZEN_LINES:
                continue
            if declared.search(line) or printed_directly.search(line):
                results.append({"line": number, "source": stripped[:160]})
            elif printed_later and printed_later.search(line):
                results.append({"line": number, "source": stripped[:160]})
        return results


class ReviewPage:
    """Generate a keyboard-friendly, zero-dependency local review surface."""

    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def write(self, item: dict[str, Any], plan: dict[str, Any], review: dict[str, Any]) -> Path:
        frames = review.get("visual_review", {}).get("critical_frames", [])
        cards = "".join(
            f'<figure><div class="frame"><img src="frames/{html.escape(Path(frame["path"]).name)}" alt="Scene {frame["scene"]} at {frame["timestamp"]} seconds"><div class="platform top"></div><div class="platform bottom"></div><div class="platform rail"></div><div class="crop left"></div><div class="crop right"></div></div><figcaption>Scene {frame["scene"]} · {frame["timestamp"]} s</figcaption></figure>'
            for frame in frames
        )
        checks = "".join(
            f'<li class="{("pass" if value else "fail")}"><span>{"PASS" if value else "FAIL"}</span>{html.escape(key.replace("_", " "))}</li>'
            for key, value in review.get("checks", {}).items()
        )
        warnings = "".join(f"<li>{html.escape(value)}</li>" for value in review.get("visual_review", {}).get("warnings", [])) or "<li>None</li>"
        strips = "".join(
            f'<figure><img class="strip" src="{html.escape(strip["path"])}" alt="Scene {strip["scene"]}, {strip["samples"]} samples"><figcaption>Scene {strip["scene"]} · {strip["from"]}–{strip["to"]} s · {strip["samples"]} muestras</figcaption></figure>'
            for strip in review.get("visual_review", {}).get("motion_strips", [])
        )
        payload = html.escape(json.dumps(review, ensure_ascii=False, indent=2))
        master_name = f"{item['id']}.mp4"
        document = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review {html.escape(item['id'])}</title><style>
        :root{{--ink:#080915;--panel:#111329;--line:#2b2f51;--text:#f8fafc;--muted:#aab0c5;--green:#22c55e;--red:#ef4444}}*{{box-sizing:border-box}}body{{margin:0;background:var(--ink);color:var(--text);font:16px/1.5 system-ui,sans-serif}}.skip{{position:absolute;left:-999px}}.skip:focus{{left:16px;top:16px;background:white;color:black;padding:10px;z-index:9}}main{{max-width:1440px;margin:auto;padding:24px}}header{{display:flex;justify-content:space-between;gap:24px;align-items:end;border-bottom:1px solid var(--line);padding-bottom:18px}}h1{{margin:0;font-size:clamp(24px,4vw,46px)}}.muted,figcaption{{color:var(--muted)}}.layout{{display:grid;grid-template-columns:minmax(280px,420px) 1fr;gap:24px;margin-top:24px}}video{{width:100%;border-radius:20px;background:black}}section{{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:18px}}ul{{padding-left:20px}}.checks{{list-style:none;padding:0}}.checks li{{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}}.checks span{{width:48px;font-size:12px;font-weight:800}}.pass span{{color:var(--green)}}.fail span{{color:var(--red)}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}}.strips{{display:grid;gap:18px;margin-top:12px}}.strip{{width:100%;height:auto;border-radius:14px;background:#0B0D1C}}figure{{margin:0}}.frame{{position:relative;overflow:hidden;aspect-ratio:9/16;border-radius:14px;background:black}}img{{width:100%;height:100%;object-fit:cover}}.platform,.crop{{position:absolute;background:rgba(239,68,68,.22);border:1px dashed rgba(248,113,113,.8);pointer-events:none}}.top{{inset:0 0 auto;height:12.5%}}.bottom{{inset:auto 0 0;height:24%}}.rail{{right:0;top:43%;bottom:24%;width:23%}}.crop{{top:0;bottom:0;width:11%}}.crop.left{{left:0}}.crop.right{{right:0}}details{{margin-top:24px}}pre{{white-space:pre-wrap;overflow:auto;background:#050611;padding:16px;border-radius:12px}}@media(max-width:800px){{.layout{{grid-template-columns:1fr}}header{{align-items:start;flex-direction:column}}}}
        </style></head><body><a class="skip" href="#main">Saltar al contenido</a><main id="main"><header><div><div class="muted">{html.escape(item['id'])} · {html.escape(item.get('state',''))}</div><h1>{html.escape(plan['title'])}</h1></div><div>{review.get('measured_duration_seconds',0):.1f} s · {html.escape(item.get('editorial_format',''))}</div></header><div class="layout"><div><video controls preload="metadata" src="../exports/{html.escape(master_name)}"></video><section><h2>Technical gates</h2><ul class="checks">{checks}</ul></section><section><h2>Warnings</h2><ul>{warnings}</ul></section></div><section><h2>Critical frames</h2><p class="muted">TikTok/Reels overlays and tall-phone side crop are simulated over every midpoint.</p><div class="grid">{cards}</div><h2>Motion strips</h2><p class="muted">Cada escena muestreada cada medio segundo. Un defecto que solo existe mientras algo se mueve no aparece en el fotograma del medio.</p><div class="strips">{strips}</div></section></div><details><summary>Raw review record</summary><pre>{payload}</pre></details></main></body></html>"""
        target = self.directory / "review/index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(document, encoding="utf-8")
        return target


class VisualReview:
    """Coordinate all cheap visual checks and their review page."""

    def __init__(self, root: Path, directory: Path, memory: Path | None = None) -> None:
        self.root = root
        self.directory = directory
        self.memory = memory

    def build(self, plan: dict[str, Any], timings: list[dict[str, Any]], video_id: str = "") -> dict[str, Any]:
        frames = CriticalFrameExtractor(self.directory).extract(timings) if timings else []
        strips = MotionStripExtractor(self.directory).build(timings) if timings else []
        figures = AnimatedFigureAudit(self.root).findings()
        hero = HeroSceneAudit(self.directory, self.memory).report(timings, video_id)
        warnings = MotionAudit.warnings(plan, timings)
        warnings.extend(MotionDefectAudit(self.directory).warnings(timings))
        # The hook's own findings read alongside the rest on the review page.
        # They are not warnings — they fail the master — but the person looking
        # at the page needs them in the same list as everything else.
        warnings.extend(hero.get("findings") or [])
        return {
            "overlay_geometry_version": 1,
            "critical_frames": [
                {**frame, "path": str(frame["path"].relative_to(self.directory / "review"))}
                for frame in frames
            ],
            "motion_strips": strips,
            "text": TextLegibilityAudit(self.root).report(),
            "animated_figures": {
                "passed": not figures,
                "findings": figures,
                "note": "Una cifra interpolada afirma un valor falso en cada fotograma menos el último.",
            },
            "hero_scene": hero,
            "warnings": warnings,
        }
