import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from real_estate.models import Property


pytestmark = pytest.mark.django_db


def test_property_intelligence_compares_inventory_and_tracks_price_changes():
    """SPEC:VIS-001 SPEC:PERM-012 SPEC:PRC-030 SPEC:PRC-032 — public context excludes raw demand metrics."""
    target = Property.objects.create(
        title="Target", city="Quito", address="Cumbayá, Quito", property_type="house",
        status="for_sale", price=300000, area=100, views_count=20,
        is_imported=True, imported_at=timezone.now(),
    )
    for index, price_m2 in enumerate([900, 950, 1000, 1050, 1100, 1150]):
        Property.objects.create(
            title=f"Comparable {index}", city="Quito", address="Cumbayá, Quito",
            property_type="house", status="for_sale", price=price_m2 * 100,
            area=100, views_count=5,
        )
    target.price = 280000
    target.save(update_fields=["price", "updated_at"])

    response = APIClient().get(f"/api/properties/{target.pk}/intelligence/")

    assert response.status_code == 200
    assert response.data["price_per_m2"] == 2800
    assert response.data["comparison"]["sample_size"] == 6
    assert response.data["price_alert"] == "above_range"
    # Supply counts the very universe the range came from — same zone, same
    # type, same operation — instead of a text match on the address.
    assert response.data["available_supply"] == 6
    assert response.data["scope"] == "sector"
    assert len(response.data["price_history"]) == 2
    assert response.data["publication_basis"] == "detected"
    # A public reader gets the level and how it was measured, never the counts.
    assert set(response.data["demand"]) == {"level", "window_days", "basis"}


def test_owner_can_read_private_property_performance_metrics():
    """SPEC:VIS-001 SPEC:PERM-012 SPEC:PRC-032 — owners retain their private metrics."""
    owner = get_user_model().objects.create_user(
        username="owner", email="owner@example.com", password="test-pass-123"
    )
    property_obj = Property.objects.create(
        owner=owner, title="Owner listing", city="Quito", property_type="house",
        status="for_sale", price=100000, area=100, views_count=12,
    )
    client = APIClient()
    client.force_authenticate(owner)

    detail = client.get(f"/api/properties/{property_obj.pk}/")
    intelligence = client.get(f"/api/properties/{property_obj.pk}/intelligence/")

    assert detail.status_code == 200
    assert detail.data["views_count"] == 12
    assert intelligence.status_code == 200
    # The counters are measured over the window now, not over the lifetime of
    # a listing, so they describe what it is doing rather than what it did.
    assert intelligence.data["demand"]["sessions"] == 0
    assert "contacts" in intelligence.data["demand"]
    assert "scope_median" in intelligence.data["demand"]


def test_anonymous_property_detail_hides_view_count():
    """SPEC:VIS-001 — public property detail never exposes views_count."""
    property_obj = Property.objects.create(
        title="Public listing", city="Quito", property_type="house",
        status="for_sale", price=100000, area=100, views_count=12,
    )

    response = APIClient().get(f"/api/properties/{property_obj.pk}/")

    assert response.status_code == 200
    assert "views_count" not in response.data


def test_market_stats_city_filter_scopes_every_metric():
    for index in range(4):
        Property.objects.create(
            title=f"Quito {index}", city="Quito",
            address="CUMBAYÁ, Quito" if index % 2 else "Cumbayá, Quito",
            property_type="house", status="for_sale", price=100000 + index * 1000,
            area=100, views_count=5,
        )
    for index in range(3):
        Property.objects.create(
            title=f"Cuenca {index}", city="Cuenca", address="El Vergel, Cuenca",
            property_type="apartment", status="for_sale", price=80000 + index * 1000,
            area=80, views_count=2,
        )

    client = APIClient()
    national = client.get("/api/market-stats/")
    scoped = client.get("/api/market-stats/", {"city": "quito"})

    assert national.status_code == 200
    assert national.data["overall"]["count"] == 7
    assert scoped.status_code == 200
    assert scoped.data["overall"]["count"] == 4
    assert [row["city"] for row in scoped.data["by_city"]] == ["Quito"]
    assert all(row["property_type"] == "house" for row in scoped.data["by_property_type"])
    assert all(row["city"] == "Quito" for row in scoped.data["by_sector"])
    # "Cumbayá" and "CUMBAYÁ" are the same sector despite the casing.
    cumbaya = [row for row in scoped.data["by_sector"] if row["sector"].casefold() == "cumbayá"]
    assert len(cumbaya) == 1 and cumbaya[0]["count"] == 4
    # Raw visit counts must never leave the API: the site is young and low
    # traffic numbers on a public page undermine trust.
    assert "supply_demand" not in scoped.data
    assert "views" not in str(scoped.data)


