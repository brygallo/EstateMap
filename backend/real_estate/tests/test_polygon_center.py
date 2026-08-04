import pytest

from real_estate.geo import polygon_center_lat_lng
from real_estate.models import Property


MACAS_RING = [
    [-2.3261, -78.1315],
    [-2.3261, -78.1313],
    [-2.3259, -78.1313],
    [-2.3259, -78.1315],
]


def test_center_of_a_lat_lng_ring():
    lat, lng = polygon_center_lat_lng(MACAS_RING)

    assert lat == pytest.approx(-2.3260, abs=1e-4)
    assert lng == pytest.approx(-78.1314, abs=1e-4)


def test_center_of_a_closed_geojson_ring_ignores_the_repeated_point():
    geojson = {
        "type": "Polygon",
        "coordinates": [[[lng, lat] for lat, lng in MACAS_RING] + [[MACAS_RING[0][1], MACAS_RING[0][0]]]],
    }

    assert polygon_center_lat_lng(geojson) == pytest.approx(
        polygon_center_lat_lng(MACAS_RING)
    )


@pytest.mark.parametrize("polygon", [None, [], {}, {"coordinates": []}, "nonsense"])
def test_shapes_without_usable_points_have_no_center(polygon):
    assert polygon_center_lat_lng(polygon) is None


@pytest.mark.django_db
def test_saving_a_polygon_fills_the_coordinates():
    """SPEC:PROP-027 — a listing with a shape always has a position."""
    property_obj = Property.objects.create(title="Terreno dibujado", polygon=MACAS_RING)

    property_obj.refresh_from_db()
    assert property_obj.latitude == pytest.approx(-2.3260, abs=1e-4)
    assert property_obj.longitude == pytest.approx(-78.1314, abs=1e-4)


@pytest.mark.django_db
def test_an_explicit_point_is_never_overwritten_by_the_centroid():
    property_obj = Property.objects.create(
        title="Terreno con punto propio",
        polygon=MACAS_RING,
        latitude=-2.5,
        longitude=-78.9,
    )

    property_obj.refresh_from_db()
    assert property_obj.latitude == -2.5
    assert property_obj.longitude == -78.9


@pytest.mark.django_db
def test_saving_only_the_polygon_still_persists_the_computed_center():
    property_obj = Property.objects.create(title="Sin forma todavía")
    assert property_obj.latitude is None

    property_obj.polygon = MACAS_RING
    property_obj.save(update_fields=["polygon"])

    property_obj.refresh_from_db()
    assert property_obj.latitude == pytest.approx(-2.3260, abs=1e-4)
    assert property_obj.longitude == pytest.approx(-78.1314, abs=1e-4)


@pytest.mark.django_db
def test_a_property_without_a_shape_keeps_null_coordinates():
    property_obj = Property.objects.create(title="Sin ubicación")

    property_obj.refresh_from_db()
    assert property_obj.latitude is None
    assert property_obj.longitude is None
