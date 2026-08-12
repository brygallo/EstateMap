#!/usr/bin/env python3
"""Record human feedback so subsequent Claude plans can use it."""

import argparse
import json
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description="Add a reviewed lesson to the video factory memory.")
    parser.add_argument("video", help="Video path, output directory, or campaign identifier")
    parser.add_argument("--problem", required=True, help="What did not work")
    parser.add_argument("--fix", required=True, help="What should happen next time")
    parser.add_argument("--scope", choices=["global", "audience", "series", "one-off"], default="global")
    args = parser.parse_args()
    target = ROOT / "memory/lessons.md"
    structured_target = ROOT / "memory/lessons.json"
    entry = (
        f"\n## {datetime.now().date().isoformat()} — {args.video}\n\n"
        f"- Alcance: {args.scope}\n"
        f"- Problema observado: {args.problem.strip()}\n"
        f"- Regla para la próxima generación: {args.fix.strip()}\n"
        "- Estado: activa\n"
    )
    with target.open("a", encoding="utf-8") as handle:
        handle.write(entry)
    data = json.loads(structured_target.read_text(encoding="utf-8"))
    data["lessons"].append({
        "created_at": datetime.now().astimezone().isoformat(),
        "source": args.video,
        "scope": args.scope,
        "applies_to": args.video if args.scope == "one-off" else None,
        "observation": args.problem.strip(),
        "rule": args.fix.strip(),
        "status": "active",
        "origin": "human",
    })
    structured_target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(target)


if __name__ == "__main__":
    main()
