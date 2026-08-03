import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from ingesta.models import Fuente
from real_estate.models import Property


pytestmark = pytest.mark.django_db


def _admin_client():
    admin = get_user_model().objects.create_user(
        username="maintenance-admin",
        email="maintenance@example.com",
        password="test-password",
        is_staff=True,
    )
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


def test_preview_counts_only_imported_cleanup_candidates():
    source = Fuente.objects.create(
        slug="maintenance-source",
        nombre="Maintenance source",
        base_url="https://example.com",
    )
    Property.objects.create(title="Imported duplicate", source=source, is_imported=True, is_duplicate=True)
    Property.objects.create(title="User duplicate flag", is_imported=False, is_duplicate=True)

    response = _admin_client().get(
        reverse("admin_ingesta_maintenance_preview"),
        {"category": "duplicates"},
    )

    assert response.status_code == 200
    assert response.data["properties"] == 1
    assert response.data["sample"][0]["title"] == "Imported duplicate"


def test_cleanup_requires_confirmation_and_never_deletes_user_property(monkeypatch):
    source = Fuente.objects.create(
        slug="cleanup-source",
        nombre="Cleanup source",
        base_url="https://example.com",
    )
    imported = Property.objects.create(title="Imported duplicate", source=source, is_imported=True, is_duplicate=True)
    user_property = Property.objects.create(title="User property", is_imported=False, is_duplicate=True)
    deleted_media = []
    monkeypatch.setattr(
        "ingesta.pipeline.images.delete_property_images",
        lambda prop: deleted_media.append(prop.pk),
    )
    client = _admin_client()

    denied = client.post(
        reverse("admin_ingesta_maintenance_cleanup"),
        {"category": "duplicates", "confirmation": "wrong"},
        format="json",
    )
    assert denied.status_code == 400

    response = client.post(
        reverse("admin_ingesta_maintenance_cleanup"),
        {"category": "duplicates", "confirmation": "ELIMINAR IMPORTADAS", "batch_size": 100},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["deleted"] == 1
    assert deleted_media == [imported.pk]
    assert not Property.objects.filter(pk=imported.pk).exists()
    assert Property.objects.filter(pk=user_property.pk).exists()
