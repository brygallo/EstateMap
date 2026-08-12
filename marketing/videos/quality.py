#!/usr/bin/env python3
"""Plan-level quality gate.

Everything here runs on plan.json, before a single second of speech is
synthesised or a frame is rendered. Catching a cross-audience CTA or an
unverifiable claim costs nothing at this point and costs a full render later.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import voice


ROOT = Path(__file__).resolve().parent

# From creative-system.md: a CTA belongs to its audience and is not swapped for
# variety.
CTA_FAMILIES = {
    "comprador": ["explora", "mira", "busca", "abre"],
    "propietario": ["publica", "sube", "comparte"],
    "profesional": ["prueba", "escríbenos", "contáctanos", "solicita"],
}

# From creative-system.md and the "No prometer" section of product-context.md.
FORBIDDEN = {
    "revolucionari": "superlativo no demostrable",
    "líder": "posición de mercado sin fuente",
    "garantiz": "promesa de resultado",
    "vende rápido": "promesa de plazo de venta",
    "el mejor": "superlativo no demostrable",
    "plusvalía": "afirmación de valorización de zona",
    "zona segura": "afirmación de seguridad de zona",
    "rentable": "afirmación de retorno",
    "publica automáticamente": "publicación automática en redes no existe",
    "publicación automática": "publicación automática en redes no existe",
    "video automático": "el video automático del anuncio es una propuesta, no una función",
    "última oportunidad": "escasez fabricada",
    "solo por hoy": "escasez fabricada",
}

EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]",
    flags=re.UNICODE,
)
NUMBER_CLAIM = re.compile(r"\b\d[\d.,]*\s*(%|por ciento|mil|millones|usuarios|visitas|propiedades|anuncios)\b", re.IGNORECASE)


def finding(level: str, rule: str, detail: str) -> dict[str, str]:
    return {"level": level, "rule": rule, "detail": detail}


def check_structure(plan: dict[str, Any]) -> list[dict[str, str]]:
    findings = []
    scenes = plan.get("scenes") or []
    if not scenes:
        return [finding("error", "scenes", "El plan no tiene escenas")]
    if scenes[0].get("purpose") != "gancho":
        findings.append(finding("error", "hook_first", f"La primera escena es '{scenes[0].get('purpose')}', debe ser 'gancho'"))
    if scenes[-1].get("purpose") != "cta":
        findings.append(finding("error", "cta_last", f"La última escena es '{scenes[-1].get('purpose')}', debe ser 'cta'"))
    ctas = [scene for scene in scenes if scene.get("purpose") == "cta"]
    if len(ctas) > 1:
        findings.append(finding("error", "single_cta", f"Hay {len(ctas)} escenas de CTA; solo se permite una"))
    return findings


def check_headlines(plan: dict[str, Any]) -> list[dict[str, str]]:
    findings = []
    for index, scene in enumerate(plan.get("scenes") or [], 1):
        text = scene.get("on_screen_text", "")
        words = len(text.split())
        if words > 5:
            findings.append(finding("error", "headline_length", f"Escena {index}: el rótulo tiene {words} palabras ({text!r}); máximo 5"))
        if len(text) > 28:
            findings.append(finding("error", "headline_width", f"Escena {index}: el rótulo tiene {len(text)} caracteres; máximo 28"))
    cover = plan.get("cover_text", "")
    if not 2 <= len(cover.split()) <= 6:
        findings.append(finding("warning", "cover_words", f"La portada tiene {len(cover.split())} palabras; conviene entre 3 y 6"))
    return findings


def check_voice(plan: dict[str, Any]) -> list[dict[str, str]]:
    findings = []
    for index, scene in enumerate(plan.get("scenes") or [], 1):
        spoken = scene.get("voice", "")
        if EMOJI.search(spoken):
            findings.append(finding("error", "voice_readable", f"Escena {index}: la locución contiene emoji"))
        if "#" in spoken:
            findings.append(finding("error", "voice_readable", f"Escena {index}: la locución contiene un hashtag"))
        if "http" in spoken or "www." in spoken:
            findings.append(finding("error", "voice_readable", f"Escena {index}: la locución contiene una URL sin escribir como se pronuncia"))
    joined = " ".join(scene.get("voice", "") for scene in plan.get("scenes") or [])
    if plan.get("narration", "").split() != joined.split():
        findings.append(finding("warning", "narration_matches", "El campo narration no coincide con la suma de las locuciones por escena"))
    return findings


def check_duration(plan: dict[str, Any], target: int) -> list[dict[str, str]]:
    estimated = sum(voice.estimate_seconds(scene.get("voice", "")) for scene in plan.get("scenes") or [])
    findings = []
    if estimated > target * 1.2:
        findings.append(finding("error", "duration", f"La locución estimada dura {estimated:.1f} s frente a {target} s pedidos; acorta el guion"))
    elif estimated < target * 0.6:
        findings.append(finding("warning", "duration", f"La locución estimada dura solo {estimated:.1f} s frente a {target} s pedidos"))
    return findings


def check_claims(plan: dict[str, Any]) -> list[dict[str, str]]:
    findings = []
    haystack = " ".join([
        plan.get("narration", ""),
        plan.get("caption", ""),
        plan.get("promise", ""),
        " ".join(scene.get("on_screen_text", "") for scene in plan.get("scenes") or []),
    ]).lower()
    for term, reason in FORBIDDEN.items():
        if term in haystack:
            findings.append(finding("error", "forbidden_claim", f"Aparece «{term}»: {reason}"))
    notes = " ".join(plan.get("verification_notes") or [])
    for match in NUMBER_CLAIM.finditer(haystack):
        if match.group(0) not in notes.lower():
            findings.append(finding("warning", "unsourced_number", f"Cifra «{match.group(0)}» sin nota de verificación"))
    return findings


def check_cta(plan: dict[str, Any]) -> list[dict[str, str]]:
    audience = plan.get("audience", "")
    cta = plan.get("cta", "").lower()
    if not cta:
        return [finding("error", "cta", "El plan no tiene CTA")]
    family = CTA_FAMILIES.get(audience)
    if family and not any(verb in cta for verb in family):
        return [finding("warning", "cta_family", f"El CTA «{plan['cta']}» no pertenece a la familia de {audience}: {family}")]
    return []


def restricted_clips() -> set[str]:
    manifest = ROOT / "assets/screens/manifest.json"
    if not manifest.exists():
        return set()
    data = json.loads(manifest.read_text(encoding="utf-8"))
    return {clip["file"] for clip in data.get("clips", []) if clip.get("requires_authorization")}


def check_assets(plan: dict[str, Any], directory: Path) -> list[dict[str, str]]:
    findings = []
    restricted = restricted_clips()
    notes = " ".join(plan.get("verification_notes") or []).lower()
    for index, scene in enumerate(plan.get("scenes") or [], 1):
        name = scene.get("asset")
        if not name:
            continue
        if not (directory / "assets/input" / name).is_file():
            findings.append(finding("error", "asset_missing", f"Escena {index}: el recurso {name} no existe en assets/input"))
        elif name in restricted and "autoriz" not in notes:
            findings.append(finding(
                "error",
                "asset_authorization",
                f"Escena {index}: {name} muestra una propiedad concreta y no hay nota de verificación sobre la autorización del anunciante",
            ))
    return findings


def check_repetition(plan: dict[str, Any], catalog: dict[str, Any], identifier: str) -> list[dict[str, str]]:
    scenes = plan.get("scenes") or []
    if not scenes:
        return []
    hook = " ".join(scenes[0].get("voice", "").lower().split())
    findings = []
    for item in catalog.get("videos", []):
        if item.get("id") == identifier or item.get("experiment") == "hook":
            continue
        previous = " ".join((item.get("hook") or "").lower().split())
        if previous and previous == hook:
            findings.append(finding("error", "repeated_hook", f"El gancho es idéntico al de {item['id']}"))
        elif previous and hook and shared_ratio(previous, hook) > 0.8:
            findings.append(finding("warning", "similar_hook", f"El gancho se parece mucho al de {item['id']}"))
    return findings


def shared_ratio(first: str, second: str) -> float:
    left, right = set(first.split()), set(second.split())
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def lint(plan: dict[str, Any], directory: Path, target: int, catalog: dict[str, Any], identifier: str) -> dict[str, Any]:
    findings: list[dict[str, str]] = []
    findings += check_structure(plan)
    findings += check_headlines(plan)
    findings += check_voice(plan)
    findings += check_duration(plan, target)
    findings += check_claims(plan)
    findings += check_cta(plan)
    findings += check_assets(plan, directory)
    findings += check_repetition(plan, catalog, identifier)
    errors = [item for item in findings if item["level"] == "error"]
    return {
        "passed": not errors,
        "errors": len(errors),
        "warnings": len(findings) - len(errors),
        "findings": findings,
        "estimated_seconds": round(sum(voice.estimate_seconds(scene.get("voice", "")) for scene in plan.get("scenes") or []), 1),
        "target_seconds": target,
    }


def rules_reference() -> dict[str, Any]:
    path = ROOT / "system/quality-rules.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
