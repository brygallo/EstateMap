"""The factory's memory across brands.

Everything here is derived: brand files and catalogues remain the truth, and
`rebuild()` throws the database away and reads them again. What the files cannot
do is answer across brands — which components exist, which ones a brand already
uses, what a doctrine has actually produced — and that is what this store is
for. Nothing in the factory reads a fact from here that it could read from disk.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

FACTORY_ROOT = Path(__file__).resolve().parents[1]
DATABASE = FACTORY_ROOT / "system" / "factory.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS brands (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    domain        TEXT,
    tagline       TEXT,
    doctrine      TEXT,
    repository    TEXT,
    onboarded_at  TEXT,
    updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS components (
    id            TEXT PRIMARY KEY,
    kind          TEXT NOT NULL,
    label         TEXT,
    description   TEXT,
    owner         TEXT,
    generic       INTEGER NOT NULL DEFAULT 0,
    updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS brand_components (
    brand         TEXT NOT NULL,
    component     TEXT NOT NULL,
    PRIMARY KEY (brand, component)
);

CREATE TABLE IF NOT EXISTS videos (
    brand         TEXT NOT NULL,
    id            TEXT NOT NULL,
    title         TEXT,
    state         TEXT,
    audience      TEXT,
    funnel_stage  TEXT,
    pillar        TEXT,
    doctrine      TEXT,
    hook          TEXT,
    duration      REAL,
    updated_at    TEXT,
    PRIMARY KEY (brand, id)
);

CREATE TABLE IF NOT EXISTS video_components (
    brand         TEXT NOT NULL,
    video         TEXT NOT NULL,
    component     TEXT NOT NULL,
    PRIMARY KEY (brand, video, component)
);

CREATE TABLE IF NOT EXISTS results (
    brand         TEXT NOT NULL,
    video         TEXT NOT NULL,
    platform      TEXT NOT NULL,
    views         INTEGER,
    retention     REAL,
    interactions  INTEGER,
    measured_at   TEXT,
    PRIMARY KEY (brand, video, platform)
);

CREATE TABLE IF NOT EXISTS findings (
    brand         TEXT NOT NULL,
    field         TEXT NOT NULL,
    value         TEXT,
    source        TEXT NOT NULL,
    confidence    TEXT NOT NULL,
    recorded_at   TEXT,
    PRIMARY KEY (brand, field)
);

-- A lesson is never learned silently. It is proposed, a person accepts or
-- rejects it, and both answers are kept: an accepted lesson becomes
-- configuration the factory applies, and a rejected one is remembered so the
-- same proposal is never made twice.
CREATE TABLE IF NOT EXISTS lessons (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    brand         TEXT,
    video         TEXT,
    scope         TEXT NOT NULL,
    subject       TEXT NOT NULL,
    claim         TEXT NOT NULL,
    evidence      TEXT NOT NULL,
    proposal      TEXT,
    sample        INTEGER NOT NULL DEFAULT 1,
    confidence    TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'proposed',
    decision_note TEXT,
    decided_at    TEXT,
    applied_as    TEXT,
    fingerprint   TEXT NOT NULL UNIQUE,
    learned_at    TEXT
);

CREATE INDEX IF NOT EXISTS lessons_by_status ON lessons (status);

CREATE INDEX IF NOT EXISTS videos_by_state ON videos (state);
CREATE INDEX IF NOT EXISTS components_by_kind ON components (kind);
"""

# A claim needs this many pieces behind it before the factory repeats it as
# advice. Below that it is an anecdote, and the store says so.
MINIMUM_SAMPLE = 4


def now() -> str:
    return datetime.now().astimezone().isoformat()


@contextmanager
def connect(path: Path | None = None) -> Iterator[sqlite3.Connection]:
    target = path or DATABASE
    target.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(target)
    connection.row_factory = sqlite3.Row
    try:
        connection.executescript(SCHEMA)
        yield connection
        connection.commit()
    finally:
        connection.close()


def rebuild(path: Path | None = None) -> None:
    """Drop the derived state. The next sync reads the files again."""
    target = path or DATABASE
    if target.exists():
        target.unlink()
    with connect(target):
        pass


