import math
import unicodedata

from real_estate.geo import coord_in_ecuador


POINT_FIELDS = (
    'id',
    'property_type',
    'status',
    'latitude',
    'longitude',
    'polygon',
    'show_measurements',
    'price',
    'city',
    'province',
)

ECUADOR_CENTER = {'lat': -1.5, 'lng': -78.5}

PROVINCE_CENTERS = {
    'azuay': {'lat': -2.9, 'lng': -79.0},
    'bolivar': {'lat': -1.6, 'lng': -79.0},
    'canar': {'lat': -2.55, 'lng': -78.95},
    'carchi': {'lat': 0.8, 'lng': -77.85},
    'chimborazo': {'lat': -1.67, 'lng': -78.65},
    'cotopaxi': {'lat': -0.93, 'lng': -78.62},
    'el oro': {'lat': -3.45, 'lng': -79.96},
    'esmeraldas': {'lat': 0.95, 'lng': -79.67},
    'galapagos': {'lat': -0.74, 'lng': -90.31},
    'guayas': {'lat': -2.17, 'lng': -79.9},
    'imbabura': {'lat': 0.35, 'lng': -78.12},
    'loja': {'lat': -3.99, 'lng': -79.2},
    'los rios': {'lat': -1.8, 'lng': -79.53},
    'manabi': {'lat': -1.05, 'lng': -80.45},
    'morona santiago': {'lat': -2.3087, 'lng': -78.1114},
    'morona': {'lat': -2.3087, 'lng': -78.1114},
    'morona-santiago': {'lat': -2.3087, 'lng': -78.1114},
    'napo': {'lat': -0.99, 'lng': -77.82},
    'orellana': {'lat': -0.47, 'lng': -76.99},
    'pastaza': {'lat': -1.49, 'lng': -78.0},
    'pichincha': {'lat': -0.18, 'lng': -78.47},
    'santa elena': {'lat': -2.23, 'lng': -80.85},
    'santo domingo de los tsachilas': {'lat': -0.25, 'lng': -79.17},
    'sucumbios': {'lat': 0.08, 'lng': -76.88},
    'tungurahua': {'lat': -1.25, 'lng': -78.62},
    'zamora chinchipe': {'lat': -4.07, 'lng': -78.95},
}

CITY_CENTERS = {
    'pichincha:quito': {'lat': -0.18, 'lng': -78.47},
    'guayas:guayaquil': {'lat': -2.17, 'lng': -79.9},
    'guayas:daule': {'lat': -2.022, 'lng': -79.906},
    'guayas:duran': {'lat': -2.185, 'lng': -79.801},
    'guayas:samborondon': {'lat': -2.065, 'lng': -79.846},
    'guayas:playas': {'lat': -2.642, 'lng': -80.37},
    'azuay:cuenca': {'lat': -2.9, 'lng': -79.0},
    'loja:loja': {'lat': -3.99, 'lng': -79.2},
    'tungurahua:ambato': {'lat': -1.25, 'lng': -78.62},
    'chimborazo:riobamba': {'lat': -1.67, 'lng': -78.65},
    'manabi:manta': {'lat': -0.95, 'lng': -80.73},
    'manabi:portoviejo': {'lat': -1.05, 'lng': -80.45},
    'manabi:bahia de caraquez': {'lat': -0.595, 'lng': -80.415},
    'el oro:machala': {'lat': -3.26, 'lng': -79.96},
    'imbabura:ibarra': {'lat': 0.35, 'lng': -78.12},
    'morona santiago:macas': {'lat': -2.31, 'lng': -78.12},
    'santo domingo de los tsachilas:santo domingo': {'lat': -0.25, 'lng': -79.17},
    'los rios:babahoyo': {'lat': -1.8, 'lng': -79.53},
    'esmeraldas:esmeraldas': {'lat': 0.95, 'lng': -79.67},
}

