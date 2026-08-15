import pytest

from real_estate.services.map_payload import build_map_payload


def _listing(index, lat, lng, city='Quito', province='Pichincha'):
    return {
        'id': index,
        'property_type': 'house',
        'status': 'for_sale',
        'latitude': lat,
        'longitude': lng,
        'polygon': None,
        'show_measurements': True,
        'price': 100000,
        'city': city,
        'province': province,
    }


class FakeQuerySet:
    def __init__(self, rows):
        self.rows = rows

    def values(self, *fields):
        return [{field: row.get(field) for field in fields} for row in self.rows]


def test_polygon_without_stored_point_gets_a_map_pin_at_its_center():
    polygon = {
        'type': 'Polygon',
        'coordinates': [[
            [-78.50, -0.20],
            [-78.48, -0.20],
            [-78.48, -0.18],
            [-78.50, -0.18],
            [-78.50, -0.20],
        ]],
    }
    queryset = FakeQuerySet([{
        'id': 1,
        'property_type': 'land',
        'status': 'for_sale',
        'latitude': None,
        'longitude': None,
        'polygon': polygon,
        'show_measurements': True,
        'price': 100000,
        'city': 'Quito',
        'province': 'Pichincha',
    }])

    payload = build_map_payload(queryset, zoom=14, max_items=100)

    assert payload['point_count'] == 1
    assert payload['items'][0]['latitude'] == pytest.approx(-0.19)
    assert payload['items'][0]['longitude'] == pytest.approx(-78.49)


def test_city_cluster_sits_on_its_listings_not_on_the_canton_center():
    """
    Every listing is in Cumbayá, ~12 km east of the coordinates the catalogue
    holds for Quito. The bubble has to follow the inventory: anchored to the
    canton centre, opening it showed empty map.
    """
    rows = [_listing(i, -0.205 + i * 0.001, -78.43 + i * 0.001) for i in range(12)]

    payload = build_map_payload(FakeQuerySet(rows), zoom=9.0, max_items=100)
    cluster = next(item for item in payload['items'] if item.get('is_cluster'))

    assert cluster['count'] == 12
    assert cluster['longitude'] > -78.44
    # The marker is one of the real listings, never a point with nothing on it.
    assert any(
        row['latitude'] == cluster['latitude'] and row['longitude'] == cluster['longitude']
        for row in rows
    )


def test_cluster_bounds_ignore_a_single_misplaced_listing():
    """One row geocoded into another province must not blow up the framing."""
    rows = [_listing(i, -0.20 + i * 0.0005, -78.47 + i * 0.0005) for i in range(40)]
    rows.append(_listing(999, -2.17, -79.90))

    payload = build_map_payload(FakeQuerySet(rows), zoom=9.0, max_items=100)
    cluster = next(item for item in payload['items'] if item.get('is_cluster'))

    assert cluster['bounds']['south'] > -1.0
    assert cluster['bounds']['west'] > -79.0
    # A tight group must not be described as a box the camera cannot zoom into.
    assert cluster['expansion_zoom'] <= 16.5


def test_expansion_zoom_follows_how_spread_out_the_group_is():
    tight = [_listing(i, -0.200 + i * 0.0002, -78.470 + i * 0.0002) for i in range(10)]
    spread = [_listing(i, -0.30 + i * 0.02, -78.60 + i * 0.02) for i in range(10)]

    tight_cluster = next(
        item for item in build_map_payload(FakeQuerySet(tight), zoom=9.0, max_items=100)['items']
        if item.get('is_cluster')
    )
    spread_cluster = next(
        item for item in build_map_payload(FakeQuerySet(spread), zoom=9.0, max_items=100)['items']
        if item.get('is_cluster')
    )

    assert tight_cluster['expansion_zoom'] > spread_cluster['expansion_zoom']


def test_map_uses_only_country_province_and_city_clusters():
    rows = [_listing(i, -0.20 + i * 0.001, -78.47 + i * 0.001) for i in range(10)]

    assert build_map_payload(FakeQuerySet(rows), zoom=5.0, max_items=100)['group_level'] == 'country'
    assert build_map_payload(FakeQuerySet(rows), zoom=6.0, max_items=100)['group_level'] == 'province'
    assert build_map_payload(FakeQuerySet(rows), zoom=8.0, max_items=100)['group_level'] == 'city'

    points = build_map_payload(FakeQuerySet(rows), zoom=9.3, max_items=100)
    assert points['mode'] == 'points'
    assert points['cluster_count'] == 0
    assert all(not item['is_cluster'] for item in points['items'])


def test_city_cluster_exposes_territorial_anchor_for_direct_navigation():
    rows = [_listing(i, -0.205 + i * 0.001, -78.43 + i * 0.001) for i in range(10)]

    payload = build_map_payload(FakeQuerySet(rows), zoom=8.0, max_items=100)
    cluster = next(item for item in payload['items'] if item['is_cluster'])

    assert cluster['group_level'] == 'city'
    assert cluster['anchor_latitude'] == pytest.approx(-0.18)
    assert cluster['anchor_longitude'] == pytest.approx(-78.47)


def test_province_cluster_reports_whether_it_has_named_cities():
    """SPEC:MCLUS-006 — provinces without cities can skip the empty level."""
    without_cities = [_listing(i, -0.10 + i * 0.001, -76.90, city='', province='Sucumbíos') for i in range(4)]
    with_city = [_listing(i, -0.20 + i * 0.001, -78.47, city='Quito') for i in range(4)]

    empty_cluster = next(
        item for item in build_map_payload(FakeQuerySet(without_cities), zoom=6.0, max_items=100)['items']
        if item['is_cluster']
    )
    named_cluster = next(
        item for item in build_map_payload(FakeQuerySet(with_city), zoom=6.0, max_items=100)['items']
        if item['is_cluster']
    )

    assert empty_cluster['has_named_cities'] is False
    assert named_cluster['has_named_cities'] is True
