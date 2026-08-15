#!/usr/bin/env python3
"""Class-based visual-review artifacts built from an existing master."""

from __future__ import annotations

import html
import json
import re
import subprocess
from pathlib import Path
from typing import Any


class CriticalFrameExtractor:
    """Extract scene midpoints without re-rendering the master."""

    def __init__(self, directory: Path) -> None:
        self.directory = directory

    def extract(self, timings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        video = self.directory / "exports/video.mp4"
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
        payload = html.escape(json.dumps(review, ensure_ascii=False, indent=2))
        document = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review {html.escape(item['id'])}</title><style>
        :root{{--ink:#080915;--panel:#111329;--line:#2b2f51;--text:#f8fafc;--muted:#aab0c5;--green:#22c55e;--red:#ef4444}}*{{box-sizing:border-box}}body{{margin:0;background:var(--ink);color:var(--text);font:16px/1.5 system-ui,sans-serif}}.skip{{position:absolute;left:-999px}}.skip:focus{{left:16px;top:16px;background:white;color:black;padding:10px;z-index:9}}main{{max-width:1440px;margin:auto;padding:24px}}header{{display:flex;justify-content:space-between;gap:24px;align-items:end;border-bottom:1px solid var(--line);padding-bottom:18px}}h1{{margin:0;font-size:clamp(24px,4vw,46px)}}.muted,figcaption{{color:var(--muted)}}.layout{{display:grid;grid-template-columns:minmax(280px,420px) 1fr;gap:24px;margin-top:24px}}video{{width:100%;border-radius:20px;background:black}}section{{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:18px}}ul{{padding-left:20px}}.checks{{list-style:none;padding:0}}.checks li{{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}}.checks span{{width:48px;font-size:12px;font-weight:800}}.pass span{{color:var(--green)}}.fail span{{color:var(--red)}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}}figure{{margin:0}}.frame{{position:relative;overflow:hidden;aspect-ratio:9/16;border-radius:14px;background:black}}img{{width:100%;height:100%;object-fit:cover}}.platform,.crop{{position:absolute;background:rgba(239,68,68,.22);border:1px dashed rgba(248,113,113,.8);pointer-events:none}}.top{{inset:0 0 auto;height:12.5%}}.bottom{{inset:auto 0 0;height:24%}}.rail{{right:0;top:43%;bottom:24%;width:23%}}.crop{{top:0;bottom:0;width:11%}}.crop.left{{left:0}}.crop.right{{right:0}}details{{margin-top:24px}}pre{{white-space:pre-wrap;overflow:auto;background:#050611;padding:16px;border-radius:12px}}@media(max-width:800px){{.layout{{grid-template-columns:1fr}}header{{align-items:start;flex-direction:column}}}}
        </style></head><body><a class="skip" href="#main">Saltar al contenido</a><main id="main"><header><div><div class="muted">{html.escape(item['id'])} · {html.escape(item.get('state',''))}</div><h1>{html.escape(plan['title'])}</h1></div><div>{review.get('measured_duration_seconds',0):.1f} s · {html.escape(item.get('editorial_format',''))}</div></header><div class="layout"><div><video controls preload="metadata" src="../exports/video.mp4"></video><section><h2>Technical gates</h2><ul class="checks">{checks}</ul></section><section><h2>Warnings</h2><ul>{warnings}</ul></section></div><section><h2>Critical frames</h2><p class="muted">TikTok/Reels overlays and tall-phone side crop are simulated over every midpoint.</p><div class="grid">{cards}</div></section></div><details><summary>Raw review record</summary><pre>{payload}</pre></details></main></body></html>"""
        target = self.directory / "review/index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(document, encoding="utf-8")
        return target


class VisualReview:
    """Coordinate all cheap visual checks and their review page."""

    def __init__(self, root: Path, directory: Path) -> None:
        self.root = root
        self.directory = directory

    def build(self, plan: dict[str, Any], timings: list[dict[str, Any]]) -> dict[str, Any]:
        frames = CriticalFrameExtractor(self.directory).extract(timings) if timings else []
        return {
            "overlay_geometry_version": 1,
            "critical_frames": [
                {**frame, "path": str(frame["path"].relative_to(self.directory / "review"))}
                for frame in frames
            ],
            "text": TextLegibilityAudit(self.root).report(),
            "warnings": MotionAudit.warnings(plan, timings),
        }
