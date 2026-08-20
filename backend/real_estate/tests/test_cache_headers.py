"""What a shared cache is allowed to keep.

A CDN decides with the headers it receives. These pin the two answers that
matter: the public reads stay reusable, and everything else leaves marked
private even if a cache rule covers its path.
"""

import pytest
from rest_framework.test import APIClient

from real_estate.models import Property


pytestmark = pytest.mark.django_db


@pytest.mark.api
def test_a_public_read_stays_reusable_by_a_shared_cache():
    """SPEC:MPERF-007 — the catalogue is meant to be cached and crawled."""
    Property.objects.create(
        title="Casa pública", city="Quito", province="Pichincha",
        property_type="house", status="for_sale", price=150000, area=100,
    )

    response = APIClient().get("/api/properties/", {"page_size": "1"})

    cache_control = response.headers.get("Cache-Control", "")
    assert "public" in cache_control
    assert "s-maxage" in cache_control


@pytest.mark.api
def test_an_authenticated_read_never_becomes_shared(create_user):
    """SPEC:MPERF-007 — one account's answer must not reach another visitor.

    The `Vary` this app sends does not list Authorization, so a CDN caching a
    path with a rule would treat two accounts as the same request. The response
    has to say `private` itself.
    """
    client = APIClient()
    client.force_authenticate(user=create_user())

    response = client.get("/api/properties/my_properties/")

    cache_control = response.headers.get("Cache-Control", "")
    assert "private" in cache_control or "no-store" in cache_control
    assert "public" not in cache_control


@pytest.mark.api
def test_a_rejected_request_is_not_cacheable_either():
    """SPEC:MPERF-007 — a 401 stored by the CDN would lock everyone out."""
    response = APIClient().get("/api/properties/my_properties/")

    assert response.status_code == 401
    cache_control = response.headers.get("Cache-Control", "")
    assert "no-store" in cache_control or "private" in cache_control