CITY_NAME_CENTERS = {
    'quito': {'lat': -0.18, 'lng': -78.47},
    'guayaquil': {'lat': -2.17, 'lng': -79.9},
    'daule': {'lat': -2.022, 'lng': -79.906},
    'duran': {'lat': -2.185, 'lng': -79.801},
    'samborondon': {'lat': -2.065, 'lng': -79.846},
    'playas': {'lat': -2.642, 'lng': -80.37},
    'cuenca': {'lat': -2.9, 'lng': -79.0},
    'loja': {'lat': -3.99, 'lng': -79.2},
    'ambato': {'lat': -1.25, 'lng': -78.62},
    'riobamba': {'lat': -1.67, 'lng': -78.65},
    'manta': {'lat': -0.95, 'lng': -80.73},
    'portoviejo': {'lat': -1.05, 'lng': -80.45},
    'bahia de caraquez': {'lat': -0.595, 'lng': -80.415},
    'machala': {'lat': -3.26, 'lng': -79.96},
    'ibarra': {'lat': 0.35, 'lng': -78.12},
    'macas': {'lat': -2.31, 'lng': -78.12},
    'santo domingo': {'lat': -0.25, 'lng': -79.17},
    'babahoyo': {'lat': -1.8, 'lng': -79.53},
    'quevedo': {'lat': -1.03, 'lng': -79.46},
    'esmeraldas': {'lat': 0.95, 'lng': -79.67},
}

CITY_ALIASES = {
    'ambato canton': 'ambato',
    'canton ambato': 'ambato',
    'canton de ambato': 'ambato',
    'distrito metropolitano de quito': 'quito',
    'metropolitan district of quito': 'quito',
    'quito distrito metropolitano': 'quito',
    'canton quito': 'quito',
    'canton de quito': 'quito',
    'samborondon': 'samborondon',
    'samborondón': 'samborondon',
    'duran': 'duran',
    'durán': 'duran',
    'eloy alfaro (duran)': 'duran',
    'canton daule': 'daule',
    'canton de daule': 'daule',
    'canton de portoviejo': 'portoviejo',
    'portoviejo canton': 'portoviejo',
    'bahia de caraquez': 'bahia de caraquez',
    'bahía de caráquez': 'bahia de caraquez',
    'sucua': 'sucua',
    'sucúa': 'sucua',
}

CITY_DISPLAY_NAMES = {
    'ambato': 'Ambato',
    'quito': 'Quito',
    'samborondon': 'Samborondón',
    'duran': 'Durán',
    'daule': 'Daule',
    'portoviejo': 'Portoviejo',
    'bahia de caraquez': 'Bahía de Caráquez',
    'sucua': 'Sucúa',
}


