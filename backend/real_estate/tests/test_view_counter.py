"""A visit is a person opening the ficha, and only the beacon sees one."""

import pytest
from rest_framework.test import APIClient

from real_estate.models import ActivityEvent, Property

pytestmark = pytest.mark.django_db

HUMAN_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
CRAWLER_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"


def _listing():
    return Property.objects.create(
        title="Casa", city="Quito", property_type="house", status="for_sale",
        price=100000, area=100,
    )


def _beacon(client, prop, user_agent, page_type="property"):
    return client.post(
        "/api/activity-events/",
        {
            "event_name": "page_view",
            "session_id": "session-1",
            "path": f"/propiedad/{prop.pk}",
            "payload": {"page_type": page_type},
        },
        format="json",
        HTTP_USER_AGENT=user_agent,
    )


def test_a_person_opening_the_ficha_moves_the_counter():
    """SPEC:PROP-024 — the browser beacon is what counts a visit."""
    prop = _listing()

    response = _beacon(APIClient(), prop, HUMAN_UA)

    assert response.status_code == 201
    prop.refresh_from_db()
    assert prop.views_count == 1
    assert ActivityEvent.objects.get().property_id == prop.pk


def test_a_crawler_running_the_beacon_does_not():
    """SPEC:PROP-024 — crawlers execute JavaScript; they are still not people."""
    prop = _listing()

    response = _beacon(APIClient(), prop, CRAWLER_UA)

    assert response.status_code == 201
    prop.refresh_from_db()
    assert prop.views_count == 0
    assert ActivityEvent.objects.get().is_bot is True


def test_reading_the_detail_endpoint_does_not_count_anybody():
    """SPEC:PROP-024 — that request is a render of a cached page."""
    prop = _listing()

    APIClient().get(f"/api/properties/{prop.pk}/", HTTP_USER_AGENT=HUMAN_UA)

    prop.refresh_from_db()
    assert prop.views_count == 0


def test_a_page_view_somewhere_else_is_not_a_visit_to_a_listing():
    """SPEC:PROP-024 — only the ficha's own page view counts."""
    prop = _listing()

    _beacon(APIClient(), prop, HUMAN_UA, page_type="map")

    prop.refresh_from_db()
    assert prop.views_count == 0
