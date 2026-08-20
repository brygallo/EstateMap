#!/usr/bin/env python3
"""Entry point for the factory panel.

The panel lives inside the factory it watches, so the import root is
`marketing/videos` — the same directory the rest of the factory runs from.
"""

import os
import sys
from pathlib import Path


def main() -> None:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "panel.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
