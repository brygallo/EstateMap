import pytest

from real_estate.geo import PolygonValidationError, validate_and_normalize_polygon


def test_normalizes_open_lat_lng_ring_to_closed_geojson():
    result = validate_and_normalize_polygon([
        [-0.20, -78.50],
        [-0.20, -78.49],
        [-0.21, -78.49],
    ])

    assert result["type"] == "Polygon"
    assert result["coordinates"][0][0] == [-78.50, -0.20]
    assert result["coordinates"][0][-1] == result["coordinates"][0][0]


def test_rejects_self_intersecting_polygon():
    with pytest.raises(PolygonValidationError, match="no pueden cruzarse"):
        validate_and_normalize_polygon([
            [-0.20, -78.50],
            [-0.21, -78.49],
            [-0.20, -78.49],
            [-0.21, -78.50],
        ])
