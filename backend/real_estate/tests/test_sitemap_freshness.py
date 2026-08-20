"""The public listing carries the date the sitemap turns into `lastmod`.

The portal builds its sitemap from this endpoint. When the payload had no date
at all, every one of the 16k URLs declared the render time — the value search
engines discard, and the one thing the sitemap code says it must never do.
"""

import pytest
from rest_framework.test import APIClient

from real_estate.models import Property


pytestmark = pytest.mark.django_db


@pytest.mark.api
def test_property_listing_carries_the_modification_date():
    """SPEC:SEO-006 — `lastmod` needs a real date to come from."""
    Property.objects.create(
        title="Casa en Cumbayá", city="Quito", province="Pichincha",
        property_type="house", status="for_sale", price=180000, area=120,
    )

    response = APIClient().get("/api/properties/", {"page_size": "1"})

    assert response.status_code == 200
    listing = response.data["results"][0]
    assert listing["updated_at"], "the sitemap reads updated_at from this payload"


@pytest.mark.api
def test_a_visit_does_not_pass_for_a_change():
    """SPEC:SEO-006 — counting a view must not move the modification date.

    The counter is a queryset `update()` precisely so `auto_now` stays out of
    it. Were it a `save()`, every visit would republish the ficha as modified
    and the freshness signal would become noise. The browser User-Agent is what
    makes the visit count at all: a crawler reads the ficha without moving the
    counter.
    """
    prop = Property.objects.create(
        title="Terreno en Tumbaco", city="Quito", province="Pichincha",
        property_type="land", status="for_sale", price=90000, area=800,
    )
    before = Property.objects.values_list("updated_at", flat=True).get(pk=prop.pk)

    APIClient().get(
        f"/api/properties/{prop.pk}/",
        HTTP_USER_AGENT=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
        ),
    )

    after = Property.objects.values_list("updated_at", flat=True).get(pk=prop.pk)
    assert after == before
    assert Property.objects.values_list("views_count", flat=True).get(pk=prop.pk) == 1
