#!/usr/bin/env python3
"""Brand profiles for the shared video factory.

The engine is shared, but product truth, editorial memory and output libraries
belong to one brand.  This module is the single process-level selection point;
commands configure it once before touching any catalog or artefact.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
PROFILES = ROOT / "brands"
DEFAULT_BRAND = "geo"


@dataclass(frozen=True)
class BrandProfile:
    id: str
    name: str
    domain: str
    tagline: str
    profile_root: Path
    library: Path
    memory: Path
    brand_tile: Path
    brand_symbol: Path
    simulations: tuple[str, ...]
    audiences: tuple[str, ...]
    cta_families: dict[str, tuple[str, ...]]
    product_reveal_audiences: tuple[str, ...]
    default_hashtags: tuple[str, ...]
    context_files: tuple[Path, ...]
    repository: Path | None

    @classmethod
    def load(cls, identifier: str) -> "BrandProfile":
        profile_root = PROFILES / identifier
        source = profile_root / "profile.json"
        if not source.is_file():
            known = ", ".join(available()) or "none"
            raise RuntimeError(f"Unknown brand: {identifier}. Available brands: {known}")
        data: dict[str, Any] = json.loads(source.read_text(encoding="utf-8"))

        def factory_path(value: str) -> Path:
            return (ROOT / value).resolve()

        storage = data.get("storage") or {}
        repository_value = data.get("repository")
        return cls(
            id=str(data["id"]),
            name=str(data["name"]),
            domain=str(data["domain"]),
            tagline=str(data.get("tagline") or ""),
            profile_root=profile_root,
            library=factory_path(str(storage["library"])),
            memory=factory_path(str(storage["memory"])),
            brand_tile=factory_path(str(data["brand_tile"])),
            brand_symbol=factory_path(str(data["brand_symbol"])),
            simulations=tuple(str(item) for item in data.get("simulations") or []),
            audiences=tuple(str(item) for item in data.get("audiences") or []),
            cta_families={
                str(audience): tuple(str(term) for term in terms)
                for audience, terms in (data.get("cta_families") or {}).items()
            },
            product_reveal_audiences=tuple(str(item) for item in data.get("product_reveal_audiences") or []),
            default_hashtags=tuple(str(item) for item in data.get("default_hashtags") or []),
            context_files=tuple(profile_root / str(item) for item in data.get("context_files") or []),
            repository=factory_path(str(repository_value)) if repository_value else None,
        )


def available() -> list[str]:
    return sorted(path.name for path in PROFILES.iterdir() if (path / "profile.json").is_file())


_current = BrandProfile.load(os.environ.get("VIDEO_BRAND", DEFAULT_BRAND))


def current() -> BrandProfile:
    return _current


def configure(identifier: str) -> BrandProfile:
    global _current
    _current = BrandProfile.load(identifier)
    return _current
