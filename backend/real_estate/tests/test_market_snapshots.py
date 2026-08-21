"""Market history: the series a portal that only knows today cannot have."""

import datetime

import pytest

from real_estate.models import MarketSnapshot, Property
from real_estate.services.snapshots import MIN_SNAPSHOT_LISTINGS, capture

pytestmark = pytest.mark.django_db


def listing(*, city="Quito", address="Cumbayá, Quito", price=200_000, area=100,
            ptype="house", status="for_sale"):
    return Property.objects.create(
        title=f"Propiedad en {address}", city=city, province="Pichincha",
        address=address, property_type=ptype, status=status,
        price=price, area=area,
    )


def test_a_slice_too_small_is_not_recorded():
    """SPEC:SNAP-001 — a median over four listings is an anecdote."""
    for _ in range(MIN_SNAPSHOT_LISTINGS - 1):
        listing()

    capture()

    assert not MarketSnapshot.objects.filter(scope="sector").exists()


def test_the_day_is_recorded_once_however_often_it_runs():
    """SPEC:SNAP-002 — a retry must not double-count the day."""
    for index in range(8):
        listing(price=100_000 + index * 1_000)

    capture()
    first = MarketSnapshot.objects.count()
    capture()

    assert MarketSnapshot.objects.count() == first
    assert first > 0


def test_the_reading_uses_the_median_not_the_average():
    """SPEC:SNAP-003 — one mansion must not move the typical price."""
    for _ in range(8):
        listing(price=100_000, area=100)
    # Large but plausible: an outlier priced per square metre like the rest,
    # so the ratio guard keeps it and the averages have something to skew.
    listing(price=900_000, area=1_000)

    capture()
    row = MarketSnapshot.objects.get(
        scope="city", city="Quito", property_type="", status="for_sale"
    )

    assert row.median_price == 100_000
    assert row.avg_price > row.median_price


def test_a_rental_never_gets_a_price_per_square_metre():
    """SPEC:SNAP-004 — a monthly rent over an area is not a $/m²."""
    for _ in range(8):
        listing(price=600, area=80, status="for_rent")

    capture()
    row = MarketSnapshot.objects.get(
        scope="city", city="Quito", property_type="", status="for_rent"
    )

    assert row.median_price == 600
    assert row.median_price_m2 is None
    assert row.avg_price_m2 is None


def test_two_days_form_a_series():
    """SPEC:SNAP-005 — the whole point: comparing a slice with itself."""
    for _ in range(8):
        listing(price=100_000)
    capture(datetime.date(2026, 8, 1))
    Property.objects.update(price=110_000)
    capture(datetime.date(2026, 8, 2))

    series = list(
        MarketSnapshot.objects.filter(scope="city", city="Quito", property_type="")
        .order_by("captured_on")
        .values_list("median_price", flat=True)
    )

    assert series == [100_000, 110_000]
