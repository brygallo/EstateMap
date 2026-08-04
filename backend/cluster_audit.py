"""Measure how far the hardcoded cluster anchors sit from the real inventory."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estate_map.settings')
django.setup()

import math
from real_estate.models import Property
from real_estate.services.map_payload import (
    _row_has_valid_point, _canonical_city_key, _normalize_name,
    _city_anchor, PROVINCE_CENTERS, POINT_FIELDS, _grid_anchor, _distance_km,
)

rows = list(
    Property.objects.exclude(status='inactive').exclude(is_duplicate=True).values(*POINT_FIELDS)
)
valid = [r for r in rows if _row_has_valid_point(r)]
print(f'valid points: {len(valid)} of {len(rows)}')


def viewport_span(zoom, width=1280, height=760):
    """Degrees visible at a given maplibre zoom (512px tiles)."""
    lng = 360.0 * width / (512.0 * (2 ** zoom))
    lat = lng * height / width
    return lat, lng


def median(values):
    values = sorted(values)
    n = len(values)
    if not n:
        return 0.0
    mid = n // 2
    return values[mid] if n % 2 else (values[mid - 1] + values[mid]) / 2


buckets = {}
for row in valid:
    city_key = _canonical_city_key(row.get('city'))
    prov_key = _normalize_name(row.get('province'))
    anchor = _city_anchor(prov_key, city_key)
    if not anchor:
        continue
    buckets.setdefault((prov_key, city_key), {'anchor': anchor, 'rows': []})['rows'].append(row)

lat_span, lng_span = viewport_span(12.2)
print(f'\nviewport at city expansion_zoom 12.2: {lat_span:.3f} lat x {lng_span:.3f} lng '
      f'(~{lat_span*111:.1f} km x {lng_span*111:.1f} km)\n')

print(f'{"ciudad":28} {"n":>6} {"en pantalla":>12} {"dist media":>11} {"p90 dist":>9} '
      f'{"mediana vs ancla":>17} {"en pantalla (mediana)":>22}')
report = []
for (prov, city), bucket in buckets.items():
    lats = [float(r['latitude']) for r in bucket['rows']]
    lngs = [float(r['longitude']) for r in bucket['rows']]
    n = len(lats)
    if n < 20:
        continue
    a = bucket['anchor']
    inside = sum(
        1 for lat, lng in zip(lats, lngs)
        if abs(lat - a['lat']) <= lat_span / 2 and abs(lng - a['lng']) <= lng_span / 2
    )
    dists = sorted(_distance_km(lat, lng, a['lat'], a['lng']) for lat, lng in zip(lats, lngs))
    med = {'lat': median(lats), 'lng': median(lngs)}
    inside_med = sum(
        1 for lat, lng in zip(lats, lngs)
        if abs(lat - med['lat']) <= lat_span / 2 and abs(lng - med['lng']) <= lng_span / 2
    )
    report.append((n, city, inside, dists, med, a, inside_med))

for n, city, inside, dists, med, a, inside_med in sorted(report, reverse=True):
    p90 = dists[int(len(dists) * 0.9)]
    avg = sum(dists) / len(dists)
    shift = _distance_km(med['lat'], med['lng'], a['lat'], a['lng'])
    print(f'{city:28} {n:6} {inside*100//n:11}% {avg:10.1f}km {p90:8.1f}km '
          f'{shift:16.1f}km {inside_med*100//n:21}%')

# Grid clusters: distance from the grid-cell center (the marker) to the nearest
# property inside that cell.
print('\n--- grid clusters (zoom 10.5, grid 0.08) ---')
grid_size = 0.08
cells = {}
for row in valid:
    lat, lng = float(row['latitude']), float(row['longitude'])
    key = (math.floor(lat / grid_size), math.floor(lng / grid_size))
    cells.setdefault(key, []).append((lat, lng))

gaps = []
for key, pts in cells.items():
    if len(pts) <= 3:
        continue
    anchor = _grid_anchor(pts[0][0], pts[0][1], grid_size)
    nearest = min(_distance_km(lat, lng, anchor['lat'], anchor['lng']) for lat, lng in pts)
    gaps.append((nearest, len(pts)))

gaps.sort(reverse=True)
print(f'celdas con cluster: {len(gaps)}')
if gaps:
    only = sorted(g[0] for g in gaps)
    print(f'distancia del marcador a la propiedad MAS CERCANA de su celda: '
          f'mediana {median(only):.2f} km, p90 {only[int(len(only)*0.9)]:.2f} km, max {only[-1]:.2f} km')
    print('peores celdas (km al punto mas cercano, n propiedades):', [(round(g, 1), g2) for g, g2 in gaps[:8]])
