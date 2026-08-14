#!/usr/bin/env python3
"""The Markdown a person reads: the script table and the storyboard.

These are written once when a video is planned and are the artefacts a human
reviews before approving, so they show times, shots and narration together.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import voice

def write_storyboard(directory: Path, plan: dict[str, Any]) -> None:
    cursor = 0.0
    sections = [f"# Storyboard: {plan['title']}"]
    for index, scene in enumerate(plan["scenes"], 1):
        start = cursor
        cursor += float(scene["duration"])
        captions = voice.split_captions(scene["voice"])
        sections.append(f"""
## Escena {index:02} · {start:.1f}–{cursor:.1f} s · {scene['purpose']}

- Visual: {scene['visual_direction']}
- Recurso: {scene.get('asset') or 'Fondo de marca'}
- Rótulo: {scene['on_screen_text']}
- Voz: {scene['voice']}
- Subtítulos: {' / '.join(captions)}
- Entrada: {scene['transition']}
""")
    (directory / "storyboard.md").write_text("\n".join(sections).strip() + "\n", encoding="utf-8")


def write_script(plan: dict[str, Any], number: int, target: Path) -> None:
    rows = []
    cursor = 0.0
    for index, scene in enumerate(plan["scenes"], 1):
        start = cursor
        cursor += float(scene["duration"])
        asset = scene.get("asset") or "Fondo de marca"
        rows.append(
            f"| {index} | {start:.1f}–{cursor:.1f} s | {scene['purpose']} | {scene['visual_direction']} | "
            f"{scene['voice']} | {scene['on_screen_text']} | {asset} | {scene['transition']} |"
        )
    target.write_text(f"""# Video {number:03}: {plan['title']}

Estado: `planificado`

## Estrategia

- Público: {plan['audience']}
- Etapa: {plan['funnel_stage']}
- Objetivo: {plan['objective']}
- Conversión: {plan['conversion_event']}
- Pilar: {plan['pillar']}
- Serie: {plan['series']}
- Concepto: {plan['concept']}
- Promesa: {plan['promise']}
- CTA: {plan['cta']}
- Hipótesis: {plan['hypothesis']}
- Portada: {plan['cover_text']}

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(rows)}

## Voz completa

{plan['narration']}

## Caption

{plan['caption']}

## Verificación antes de publicar

{chr(10).join(f'- [ ] {note}' for note in plan['verification_notes']) or '- [ ] Sin afirmaciones adicionales.'}
""", encoding="utf-8")
