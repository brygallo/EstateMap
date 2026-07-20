import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from ingesta.models import Fuente, IngestaRun, ListingRetirada
from real_estate.models import Property


pytestmark = pytest.mark.django_db


def test_dashboard_reports_catalog_quality_and_ingestion_health():
    user = get_user_model().objects.create_user(
        username="owner",
        email="owner@example.com",
        password="test-password",
        is_staff=True,
    )
    source = Fuente.objects.create(
        slug="plusvalia",
        nombre="Plusvalia",
        base_url="https://www.plusvalia.com",
    )
    Property.objects.create(
        title="Missing operational data",
        status="for_sale",
        price=None,
        latitude=None,
        longitude=None,
        source=source,
        external_id="missing-1",
        is_imported=True,
    )
    Property.objects.create(
        title="Duplicate",
        status="for_sale",
        price=100000,
        latitude=-0.2,
        longitude=-78.5,
        source=source,
        external_id="duplicate-1",
        is_imported=True,
        is_duplicate=True,
    )
    ListingRetirada.objects.create(
        fuente=source,
        external_id="gone-1",
        source_url="https://www.plusvalia.com/propiedades/gone-1.html",
        http_status=410,
    )
    IngestaRun.objects.create(
        fuente=source,
        estado="error",
        mensaje="blocked",
    )

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get(reverse("admin_dashboard"))

    assert response.status_code == 200
    assert response.data["quality"] == {
        "without_images": 2,
        "without_location": 1,
        "without_price": 1,
        "duplicates": 1,
        "inactive": 0,
    }
    assert response.data["ingestion"]["failed_24h"] == 1
    assert response.data["ingestion"]["retired_total"] == 1
    assert response.data["ingestion"]["imported_total"] == 2
    assert response.data["ingestion"]["sources"][0]["status"] == "error"


def test_admin_property_list_filters_imported_and_user_inventory():
    user_model = get_user_model()
    admin = user_model.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="test-password",
        is_staff=True,
    )
    publisher = user_model.objects.create_user(
        username="publisher",
        email="publisher@example.com",
        password="test-password",
    )
    source = Fuente.objects.create(
        slug="plusvalia",
        nombre="Plusvalia",
        base_url="https://www.plusvalia.com",
    )
    imported = Property.objects.create(
        title="Imported",
        source=source,
        external_id="external-1",
        is_imported=True,
    )
    published = Property.objects.create(title="Published by user", owner=publisher)

    client = APIClient()
    client.force_authenticate(user=admin)
    imported_response = client.get(reverse("admin_properties_list"), {"origin": "imported"})
    users_response = client.get(reverse("admin_properties_list"), {"origin": "users"})

    assert [item["id"] for item in imported_response.data["results"]] == [imported.id]
    assert imported_response.data["results"][0]["source_name"] == "Plusvalia"
    assert [item["id"] for item in users_response.data["results"]] == [published.id]
    assert users_response.data["results"][0]["source_name"] is None
