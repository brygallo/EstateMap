#!/usr/bin/env python3
"""Synthesise Spanish speech with local Kokoro.

Accepts either a single --text/--output pair or a --manifest with many clips so
the model is loaded once per render instead of once per caption.
"""

import argparse
import json

import numpy as np
import soundfile as sf
from kokoro import KPipeline


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text")
    parser.add_argument("--output")
    parser.add_argument("--manifest", help="JSON list of {text, output} objects")
    parser.add_argument("--voice", default="ef_dora")
    parser.add_argument("--speed", type=float, default=1.04)
    args = parser.parse_args()

    if args.manifest:
        clips = json.loads(open(args.manifest, encoding="utf-8").read())
    elif args.text and args.output:
        clips = [{"text": args.text, "output": args.output}]
    else:
        raise SystemExit("Provide --manifest or both --text and --output")

    pipeline = KPipeline(lang_code="e")
    for clip in clips:
        chunks = [audio for _, _, audio in pipeline(clip["text"], voice=args.voice, speed=args.speed)]
        if not chunks:
            raise RuntimeError(f"Kokoro returned no audio for: {clip['text']!r}")
        sf.write(clip["output"], np.concatenate(chunks), 24000)


if __name__ == "__main__":
    main()
