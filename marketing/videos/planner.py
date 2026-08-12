#!/usr/bin/env python3
"""Everything the factory asks Claude for: plans, hook variants and lessons."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent

PURPOSES = ["gancho", "problema", "prueba", "resultado", "cta"]

CONTEXT_FILES = [
    "CLAUDE.md",
    "product-context.md",
    "strategy.md",
    "production-guide.md",
    "creative-system.md",
    "memory/lessons.md",
    "memory/content-gaps.json",
    "memory/decisions.md",
]

PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "title", "audience", "funnel_stage", "objective", "conversion_event",
        "pillar", "series", "concept", "promise", "cta", "hypothesis",
        "cover_text", "caption", "music_prompt", "narration",
        "verification_notes", "scenes",
    ],
    "properties": {
        "title": {"type": "string"},
        "audience": {"type": "string", "enum": ["comprador", "propietario", "profesional"]},
        "funnel_stage": {"type": "string", "enum": ["descubrimiento", "consideración", "conversión"]},
        "objective": {"type": "string"},
        "conversion_event": {"type": "string"},
        "pillar": {"type": "string"},
        "series": {"type": "string"},
        "concept": {"type": "string"},
        "promise": {"type": "string"},
        "cta": {"type": "string", "maxLength": 34},
        "hypothesis": {"type": "string"},
        "cover_text": {"type": "string", "maxLength": 32},
        "caption": {"type": "string"},
        "music_prompt": {"type": "string"},
        "narration": {"type": "string"},
        "verification_notes": {"type": "array", "items": {"type": "string"}},
        "scenes": {
            "type": "array",
            "minItems": 3,
            "maxItems": 8,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["purpose", "duration", "voice", "on_screen_text", "asset", "visual_direction", "transition"],
                "properties": {
                    "purpose": {"type": "string", "enum": PURPOSES},
                    "duration": {"type": "number"},
                    "voice": {"type": "string"},
                    "on_screen_text": {"type": "string", "maxLength": 28},
                    "asset": {"type": ["string", "null"]},
                    "visual_direction": {"type": "string"},
                    "transition": {"type": "string", "enum": ["cut", "fade"]},
                },
            },
        },
    },
}

HOOKS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["hooks"],
    "properties": {
        "hooks": {
            "type": "array",
            "minItems": 1,
            "maxItems": 5,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["label", "voice", "on_screen_text", "cover_text", "rationale"],
                "properties": {
                    "label": {"type": "string", "maxLength": 24},
                    "voice": {"type": "string"},
                    "on_screen_text": {"type": "string", "maxLength": 28},
                    "cover_text": {"type": "string", "maxLength": 32},
                    "rationale": {"type": "string"},
                },
            },
        },
    },
}

LESSONS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["lessons", "recommended_gaps"],
    "properties": {
        "lessons": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["scope", "applies_to", "observation", "rule", "evidence_video"],
                "properties": {
                    "scope": {"type": "string", "enum": ["global", "audience", "series"]},
                    "applies_to": {"type": ["string", "null"]},
                    "observation": {"type": "string"},
                    "rule": {"type": "string"},
                    "evidence_video": {"type": "string"},
                },
            },
        },
        "recommended_gaps": {"type": "array", "items": {"type": "string"}},
    },
}


def read_context() -> str:
    parts = []
    for name in CONTEXT_FILES:
        path = ROOT / name
        if path.exists():
            parts.append(path.read_text(encoding="utf-8"))
    return "\n\n".join(parts)


def error_detail(completed: subprocess.CompletedProcess[str]) -> str:
    """Claude reports failures inside its JSON payload, leaving stderr empty."""
    detail = completed.stderr.strip()
    try:
        payload = json.loads(completed.stdout)
    except (json.JSONDecodeError, ValueError):
        return detail or completed.stdout.strip()[:400] or "no output"
    errors = payload.get("errors") or []
    return "; ".join(filter(None, [detail, payload.get("subtype", ""), *errors])) or "no detail reported"


def ask(prompt: str, schema: dict[str, Any], system: str | None = None) -> dict[str, Any]:
    """Run one closed-book structured request against the authenticated CLI.

    Tools stay disabled on purpose: the system prompt asks for claims to be
    verified against specs/, and with tools available the planner burns its
    turns on permission-denied Bash calls and dies on the turn limit.
    """
    command = [
        "claude", "-p",
        "--output-format", "json",
        "--json-schema", json.dumps(schema),
        "--tools", "",
        "--max-turns", "2",
    ]
    if system:
        command.extend(["--system-prompt", system])
    model = os.environ.get("CLAUDE_MODEL")
    if model:
        command.extend(["--model", model])
    completed = subprocess.run(command, input=prompt, text=True, capture_output=True)
    if completed.returncode:
        raise RuntimeError(f"Claude CLI failed: {error_detail(completed)}")
    response = json.loads(completed.stdout)
    structured = response.get("structured_output")
    if isinstance(structured, dict):
        return structured
    result = response.get("result")
    if isinstance(result, str):
        return json.loads(result)
    raise RuntimeError(f"Claude returned no structured output: {str(response)[:400]}")


def describe_assets(assets: list[dict[str, Any]]) -> str:
    if not assets:
        return (
            "No product footage is available. Every scene must use asset: null and the "
            "renderer will fall back to the branded map background. Do not describe screens "
            "that will not be shown."
        )
    lines = []
    for asset in assets:
        warning = " — REQUIERE AUTORIZACIÓN DEL ANUNCIANTE" if asset.get("requires_authorization") else ""
        lines.append(f"- {asset['file']}: {asset['description']} ({asset.get('proves', 'sin nota')}){warning}")
    return (
        "Available approved footage. Use these exact filenames or null:\n"
        + "\n".join(lines)
        + "\nIf you use a clip marked as requiring authorisation, add a verification note "
        "saying whose permission must be on file before publishing."
    )


def create_plan(brief: str, duration: int, assets: list[dict[str, Any]], catalog: str) -> dict[str, Any]:
    prompt = f"""Create one production-ready Spanish social video for Geo Propiedades Ecuador.

