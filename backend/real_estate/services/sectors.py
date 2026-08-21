"""Named zones: the finest geography this catalogue has.

A zone is the first segment of a free-text address — «Cumbayá», «Urb. Mocolí
Golf Club», «Kennedy Norte». Search Console shows that is how people look for
property here: in the three months to August 2026 the domain took 450
impressions for queries naming a building or an urbanization, at an average
position of 9, without a single page dedicated to any of them.

Two things make the zone usable rather than noise, and both live here so the
stats table, the listing page and the sitemap cannot disagree:

- **The key folds case and accents.** «Cumbayá» and «Cumbaya» are one place;
  grouping by case alone had split the most expensive zone of Quito into two
  halves, each publishing its own average (PRC-009).
- **The name is chosen, not taken.** Of all the spellings in a group the most
  frequent wins, except that an accented variant beats a bare one when it is at
  least half as common: people drop accents when typing, not when naming.
"""

from __future__ import annotations

import unicodedata
from collections import Counter
from typing import Any

from django.db.models import Avg, Count, F, FloatField, Max, Q
from django.db.models.expressions import ExpressionWrapper

from real_estate.models import Property

# A zone needs the same inventory a local landing needs to be worth indexing
# (SEO-001). Below it the page still resolves, it just does not ask to be found.
MIN_SECTOR_LISTINGS = 5


def has_marks(text: str) -> bool:
    return any(
        unicodedata.category(char) == "Mn" for char in unicodedata.normalize("NFD", text or "")
    )


# Words a Spanish place name keeps lowercase unless it opens the name.
_MINOR_WORDS = {"de", "del", "la", "las", "el", "los", "y", "en", "a", "al"}


def titlecase_place(name: str) -> str:
    """«PUERTO AZUL» → «Puerto Azul». Anything not shouted is left alone.

    Importers pass the seller's own capitalisation through, so a handful of
    zones publish as shouting next to their neighbours. Only fully uppercase
    names are touched: a name that already mixes case was written deliberately.
    """
    if not name or not name.isupper():
        return name
    words = name.split()
    out = []
    for index, word in enumerate(words):
        if not word.isalpha():
            out.append(word)
            continue
        lowered = word.casefold()
        if index and lowered in _MINOR_WORDS:
            out.append(lowered)
        else:
            out.append(word.capitalize())
    return " ".join(out)


def sector_display(labels: list[str]) -> str:
    """The spelling to publish for a group of variants of the same zone."""
    counted = Counter(label.strip() for label in labels if label and label.strip())
    if not counted:
        return ""
    ranked = counted.most_common()
    top_name, top_count = ranked[0]
    for name, count in ranked:
        if has_marks(name) and count >= top_count / 2:
            return titlecase_place(name)
    return titlecase_place(top_name)


def _public() -> Any:
    return (
        Property.objects.filter(is_duplicate=False)
        .exclude(status="inactive")
        .exclude(sector_key="")
    )


# A zone absorbs another when the second is plainly a corner of the first —
# «Cumbayá Sector La Viña» inside «Cumbayá», «Miravalle 4» inside «Miravalle».
# Left apart, each publishes its own thin page and its own average, and the
# authority of the real zone is split across them. The parent has to be at
# least this many times larger, so genuinely distinct neighbours are not
# swallowed: «Av. República» (5) does not absorb «Av. República de El Salvador»
# (5), which is a different avenue.
PARENT_DOMINANCE = 3


def absorptions(rows: list[dict]) -> dict[tuple[str, str], tuple[str, str]]:
    """Map every absorbed zone key to the key that absorbs it."""
    by_city: dict[str, list[dict]] = {}
    for row in rows:
        by_city.setdefault(row["city"], []).append(row)

    merged: dict[tuple[str, str], tuple[str, str]] = {}
    for city, city_rows in by_city.items():
        ranked = sorted(city_rows, key=lambda row: -row["count"])
        for parent in ranked:
            parent_key = parent["sector_key"]
            for child in ranked:
                child_key = child["sector_key"]
                if child_key == parent_key or (city, child_key) in merged:
                    continue
                if not child_key.startswith(parent_key + " "):
                    continue
                if parent["count"] < child["count"] * PARENT_DOMINANCE:
                    continue
                merged[(city, child_key)] = (city, parent_key)
    return merged