@dataclass(frozen=True)
class Finding:
    """One fact about a brand, and where it came from.

    `confidence` is the whole point: `hecho` was read from a file, `derivado`
    was inferred from something read, and `propuesto` is a suggestion nobody has
    confirmed. Only `hecho` and `derivado` may be written into a brand without
    a person looking at it.
    """

    field: str
    value: Any
    source: str
    confidence: str = "hecho"

    def as_row(self, brand_id: str) -> tuple:
        stored = self.value if isinstance(self.value, str) else json.dumps(self.value, ensure_ascii=False)
        return (brand_id, self.field, stored, self.source, self.confidence, now())


CONFIDENCE_ORDER = {"hecho": 0, "derivado": 1, "propuesto": 2}


def save_brand(brand: dict[str, Any], path: Path | None = None) -> None:
    with connect(path) as connection:
        connection.execute(
            """
            INSERT INTO brands (id, name, domain, tagline, doctrine, repository, onboarded_at, updated_at)
            VALUES (:id, :name, :domain, :tagline, :doctrine, :repository, :onboarded_at, :updated_at)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, domain = excluded.domain, tagline = excluded.tagline,
                doctrine = excluded.doctrine, repository = excluded.repository,
                updated_at = excluded.updated_at
            """,
            {
                "id": brand["id"],
                "name": brand.get("name") or brand["id"],
                "domain": brand.get("domain"),
                "tagline": brand.get("tagline"),
                "doctrine": brand.get("doctrine"),
                "repository": brand.get("repository"),
                "onboarded_at": brand.get("onboarded_at") or now(),
                "updated_at": now(),
            },
        )


def save_findings(brand_id: str, findings: list[Finding], path: Path | None = None) -> None:
    with connect(path) as connection:
        for finding in findings:
            connection.execute(
                """
                INSERT INTO findings (brand, field, value, source, confidence, recorded_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(brand, field) DO UPDATE SET
                    value = excluded.value, source = excluded.source,
                    confidence = excluded.confidence, recorded_at = excluded.recorded_at
                """,
                finding.as_row(brand_id),
            )


def save_component(
    component_id: str,
    kind: str,
    label: str = "",
    description: str = "",
    owner: str = "",
    generic: bool = False,
    path: Path | None = None,
) -> None:
    with connect(path) as connection:
        connection.execute(
            """
            INSERT INTO components (id, kind, label, description, owner, generic, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                kind = excluded.kind, label = excluded.label,
                description = excluded.description, owner = excluded.owner,
                generic = excluded.generic, updated_at = excluded.updated_at
            """,
            (component_id, kind, label, description, owner, int(generic), now()),
        )


def link_component(brand_id: str, component_id: str, path: Path | None = None) -> None:
    with connect(path) as connection:
        connection.execute(
            "INSERT OR IGNORE INTO brand_components (brand, component) VALUES (?, ?)",
            (brand_id, component_id),
        )


def save_video(brand_id: str, video: dict[str, Any], path: Path | None = None) -> None:
    with connect(path) as connection:
        connection.execute(
            """
            INSERT INTO videos (brand, id, title, state, audience, funnel_stage, pillar,
                                doctrine, hook, duration, updated_at)
            VALUES (:brand, :id, :title, :state, :audience, :funnel_stage, :pillar,
                    :doctrine, :hook, :duration, :updated_at)
            ON CONFLICT(brand, id) DO UPDATE SET
                title = excluded.title, state = excluded.state, audience = excluded.audience,
                funnel_stage = excluded.funnel_stage, pillar = excluded.pillar,
                doctrine = excluded.doctrine, hook = excluded.hook,
                duration = excluded.duration, updated_at = excluded.updated_at
            """,
            {
                "brand": brand_id,
                "id": video.get("id"),
                "title": video.get("title"),
                "state": video.get("state"),
                "audience": video.get("audience"),
                "funnel_stage": video.get("funnel_stage"),
                "pillar": video.get("pillar"),
                "doctrine": video.get("doctrine"),
                "hook": video.get("hook"),
                "duration": video.get("duration_seconds"),
                "updated_at": now(),
            },
        )


