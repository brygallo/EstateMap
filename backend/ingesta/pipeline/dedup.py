"""
Deduplicación en dos niveles (ver PLAN.md):

1. Misma fuente: clave ``(source, external_id)`` -> lo resuelve el upsert.
2. Entre fuentes distintas: **cercanía geográfica**. Si ya existe una propiedad
   importada a menos de ``PROXIMITY_M`` metros y con área compatible, se
   considera la misma propiedad física y no se crea una nueva.

Sin PostGIS: se prefiltra por un bounding box sobre ``latitude``/``longitude``
(índices B-tree) y se confirma con haversine en Python.
"""
import math
import re

PROXIMITY_M = 30.0          # radio para "misma ubicación exacta"
WIDE_RADIUS_M = 500.0       # radio amplio: el mismo lote con pin desplazado entre portales
AREA_TOLERANCE = 0.10       # ±10% de área (con teléfono o proximidad)
ATTR_TOLERANCE = 0.03       # ±3% de área/precio (para confirmar a distancia media)

_METERS_PER_DEG_LAT = 111_320.0


def haversine_m(lat1, lng1, lat2, lng2):
    """Distancia en metros entre dos coordenadas."""
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _pct_within(a, b, tol):
    """True si a y b (ambos presentes) están dentro de ±tol relativo."""
    if not a or not b:
        return False
    a, b = float(a), float(b)
    lo, hi = sorted((a, b))
    return hi > 0 and (hi - lo) / hi <= tol


def _area_compatible(a, b):
    if not a or not b:
        return True  # si a alguno le falta el área, no descartamos por área
    lo, hi = sorted((a, b))
    return (hi - lo) / hi <= AREA_TOLERANCE


def normalize_phone(phone):
    """Deja solo dígitos y toma los últimos 9 (celulares/fijos EC) para comparar."""
    digits = re.sub(r"\D", "", phone or "")
    return digits[-9:] if len(digits) >= 9 else digits


def find_duplicate(latitude, longitude, area=None, price=None, phone=None,
                   image_hash=None, exclude_source_id=None):
    """
    Detecta si un anuncio ya existe como propiedad canónica de OTRA fuente.

    NO usamos el teléfono como señal: una inmobiliaria/persona tiene un solo
    número y muchas propiedades distintas, así que uniría anuncios diferentes.

    Señales usadas (de más a menos confiable):
    1. **Misma huella de imagen** (mismas fotos) -> la señal definitiva; identifica
       la misma propiedad aunque la ubicación y el resto difieran.
    2. **Proximidad < 30 m** + área compatible -> misma ubicación exacta.
    3. **Área ±3% y precio ±3%** dentro de ~500 m -> mismo lote con el pin
       desplazado entre portales (requiere que área Y precio coincidan para no
       unir lotes vecinos de un mismo proyecto).

    Devuelve la Property canónica o ``None``.
    """
    from real_estate.models import Property  # import diferido (evita ciclos)

    canon = Property.objects.filter(is_imported=True, is_duplicate=False)
    if exclude_source_id is not None:
        canon = canon.exclude(source_id=exclude_source_id)

    # --- Señal 1: misma imagen (independiente de ubicación/precio/teléfono) ---
    if image_hash:
        match = canon.filter(image_hash=image_hash).only("id").first()
        if match is not None:
            return match

    # --- Señales 2 y 3: geográficas + atributos (bbox amplio ~500 m) ---
    if latitude is None or longitude is None:
        return None
    dlat = WIDE_RADIUS_M / _METERS_PER_DEG_LAT
    dlng = WIDE_RADIUS_M / (_METERS_PER_DEG_LAT * max(math.cos(math.radians(latitude)), 1e-6))
    near = canon.filter(
        latitude__range=(latitude - dlat, latitude + dlat),
        longitude__range=(longitude - dlng, longitude + dlng),
    ).only("id", "latitude", "longitude", "area", "price")

    for cand in near:
        if cand.latitude is None or cand.longitude is None:
            continue
        dist = haversine_m(latitude, longitude, cand.latitude, cand.longitude)
        # 2) misma ubicación exacta
        if dist <= PROXIMITY_M and _area_compatible(area, cand.area):
            return cand
        # 3) pin desplazado pero misma área y precio
        if dist <= WIDE_RADIUS_M and _pct_within(area, cand.area, ATTR_TOLERANCE) \
                and _pct_within(price, cand.price, ATTR_TOLERANCE):
            return cand
    return None


# Alias de compatibilidad.
def find_nearby_duplicate(latitude, longitude, area=None, exclude_source_id=None):
    return find_duplicate(latitude, longitude, area=area, exclude_source_id=exclude_source_id)
