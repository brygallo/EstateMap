#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    cat <<'EOF'
Usage: ./run_tests.sh [all|specs|backend|frontend|e2e|help]

  all       Run specs, backend, frontend and end-to-end tests.
  specs     Validate specifications and generated files.
  backend   Run every Django test and check for missing migrations.
  frontend  Run lint, type checking, unit tests, token checks and production build.
  e2e       Run Playwright against an already-running application.
  help      Show this message.
EOF
}

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Required command not found: $1" >&2
        exit 1
    fi
}

run_specs() {
    "$ROOT_DIR/scripts/specs.sh" check
}

run_backend() {
    require_command docker
    if ! docker info >/dev/null 2>&1; then
        echo "Docker is required for backend tests and is not running." >&2
        exit 1
    fi

    docker compose -f "$ROOT_DIR/docker-compose.yml" run --rm backend \
        sh -c "pytest -q && python manage.py makemigrations --check --dry-run"
}

run_frontend() {
    require_command npm
    (
        cd "$ROOT_DIR/frontend"
        npm run lint
        npm run typecheck
        npm test
        npm run check-tokens
        npm run build
    )
}

run_e2e() {
    require_command npm
    if ! curl --fail --silent "${E2E_BASE_URL:-http://localhost:3010}" >/dev/null; then
        echo "The frontend is not reachable. Start the complete application before E2E tests." >&2
        exit 1
    fi
    if ! curl --fail --silent "${E2E_API_URL:-http://localhost:8010/api}/health/" >/dev/null; then
        echo "The backend health endpoint is not reachable." >&2
        exit 1
    fi

    (cd "$ROOT_DIR/tests" && npm test)
}

case "${1:-all}" in
    all)
        run_specs
        run_backend
        run_frontend
        run_e2e
        ;;
    specs) run_specs ;;
    backend) run_backend ;;
    frontend) run_frontend ;;
    e2e) run_e2e ;;
    help|-h|--help) usage ;;
    *)
        echo "Unknown test group: $1" >&2
        usage >&2
        exit 2
        ;;
esac