def fingerprint(brand_id: str | None, scope: str, subject: str, claim: str) -> str:
    """Identity of a lesson, so the same one is never proposed twice."""
    raw = "|".join([brand_id or "*", scope, subject, " ".join(claim.lower().split())])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def propose_lesson(
    scope: str,
    subject: str,
    claim: str,
    evidence: str,
    proposal: str = "",
    sample: int = 1,
    brand_id: str | None = None,
    video_id: str | None = None,
    path: Path | None = None,
) -> str | None:
    """Put a lesson in front of a person. Returns its fingerprint, or None if
    it was already proposed, accepted or rejected before."""
    mark = fingerprint(brand_id, scope, subject, claim)
    confidence = "sostenida" if sample >= MINIMUM_SAMPLE else "anecdótica"
    with connect(path) as connection:
        seen = connection.execute(
            "SELECT status FROM lessons WHERE fingerprint = ?", (mark,)
        ).fetchone()
        if seen is not None:
            return None
        connection.execute(
            """
            INSERT INTO lessons (brand, video, scope, subject, claim, evidence, proposal,
                                 sample, confidence, status, fingerprint, learned_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed', ?, ?)
            """,
            (brand_id, video_id, scope, subject, claim, evidence, proposal,
             sample, confidence, mark, now()),
        )
    return mark


def decide_lesson(
    mark: str,
    accepted: bool,
    note: str = "",
    applied_as: str = "",
    path: Path | None = None,
) -> bool:
    """Record the person's answer. A rejection is as valuable as an approval:
    it is what stops the factory proposing the same thing again."""
    with connect(path) as connection:
        cursor = connection.execute(
            """
            UPDATE lessons
               SET status = ?, decision_note = ?, applied_as = ?, decided_at = ?
             WHERE fingerprint = ? AND status = 'proposed'
            """,
            ("accepted" if accepted else "rejected", note, applied_as, now(), mark),
        )
        return cursor.rowcount > 0


def pending_lessons(brand_id: str | None = None, path: Path | None = None) -> list[dict[str, Any]]:
    query = "SELECT * FROM lessons WHERE status = 'proposed'"
    arguments: list[Any] = []
    if brand_id:
        query += " AND (brand = ? OR brand IS NULL)"
        arguments.append(brand_id)
    query += " ORDER BY learned_at DESC"
    with connect(path) as connection:
        return [dict(row) for row in connection.execute(query, arguments)]


def brands(path: Path | None = None) -> list[dict[str, Any]]:
    with connect(path) as connection:
        return [dict(row) for row in connection.execute("SELECT * FROM brands ORDER BY id")]


def components(kind: str | None = None, brand_id: str | None = None, path: Path | None = None) -> list[dict[str, Any]]:
    query = "SELECT c.* FROM components c"
    clauses, arguments = [], []
    if brand_id:
        query += " JOIN brand_components b ON b.component = c.id"
        clauses.append("b.brand = ?")
        arguments.append(brand_id)
    if kind:
        clauses.append("c.kind = ?")
        arguments.append(kind)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY c.kind, c.id"
    with connect(path) as connection:
        return [dict(row) for row in connection.execute(query, arguments)]


def findings(brand_id: str, path: Path | None = None) -> list[dict[str, Any]]:
    with connect(path) as connection:
        rows = connection.execute(
            "SELECT * FROM findings WHERE brand = ? ORDER BY field", (brand_id,)
        )
        return [dict(row) for row in rows]


def lessons(
    brand_id: str | None = None,
    status: str | None = None,
    path: Path | None = None,
) -> list[dict[str, Any]]:
    query = "SELECT * FROM lessons"
    clauses, arguments = [], []
    if brand_id:
        clauses.append("(brand = ? OR brand IS NULL)")
        arguments.append(brand_id)
    if status:
        clauses.append("status = ?")
        arguments.append(status)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY learned_at DESC"
    with connect(path) as connection:
        return [dict(row) for row in connection.execute(query, arguments)]
