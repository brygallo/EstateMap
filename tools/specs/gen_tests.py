#!/usr/bin/env python3
"""Turn the `cases:` blocks in specs/ into runnable tests.

Two kinds of output, both regenerated from scratch:

* `backend/real_estate/tests/generated/` — pytest. Permission rules that declare
  an endpoint and a role become real API calls against the real viewset, so a
  loosened permission fails the suite. Rules that are still proposals become
  skipped tests carrying the reason, which keeps the intent visible without
  turning the suite red for work nobody has started.
* `tests/generated/` — Playwright. Rules with a route and a `data-testid`
  become a visibility assertion in the browser.

A case says two separate things and they must not be confused: `given` is the
state of the world before the call, and `body` is the call itself. The state is
handed to `SpecWorld.apply`, which builds it before the request goes out; the
body is sent as the request payload. They used to share one field, which meant a
`given` on a GET was silently dropped and the case tested nothing.

Every generated test carries a `SPEC:<id>` marker. That marker is what
`validate.py` looks for when it checks that a rule is actually covered, so
generation and validation close the loop on each other.

    ./scripts/specs.sh tests
    ./scripts/specs.sh tests --check   # fails if generated output is stale
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

from specs_lib import (
    GENERATED_BANNER,
    GENERATED_E2E_DIR,
    GENERATED_PYTEST_DIR,
    LIVE_STATUSES,
    REPO_ROOT,
    SpecFile,
    SpecSet,
    load_specs,
    slug_to_identifier,
    write_if_changed,
)

ALLOWED = "allowed"
DENIED = "denied"


def py_repr(value: Any) -> str:
    return repr(value)


def test_name(rule_id: str, case_name: str, taken: set[str]) -> str:
    base = f"test_{slug_to_identifier(rule_id)}_{slug_to_identifier(case_name)}"
    base = re.sub(r"_+", "_", base)[:100]
    name = base
    counter = 2
    while name in taken:
        name = f"{base}_{counter}"
        counter += 1
    taken.add(name)
    return name


def api_cases(rule: dict[str, Any]) -> list[dict[str, Any]]:
    """Cases this generator knows how to execute against the API."""

    backend = rule.get("backend") or {}
    if not backend.get("endpoint"):
        return []
    out = []
    for case in rule.get("cases") or []:
        # `expected` is free-form by design: it holds a literal value for
        # calculation rules, and a list or a dict where that reads better. Only
        # the string forms below are executable, and an `in` test against a set
        # would raise on the unhashable ones.
        expected = case.get("expected")
        if isinstance(expected, str) and expected in {ALLOWED, DENIED} and case.get("role"):
            out.append(case)
    return out


def render_pytest(spec: SpecFile) -> str | None:
    rules = [r for r in spec.rules if (r.get("tests") or {}).get("api") and api_cases(r)]
    if not rules:
        return None

    taken: set[str] = set()
    lines: list[str] = [
        '"""' ,
        f"{GENERATED_BANNER}",
        "",
        f"Generated from {spec.rel} by tools/specs/gen_tests.py.",
        "To change an assertion, change the case in the YAML and regenerate.",
        '"""',
        "",
        "import pytest",
        "",
        "from real_estate.tests.spec_support import assert_outcome  # noqa: F401",
        "",
        "",
        "pytestmark = [pytest.mark.django_db, pytest.mark.api]",
        "",
    ]

    for rule in rules:
        backend = rule["backend"]
        denied_status = backend.get("denied_http_status")
        rule_id = rule["id"]
        skip_reason = None
        if rule["status"] not in LIVE_STATUSES:
            skip_reason = (
                f"{rule_id} is '{rule['status']}': no code implements it yet"
            )

        lines.append("")
        lines.append(f"# --- {rule_id}: {rule['name']} ---")
        for case in api_cases(rule):
            name = test_name(rule_id, case["name"], taken)
            expected = case["expected"]
            status_override = case.get("http_status")
            # A rule declares one endpoint, but a statement like "it resolves by
            # its id and by its short code" is about two. The case may say which
            # of them it is talking about.
            method, _, path = (case.get("endpoint") or backend["endpoint"]).partition(" ")
            lines.append("")
            if skip_reason:
                lines.append(f"@pytest.mark.skip(reason={py_repr(skip_reason)})")
            lines.append(f"def {name}(spec_request):")
            lines.append('    """')
            lines.append(f"    SPEC:{rule_id} — {rule['name']}")
            lines.append(f"    Case: {case['name']}")
            lines.append('    """')
            lines.append("    response = spec_request(")
            lines.append(f"        method={py_repr(method)},")
            lines.append(f"        path={py_repr(path)},")
            lines.append(f"        role={py_repr(case['role'])},")
            # `given` is the world before the call; `body` is the call. Passing
            # the former as the latter was the bug this split exists to kill.
            given = case.get("given")
            body = case.get("body")
            lines.append(f"        given={py_repr(given) if given else 'None'},")
            lines.append(f"        body={py_repr(body) if body else 'None'},")
            lines.append("    )")
            lines.append("    assert_outcome(")
            lines.append("        response,")
            lines.append(f"        expected={py_repr(expected)},")
            lines.append(f"        denied_status={py_repr(status_override or denied_status)},")
            lines.append(f"        rule_id={py_repr(rule_id)},")
            lines.append(f"        case_name={py_repr(case['name'])},")
            lines.append(f"        expected_status={py_repr(case.get('expected_http_status'))},")
            lines.append("    )")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def render_integrity_test() -> str:
    return f'''"""
{GENERATED_BANNER}

Runs the spec validator inside the normal suite. Without this, a change that
breaks the link between specs and code would only surface in CI; here it fails
in the same `pytest` everyone already runs.
"""

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[4]
TOOLS = REPO_ROOT / "tools" / "specs"


@pytest.mark.unit
def test_specs_still_match_the_code():
    """Every implemented rule points at code that exists in the tree."""
    pytest.importorskip(
        "yaml",
        reason="PyYAML is not in the backend image; the real gate lives in CI (.github/workflows/specs.yml)",
    )
    sys.path.insert(0, str(TOOLS))
    try:
        import specs_lib
    finally:
        sys.path.pop(0)

    specs, problems = specs_lib.load_specs()
    assert not problems, "\\n".join(str(p) for p in problems)

    errors = [p for p in specs_lib.validate(specs) if p.level == "error"]
    assert not errors, "Specs and code disagree:\\n" + "\\n".join(
        str(e) for e in errors
    )
'''


