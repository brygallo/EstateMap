#!/usr/bin/env python3
"""Validate every spec under specs/ and exit non-zero on any error.

This is the gate the CI job runs. It answers one question: can the specs still
be trusted as a description of this codebase?

    ./scripts/specs.sh validate
    ./scripts/specs.sh validate --strict     # warnings fail the run too
"""

from __future__ import annotations

import argparse
import sys

from specs_lib import Problem, load_specs, spec_paths, validate


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--strict",
        action="store_true",
        help="treat warnings as errors",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="show only problems",
    )
    args = parser.parse_args()

    paths = spec_paths()
    if not paths:
        print("No files found under specs/. Nothing to validate.")
        return 1

    specs, problems = load_specs()
    problems.extend(validate(specs))

    errors = [p for p in problems if p.level == "error"]
    warnings = [p for p in problems if p.level != "error"]

    if not args.quiet:
        rule_count = sum(1 for _ in specs.rules())
        print(f"Spec files: {len(specs.files)}   Rules: {rule_count}")
        by_status: dict[str, int] = {}
        for _spec, rule in specs.rules():
            by_status[rule.get("status", "?")] = by_status.get(rule.get("status", "?"), 0) + 1
        for status, count in sorted(by_status.items()):
            print(f"  {status:<16} {count}")
        print()

    for problem in warnings:
        print(problem)
    for problem in errors:
        print(problem)

    if errors:
        print(f"\n{len(errors)} error(s). Specs and code disagree.")
        return 1
    if warnings and args.strict:
        print(f"\n{len(warnings)} warning(s) with --strict enabled.")
        return 1
    if not args.quiet:
        print("Specs valid: every implemented rule points at code that exists.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
