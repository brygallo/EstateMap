"""Same audit, but with filters active: the anchor is hardcoded and cannot follow them."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estate_map.settings')
django.setup()

from real_estate.models import Property
from real_estate.services.map_payload import (
    _row_has_valid_point, _canonical_city_key, _normalize_name,
    _city_anchor, POINT_FIELDS, _distance_km,
)


def viewport_span(zoom, width=1280, height=760):
    lng = 360.0 * width / (512.0 * (2 ** zoom))
    return lng * height / width, lng


def median(values):
    values = sorted(values)
    n = len(values)
    mid = n // 2
    return values[mid] if n % 2 else (values[mid - 1] + values[mid]) / 2


LAT_SPAN, LNG_SPAN = viewport_span(12.2)

SCENARIOS = [
    ('sin filtros', {}),
    ('alquiler', {'status': 'for_rent'}),
    ('terrenos', {'property_type': 'land'}),
    ('terrenos en alquiler', {'property_type': 'land', 'status': 'for_rent'}),
    ('casas > $300k', {'property_type': 'house', 'price__gte': 300000}),
    ('locales comerciales', {'property_type': 'commercial'}),
]

for name, filters in SCENARIOS:
    qs = Property.objects.exclude(status='inactive').exclude(is_duplicate=True).filter(**filters)
    rows = [r for r in qs.values(*POINT_FIELDS) if _row_has_valid_point(r)]
    grouped = {}
    for row in rows:
        city_key = _canonical_city_key(row.get('city'))
        prov_key = _normalize_name(row.get('province'))
        anchor = _city_anchor(prov_key, city_key)
        if anchor:
            grouped.setdefault((city_key, anchor['lat'], anchor['lng']), []).append(row)

    print(f'\n=== {name} ({len(rows)} propiedades) ===')
    for (city, alat, alng), bucket in sorted(grouped.items(), key=lambda kv: -len(kv[1]))[:5]:
        lats = [float(r['latitude']) for r in bucket]
        lngs = [float(r['longitude']) for r in bucket]
        n = len(lats)
        inside = sum(
            1 for lat, lng in zip(lats, lngs)
            if abs(lat - alat) <= LAT_SPAN / 2 and abs(lng - alng) <= LNG_SPAN / 2
        )
        mlat, mlng = median(lats), median(lngs)
        inside_med = sum(
            1 for lat, lng in zip(lats, lngs)
            if abs(lat - mlat) <= LAT_SPAN / 2 and abs(lng - mlng) <= LNG_SPAN / 2
        )
        shift = _distance_km(mlat, mlng, alat, alng)
        print(f'  {city:22} n={n:5}  ancla fija: {inside*100//n:3}% en pantalla   '
              f'mediana real: {inside_med*100//n:3}%  (desplazada {shift:.1f} km)')
