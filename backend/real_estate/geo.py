"""
Geographic helpers for validating and normalizing property polygons.

Polygons arrive from the frontend either as a GeoJSON ``Polygon`` object or as a
simple ``[[lat, lng], ...]`` ring. They are always stored as GeoJSON with
``[lng, lat]`` coordinate order (the GeoJSON standard). These helpers enforce
that the geometry is well-formed, sits inside Ecuador, and covers a sane area.
"""

import math

# --- Ecuador bounding box (includes the Galápagos Islands) -------------------
# Continental Ecuador and Galápagos are separated so the ocean between them
# does not become "valid Ecuador" for map clusters.
ECUADOR_MAINLAND_LAT_MIN = -5.45
ECUADOR_MAINLAND_LAT_MAX = 1.9
ECUADOR_MAINLAND_LNG_MIN = -81.35
ECUADOR_MAINLAND_LNG_MAX = -74.75

GALAPAGOS_LAT_MIN = -1.75
GALAPAGOS_LAT_MAX = 1.85
GALAPAGOS_LNG_MIN = -92.2
GALAPAGOS_LNG_MAX = -88.45

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
    """True if a ``(lat, lng)`` pair falls inside mainland Ecuador or Galápagos."""
    in_mainland = (
        ECUADOR_MAINLAND_LAT_MIN <= lat <= ECUADOR_MAINLAND_LAT_MAX
        and ECUADOR_MAINLAND_LNG_MIN <= lng <= ECUADOR_MAINLAND_LNG_MAX
    )
    in_galapagos = (
        GALAPAGOS_LAT_MIN <= lat <= GALAPAGOS_LAT_MAX
        and GALAPAGOS_LNG_MIN <= lng <= GALAPAGOS_LNG_MAX
    )
    return in_mainland or in_galapagos


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


def _orientation(a, b, c):
    value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])
    if math.isclose(value, 0.0, abs_tol=1e-12):
        return 0
    return 1 if value > 0 else 2


def _on_segment(a, b, c):
    return (
        min(a[0], c[0]) <= b[0] <= max(a[0], c[0])
        and min(a[1], c[1]) <= b[1] <= max(a[1], c[1])
    )


def _segments_intersect(a, b, c, d):
    o1, o2 = _orientation(a, b, c), _orientation(a, b, d)
    o3, o4 = _orientation(c, d, a), _orientation(c, d, b)
    if o1 != o2 and o3 != o4:
        return True
    return (
        (o1 == 0 and _on_segment(a, c, b))
        or (o2 == 0 and _on_segment(a, d, b))
        or (o3 == 0 and _on_segment(c, a, d))
        or (o4 == 0 and _on_segment(c, b, d))
    )


def polygon_self_intersects(ring_latlng):
    """Return True when two non-adjacent polygon edges intersect."""
    edge_count = len(ring_latlng)
    for first in range(edge_count):
        a, b = ring_latlng[first], ring_latlng[(first + 1) % edge_count]
        for second in range(first + 1, edge_count):
            if second == first or second == first + 1:
                continue
            if first == 0 and second == edge_count - 1:
                continue
            c, d = ring_latlng[second], ring_latlng[(second + 1) % edge_count]
            if _segments_intersect(a, b, c, d):
                return True
    return False


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

    # Remove consecutive duplicates and require three genuinely distinct
    # coordinates (not merely three entries in the array).
    distinct = [p for i, p in enumerate(open_ring) if i == 0 or p != open_ring[i - 1]]
    if len({tuple(point) for point in distinct}) < 3:
        raise PolygonValidationError(
            "El polígono debe tener al menos 3 vértices distintos."
        )

    # Bounds check.
    for lat, lng in distinct:
        if not coord_in_ecuador(lat, lng):
            raise PolygonValidationError(
                f"La coordenada ({lat:.5f}, {lng:.5f}) está fuera de Ecuador."
            )

    if polygon_self_intersects(distinct):
        raise PolygonValidationError(
            "Los lados del polígono no pueden cruzarse entre sí."
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
