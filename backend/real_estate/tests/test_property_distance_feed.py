import pytest

from real_estate.models import Property

pytestmark = pytest.mark.django_db


def _property(title, latitude, longitude):
    return Property.objects.create(
        title=title,
        price=100000,
        latitude=latitude,
        longitude=longitude,
    )


def test_property_feed_paginates_the_catalogue_from_nearest_to_farthest(api_client):
    """SPEC:PROP-031 — the card feed continues beyond the current map area."""
    farthest = _property('Quito', -0.1807, -78.4678)
    nearest = _property('Macas centro', -2.3087, -78.1114)
    farther = _property('Puyo', -1.4924, -77.9972)
    nearby = _property('Macas norte', -2.2980, -78.1100)

    first = api_client.get(
        '/api/properties/',
        {'origin_lat': -2.3087, 'origin_lng': -78.1114, 'page_size': 2},
    )
    second = api_client.get(
        '/api/properties/',
        {'origin_lat': -2.3087, 'origin_lng': -78.1114, 'page_size': 2, 'page': 2},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert [row['id'] for row in first.data['results']] == [nearest.id, nearby.id]
    assert [row['id'] for row in second.data['results']] == [farther.id, farthest.id]
    assert first.data['next'] is not None


def test_property_feed_places_missing_coordinates_last(api_client):
    """SPEC:PROP-031 — unlocated listings do not displace nearby cards."""
    missing = _property('Sin ubicación', None, None)
    located = _property('Macas', -2.3087, -78.1114)

    response = api_client.get(
        '/api/properties/',
        {'origin_lat': -2.3087, 'origin_lng': -78.1114, 'page_size': 10},
    )

    assert response.status_code == 200
    assert [row['id'] for row in response.data['results']] == [located.id, missing.id]
