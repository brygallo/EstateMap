"""
Validación de ubicación. **No geocodificamos**: solo aceptamos anuncios que ya
traen lat/lng, y que caen dentro de Ecuador. Reutiliza el bounding box oficial
del proyecto en ``real_estate.geo``.
"""
from real_estate.geo import coord_in_ecuador


def parse_coord(value):
    """Convierte '-1.6074884' o -1.6 a float; None si no es válido."""
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def validate_location(latitude, longitude):
    """
    Devuelve ``(ok, lat, lng, motivo)``.

    - ``ok=False`` con motivo 'sin_coordenadas' si falta lat o lng.
    - ``ok=False`` con motivo 'fuera_de_ecuador' si cae fuera del bounding box.
    - ``ok=True`` con lat/lng float si es válido.
    """
    lat = parse_coord(latitude)
    lng = parse_coord(longitude)
    if lat is None or lng is None:
        return False, None, None, "sin_coordenadas"
    if not coord_in_ecuador(lat, lng):
        return False, lat, lng, "fuera_de_ecuador"
    return True, lat, lng, ""
