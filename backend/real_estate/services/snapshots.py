"""A daily reading of the market, kept so it can be compared with itself later.

Everything else this portal publishes answers «how much is it now». That is the
question a competitor with the same listings can answer too. «How much did it
move» is not: it needs a record that starts before anyone asks, and a day not
captured is a day that cannot be recovered.

The row is deliberately narrow. It stores what a page can defend — a count, a
median, an average, a range — for one slice of the market on one day, and only
when the slice held enough listings for those figures to mean anything.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from django.db.models import F, FloatField
from django.db.models.expressions import ExpressionWrapper

from real_estate.models import MarketSnapshot, Property
from real_estate.services.sectors import absorptions

# A slice below this is an anecdote. Recording it would invite a page to quote
# «the median price in X» from four listings, which is exactly the kind of
# figure this project refuses to publish.
MIN_SNAPSHOT_LISTINGS = 5


def _median(values: list[float]) -> float | None:
    ordered = sorted(values)
    if len(ordered) < MIN_SNAPSHOT_LISTINGS:
        return None
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return float(ordered[middle])
    return (float(ordered[middle - 1]) + float(ordered[middle])) / 2


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def _reading(rows: list[dict], *, with_ratio: bool) -> dict | None:
    if len(rows) < MIN_SNAPSHOT_LISTINGS:
        return None
    prices = [float(row["price"]) for row in rows if row["price"]]
    areas = [float(row["area"]) for row in rows if row["area"]]
    ratios = (
        [float(row["price_per_m2"]) for row in rows if row["price_per_m2"]]
        if with_ratio
        else []
    )
    return {
        "active_count": len(rows),
        "median_price": _median(prices),
        "avg_price": _mean(prices),
        "median_price_m2": _median(ratios),
        "avg_price_m2": _mean(ratios),
        "median_area": _median(areas),
    }


def capture(captured_on: date | None = None) -> int:
    """Write today's reading for every slice that has one. Returns rows written.

    Re-running on the same day overwrites that day rather than duplicating it,
    so a retry after a failure is safe and a backfill cannot double-count.
    """
    day = captured_on or date.today()

    rows = list(
        Property.objects.filter(is_duplicate=False)
        .exclude(status="inactive")
        .filter(price__gt=0, area__gt=0)
        .annotate(
            price_per_m2=ExpressionWrapper(
                F("price") / F("area"), output_field=FloatField()
            )
        )
        .filter(price_per_m2__gt=1, price_per_m2__lt=10_000)
        .values(
            "city", "province", "sector_key", "property_type", "status",
            "price", "area", "price_per_m2",
        )
    )

    buckets: dict[tuple, list[dict]] = defaultdict(list)
    sector_counts: dict[tuple[str, str], int] = defaultdict(int)
    for row in rows:
        city, status, ptype = row["city"] or "", row["status"], row["property_type"]
        buckets[("country", "", "", "", status)].append(row)
        buckets[("country", "", "", ptype, status)].append(row)
        if city:
            buckets[("city", city, "", "", status)].append(row)
            buckets[("city", city, "", ptype, status)].append(row)
            if row["sector_key"]:
                sector_counts[(city, row["sector_key"])] += 1
                buckets[("sector", city, row["sector_key"], "", status)].append(row)

    # The zone pages absorb a corner into the zone that contains it; the history
    # has to agree with them or a chart would show a zone appearing out of
    # nowhere the day the absorption rule changed.
    absorbed = absorptions(
        [
            {"city": city, "sector_key": key, "count": count}
            for (city, key), count in sector_counts.items()
        ]
    )
    for (city, key), (target_city, target_key) in absorbed.items():
        for status in ("for_sale", "for_rent"):
            origin = ("sector", city, key, "", status)
            target = ("sector", target_city, target_key, "", status)
            if origin in buckets:
                buckets[target].extend(buckets.pop(origin))

    written = 0
    for (scope, city, sector_key, property_type, status), slice_rows in buckets.items():
        reading = _reading(slice_rows, with_ratio=status == "for_sale")
        if reading is None:
            continue
        MarketSnapshot.objects.update_or_create(
            captured_on=day,
            scope=scope,
            city=city,
            sector_key=sector_key,
            property_type=property_type,
            status=status,
            defaults=reading,
        )
        written += 1
    return written
