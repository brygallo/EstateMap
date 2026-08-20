#!/usr/bin/env python3
"""Single store for what the factory has learned.

`lessons.json` is the source of truth and `lessons.md` is a rendered view of it,
so a human correction and a lesson derived from metrics can never drift apart.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import brand


ROOT = Path(__file__).resolve().parent
STORE = ROOT / "brands/geo/memory/lessons.json"
VIEW = ROOT / "brands/geo/memory/lessons.md"


def configure(profile: brand.BrandProfile) -> None:
    global STORE, VIEW
    STORE = profile.memory / "lessons.json"
    VIEW = profile.memory / "lessons.md"

PREAMBLE = """# Aprendizajes activos

Claude lee este archivo antes de cada generación. **No lo edites a mano**: se
regenera desde `memory/lessons.json`. Para añadir una corrección usa
`marketing/videos/video feedback`.

## Reglas permanentes

- Si no hay material real del producto, declarar el resultado como video
  tipográfico de marca; no fingir una captura de pantalla.
- La voz no debe leer hashtags, instrucciones de edición ni emojis.
- Una corrección humana explícita tiene prioridad sobre una heurística general
  de la estrategia.
"""


def load() -> dict[str, Any]:
    if not STORE.exists():
        return {"version": 1, "lessons": []}
    return json.loads(STORE.read_text(encoding="utf-8"))


def save(data: dict[str, Any]) -> None:
    STORE.parent.mkdir(parents=True, exist_ok=True)
    STORE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    render(data)


def add(lesson: dict[str, Any]) -> None:
    data = load()
    data["lessons"].append({
        "created_at": datetime.now().astimezone().isoformat(),
        "status": "active",
        **lesson,
    })
    save(data)


def render(data: dict[str, Any] | None = None) -> None:
    data = data or load()
    active = [lesson for lesson in data["lessons"] if lesson.get("status", "active") == "active"]
    sections = [PREAMBLE]
    if active:
        sections.append("\n## Aprendizajes registrados\n")
    for lesson in active:
        applies = lesson.get("applies_to") or "toda la cuenta"
        origin = "corrección humana" if lesson.get("origin") == "human" else "métricas"
        date = (lesson.get("created_at") or "")[:10]
        sections.append(
            f"\n### {date} · {lesson.get('scope', 'global')} · {applies}\n\n"
            f"- Observación ({origin}): {lesson.get('observation', '').strip()}\n"
            f"- Regla: {lesson.get('rule', '').strip()}\n"
        )
    VIEW.parent.mkdir(parents=True, exist_ok=True)
    VIEW.write_text("".join(sections).rstrip() + "\n", encoding="utf-8")
