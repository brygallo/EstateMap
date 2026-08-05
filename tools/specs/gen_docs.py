#!/usr/bin/env python3
"""Render specs/ into human-readable Markdown under docs/generated/.

The generated pages are never edited by hand: they are a view over the YAML, so
the rule and its documentation cannot drift apart. Prose that a human writes and
maintains belongs in docs/business-rules/ and docs/technical/ instead.

    ./scripts/specs.sh docs
    ./scripts/specs.sh docs --check   # fails if the Markdown is out of date
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

from specs_lib import (
    GENERATED_BANNER,
    GENERATED_DOCS_DIR,
    REPO_ROOT,
    SpecFile,
    SpecSet,
    collect_spec_markers,
    load_specs,
    write_if_changed,
)

STATUS_LABEL = {
    "implemented": "✅ Implementada",
    "partial": "🟡 Parcial",
    "proposed": "📝 Propuesta (sin código)",
    "not_implemented": "⛔ No implementada",
    "deprecated": "🗑️ Obsoleta",
}


def fmt_status(status: str) -> str:
    return STATUS_LABEL.get(status, status)


def fmt_value(value: Any) -> str:
    if isinstance(value, bool):
        return "sí" if value else "no"
    if value is None:
        return "—"
    if isinstance(value, (list, tuple)):
        return ", ".join(fmt_value(v) for v in value)
    if isinstance(value, dict):
        return ", ".join(f"`{k}`={fmt_value(v)}" for k, v in value.items())
    return str(value)


def evidence_lines(rule: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for item in rule.get("evidence", []) or []:
        ref = item["file"]
        if item.get("lines"):
            ref = f"{ref}:{item['lines']}"
        note = f" — {item['note']}" if item.get("note") else ""
        symbol = f" (`{item['symbol']}`)" if item.get("symbol") else ""
        out.append(f"- `{ref}`{symbol}{note}")
    return out


def render_rule(rule: dict[str, Any], markers: dict[str, set[str]]) -> str:
    rule_id = rule["id"]
    parts: list[str] = [f"### {rule_id} — {rule['name']}", ""]
    parts.append(f"**Estado:** {fmt_status(rule['status'])}")
    parts.append("")
    parts.append(rule["summary"])
    parts.append("")

    if rule.get("rationale"):
        parts.append(f"> **Por qué:** {rule['rationale']}")
        parts.append("")

    if rule.get("conditions"):
        parts.append("**Se aplica cuando:**")
        parts.append("")
        for key, value in rule["conditions"].items():
            parts.append(f"- `{key}`: {fmt_value(value)}")
        parts.append("")

    perms = (rule.get("permissions") or {}).get("required") or []
    if perms:
        parts.append("**Permisos exigidos:** " + ", ".join(f"`{p}`" for p in perms))
        parts.append("")

    backend = rule.get("backend") or {}
    if backend:
        parts.append("**Backend**")
        parts.append("")
        if backend.get("endpoint"):
            parts.append(f"- Endpoint: `{backend['endpoint']}`")
        if "enforce" in backend:
            parts.append(f"- ¿Lo aplica el servidor?: {fmt_value(backend['enforce'])}")
        if backend.get("denied_http_status"):
            parts.append(f"- Al denegar: HTTP `{backend['denied_http_status']}`")
        if backend.get("denied_error_code"):
            parts.append(f"- Código de error: `{backend['denied_error_code']}`")
        if backend.get("throttle_scope"):
            parts.append(f"- Throttle: `{backend['throttle_scope']}`")
        if backend.get("note"):
            parts.append(f"- Nota: {backend['note']}")
        parts.append("")

    frontend = rule.get("frontend") or {}
    if frontend:
        parts.append("**Frontend**")
        parts.append("")
        for route in frontend.get("routes", []) or []:
            parts.append(f"- Ruta: `{route}`")
        if "visible_when_allowed" in frontend:
            parts.append(f"- Visible si se permite: {fmt_value(frontend['visible_when_allowed'])}")
        if "hidden_when_denied" in frontend:
            parts.append(f"- Oculto si se deniega: {fmt_value(frontend['hidden_when_denied'])}")
        if frontend.get("message"):
            parts.append(f"- Mensaje: «{frontend['message']}»")
        if frontend.get("upgrade_message"):
            parts.append(f"- Mensaje de upgrade: «{frontend['upgrade_message']}»")
        if frontend.get("test_id"):
            parts.append(f"- `data-testid`: `{frontend['test_id']}`")
        if frontend.get("note"):
            parts.append(f"- Nota: {frontend['note']}")
        parts.append("")

    evidence = evidence_lines(rule)
    if evidence:
        parts.append("**Evidencia en el código** (verificada por `tools/specs/validate.py`)")
        parts.append("")
        parts.extend(evidence)
        parts.append("")
    elif rule["status"] in {"proposed", "not_implemented"}:
        parts.append("**Evidencia en el código:** ninguna, y es lo esperado: no hay código que la implemente.")
        parts.append("")

    cases = rule.get("cases") or []
    if cases:
        parts.append("**Casos**")
        parts.append("")
        # Two columns, not one: the state a case starts from and the request it
        # then makes are different things, and reading them merged is how they
        # got confused in the first place.
        parts.append("| Caso | Rol | Estado previo | Cuerpo | Esperado |")
        parts.append("| --- | --- | --- | --- | --- |")
        for case in cases:
            given = fmt_value(case.get("given")) if case.get("given") else "—"
            body = fmt_value(case.get("body")) if case.get("body") else "—"
            expected = fmt_value(case.get("expected"))
            if case.get("http_status"):
                expected += f" (HTTP {case['http_status']})"
            if case.get("error_code"):
                expected += f" `{case['error_code']}`"
            name = case["name"]
            if case.get("endpoint"):
                name += f" — `{case['endpoint']}`"
            parts.append(
                f"| {name} | {case.get('role', '—')} | {given} | {body} | {expected} |"
            )
        parts.append("")

    wanted = rule.get("tests") or {}
    if any(wanted.values()):
        layers = ", ".join(sorted(k for k, v in wanted.items() if v))
        covering = sorted(markers.get(rule_id, []))
        parts.append(f"**Cobertura exigida:** {layers}")
        parts.append("")
        if covering:
            for path in covering:
                parts.append(f"- `{path}`")
        else:
            parts.append("- ⚠️ Sin ningún test que lleve el marcador `SPEC:" + rule_id + "`")
        parts.append("")

    if rule.get("see_also"):
        parts.append("**Ver también:** " + ", ".join(f"`{s}`" for s in rule["see_also"]))
        parts.append("")

    return "\n".join(parts)


def render_spec(spec: SpecFile, markers: dict[str, set[str]]) -> str:
    data = spec.data
    title = data.get("title") or spec.domain.replace("-", " ").title()
    parts = [
        f"<!-- {GENERATED_BANNER} -->",
        f"<!-- Fuente: {spec.rel} -->",
        "",
        f"# {title}",
        "",
        f"> Generado desde `{spec.rel}`. **No edites este archivo**: edita el YAML y ejecuta "
        "`./scripts/specs.sh docs`.",
        "",
    ]
    if data.get("status"):
        parts.append(f"**Estado del dominio:** {fmt_status(data['status'])}")
        parts.append("")
    if data.get("summary"):
        parts.append(data["summary"])
        parts.append("")
    if data.get("owners"):
        parts.append("**Responsables:** " + ", ".join(data["owners"]))
        parts.append("")
    if data.get("see_also"):
        parts.append("**Ver también:** " + ", ".join(f"`{s}`" for s in data["see_also"]))
        parts.append("")

    catalog = spec.catalog
    if catalog.get("permissions"):
        parts.append("## Permisos declarados")
        parts.append("")
        parts.append("| Slug | Descripción | Roles |")
        parts.append("| --- | --- | --- |")
        for entry in catalog["permissions"]:
            roles = ", ".join(entry.get("roles", [])) or "—"
            parts.append(f"| `{entry['slug']}` | {entry['description']} | {roles} |")
        parts.append("")
    if catalog.get("error_codes"):
        parts.append("## Códigos de error declarados")
        parts.append("")
        parts.append("| Código | HTTP | Descripción |")
        parts.append("| --- | --- | --- |")
        for entry in catalog["error_codes"]:
            parts.append(f"| `{entry['code']}` | {entry['http_status']} | {entry['description']} |")
        parts.append("")

    parts.append("## Reglas")
    parts.append("")
    parts.append("| Id | Regla | Estado |")
    parts.append("| --- | --- | --- |")
    for rule in spec.rules:
        parts.append(f"| [`{rule['id']}`](#{rule['id'].lower()}--{slug_anchor(rule['name'])}) | {rule['name']} | {fmt_status(rule['status'])} |")
    parts.append("")

    for rule in spec.rules:
        parts.append(render_rule(rule, markers))

    return "\n".join(parts).rstrip() + "\n"


def slug_anchor(name: str) -> str:
    import re

    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug, flags=re.UNICODE)
    return re.sub(r"[\s]+", "-", slug)


def render_index(specs: SpecSet, markers: dict[str, set[str]]) -> str:
    total = sum(1 for _ in specs.rules())
    by_status: dict[str, int] = {}
    for _spec, rule in specs.rules():
        by_status[rule["status"]] = by_status.get(rule["status"], 0) + 1

    parts = [
        f"<!-- {GENERATED_BANNER} -->",
        "",
        "# Reglas de negocio (generado)",
        "",
        "Vista legible de `specs/`. Cada regla marcada como implementada apunta a las líneas "
        "de código que la aplican, y `tools/specs/validate.py` comprueba que ese código siga "
        "existiendo, así que esta página no puede quedarse desfasada en silencio.",
        "",
        f"**Total de reglas: {total}**",
        "",
        "| Estado | Reglas |",
        "| --- | --- |",
    ]
    for status, count in sorted(by_status.items()):
        parts.append(f"| {fmt_status(status)} | {count} |")
    parts.append("")
    parts.append("| Dominio | Archivo | Reglas | Documento |")
    parts.append("| --- | --- | --- | --- |")
    for spec in sorted(specs.files, key=lambda s: s.rel):
        parts.append(
            f"| {spec.domain} | `{spec.rel}` | {len(spec.rules)} | [{spec.domain}.md](./{spec.domain}.md) |"
        )
    parts.append("")

    uncovered = []
    for _spec, rule in specs.rules():
        if rule["status"] in {"implemented", "partial"} and any((rule.get("tests") or {}).values()):
            if rule["id"] not in markers:
                uncovered.append(rule["id"])
    if uncovered:
        parts.append("## Reglas sin cobertura")
        parts.append("")
        parts.append("Piden test pero ningún archivo lleva su marcador `SPEC:<id>`:")
        parts.append("")
        for rule_id in sorted(uncovered):
            parts.append(f"- `{rule_id}`")
        parts.append("")

    return "\n".join(parts).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="do not write; fail if anything would change")
    args = parser.parse_args()

    specs, problems = load_specs()
    for problem in problems:
        print(problem)
    if problems:
        return 1

    markers = collect_spec_markers()
    outputs: dict[Path, str] = {GENERATED_DOCS_DIR / "README.md": render_index(specs, markers)}
    for spec in specs.files:
        outputs[GENERATED_DOCS_DIR / f"{spec.domain}.md"] = render_spec(spec, markers)

    changed: list[Path] = []
    for path, content in outputs.items():
        if args.check:
            current = path.read_text(encoding="utf-8") if path.exists() else None
            if current != content:
                changed.append(path)
        elif write_if_changed(path, content):
            changed.append(path)

    # Remove pages whose spec file is gone, so a deleted domain does not leave
    # a stale document behind.
    if GENERATED_DOCS_DIR.exists():
        expected = {p.name for p in outputs}
        for path in GENERATED_DOCS_DIR.glob("*.md"):
            if path.name not in expected:
                if args.check:
                    changed.append(path)
                else:
                    path.unlink()
                    changed.append(path)

    if args.check and changed:
        print("Generated documentation is out of date:")
        for path in changed:
            print(f"  - {path.relative_to(REPO_ROOT)}")
        print("Run ./scripts/specs.sh docs and include the result in the commit.")
        return 1

    if changed:
        for path in changed:
            print(f"wrote {path.relative_to(REPO_ROOT)}")
    else:
        print("Generated documentation was already up to date.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