Target duration: {duration} seconds, and scene durations must total approximately that.
The renderer measures the real speech, so keep narration tight: roughly 15 spoken
characters per second. A {duration} second video holds about {duration * 14} characters
of narration in total.

The first scene must hook in two seconds. Use one audience, one promise and one CTA.
Every voice field is the exact narration spoken during that scene, written for a
text-to-speech voice: no emoji, no hashtags, no stage directions, no abbreviations
the voice cannot read. Write numbers and URLs the way they are pronounced.
Each on_screen_text is a rótulo of at most five words, not a sentence.
The narration field joins every voice field in order.

{describe_assets(assets)}

PREVIOUS VIDEO CATALOG:
{catalog}

Study the catalog before planning. Complement missing audiences, funnel stages,
pillars or objections. Do not repeat a previous hook or concept unless the brief
explicitly asks for a variant.

USER BRIEF:
{brief}
"""
    return ask(prompt, PLAN_SCHEMA, read_context())


def create_hooks(plan: dict[str, Any], count: int) -> list[dict[str, Any]]:
    prompt = f"""Write {count} alternative opening hooks for this approved Spanish social video.

Keep the same audience, promise, body and CTA. Change only the first scene: its
spoken line, its rótulo and the cover text. Each hook must use a different
mechanism (for example a question, a common mistake, a result first, a direct
contradiction) so the experiment isolates one variable.

The spoken line must be sayable in about two seconds, which is roughly 30 characters.

APPROVED PLAN:
{json.dumps(plan, ensure_ascii=False)}
"""
    return ask(prompt, HOOKS_SCHEMA, read_context())["hooks"]


def create_lessons(evidence: list[dict[str, Any]], coverage: dict[str, Any]) -> dict[str, Any]:
    prompt = (
        "Analyze these social video results for Geo Propiedades Ecuador. Produce cautious, "
        "actionable Spanish lessons. Do not infer causality without a controlled comparison; "
        "label limited evidence in the observation. Recommend content gaps that complement "
        "the catalog.\n\n"
        + json.dumps({"evidence": evidence, "coverage": coverage}, ensure_ascii=False)
    )
    return ask(prompt, LESSONS_SCHEMA)
