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


def sector_display(labels: list[str]) -> str:
    """The spelling to publish for a group of variants of the same zone."""
    counted = Counter(label.strip() for label in labels if label and label.strip())
    if not counted:
        return ""
    ranked = counted.most_common()
    top_name, top_count = ranked[0]
    for name, count in ranked:
        if has_marks(name) and count >= top_count / 2:
            return name
    return top_name


def _public() -> Any:
    return (
        Property.objects.filter(is_duplicate=False)
        .exclude(status="inactive")
        .exclude(sector_key="")
    )


def list_sectors(city: str | None = None, minimum: int = MIN_SECTOR_LISTINGS) -> list[dict]:
    """Every zone with enough inventory to deserve a page.

    One query for the counts and one for the spellings, not one per zone: the
    catalogue holds hundreds of zones and the sitemap asks for all of them at
    once.
    """
    queryset = _public()
    if city:
        queryset = queryset.filter(city__iexact=city)

    with_ratio = queryset.filter(price__gt=0, area__gt=0).annotate(
        price_per_m2=ExpressionWrapper(F("price") / F("area"), output_field=FloatField())
    )

    rows = (
        queryset.values("city", "province", "sector_key")
        .annotate(
            count=Count("id"),
            updated_at=Max("updated_at"),
        )
        .filter(count__gte=minimum)
        .order_by("-count")
    )
    keys = [(row["city"], row["sector_key"]) for row in rows]
    if not keys:
        return []

    labels: dict[tuple[str, str], list[str]] = {}
    for city_name, key, label in queryset.filter(
        sector_key__in=[key for _, key in keys]
    ).values_list("city", "sector_key", "sector_label"):
        labels.setdefault((city_name, key), []).append(label)

    averages: dict[tuple[str, str], float] = {}
    for row in (
        with_ratio.filter(price_per_m2__gte=1, price_per_m2__lte=10_000)
        .values("city", "sector_key")
        .annotate(avg_price_m2=Avg("price_per_m2"), sample=Count("id"))
    ):
        # A price per m² over one or two listings is not a market reading; the
        # zone page shows the figure only when there is something to average.
        if row["sample"] >= 3:
            averages[(row["city"], row["sector_key"])] = row["avg_price_m2"]

    return [
        {
            "city": row["city"],
            "province": row["province"],
            "sector_key": row["sector_key"],
            "name": sector_display(labels.get((row["city"], row["sector_key"]), [])),
            "count": row["count"],
            "avg_price_m2": averages.get((row["city"], row["sector_key"])),
            "updated_at": row["updated_at"],
        }
        for row in rows
    ]


def find_sector(city: str, key: str) -> dict | None:
    """One zone by its key, or None when nothing is published there."""
    for sector in list_sectors(city=city, minimum=1):
        if sector["sector_key"] == key:
            return sector
    return None
