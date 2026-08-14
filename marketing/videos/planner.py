#!/usr/bin/env python3
"""Everything the factory asks Claude for: plans, hook variants and lessons."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

import quality


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
        "cover_text", "caption", "narration",
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
        "narration": {"type": "string"},
        # Optional instrumental brief. Absent means the piece carries no music,
        # which stays the default: a bed is bought only when someone asks.
        "music": {"type": ["string", "null"], "maxLength": 300},
        "verification_notes": {"type": "array", "items": {"type": "string"}},
        # The ceiling is the story format's; `quality.scene_budget` holds short
        # form to five, so a fifteen-second piece still cannot arrive with nine.
        "scenes": {
            "type": "array",
            "minItems": 3,
            "maxItems": 9,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["purpose", "duration", "voice", "on_screen_text", "asset", "visual_direction", "transition"],
                "properties": {
                    "purpose": {"type": "string", "enum": PURPOSES},
                    "duration": {"type": "number"},
                    "voice": {"type": "string"},
                    "on_screen_text": {"type": "string", "maxLength": 22},
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
                    "on_screen_text": {"type": "string", "maxLength": 22},
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


SIMULATIONS = {
    "sim:que-compras": "animación educativa: comprar un departamento es comprar una parte de un edificio",
    "sim:propiedad-horizontal": "animación educativa: qué consta en la escritura y qué es área común",
    "sim:alicuota": "animación educativa: la alícuota mensual y el certificado de estar al día",
    "sim:edificio": "animación educativa: las actas de asamblea y el estado real del edificio",
    "sim:escrituras": "animación: la escritura, el propietario inscrito y la comprobación de que es quien vende",
    "sim:gravamenes": "animación: el certificado de gravámenes y el predial, leídos uno a uno",
    "sim:uso-suelo": "animación: el uso de suelo del municipio y lo que permite construir",
    "sim:linderos": "animación: caminar los linderos y encontrar la medida que no cuadra",
    "sim:servicios": "animación: los servicios que llegan al terreno y el acceso en invierno",
    "sim:alrededor": "animación: el entorno del terreno en el mapa, las vías y el acceso",
    "sim:forma-dibujada": "animación: la Forma del terreno dibujándose, con el aviso de que no es un plano legal",
    "sim:medidas": "animación: el campo Medidas de la ficha marcado como referencia aproximada",
    "sim:dividir": "animación: precio total dividido para el área, el precio por m² y dos terrenos de distinto tamaño comparados",
    "sim:preguntas": "animación educativa: lo que una foto de un terreno no puede decirte, fuera de cualquier portal",
    "sim:anuncios": "animación: anuncios cayendo en pila, cada uno con foto y precio y el hueco de la ubicación vacío",
    "sim:llegada": "animación: los anuncios se apartan y entra el mapa con la marca; úsala en la escena donde se nombra Geo Propiedades",
    "sim:mapa": "animación: del mapa del país a una zona, las burbujas de ciudad se abren en barrios y luego en casas con su precio",
    "sim:zona": "animación: se abre una zona, primero el agrupado y después los pines de cada casa con su precio",
    "sim:filtros": "animación: un filtro de precio se ajusta sobre el mapa y desaparecen las propiedades fuera del rango",
    "sim:ficha": "animación: una ficha entra en cuadro con su foto, su precio y sus características",
    "sim:precio": "animación: el precio por metro cuadrado sube y se sitúa dentro del rango habitual de la zona, con el número de comparables",
    "sim:publicar": "animación: los cinco pasos de publicar se marcan uno a uno",
    "sim:publicar-gratis": "animación: el flujo de publicación aparece junto a costo cero y sin comisión",
    "sim:formulario": "animación: el formulario real avanza entre tipo de propiedad y estado",
    "sim:ubicacion-publicacion": "animación: cambia entre un punto y la Forma del terreno sobre el mapa",
    "sim:fotos-publicacion": "animación: el precio y las fotos forman la vista previa de la propiedad",
    "sim:revisar-fotos": "animación de comprador: galería pública y características declaradas",
    "sim:precio-area": "animación de comprador: precio por m² y comparación con inventario activo del mismo tipo, operación y ciudad",
    "sim:ubicacion-ficha": "animación de comprador: ubicación pública y Forma del terreno condicionada a que exista",
    "sim:contacto": "animación de comprador: el bloque de contacto de la ficha, el teléfono que se revela y el mensaje ya escrito para quien publica",
    "sim:vender": "animación de propietario: el terreno y la casa con su letrero de se vende o se arrienda",
    "sim:cero-comision": "animación de propietario: cero por publicar, cero comisión al vender o arrendar y sin límite de propiedades",
    "sim:ya-estan": "animación de propietario: el mapa lleno de propiedades en venta y el hueco de la que falta",
    "sim:anuncio-en-mapa": "animación de propietario: el anuncio publicado aterriza en el mapa con su forma de terreno y su precio",
    "sim:te-contactan": "animación de propietario: la llamada y el mensaje del interesado llegan directo al anunciante",
    "sim:aents-reveal": "animación de Aents: Geo Propiedades Ecuador aparece como caso real construido por Aents",
    "sim:aents-proceso": "animación de Aents: estrategia, diseño, desarrollo y lanzamiento",
    "sim:aents-servicios": "animación de Aents: webs, apps, sistemas empresariales y automatización con integraciones",
    "sim:aents-contacto": "animación final de Aents: Agenda tu idea, WhatsApp 098 373 8151 y aents.net",
}


def describe_assets(assets: list[dict[str, Any]]) -> str:
    animated = "\n".join(f"- {name}: {description}" for name, description in SIMULATIONS.items())
    preamble = (
        "Animated recreations you can use in any scene. They are drawn illustrations of the "
        "product, never screenshots, so describe what they show without claiming the viewer is "
        "watching a recording:\n" + animated + "\n\n"
    )
    if not assets:
        return preamble + (
            "There is no screen footage. Use the animated recreations above, or asset: null for a "
            "branded typographic scene. Do not describe screens that will not be shown."
        )
    lines = []
    for asset in assets:
        warning = " — REQUIERE AUTORIZACIÓN DEL ANUNCIANTE" if asset.get("requires_authorization") else ""
        lines.append(f"- {asset['file']}: {asset['description']} ({asset.get('proves', 'sin nota')}){warning}")
    return preamble + (
        "Approved screen captures. Use these exact filenames, an animation above, or null:\n"
        + "\n".join(lines)
        + "\nIf you use a clip marked as requiring authorisation, add a verification note that "
        "names the clip file without its extension and states whose permission must be on file "
        "before publishing. The gate looks for the clip name and the word autorización in the "
        "same note."
    )


def create_plan(brief: str, duration: int, assets: list[dict[str, Any]], catalog: str) -> dict[str, Any]:
    scenes = quality.scene_budget(duration)
    reveal = quality.product_reveal_deadline(duration)
    shape = (
        "This is a story: it may set the scene before it demonstrates, and it has to "
        "hold attention with narrative, not with filler. Every beat moves the story on."
        if quality.is_story(duration)
        else "This is short form: one promise and its demonstration, nothing else."
    )
    prompt = f"""Create one production-ready Spanish social video for Geo Propiedades Ecuador.

Target duration: {duration} seconds, and scene durations must total approximately that.
The renderer measures the real speech, so keep narration tight: roughly 15 spoken
characters per second. A {duration} second video holds about {duration * 14} characters
of narration in total.

{shape}

The first scene must hook in two seconds. Use at most {scenes} scenes, one audience,
one promise and one CTA. In buyer videos the map or product demonstration must
begin by second {reveal:.0f}; do not spend consecutive scenes repeating the problem. The
CTA for a buyer is “Encuentra tu futuro hogar” or “Explora el mapa”, and owner
language such as “publica tu propiedad” must not appear in that piece.
Every voice field is the exact narration spoken during that scene, written for a
text-to-speech voice: no emoji, no hashtags, no stage directions, no abbreviations
the voice cannot read. Write numbers and URLs the way they are pronounced.
Each on_screen_text is a rótulo of at most four words and 22 characters: it has to fit on a single row.
The narration field joins every voice field in order.

The music field is a short instrumental brief in Spanish describing the bed that
sits under the voice: genre, instruments, tempo and mood. It is never sung and
never competes with the narration, so do not ask for vocals, lyrics or a chorus.
Leave it null when the piece is stronger with no music at all.

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