def ts_string(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def render_playwright(spec: SpecFile) -> str | None:
    rules = [r for r in spec.rules if (r.get("tests") or {}).get("playwright")]
    if not rules:
        return None

    lines: list[str] = [
        f"// {GENERATED_BANNER}",
        f"// Generated from {spec.rel} by tools/specs/gen_tests.py.",
        "",
        "import { expect, test } from '@playwright/test';",
        "",
        f"test.describe({ts_string(spec.data.get('title') or spec.domain)}, () => {{",
    ]

    for rule in rules:
        rule_id = rule["id"]
        frontend = rule.get("frontend") or {}
        routes = frontend.get("routes") or []
        test_id = frontend.get("test_id")
        unbuilt = rule["status"] not in LIVE_STATUSES

        lines.append("")
        lines.append(f"  // SPEC:{rule_id} - {rule['name']}")

        if unbuilt:
            reason = f"{rule_id} is '{rule['status']}': there is no UI to test yet"
            title = f"SPEC:{rule_id} {rule['name']}"
            lines.append(f"  test.skip({ts_string(title)}, async () => {{")
            lines.append(f"    // {reason}")
            lines.append("  });")
            continue

        if not routes:
            lines.append(
                "  // No 'frontend.routes' in the YAML: nothing to navigate to. "
                "Add the route or drop tests.playwright."
            )
            continue

        for index, route in enumerate(routes):
            suffix = f" [{route}]" if len(routes) > 1 else ""
            title = f"SPEC:{rule_id} {rule['name']}{suffix}"
            lines.append(f"  test({ts_string(title)}, async ({{ page }}) => {{")
            lines.append(f"    await page.goto({ts_string(route)});")
            if test_id:
                visible = frontend.get("visible_when_allowed", True)
                locator = f"page.getByTestId({ts_string(test_id)})"
                if visible:
                    lines.append(f"    await expect({locator}).toBeVisible();")
                else:
                    lines.append(f"    await expect({locator}).toHaveCount(0);")
            else:
                lines.append("    // No 'frontend.test_id': only assert the route responds.")
                lines.append("    await expect(page.locator('body')).toBeVisible();")
            if frontend.get("message"):
                lines.append(
                    f"    await expect(page.getByText({ts_string(frontend['message'])})).toBeVisible();"
                )
            lines.append("  });")

    lines.append("});")
    return "\n".join(lines).rstrip() + "\n"


def clean_dir(directory: Path, keep: set[str], check: bool) -> list[Path]:
    removed: list[Path] = []
    if not directory.exists():
        return removed
    for path in directory.iterdir():
        if path.name in keep or path.name in {"__pycache__"}:
            continue
        if path.is_dir():
            continue
        if check:
            removed.append(path)
        else:
            path.unlink()
            removed.append(path)
    return removed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="do not write; fail if anything would change")
    args = parser.parse_args()

    specs, problems = load_specs()
    for problem in problems:
        print(problem)
    if problems:
        return 1

    outputs: dict[Path, str] = {
        GENERATED_PYTEST_DIR / "__init__.py": "",
        GENERATED_PYTEST_DIR / "test_spec_integrity.py": render_integrity_test(),
    }
    for spec in specs.files:
        pytest_src = render_pytest(spec)
        if pytest_src:
            outputs[GENERATED_PYTEST_DIR / f"test_spec_{slug_to_identifier(spec.domain)}.py"] = pytest_src
        e2e_src = render_playwright(spec)
        if e2e_src:
            outputs[GENERATED_E2E_DIR / f"{spec.domain}.spec.ts"] = e2e_src

    changed: list[Path] = []
    for path, content in outputs.items():
        if args.check:
            current = path.read_text(encoding="utf-8") if path.exists() else None
            if current != content:
                changed.append(path)
        elif write_if_changed(path, content):
            changed.append(path)

    changed.extend(
        clean_dir(GENERATED_PYTEST_DIR, {p.name for p in outputs if p.parent == GENERATED_PYTEST_DIR}, args.check)
    )
    changed.extend(
        clean_dir(GENERATED_E2E_DIR, {p.name for p in outputs if p.parent == GENERATED_E2E_DIR} | {"README.md"}, args.check)
    )

    if args.check and changed:
        print("Generated tests are out of date:")
        for path in changed:
            print(f"  - {path.relative_to(REPO_ROOT)}")
        print("Run ./scripts/specs.sh tests and include the result in the commit.")
        return 1

    if changed:
        for path in changed:
            print(f"wrote {path.relative_to(REPO_ROOT)}")
    else:
        print("Generated tests were already up to date.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
