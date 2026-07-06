"""
Geographic helpers for validating and normalizing property polygons.

Polygons arrive from the frontend either as a GeoJSON ``Polygon`` object or as a
simple ``[[lat, lng], ...]`` ring. They are always stored as GeoJSON with
``[lng, lat]`` coordinate order (the GeoJSON standard). These helpers enforce
that the geometry is well-formed, sits inside Ecuador, and covers a sane area.
"""

import math

# --- Ecuador bounding box (includes the Galápagos Islands) -------------------
# Continental Ecuador spans roughly lat [-5.0, 1.5], lng [-81.1, -75.2].
# Galápagos extends the western/northern edge to ~ -92.0 lng / 1.7 lat.
ECUADOR_LAT_MIN = -5.10
ECUADOR_LAT_MAX = 1.75
ECUADOR_LNG_MIN = -92.10
ECUADOR_LNG_MAX = -75.15

# --- Area limits (square meters) ---------------------------------------------
# A plot smaller than this is almost certainly a drawing mistake; larger than
# this is beyond any realistic single real-estate listing (500 ha).
MIN_POLYGON_AREA_M2 = 10.0
MAX_POLYGON_AREA_M2 = 5_000_000.0

# Meters per degree of latitude (roughly constant).
_METERS_PER_DEG_LAT = 111_320.0


class PolygonValidationError(ValueError):
    """Raised when a polygon fails geographic validation."""


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def coord_in_ecuador(lat, lng):
    """True if a ``(lat, lng)`` pair falls inside the Ecuador bounding box."""
    return (
        ECUADOR_LAT_MIN <= lat <= ECUADOR_LAT_MAX
        and ECUADOR_LNG_MIN <= lng <= ECUADOR_LNG_MAX
    )


def polygon_area_m2(ring_latlng):
    """
    Approximate the area (m²) of a ring given as ``[[lat, lng], ...]`` using an
    equirectangular projection centered on the ring's mean latitude and the
    shoelace formula. Accurate enough for validation at property scale.
    """
    if len(ring_latlng) < 3:
        return 0.0

    mean_lat = sum(lat for lat, _ in ring_latlng) / len(ring_latlng)
    meters_per_deg_lng = _METERS_PER_DEG_LAT * math.cos(math.radians(mean_lat))

    # Project to local meters (x = east, y = north).
    points = [
        (lng * meters_per_deg_lng, lat * _METERS_PER_DEG_LAT)
        for lat, lng in ring_latlng
    ]

    area = 0.0
    n = len(points)
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        area += x1 * y2 - x2 * y1
    return abs(area) / 2.0


def _extract_ring_latlng(value):
    """
    Normalize any accepted polygon input into a ``[[lat, lng], ...]`` ring,
    raising :class:`PolygonValidationError` on structural problems. Does not yet
    check Ecuador bounds or area.
    """
    # GeoJSON Polygon: {"type": "Polygon", "coordinates": [[[lng, lat], ...]]}
    if isinstance(value, dict):
        if value.get("type") != "Polygon":
            raise PolygonValidationError(
                "El polígono GeoJSON debe ser de tipo 'Polygon'."
            )
        coordinates = value.get("coordinates")
        if not isinstance(coordinates, list) or not coordinates:
            raise PolygonValidationError(
                "El polígono GeoJSON no tiene coordenadas válidas."
            )
        outer_ring = coordinates[0]
        if not isinstance(outer_ring, list):
            raise PolygonValidationError("El anillo del polígono es inválido.")
        # GeoJSON is [lng, lat]; convert to [lat, lng].
        ring = []
        for point in outer_ring:
            if not (isinstance(point, list) and len(point) == 2):
                raise PolygonValidationError(
                    "Cada coordenada debe ser un par [lng, lat]."
                )
            lng, lat = point
            if not (_is_number(lat) and _is_number(lng)):
                raise PolygonValidationError("Las coordenadas deben ser numéricas.")
            ring.append([lat, lng])
        return ring

    # Simple array: [[lat, lng], ...]
    if isinstance(value, list):
        ring = []
        for point in value:
            if not (isinstance(point, list) and len(point) == 2):
                raise PolygonValidationError(
                    "Cada coordenada debe ser un par [lat, lng]."
                )
            lat, lng = point
            if not (_is_number(lat) and _is_number(lng)):
                raise PolygonValidationError("Las coordenadas deben ser numéricas.")
            ring.append([lat, lng])
        return ring

    raise PolygonValidationError("Formato de polígono no reconocido.")


def validate_and_normalize_polygon(value):
    """
    Validate a polygon (GeoJSON or ``[[lat, lng], ...]``) and return a canonical,
    closed GeoJSON ``Polygon`` dict with ``[lng, lat]`` coordinate order.

    Enforces: ≥3 distinct vertices, all coordinates inside Ecuador, a sane area,
    and a closed ring (first point repeated as last).

    Raises :class:`PolygonValidationError` on any problem.
    """
    ring = _extract_ring_latlng(value)

    # Drop a trailing closing point so we count real vertices.
    open_ring = ring[:-1] if len(ring) >= 2 and ring[0] == ring[-1] else ring

    # Deduplicate consecutive identical points for the vertex count.
    distinct = [p for i, p in enumerate(open_ring) if i == 0 or p != open_ring[i - 1]]
    if len(distinct) < 3:
        raise PolygonValidationError(
            "El polígono debe tener al menos 3 vértices distintos."
        )

    # Bounds check.
    for lat, lng in distinct:
        if not coord_in_ecuador(lat, lng):
            raise PolygonValidationError(
                f"La coordenada ({lat:.5f}, {lng:.5f}) está fuera de Ecuador."
            )

    # Area check.
    area = polygon_area_m2(distinct)
    if area < MIN_POLYGON_AREA_M2:
        raise PolygonValidationError(
            f"El área del polígono es demasiado pequeña "
            f"({area:.1f} m², mínimo {MIN_POLYGON_AREA_M2:.0f} m²)."
        )
    if area > MAX_POLYGON_AREA_M2:
        raise PolygonValidationError(
            f"El área del polígono es demasiado grande "
            f"({area:.0f} m², máximo {MAX_POLYGON_AREA_M2:.0f} m²)."
        )

    # Build a canonical, closed GeoJSON ring in [lng, lat] order.
    closed = distinct + [distinct[0]]
    geojson_coords = [[lng, lat] for lat, lng in closed]
    return {"type": "Polygon", "coordinates": [geojson_coords]}
