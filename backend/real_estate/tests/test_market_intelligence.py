import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from real_estate.models import Property


pytestmark = pytest.mark.django_db


def test_property_intelligence_compares_inventory_and_tracks_price_changes():
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
    assert response.data["available_supply"] == 7
    assert response.data["demand"]["level"] == "high"
    assert len(response.data["price_history"]) == 2
    assert response.data["publication_basis"] == "detected"


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