def list_sectors(city: str | None = None, minimum: int = MIN_SECTOR_LISTINGS) -> list[dict]:
    """Every zone with enough inventory to deserve a page.

    One query for the counts and one for the spellings, not one per zone: the
    catalogue holds hundreds of zones and the sitemap asks for all of them at
    once. Absorption runs before the threshold, so a corner of a large zone
    counts towards it instead of competing with it.
    """
    queryset = _public()
    if city:
        queryset = queryset.filter(city__iexact=city)

    with_ratio = queryset.filter(price__gt=0, area__gt=0).annotate(
        price_per_m2=ExpressionWrapper(F("price") / F("area"), output_field=FloatField())
    )

    raw = list(
        queryset.values("city", "province", "sector_key")
        .annotate(count=Count("id"), updated_at=Max("updated_at"))
        .order_by("-count")
    )
    absorbed = absorptions(raw)

    combined: dict[tuple[str, str], dict] = {}
    aliases: dict[tuple[str, str], list[str]] = {}
    for row in raw:
        origin = (row["city"], row["sector_key"])
        target = absorbed.get(origin, origin)
        entry = combined.get(target)
        if entry is None:
            combined[target] = entry = {
                "city": target[0],
                "province": row["province"],
                "sector_key": target[1],
                "count": 0,
                "updated_at": row["updated_at"],
            }
        entry["count"] += row["count"]
        if row["updated_at"] and (
            entry["updated_at"] is None or row["updated_at"] > entry["updated_at"]
        ):
            entry["updated_at"] = row["updated_at"]
        if target != origin:
            aliases.setdefault(target, []).append(row["sector_key"])

    rows = sorted(
        (entry for entry in combined.values() if entry["count"] >= minimum),
        key=lambda entry: (-entry["count"], entry["city"], entry["sector_key"]),
    )
    if not rows:
        return []

    # Grouped, not row by row. Reading one row per listing to pick a spelling
    # meant pulling the whole catalogue of a city — 8.500 rows for Quito — to
    # end up with two or three distinct strings per zone. Postgres counts them.
    published = {(entry["city"], entry["sector_key"]) for entry in rows}
    wanted = {origin for origin, target in absorbed.items() if target in published} | published

    labels: dict[tuple[str, str], list[str]] = {}
    spellings = (
        queryset.filter(sector_key__in=[key for _, key in wanted])
        .values("city", "sector_key", "sector_label")
        .annotate(times=Count("id"))
    )
    for row in spellings:
        origin = (row["city"], row["sector_key"])
        if origin not in wanted:
            continue
        target = absorbed.get(origin, origin)
        bucket = labels.setdefault(target, [])
        # `sector_display` counts occurrences, so the spelling is repeated as
        # many times as it appears — cheap, since a zone has a handful. An
        # absorbed corner contributes its listings but not its own name, or
        # «Miravalle 4» could end up naming «Miravalle».
        if target == origin:
            bucket.extend([row["sector_label"]] * row["times"])

    # Weighted, because an absorbed corner brings its own sample along.
    pooled: dict[tuple[str, str], tuple[float, int]] = {}
    for row in (
        with_ratio.filter(price_per_m2__gte=1, price_per_m2__lte=10_000)
        .values("city", "sector_key")
        .annotate(avg_price_m2=Avg("price_per_m2"), sample=Count("id"))
    ):
        origin = (row["city"], row["sector_key"])
        if origin not in wanted:
            continue
        target = absorbed.get(origin, origin)
        total, sample = pooled.get(target, (0.0, 0))
        pooled[target] = (
            total + float(row["avg_price_m2"]) * row["sample"],
            sample + row["sample"],
        )

    averages: dict[tuple[str, str], float] = {
        key: total / sample
        # A price per m² over one or two listings is not a market reading; the
        # zone page shows the figure only when there is something to average.
        for key, (total, sample) in pooled.items()
        if sample >= 3
    }

    return [
        {
            "city": entry["city"],
            "province": entry["province"],
            "sector_key": entry["sector_key"],
            "name": sector_display(labels.get((entry["city"], entry["sector_key"]), [])),
            "count": entry["count"],
            "avg_price_m2": averages.get((entry["city"], entry["sector_key"])),
            "aliases": sorted(aliases.get((entry["city"], entry["sector_key"]), [])),
            "updated_at": entry["updated_at"],
        }
        for entry in rows
    ]


def find_sector(city: str, key: str) -> dict | None:
    """One zone by its key, or None when nothing is published there.

    An absorbed key still resolves, to the zone that absorbed it: the URL it
    used to own is already indexed and should lead somewhere, not 404.
    """
    for sector in list_sectors(city=city, minimum=1):
        if sector["sector_key"] == key or key in sector["aliases"]:
            return sector
    return None
