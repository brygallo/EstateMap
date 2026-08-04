"""Simulate a click on every cluster the API returns and check what lands on screen."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estate_map.settings')
django.setup()

import math
from real_estate.models import Property
from real_estate.services.map_payload import (
    build_map_payload, _row_has_valid_point, POINT_FIELDS, _distance_km,
)

WIDTH, HEIGHT, PADDING = 1280, 760, 92


def fit_bounds(bounds, max_zoom):
    """Reproduce maplibre's fitBounds: the zoom where the box fits, capped."""
    lat_span = max(bounds['north'] - bounds['south'], 1e-9)
    lng_span = max(bounds['east'] - bounds['west'], 1e-9)
    usable_w = max(WIDTH - 2 * PADDING, 1)
    usable_h = max(HEIGHT - 2 * PADDING, 1)
    zoom = min(
        math.log2(360.0 * usable_w / (512.0 * lng_span)),
        math.log2(360.0 * usable_h / (512.0 * lat_span)),
    )
    zoom = min(zoom, max_zoom)
    center = {'lat': (bounds['north'] + bounds['south']) / 2, 'lng': (bounds['east'] + bounds['west']) / 2}
    return center, zoom


def viewport(center, zoom):
    lng_span = 360.0 * WIDTH / (512.0 * (2 ** zoom))
    lat_span = lng_span * HEIGHT / WIDTH
    return (center['lat'] - lat_span / 2, center['lat'] + lat_span / 2,
            center['lng'] - lng_span / 2, center['lng'] + lng_span / 2)


SCENARIOS = [
    ('sin filtros', {}),
    ('alquiler', {'status': 'for_rent'}),
    ('terrenos', {'property_type': 'land'}),
    ('casas > $300k', {'property_type': 'house', 'price__gte': 300000}),
    ('locales comerciales', {'property_type': 'commercial'}),
]

# Zoom levels that produce each grouping tier: country, province, city, grid.
ZOOMS = [5.0, 6.5, 9.0, 10.5]

for name, filters in SCENARIOS:
    qs = Property.objects.exclude(status='inactive').exclude(is_duplicate=True).filter(**filters)
    rows = [r for r in qs.values(*POINT_FIELDS) if _row_has_valid_point(r)]
    pts = [(float(r['latitude']), float(r['longitude'])) for r in rows]
    print(f'\n=== {name} ({len(pts)} propiedades) ===')

    for zoom in ZOOMS:
        payload = build_map_payload(qs.only(*POINT_FIELDS), zoom, 1600)
        clusters = [i for i in payload['items'] if i.get('is_cluster')]
        if not clusters:
            continue
        level = payload.get('group_level')
        coverages, empties, marker_gaps = [], 0, []
        for cluster in clusters:
            center, target = fit_bounds(cluster['bounds'], cluster['expansion_zoom'])
            south, north, west, east = viewport(center, target)
            visible = sum(1 for lat, lng in pts if south <= lat <= north and west <= lng <= east)
            coverages.append(visible / cluster['count'])
            if visible == 0:
                empties += 1
            # How far the drawn bubble is from the closest real property.
            nearest = min(
                _distance_km(lat, lng, cluster['latitude'], cluster['longitude']) for lat, lng in pts
            )
            marker_gaps.append(nearest)

        coverages.sort()
        marker_gaps.sort()
        worst = coverages[0]
        median_cov = coverages[len(coverages) // 2]
        print(f'  {level:9} z={zoom:<5} clusters={len(clusters):4}  '
              f'cobertura del grupo tras el clic: mediana {median_cov*100:5.1f}%  peor {worst*100:5.1f}%  '
              f'clics a la nada: {empties}   marcador->propiedad mas cercana: '
              f'mediana {marker_gaps[len(marker_gaps)//2]:.2f} km, max {marker_gaps[-1]:.2f} km')