def build_map_payload(queryset, zoom, max_items, viewport=None):
    zoom = 7 if zoom is None else float(zoom)
    cluster_zoom = zoom < 11.5
    max_items = max(1, min(int(max_items), 1600 if cluster_zoom else 2000))

    rows = list(queryset.values(*POINT_FIELDS))
    valid_rows = [row for row in rows if _row_has_valid_point(row)]
    total_count = len(valid_rows)

    if not cluster_zoom:
        items = [_point_payload(row) for row in valid_rows[:max_items]]
        return {
            'mode': 'points',
            'zoom': zoom,
            'context': _payload_context('points', total_count),
            'total_count': total_count,
            'cluster_count': 0,
            'point_count': len(items),
            'city_groups': _city_group_payload(valid_rows),
            'items': items,
        }

    group_level = _group_level_for_zoom(zoom)
    grid_size = _cluster_grid_size_for_zoom(zoom)
    buckets = _build_buckets(valid_rows, group_level, grid_size)
    clusters, representative_points = _build_items_from_buckets(buckets, zoom, group_level)

    # La grilla es una vista local: sólo mandamos lo cercano al viewport para
    # mantener el payload liviano. Las posiciones se calcularon sobre TODO el
    # dataset filtrado, así que nunca "caminan" al panear; el viewport sólo
    # decide qué agrupadores (ya estables) se envían.
    if group_level == 'grid' and viewport:
        clusters = [item for item in clusters if _within_viewport(item, viewport)]
        representative_points = [
            item for item in representative_points if _within_viewport(item, viewport)
        ]

    clusters.sort(key=lambda item: item['count'], reverse=True)
    representative_points.sort(key=lambda item: float(item.get('price') or 0), reverse=True)

    max_point_samples = min(180, max(40, max_items // 4))
    points = representative_points[:max_point_samples]
    items = [*clusters, *points][:max_items]

    return {
        'mode': 'mixed',
        'zoom': zoom,
        'group_level': group_level,
        'grid_size': grid_size,
        'context': _payload_context(group_level, total_count),
        'total_count': total_count,
        'cluster_count': len(clusters),
        'point_count': len(points),
        'city_groups': _city_group_payload(valid_rows),
        'items': items,
    }


def _normalize_name(value):
    text = (value or '').strip().lower()
    text = unicodedata.normalize('NFD', text)
    return ''.join(char for char in text if unicodedata.category(char) != 'Mn')


def _canonical_city_key(value):
    city_key = _normalize_name(value)
    return CITY_ALIASES.get(city_key, city_key)


def _display_city_name(city_key, fallback):
    return CITY_DISPLAY_NAMES.get(city_key) or (fallback or '').strip()


def _row_has_valid_point(row):
    if row['latitude'] is None or row['longitude'] is None:
        return False
    return coord_in_ecuador(float(row['latitude']), float(row['longitude']))


def _group_level_for_zoom(zoom):
    if zoom <= 5.2:
        return 'country'
    if zoom <= 6.8:
        return 'province'
    if zoom <= 9.2:
        return 'city'
    return 'grid'


def _cluster_grid_size_for_zoom(zoom):
    if zoom <= 6:
        return 1.0
    if zoom <= 8:
        return 0.45
    if zoom <= 10:
        return 0.18
    return 0.08


def _point_payload(row):
    return {
        'id': row['id'],
        'property_type': row['property_type'],
        'status': row['status'],
        'latitude': float(row['latitude']),
        'longitude': float(row['longitude']),
        'polygon': row.get('polygon'),
        'show_measurements': row.get('show_measurements'),
        'price': row['price'],
        'city': row.get('city'),
        'province': row.get('province'),
        'is_cluster': False,
    }


def _bucket_key_and_label(row, group_level, grid_size):
    lat = float(row['latitude'])
    lng = float(row['longitude'])
    city = (row.get('city') or '').strip()
    province = (row.get('province') or '').strip()
    city_key = _canonical_city_key(city)
    province_key = _normalize_name(province)

    if group_level == 'country':
        return 'country:ecuador', 'Ecuador'
    if group_level == 'province' and province and province_key in PROVINCE_CENTERS:
        return f"province:{province_key}", province
    if group_level == 'city' and city and _city_anchor(province_key, city_key):
        return f"city:{city_key}", city
    return f"grid:{math.floor(lat / grid_size)}:{math.floor(lng / grid_size)}", None


def _city_anchor(province_key, city_key):
    return CITY_CENTERS.get(f'{province_key}:{city_key}') or CITY_NAME_CENTERS.get(city_key)


def _grid_anchor(lat, lng, grid_size):
    lat_index = math.floor(lat / grid_size)
    lng_index = math.floor(lng / grid_size)
    return {
        'lat': (lat_index + 0.5) * grid_size,
        'lng': (lng_index + 0.5) * grid_size,
    }


def _bucket_anchor(row, key, group_level, grid_size):
    lat = float(row['latitude'])
    lng = float(row['longitude'])
    city = _canonical_city_key(row.get('city'))
    province = _normalize_name(row.get('province'))

    if group_level == 'country':
        return ECUADOR_CENTER
    if group_level == 'province':
        return PROVINCE_CENTERS.get(province) or _grid_anchor(lat, lng, grid_size)
    if group_level == 'city':
        return _city_anchor(province, city) or _grid_anchor(lat, lng, grid_size)

    # Grid clusters are anchored to the grid-cell center, so they do not drift
    # as the set of properties inside the cell changes.
    return _grid_anchor(lat, lng, grid_size)


def _build_buckets(valid_rows, group_level, grid_size):
    buckets = {}
    for row in valid_rows:
        lat = float(row['latitude'])
        lng = float(row['longitude'])
        key, label = _bucket_key_and_label(row, group_level, grid_size)
        city_key = _canonical_city_key(row.get('city'))
        anchor = _bucket_anchor(row, key, group_level, grid_size)
        bucket = buckets.setdefault(key, {
            'count': 0,
            'lat_sum': 0.0,
            'lng_sum': 0.0,
            'lat_min': lat,
            'lat_max': lat,
            'lng_min': lng,
            'lng_max': lng,
            'sample': row,
            'rows': [],
            'micro_buckets': {},
            'label': _display_city_name(city_key, label) if group_level == 'city' else label,
            'anchor': anchor,
            'group_level': group_level,
            'suspicious_count': 0,
        })
        bucket['count'] += 1
        bucket['lat_sum'] += lat
        bucket['lng_sum'] += lng
        bucket['lat_min'] = min(bucket['lat_min'], lat)
        bucket['lat_max'] = max(bucket['lat_max'], lat)
        bucket['lng_min'] = min(bucket['lng_min'], lng)
        bucket['lng_max'] = max(bucket['lng_max'], lng)
        bucket['rows'].append(row)
        if group_level == 'city' and bucket.get('anchor') and _distance_km(lat, lng, bucket['anchor']['lat'], bucket['anchor']['lng']) > 85:
            bucket['suspicious_count'] += 1

        micro_size = max(grid_size / 4, 0.01)
        micro_key = (math.floor(lat / micro_size), math.floor(lng / micro_size))
        micro = bucket['micro_buckets'].setdefault(micro_key, {
            'count': 0,
            'lat_sum': 0.0,
            'lng_sum': 0.0,
        })
        micro['count'] += 1
        micro['lat_sum'] += lat
        micro['lng_sum'] += lng
    return buckets


def _build_items_from_buckets(buckets, zoom, group_level):
    clusters = []
    representative_points = []
    force_cluster = group_level in ('country', 'province')

    for key, bucket in buckets.items():
        if not force_cluster and bucket['count'] <= 3:
            representative_points.extend(_point_payload(row) for row in bucket['rows'])
            continue

        densest = max(bucket['micro_buckets'].values(), key=lambda item: item['count'])
        if group_level in ('country', 'province', 'city'):
            bucket['focus'] = bucket['anchor']
        else:
            bucket['focus'] = {
                'lat': densest['lat_sum'] / densest['count'],
                'lng': densest['lng_sum'] / densest['count'],
            }
        clusters.append(_cluster_payload(key, bucket, zoom))

    return clusters, representative_points


def _cluster_payload(key, bucket, zoom):
    anchor = bucket.get('anchor') or {
        'lat': bucket['lat_sum'] / bucket['count'],
        'lng': bucket['lng_sum'] / bucket['count'],
    }
    focus = bucket.get('focus') or {
        'lat': anchor['lat'],
        'lng': anchor['lng'],
    }
    return {
        'id': f"cluster:{key}",
        'is_cluster': True,
        'count': bucket['count'],
        'label': bucket.get('label'),
        'group_level': bucket.get('group_level'),
        'latitude': anchor['lat'],
        'longitude': anchor['lng'],
        'focus_latitude': focus['lat'],
        'focus_longitude': focus['lng'],
        'expansion_zoom': _expansion_zoom_for_group(bucket.get('group_level'), zoom),
        'bounds': _bucket_bounds(bucket),
        'suspicious_count': bucket.get('suspicious_count', 0),
    }


def _expansion_zoom_for_group(group_level, zoom):
    if group_level == 'country':
        return 5.8
    if group_level == 'province':
        return 7.4
    if group_level == 'city':
        return 12.2
    return min(max(float(zoom) + 2, 11), 15)


def _within_viewport(item, viewport, pad_ratio=0.6):
    west, south, east, north = viewport
    lat_pad = max((north - south) * pad_ratio, 0.02)
    lng_pad = max((east - west) * pad_ratio, 0.02)
    lat = float(item['latitude'])
    lng = float(item['longitude'])
    return (
        (south - lat_pad) <= lat <= (north + lat_pad)
        and (west - lng_pad) <= lng <= (east + lng_pad)
    )


def _distance_km(lat_a, lng_a, lat_b, lng_b):
    lat_delta = (float(lat_a) - float(lat_b)) * 111.0
    lng_delta = (float(lng_a) - float(lng_b)) * 111.0 * math.cos(math.radians((float(lat_a) + float(lat_b)) / 2))
    return math.sqrt((lat_delta * lat_delta) + (lng_delta * lng_delta))


def _bucket_bounds(bucket):
    # Bounds always describe the real properties inside the group. The marker
    # itself stays on a stable political/city anchor, while click navigation can
    # frame the actual inventory.
    return {
        'west': bucket['lng_min'],
        'south': bucket['lat_min'],
        'east': bucket['lng_max'],
        'north': bucket['lat_max'],
    }


def _payload_context(group_level, total_count):
    labels = {
        'country': {
            'title': 'Ecuador',
            'subtitle': 'Resumen nacional por provincias',
            'next_level': 'province',
        },
        'province': {
            'title': 'Provincias',
            'subtitle': 'Toca una provincia para ver sus ciudades',
            'next_level': 'city',
        },
        'city': {
            'title': 'Ciudades',
            'subtitle': 'Toca una ciudad para abrir sus propiedades',
            'next_level': 'points',
        },
        'grid': {
            'title': 'Zonas',
            'subtitle': 'Agrupadores por zonas visibles',
            'next_level': 'points',
        },
        'points': {
            'title': 'Propiedades',
            'subtitle': 'Puntos individuales en la vista actual',
            'next_level': None,
        },
    }
    context = labels.get(group_level, labels['grid']).copy()
    context['group_level'] = group_level
    context['total_count'] = total_count
    return context


def _city_group_payload(valid_rows):
    buckets = {}
    for row in valid_rows:
        city = (row.get('city') or '').strip()
        if not city:
            continue
        province = (row.get('province') or '').strip()
        province_key = _normalize_name(province)
        city_key = _canonical_city_key(city)
        key = f"{province_key}:{city_key}"
        lat = float(row['latitude'])
        lng = float(row['longitude'])
        bucket = buckets.setdefault(key, {
            'id': f"city:{key}",
            'label': _display_city_name(city_key, city),
            'province': province,
            'count': 0,
            'lat_sum': 0.0,
            'lng_sum': 0.0,
            'lat_min': lat,
            'lat_max': lat,
            'lng_min': lng,
            'lng_max': lng,
            'anchor': _city_anchor(province_key, city_key),
            'suspicious_count': 0,
        })
        bucket['count'] += 1
        bucket['lat_sum'] += lat
        bucket['lng_sum'] += lng
        bucket['lat_min'] = min(bucket['lat_min'], lat)
        bucket['lat_max'] = max(bucket['lat_max'], lat)
        bucket['lng_min'] = min(bucket['lng_min'], lng)
        bucket['lng_max'] = max(bucket['lng_max'], lng)
        if bucket.get('anchor') and _distance_km(lat, lng, bucket['anchor']['lat'], bucket['anchor']['lng']) > 85:
            bucket['suspicious_count'] += 1

    groups = []
    for bucket in buckets.values():
        anchor = bucket.get('anchor') or {
            'lat': round(bucket['lat_sum'] / bucket['count'], 3),
            'lng': round(bucket['lng_sum'] / bucket['count'], 3),
        }
        groups.append({
            'id': bucket['id'],
            'label': bucket['label'],
            'province': bucket['province'],
            'count': bucket['count'],
            'latitude': anchor['lat'],
            'longitude': anchor['lng'],
            'zoom': 12.2,
            'bounds': _bucket_bounds(bucket),
            'suspicious_count': bucket.get('suspicious_count', 0),
        })
    return sorted(groups, key=lambda item: (-item['count'], item['label'].lower()))