@pytest.mark.api
def test_the_same_sector_written_with_and_without_accents_is_one_sector():
    """SPEC:PRC-009 — «Cumbaya» and «Cumbayá» are the same place.

    Grouping by casefold alone split them in production: Cumbayá held 42
    listings and Cumbaya another 47, each publishing its own average as if they
    were different neighbourhoods. Half the inventory of the most expensive
    sector in Quito was invisible from either row.
    """
    for index in range(3):
        Property.objects.create(
            title=f"Casa acentuada {index}", city="Quito", address="Cumbayá, Quito",
            property_type="house", status="for_sale", price=200000, area=100,
        )
    for index in range(2):
        Property.objects.create(
            title=f"Casa sin tilde {index}", city="Quito", address="CUMBAYA, Quito",
            property_type="house", status="for_sale", price=200000, area=100,
        )

    response = APIClient().get("/api/market-stats/", {"city": "Quito"})

    assert response.status_code == 200
    sectors = [row for row in response.data["by_sector"] if row["sector"].lower().startswith("cumbay")]
    assert len(sectors) == 1, f"expected one sector, got {[row['sector'] for row in sectors]}"
    assert sectors[0]["count"] == 5
    # The accented spelling is the name; the bare one is how it gets typed.
    assert sectors[0]["sector"] == "Cumbayá"


def test_the_comparison_falls_back_to_the_city_and_says_so():
    """SPEC:PRC-030 — a zone without enough inventory is not a market."""
    target = Property.objects.create(
        title="Solo en su barrio", city="Quito", address="Barrio Raro, Quito",
        property_type="house", status="for_sale", price=200000, area=100,
    )
    for index in range(6):
        Property.objects.create(
            title=f"Otro barrio {index}", city="Quito", address="Cumbayá, Quito",
            property_type="house", status="for_sale", price=150000, area=100,
        )

    response = APIClient().get(f"/api/properties/{target.pk}/intelligence/")

    assert response.status_code == 200
    assert response.data["scope"] == "city"
    assert response.data["scope_label"] == "Quito"
    assert response.data["comparison"]["sample_size"] == 6


def test_the_comparison_never_mixes_operations_or_types():
    """SPEC:PRC-030 — a house for rent is not a comparable for a house for sale."""
    target = Property.objects.create(
        title="Casa en venta", city="Loja", address="Zona Uno, Loja",
        property_type="house", status="for_sale", price=200000, area=100,
    )
    for index in range(5):
        Property.objects.create(
            title=f"Casa en alquiler {index}", city="Loja", address="Zona Uno, Loja",
            property_type="house", status="for_rent", price=600, area=100,
        )
        Property.objects.create(
            title=f"Terreno en venta {index}", city="Loja", address="Zona Uno, Loja",
            property_type="land", status="for_sale", price=90000, area=100,
        )

    response = APIClient().get(f"/api/properties/{target.pk}/intelligence/")

    assert response.status_code == 200
    assert response.data["comparison"]["sample_size"] == 0
    assert response.data["available_supply"] == 0
    assert response.data["comparables"] == []


def test_the_analysis_shows_the_comparables_it_used():
    """SPEC:PRC-031 — the range is checkable, and every card is an internal link."""
    target = Property.objects.create(
        title="Casa objetivo", city="Ambato", address="Ficoa, Ambato",
        property_type="house", status="for_sale", price=200000, area=100,
    )
    for index in range(8):
        Property.objects.create(
            title=f"Comparable {index}", city="Ambato", address="Ficoa, Ambato",
            property_type="house", status="for_sale", price=180000, area=100 + index,
        )

    response = APIClient().get(f"/api/properties/{target.pk}/intelligence/")

    assert response.status_code == 200
    comparables = response.data["comparables"]
    assert 0 < len(comparables) <= 5
    assert target.pk not in [item["id"] for item in comparables]
    assert all(item["price_per_m2"] for item in comparables)
    # Sorted by how close they are in size to the listing being read.
    areas = [float(item["area"]) for item in comparables]
    assert areas == sorted(areas, key=lambda value: abs(value - 100))


def test_confidence_says_how_much_the_range_is_worth():
    """SPEC:PRC-031 — a range built on three listings is not a statement."""
    from real_estate.services.intelligence import PropertyIntelligenceService

    assert PropertyIntelligenceService.confidence_for(40) == "high"
    assert PropertyIntelligenceService.confidence_for(10) == "medium"
    assert PropertyIntelligenceService.confidence_for(5) == "low"
    assert PropertyIntelligenceService.confidence_for(3) == "insufficient"


def test_the_verdict_prices_the_gap_in_money():
    """SPEC:PRC-031 — a percentage is an abstraction; dollars are the decision."""
    target = Property.objects.create(
        title="Casa cara", city="Manta", address="Barrio Sol, Manta",
        property_type="house", status="for_sale", price=300000, area=100,
    )
    for index in range(6):
        Property.objects.create(
            title=f"Comparable {index}", city="Manta", address="Barrio Sol, Manta",
            property_type="house", status="for_sale", price=200000, area=100,
        )

    response = APIClient().get(f"/api/properties/{target.pk}/intelligence/")

    assert response.data["estimated_price"] == 200000
    assert response.data["difference_amount"] == 100000
    assert response.data["comparison"]["confidence"] == "low"
