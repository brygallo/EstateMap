#!/usr/bin/env bash
# Entrypoint for everything spec-related.
#
# The tools need PyYAML and jsonschema, which the backend image does not carry.
# Rather than adding two dependencies to a production image for a dev-time gate,
# this script keeps them in a throwaway virtualenv at .venv-specs (gitignored)
# and bootstraps it on first use.
#
#   ./scripts/specs.sh validate     check the specs against the code
#   ./scripts/specs.sh docs         regenerate docs/generated/
#   ./scripts/specs.sh tests        regenerate the tests derived from the specs
#   ./scripts/specs.sh all          all three
#   ./scripts/specs.sh check        CI mode: fail if anything is out of date
#   ./scripts/specs.sh fix-ranges   re-anchor evidence line numbers onto symbols
#   ./scripts/specs.sh bootstrap    only prepare the environment

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="$REPO_ROOT/.venv-specs"
PY="$VENV/bin/python"
TOOLS="$REPO_ROOT/tools/specs"

bootstrap() {
  if [ ! -x "$PY" ]; then
    echo "==> Creating $VENV"
    python3 -m venv "$VENV"
  fi
  if ! "$PY" -c "import yaml, jsonschema" >/dev/null 2>&1; then
    echo "==> Installing tools/specs dependencies"
    "$VENV/bin/pip" install -q --disable-pip-version-check -r "$TOOLS/requirements.txt"
  fi
}

run() {
  bootstrap
  PYTHONPATH="$TOOLS" "$PY" "$TOOLS/$1" "${@:2}"
}

case "${1:-all}" in
  bootstrap)
    bootstrap
    echo "Done. $VENV is ready."
    ;;
  validate)
    run validate.py "${@:2}"
    ;;
  docs)
    run gen_docs.py "${@:2}"
    ;;
  tests)
    run gen_tests.py "${@:2}"
    ;;
  fix-ranges)
    run fix_ranges.py "${@:2}"
    ;;
  all)
    run validate.py
    run gen_docs.py
    run gen_tests.py
    ;;
  check)
    # Order matters: generate first so the coverage check sees the generated
    # markers, then validate, then prove nothing was left uncommitted.
    run gen_docs.py --check
    run gen_tests.py --check
    run validate.py
    ;;
  help | -h | --help)
    sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
  *)
    echo "Unknown command: $1" >&2
    echo "Use: bootstrap | validate | docs | tests | all | check" >&2
    exit 2
    ;;
esac
