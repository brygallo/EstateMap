#!/usr/bin/env python3
"""Re-anchor the `lines:` of every evidence entry onto its `symbol:`.

Line numbers rot. A refactor two files away shifts everything below it, and a
citation that was right when written silently starts pointing at unrelated code.
The `symbol` is the durable half of the anchor, so this tool treats it as the
source of truth and recomputes the range around it.

It only touches entries where the symbol exists in the file but falls outside the
cited range. It never invents a range for an entry that has none, and it never
touches an entry whose symbol has vanished — that one is a real finding and must
be resolved by a human, because it usually means the rule is no longer enforced.

Editing is line-oriented rather than a YAML round-trip on purpose: dumping the
parsed document back out would strip every comment and reflow the block scalars
that hold the Spanish prose.

    ./scripts/specs.sh fix-ranges           # apply
    ./scripts/specs.sh fix-ranges --dry-run # report only
"""

from __future__ import annotations

import argparse
import re
import sys

from specs_lib import REPO_ROOT, spec_paths

# Evidence entries are flat two-space-indented mappings, so a small line scanner
# is enough and keeps the rest of the file byte-identical.
FILE_RE = re.compile(r"^(\s*)-?\s*file:\s*(.+?)\s*$")
LINES_RE = re.compile(r"^(\s*)lines:\s*[\"']?([0-9]+(?:-[0-9]+)?)[\"']?\s*$")
SYMBOL_RE = re.compile(r"^(\s*)symbol:\s*(.+?)\s*$")

# How much context to keep around the symbol when rebuilding a range, so the
# citation still reads as a block of code rather than a bare line.
CONTEXT_BEFORE = 0
CONTEXT_AFTER = 2


def unquote(value: str) -> str:
    """Undo YAML's scalar quoting for the flat one-line values used here.

    Escapes matter: a symbol like `bump_props_version("catalog")` is written
    double-quoted in the YAML, and leaving the backslashes in would make the
    lookup fail and the entry look like dead code.
    """
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        quote = value[0]
        inner = value[1:-1]
        if quote == '"':
            return inner.replace('\\"', '"').replace("\\\\", "\\")
        return inner.replace("''", "'")
    return value


def symbol_lines(source: list[str], symbol: str) -> list[int]:
    return [index for index, line in enumerate(source, start=1) if symbol in line]


def best_range(source: list[str], symbol: str, old_start: int, old_end: int) -> str | None:
    """Pick the occurrence closest to where the spec thought the code was.

    Staying near the original guess matters when a symbol appears more than once:
    the author was looking at a particular place, and the nearest match is
    almost always the one they meant.
    """
    hits = symbol_lines(source, symbol)
    if not hits:
        return None

    span = max(1, old_end - old_start)
    target = old_start
    hit = min(hits, key=lambda line: abs(line - target))

    start = max(1, hit - CONTEXT_BEFORE)
    end = min(len(source), max(hit + CONTEXT_AFTER, start + span - 1))
    return str(start) if start == end else f"{start}-{end}"


def process(path, dry_run: bool) -> list[str]:
    rel = str(path.relative_to(REPO_ROOT))
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    changes: list[str] = []
    # Walk forward remembering the most recent file/lines seen, because within an
    # evidence entry the keys always appear in that order.
    current_file: str | None = None
    lines_index: int | None = None
    lines_value: str | None = None

    for index, raw in enumerate(lines):
        file_match = FILE_RE.match(raw)
        if file_match:
            current_file = unquote(file_match.group(2))
            lines_index = None
            lines_value = None
            continue

        lines_match = LINES_RE.match(raw)
        if lines_match:
            lines_index = index
            lines_value = lines_match.group(2)
            continue

        symbol_match = SYMBOL_RE.match(raw)
        if not symbol_match:
            continue

        symbol = unquote(symbol_match.group(2))
        if not (current_file and lines_value and lines_index is not None):
            continue

        target = REPO_ROOT / current_file
        if not target.exists() or target.is_dir():
            continue

        source = target.read_text(encoding="utf-8", errors="replace").splitlines()
        start, _, end = lines_value.partition("-")
        start_n = max(1, int(start))
        end_n = int(end) if end else start_n
        excerpt = "\n".join(source[start_n - 1 : end_n])
        if symbol in excerpt:
            continue

        replacement = best_range(source, symbol, start_n, end_n)
        if replacement is None:
            changes.append(
                f"  SKIPPED {current_file}:{lines_value} '{symbol}' — "
                "symbol not found; the rule may no longer be enforced"
            )
            continue

        indent = lines_match.group(1) if (lines_match := LINES_RE.match(lines[lines_index])) else "  "
        lines[lines_index] = f'{indent}lines: "{replacement}"\n'
        changes.append(f"  {current_file}: {lines_value} -> {replacement}   ({symbol})")

    if changes and not dry_run:
        path.write_text("".join(lines), encoding="utf-8")

    return [f"{rel}:"] + changes if changes else []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    args = parser.parse_args()

    total = 0
    skipped = 0
    for path in spec_paths():
        report = process(path, args.dry_run)
        for line in report:
            print(line)
        for line in report:
            if line.strip().startswith("SKIPPED"):
                skipped += 1
            elif line.startswith("  "):
                total += 1

    verb = "would re-anchor" if args.dry_run else "re-anchored"
    print(f"\n{verb} {total} evidence range(s); {skipped} need a human.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
