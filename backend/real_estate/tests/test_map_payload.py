import pytest

from real_estate.services.map_payload import build_map_payload


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
