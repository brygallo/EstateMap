#!/usr/bin/env bash
# Start the factory panel on loopback.
#
# --noreload is deliberate: the panel owns the ttyd processes it starts, and an
# autoreload restart would orphan every open terminal.
set -euo pipefail

cd "$(dirname "$0")"
PORT="${PANEL_PORT:-8765}"

exec python3 manage.py runserver "127.0.0.1:${PORT}" --noreload
