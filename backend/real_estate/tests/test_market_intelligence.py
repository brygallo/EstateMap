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
