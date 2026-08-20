"""Supervised learning: the factory proposes, a person decides, both answers stick.

Nothing is learned silently here. When a piece finishes, the factory reads what
actually happened — what the linter flagged, what the review measured, what the
person corrected — and turns each observation into a proposal phrased as a
change to configuration. A person answers «esto sí» or «esto no», and that is
the whole loop:

* accepted  → written into `brands/<brand>/rules.json`, where the planner and
  the linter read it. From then on the factory applies it without asking.
* rejected  → kept as a decision, so the same proposal is never made again.

Both answers teach. A rejection is not a discarded idea: it is the record that
this factory does not work that way, and it is what stops the next piece from
raising it a second time.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from . import factory, store

RULES_FILE = "rules.json"


def _rules_path(brand_id: str) -> Path | None:
    active = factory.brand(brand_id)
    if active is None:
        return None
    return active.memory.parent / RULES_FILE


def rules(brand_id: str) -> dict[str, Any]:
    """The configuration a brand has actually agreed to."""
    path = _rules_path(brand_id)
    if path is None or not path.is_file():
        return {"version": 1, "learned": []}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"version": 1, "learned": []}


def _write_rules(brand_id: str, value: dict[str, Any]) -> None:
    path = _rules_path(brand_id)
    if path is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def observe(brand_id: str, video_id: str) -> list[dict[str, str]]:
    """Read what a finished piece leaves behind, and phrase it as proposals.

    Only what the artefacts actually say. A finding the files do not support is
    not an observation, and the factory has no business proposing it.
    """
    detail = factory.video(brand_id, video_id)
    if detail is None:
        return []
    artefacts = {item["name"]: item for item in detail["artefacts"]}
    found: list[dict[str, str]] = []

    lint = (artefacts.get("lint.json") or {}).get("content") or {}
    for finding in lint.get("findings") or []:
        if finding.get("level") != "error":
            continue
        rule = str(finding.get("rule") or "lint")
        found.append(
            {
                "scope": "lint",
                "subject": rule,
                "claim": f"La regla «{rule}» se incumplió al planificar {video_id}.",
                "evidence": f"lint.json de {video_id}: {finding.get('message') or rule}",
                "proposal": f"Comprobar «{rule}» antes de aprobar, no después de renderizar.",
            }
        )

    review = (artefacts.get("review.json") or {}).get("content") or {}
    for check in review.get("checks") or []:
        if check.get("passed") is not False:
            continue
        name = str(check.get("name") or "revisión")
        found.append(
            {
                "scope": "review",
                "subject": name,
                "claim": f"La comprobación «{name}» falló en {video_id}.",
                "evidence": f"review.json de {video_id}: {check.get('detail') or name}",
                "proposal": f"Tratar «{name}» como bloqueante para las siguientes piezas.",
            }
        )

    target = detail.get("target_duration_seconds")
    measured = detail.get("duration_seconds")
    if target and measured and abs(measured - target) / target > 0.25:
        found.append(
            {
                "scope": "duration",
                "subject": "duración objetivo",
                "claim": (
                    f"{video_id} apuntaba a {target:.0f} s y salió en {measured:.1f} s: "
                    "la estimación del plan se desvía más de un cuarto."
                ),
                "evidence": f"catalog.json: target {target}, medido {measured}",
                "proposal": "Recalibrar la estimación de duración del planificador para este formato.",
            }
        )

    human = review.get("human_review") or {}
    for note in human.get("notes") or []:
        text = str(note).strip()
        if not text:
            continue
        found.append(
            {
                "scope": "humano",
                "subject": "corrección humana",
                "claim": text,
                "evidence": f"review.json de {video_id}, revisión humana",
                "proposal": "Convertir esta corrección en regla de la marca.",
            }
        )

    return found


def propose_from_video(brand_id: str, video_id: str) -> list[dict[str, Any]]:
    """Queue everything the piece taught, minus what was already decided."""
    queued: list[dict[str, Any]] = []
    for observation in observe(brand_id, video_id):
        mark = store.propose_lesson(
            scope=observation["scope"],
            subject=observation["subject"],
            claim=observation["claim"],
            evidence=observation["evidence"],
            proposal=observation["proposal"],
            brand_id=brand_id,
            video_id=video_id,
        )
        if mark is not None:
            queued.append({**observation, "fingerprint": mark})
    return queued


def propose(
    brand_id: str,
    scope: str,
    subject: str,
    claim: str,
    evidence: str,
    proposal: str = "",
    video_id: str | None = None,
) -> str | None:
    """What the agent itself learned, phrased as a proposal.

    This is the «aprendí esto» at the end of a session: the agent states it,
    and it waits for a person exactly like every other proposal.
    """
    return store.propose_lesson(
        scope=scope,
        subject=subject,
        claim=claim,
        evidence=evidence,
        proposal=proposal,
        brand_id=brand_id,
        video_id=video_id,
    )


def pending(brand_id: str | None = None) -> list[dict[str, Any]]:
    return store.pending_lessons(brand_id)


def accept(mark: str, note: str = "") -> bool:
    """«Esto sí» — the lesson becomes configuration the factory applies."""
    queued = {item["fingerprint"]: item for item in store.pending_lessons()}
    lesson = queued.get(mark)
    if lesson is None:
        return False
    brand_id = lesson.get("brand")
    applied = ""
    if brand_id:
        current = rules(brand_id)
        learned = current.setdefault("learned", [])
        learned.append(
            {
                "fingerprint": mark,
                "scope": lesson["scope"],
                "subject": lesson["subject"],
                "rule": lesson.get("proposal") or lesson["claim"],
                "evidence": lesson["evidence"],
                "from_video": lesson.get("video"),
                "accepted_at": store.now(),
                "note": note,
            }
        )
        current["updated_at"] = store.now()
        _write_rules(brand_id, current)
        applied = f"{brand_id}/{RULES_FILE}"
    return store.decide_lesson(mark, accepted=True, note=note, applied_as=applied)


def reject(mark: str, note: str = "") -> bool:
    """«Esto no» — recorded, and never proposed again."""
    return store.decide_lesson(mark, accepted=False, note=note)
