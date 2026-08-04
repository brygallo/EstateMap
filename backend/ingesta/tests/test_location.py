from ingesta.pipeline.location import validate_location


def test_import_location_requires_real_coordinates_inside_ecuador():
    """SPEC:IMP-012 — missing or out-of-country coordinates reject a listing."""
    assert validate_location(None, None) == (False, None, None, "sin_coordenadas")
    assert validate_location(4.7, -74.07) == (False, 4.7, -74.07, "fuera_de_ecuador")
    assert validate_location(-0.18, -78.48) == (True, -0.18, -78.48, "")
