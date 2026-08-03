import time

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import RequestFactory, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from estate_map.observability import record_incident
from real_estate.models import Property, SystemIncident


pytestmark = pytest.mark.django_db

LOCAL_CACHE = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "system-operations-tests",
    }
}


def _user(*, staff=False):
    return get_user_model().objects.create_user(
        username="system-admin" if staff else "publisher",
        email="system@example.com" if staff else "publisher@example.com",
        password="test-password",
        is_staff=staff,
    )


def test_incidents_are_aggregated_without_query_strings_or_payloads():
    request = RequestFactory().post("/api/properties/?token=secret", {"password": "never-store"})

    record_incident(request=request, request_id="request-1", status_code=500)
    record_incident(request=request, request_id="request-2", status_code=500)

    incident = SystemIncident.objects.get()
    assert incident.path == "/api/properties/"
    assert incident.occurrences == 2
    assert "secret" not in incident.path
    assert "password" not in incident.message


@override_settings(CACHES=LOCAL_CACHE)
def test_admin_system_status_reports_worker_and_can_resolve_incident():
    admin = _user(staff=True)
    cache.set("system:worker:heartbeat", time.time(), 300)
    incident = SystemIncident.objects.create(
        fingerprint="a" * 64,
        status_code=500,
        method="GET",
        path="/api/example/",
    )
    client = APIClient()
    client.force_authenticate(admin)

    response = client.get(reverse("admin_system_status"))
    assert response.status_code == 200
    assert response.data["components"]["worker"]["status"] == "healthy"
    assert response.data["incidents"][0]["id"] == incident.id

    resolved = client.post(
        reverse("admin_system_status"),
        {"incident_id": incident.id, "resolved": True},
        format="json",
    )
    assert resolved.status_code == 200
    incident.refresh_from_db()
    assert incident.resolved is True


@override_settings(CACHES=LOCAL_CACHE)
def test_property_create_idempotency_prevents_duplicate_publications():
    publisher = _user()
    client = APIClient()
    client.force_authenticate(publisher)
    payload = {
        "title": "Casa idempotente",
        "property_type": "house",
        "status": "for_sale",
        "price": "120000",
        "area": "100",
        "city": "Quito",
        "province": "Pichincha",
        "latitude": "-0.18",
        "longitude": "-78.48",
    }
    headers = {"HTTP_IDEMPOTENCY_KEY": "same-publication-request"}

    first = client.post("/api/properties/", payload, format="json", **headers)
    second = client.post("/api/properties/", payload, format="json", **headers)

    assert first.status_code == 201
    assert second.status_code == 200
    assert second["X-Idempotent-Replay"] == "true"
    assert first.data["id"] == second.data["id"]
    assert Property.objects.filter(owner=publisher).count() == 1
