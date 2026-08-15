#!/usr/bin/env python3
"""Class-based editorial formats, metrics and experiment decisions."""

from __future__ import annotations

import csv
import fcntl
import functools
from pathlib import Path
from typing import Any

import catalog as catalog_store


class EditorialFormat:
    """Choose the job a video runtime must do."""

    @classmethod
    def classify(cls, plan: dict[str, Any], target: int) -> str:
        if plan.get("pillar") == "Educación inmobiliaria" and target > 45:
            return "education"
        if target <= 30:
            return "demonstration"
        if target <= 45:
            return "tutorial"
        return "story"


class ResultsTable:
    """Validate the small, platform-exportable results contract."""

    FIELDS = [
        "platform", "published_at", "window_hours", "views", "views_3s",
        "completions", "saves", "shares", "profile_visits", "link_clicks",
        "conversions", "primary_metric", "decision", "learning",
    ]
    NUMERIC_FIELDS = {
        "window_hours", "views", "views_3s", "completions", "saves", "shares",
        "profile_visits", "link_clicks", "conversions",
    }
    DECISIONS = {"scale", "iterate", "reuse", "retire", "inconclusive"}

    @classmethod
    def read(cls, path: Path) -> list[dict[str, str]]:
        with path.open(encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            unknown = set(reader.fieldnames or []) - set(cls.FIELDS)
            missing = {"platform", "published_at", "primary_metric"} - set(reader.fieldnames or [])
            if unknown:
                raise RuntimeError(f"Unknown results columns: {', '.join(sorted(unknown))}")
            if missing:
                raise RuntimeError(f"Missing results columns: {', '.join(sorted(missing))}")
            rows = list(reader)
        if not rows:
            raise RuntimeError("Results CSV has no data rows")
        for number, row in enumerate(rows, 2):
            metric = (row.get("primary_metric") or "").strip()
            if metric not in cls.NUMERIC_FIELDS:
                raise RuntimeError(f"Row {number} names an invalid primary_metric: {metric}")
            for field in cls.NUMERIC_FIELDS:
                value = (row.get(field) or "").strip()
                if value:
                    try:
                        if float(value) < 0:
                            raise ValueError
                    except ValueError as error:
                        raise RuntimeError(f"Row {number} has an invalid {field}: {value}") from error
            decision = (row.get("decision") or "").strip()
            if decision and decision not in cls.DECISIONS:
                raise RuntimeError(f"Row {number} has an invalid decision: {decision}")
        return rows

    @classmethod
    def total(cls, rows: list[dict[str, str]], metric: str) -> float:
        return sum(float(row.get(metric) or 0) for row in rows)


class PublicationImport:
    """Validate a complete sync payload before any state changes."""

    @classmethod
    def read(cls, path: Path) -> list[dict[str, Any]]:
        data = catalog_store.load_json(path)
        if not isinstance(data, list) or not data:
            raise RuntimeError("Publication sync file must be a non-empty JSON list")
        for index, record in enumerate(data, 1):
            if not isinstance(record, dict):
                raise RuntimeError(f"Publication record {index} must be an object")
            missing = [key for key in ("video", "platform", "published_at") if not str(record.get(key, "")).strip()]
            if missing:
                raise RuntimeError(f"Publication record {index} is missing: {', '.join(missing)}")
        return data


class ExperimentDecision:
    """Choose a winner deterministically only after every arm has enough views."""

    @classmethod
    def build(cls, entries: list[dict[str, Any]], metric: str, minimum_views: int) -> dict[str, Any]:
        ranked = sorted(entries, key=lambda entry: entry["value"], reverse=True)
        enough = len(ranked) >= 2 and all(entry["views"] >= minimum_views for entry in ranked)
        return {
            "primary_metric": metric,
            "minimum_views_per_variant": minimum_views,
            "status": "winner" if enough else "inconclusive",
            "winner": ranked[0]["video"] if enough else None,
            "ranking": ranked,
            "next_action": "reuse the winning variable" if enough else "collect more observations",
        }


class StatePolicy:
    """Protect frozen artifacts before a command touches the filesystem."""

    @classmethod
    def require_mutable(cls, item: dict[str, Any], action: str) -> None:
        if item.get("state") in catalog_store.IMMUTABLE_STATES:
            raise RuntimeError(f"A {item['state']} video is immutable; create a variant to {action}")


class ApprovalPolicy:
    """Allow corrected local drafts to invalidate and replace old approval."""

    APPROVABLE_STATES = frozenset({"planned", "approved", "rendered", "reviewed", "signed"})

    @classmethod
    def require_approvable(cls, state: str) -> None:
        if state not in cls.APPROVABLE_STATES:
            raise RuntimeError(
                f"A {state} video cannot be re-approved; create a variant instead"
            )


class PlanCatalogMetadata:
    """Keep catalogue discovery fields aligned with the approved plan."""

    @classmethod
    def build(cls, plan: dict[str, Any], duration: int) -> dict[str, Any]:
        return {
            "title": plan["title"],
            "audience": plan["audience"],
            "funnel_stage": plan["funnel_stage"],
            "pillar": plan["pillar"],
            "series": plan["series"],
            "concept": plan["concept"],
            "hook": plan["scenes"][0]["voice"],
            "cta": plan["cta"],
            "editorial_format": EditorialFormat.classify(plan, duration),
        }


class PlanConsistencyAudit:
    """Catch prose that denies a simulation the structured plan already uses."""

    ABSENCE_PHRASES = ("no existe", "todavía no existe", "mientras no exista", "no está registrada")

    @classmethod
    def findings(cls, plan: dict[str, Any], simulations: set[str]) -> list[dict[str, str]]:
        findings = []
        notes = " ".join(str(note) for note in plan.get("verification_notes") or []).lower()
        for scene in plan.get("scenes") or []:
            asset = scene.get("asset")
            if asset in simulations and asset and asset.lower() in notes:
                nearby = notes[notes.find(asset.lower()):]
                if any(phrase in nearby[:240] for phrase in cls.ABSENCE_PHRASES):
                    findings.append({
                        "level": "error",
                        "rule": "asset_note_consistency",
                        "detail": f"The plan uses {asset}, but its verification notes say it is unavailable",
                    })
        return findings


class ForbiddenClaimPolicy:
    """Distinguish a prohibited promise from an explicit denial of one."""

    NEGATIONS = ("no ", "nunca ", "tampoco ", "ni ", "sin afirmar ", "sin prometer ")

    @classmethod
    def is_explicitly_negated(cls, text: str, term: str) -> bool:
        position = text.find(term)
        if position < 0:
            return False
        sentence_start = max(text.rfind(mark, 0, position) for mark in (".", "!", "?", ";")) + 1
        prefix = text[sentence_start:position].strip()
        words = prefix.split()
        nearby = " ".join(words[-8:]) + " "
        return any(negation in nearby for negation in cls.NEGATIONS)


class RenderLock:
    """Give one video a single render owner until the process releases it."""

    def __init__(self, directory: Path) -> None:
        self.path = directory / ".render.lock"
        self.handle: Any = None

    def __enter__(self) -> "RenderLock":
        self.handle = self.path.open("a+", encoding="utf-8")
        try:
            fcntl.flock(self.handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            self.handle.close()
            self.handle = None
            raise RuntimeError(f"Another render is already running for {self.path.parent.name}") from error
        return self

    def __exit__(self, *_: Any) -> None:
        if self.handle is not None:
            fcntl.flock(self.handle.fileno(), fcntl.LOCK_UN)
            self.handle.close()
            self.handle = None

    @classmethod
    def serialized(cls, command: Any) -> Any:
        @functools.wraps(command)
        def guarded(args: Any) -> Any:
            directory, _, _ = catalog_store.find(args.video)
            with cls(directory):
                return command(args)
        return guarded
