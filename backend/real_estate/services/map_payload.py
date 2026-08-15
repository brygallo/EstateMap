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

MAX_CLUSTER_ZOOM = 9.2

CLUSTER_LEVEL_ZOOMS = {
    'country': 5.0,
    'province': 6.0,
    'city': 8.0,
}

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


def build_map_payload(queryset, zoom, max_items):
    zoom = 7 if zoom is None else float(zoom)
    cluster_zoom = zoom <= MAX_CLUSTER_ZOOM
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


def canonical_cluster_zoom(zoom):
    """Collapse every territorial view into one stable payload per level."""
    numeric_zoom = 7 if zoom is None else float(zoom)
    if numeric_zoom > MAX_CLUSTER_ZOOM:
        return numeric_zoom
    return CLUSTER_LEVEL_ZOOMS[_group_level_for_zoom(numeric_zoom)]


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
    point = _row_point(row)
    if not point:
        return False
    row['latitude'], row['longitude'] = point
    return True


def _row_point(row):
    """Return the stored point or derive one from the property's polygon."""
    lat = row.get('latitude')
    lng = row.get('longitude')
    if lat is not None and lng is not None:
        lat = float(lat)
        lng = float(lng)
        if coord_in_ecuador(lat, lng):
            return lat, lng

    polygon = row.get('polygon')
    if not polygon:
        return None

    if isinstance(polygon, dict):
        rings = polygon.get('coordinates') or []
        ring = rings[0] if rings else []
        points = [(float(coord[1]), float(coord[0])) for coord in ring if len(coord) >= 2]
    elif isinstance(polygon, list):
        points = [(float(coord[0]), float(coord[1])) for coord in polygon if len(coord) >= 2]
    else:
        return None

    if len(points) > 1 and points[0] == points[-1]:
        points.pop()
    points = [(point_lat, point_lng) for point_lat, point_lng in points if coord_in_ecuador(point_lat, point_lng)]
    if not points:
        return None

    return (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )


def _group_level_for_zoom(zoom):
    if zoom <= 5.2:
        return 'country'
    if zoom <= 6.8:
        return 'province'
    return 'city'


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
    if group_level == 'province' and province:
        return f"province:{province_key}", province
    if group_level == 'city':
        fallback_key = f"{math.floor(lat / grid_size)}:{math.floor(lng / grid_size)}"
        return f"city:{province_key}:{city_key or fallback_key}", city or None
    return 'country:ecuador', 'Ecuador'


def _city_anchor(province_key, city_key):
    return CITY_CENTERS.get(f'{province_key}:{city_key}') or CITY_NAME_CENTERS.get(city_key)


def _grid_anchor(lat, lng, grid_size):
    lat_index = math.floor(lat / grid_size)
    lng_index = math.floor(lng / grid_size)
    return {
        'lat': (lat_index + 0.5) * grid_size,
        'lng': (lng_index + 0.5) * grid_size,
    }


def _reference_anchor(row, group_level, grid_size):
    """
    Nominal centre of the group: the canton's or province's official location.

    This is NOT where the marker is drawn — that would put the bubble on the
    colonial centre while the listings sit in the valleys, and send the click
    somewhere with nothing to show. It is kept only to measure how far a
    property is from the place it claims to be in (`suspicious_count`).
    """
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
    return _grid_anchor(lat, lng, grid_size)


def _percentile(sorted_values, ratio):
    if not sorted_values:
        return 0.0
    position = (len(sorted_values) - 1) * ratio
    low = int(position)
    high = min(low + 1, len(sorted_values) - 1)
    return sorted_values[low] + (sorted_values[high] - sorted_values[low]) * (position - low)


def _medoid(lats, lngs):
    """
    Position of the real property closest to the group's median.

    The median already lands inside the mass of listings, unlike the arithmetic
    mean, which can fall in the gap between two dense pockets. Snapping it to an
    actual property closes the remaining case: a national or provincial group
    whose median falls between Quito and Guayaquil would otherwise draw its
    bubble over open sea. Snapped, a marker is never on empty ground.

    It is as stable while panning as a fixed anchor, because buckets are always
    built over the whole filtered dataset and not over the viewport.
    """
    if not lats:
        return {'lat': 0.0, 'lng': 0.0}
    center_lat = _percentile(sorted(lats), 0.5)
    center_lng = _percentile(sorted(lngs), 0.5)
    lat, lng = min(
        zip(lats, lngs),
        key=lambda point: _distance_km(point[0], point[1], center_lat, center_lng),
    )
    return {'lat': lat, 'lng': lng}


def _bucket_center(bucket):
    return _medoid(
        [float(row['latitude']) for row in bucket['rows']],
        [float(row['longitude']) for row in bucket['rows']],
    )


def _build_buckets(valid_rows, group_level, grid_size):
    buckets = {}
    for row in valid_rows:
        lat = float(row['latitude'])
        lng = float(row['longitude'])
        key, label = _bucket_key_and_label(row, group_level, grid_size)
        city_key = _canonical_city_key(row.get('city'))
        anchor = _reference_anchor(row, group_level, grid_size)
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
            'has_named_cities': False,
        })
        bucket['count'] += 1
        bucket['lat_sum'] += lat
        bucket['lng_sum'] += lng
        bucket['lat_min'] = min(bucket['lat_min'], lat)
        bucket['lat_max'] = max(bucket['lat_max'], lat)
        bucket['lng_min'] = min(bucket['lng_min'], lng)
        bucket['lng_max'] = max(bucket['lng_max'], lng)
        bucket['rows'].append(row)
        if city_key:
            bucket['has_named_cities'] = True
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

        # The densest micro-cell is the fallback focus for a group whose points
        # are split in two distant pockets: the median can sit between them.
        densest = max(bucket['micro_buckets'].values(), key=lambda item: item['count'])
        bucket['focus'] = {
            'lat': densest['lat_sum'] / densest['count'],
            'lng': densest['lng_sum'] / densest['count'],
        }
        clusters.append(_cluster_payload(key, bucket, zoom))

    return clusters, representative_points


def _cluster_payload(key, bucket, zoom):
    center = _bucket_center(bucket)
    focus = bucket.get('focus') or center
    bounds = _bucket_bounds(bucket)
    return {
        'id': f"cluster:{key}",
        'is_cluster': True,
        'count': bucket['count'],
        'label': bucket.get('label'),
        'group_level': bucket.get('group_level'),
        # Marker position: the median of the group's own properties, so the
        # bubble is always drawn over the inventory it represents.
        'latitude': center['lat'],
        'longitude': center['lng'],
        'focus_latitude': focus['lat'],
        'focus_longitude': focus['lng'],
        'anchor_latitude': (bucket.get('anchor') or center)['lat'],
        'anchor_longitude': (bucket.get('anchor') or center)['lng'],
        'expansion_zoom': _expansion_zoom_for_bounds(bounds),
        'bounds': bounds,
        'suspicious_count': bucket.get('suspicious_count', 0),
        'has_named_cities': bucket.get('has_named_cities', False),
    }


# Nominal canvas used to translate a span into a zoom level. The client fits the
# bounds against its own canvas, so this only has to be close enough to cap how
# far a tight cluster is allowed to zoom in.
NOMINAL_VIEWPORT_PX = (1100, 700)
MIN_EXPANSION_ZOOM = 11.0
MAX_EXPANSION_ZOOM = 16.5


def _expansion_zoom_for_bounds(bounds):
    """
    Zoom at which the group's own extent fills the screen.

    Ecuador straddles the equator, where a degree of latitude and a degree of
    longitude cover practically the same number of Mercator pixels, so the two
    axes can be compared directly. Fixed per-level zooms were the reason a
    click could land on empty map: a canton the size of the DMQ and a village
    were both opened at 12.2.
    """
    width, height = NOMINAL_VIEWPORT_PX
    lat_span = max(float(bounds['north']) - float(bounds['south']), 1e-4)
    lng_span = max(float(bounds['east']) - float(bounds['west']), 1e-4)
    zoom = min(
        math.log2(360.0 * width / (512.0 * lng_span)),
        math.log2(360.0 * height / (512.0 * lat_span)),
    )
    return round(min(max(zoom, MIN_EXPANSION_ZOOM), MAX_EXPANSION_ZOOM), 2)


def _distance_km(lat_a, lng_a, lat_b, lng_b):
    lat_delta = (float(lat_a) - float(lat_b)) * 111.0
    lng_delta = (float(lng_a) - float(lng_b)) * 111.0 * math.cos(math.radians((float(lat_a) + float(lat_b)) / 2))
    return math.sqrt((lat_delta * lat_delta) + (lng_delta * lng_delta))


# Fraction of the group trimmed from each end before framing it. One listing
# geocoded into the wrong province must not force the camera to pull back far
# enough to include it, leaving every real listing as an unreadable speck.
BOUNDS_TRIM = 0.05
# Never describe a group as smaller than ~150 m across: a whole building's worth
# of listings shares one coordinate, and a zero-width box has no zoom that fits.
MIN_BOUNDS_SPAN = 0.0014


def _bucket_bounds(bucket, lats=None, lngs=None):
    """
    Extent of the group's real properties, trimmed at both ends.

    Bounds are what click navigation frames, so they answer one question: where
    do I have to point the camera for this group to be visible? Percentiles
    instead of min/max keep a single mis-geocoded row from answering it wrong.
    """
    if lats is None or lngs is None:
        lats = [float(row['latitude']) for row in bucket['rows']]
        lngs = [float(row['longitude']) for row in bucket['rows']]
    lats = sorted(lats)
    lngs = sorted(lngs)

    south = _percentile(lats, BOUNDS_TRIM)
    north = _percentile(lats, 1 - BOUNDS_TRIM)
    west = _percentile(lngs, BOUNDS_TRIM)
    east = _percentile(lngs, 1 - BOUNDS_TRIM)

    if north - south < MIN_BOUNDS_SPAN:
        middle = (north + south) / 2
        south, north = middle - MIN_BOUNDS_SPAN / 2, middle + MIN_BOUNDS_SPAN / 2
    if east - west < MIN_BOUNDS_SPAN:
        middle = (east + west) / 2
        west, east = middle - MIN_BOUNDS_SPAN / 2, middle + MIN_BOUNDS_SPAN / 2

    return {'west': west, 'south': south, 'east': east, 'north': north}


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
        'points': {
            'title': 'Propiedades',
            'subtitle': 'Puntos individuales en la vista actual',
            'next_level': None,
        },
    }
    context = labels.get(group_level, labels['points']).copy()
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
            'lats': [],
            'lngs': [],
            'suspicious_count': 0,
        })
        bucket['count'] += 1
        bucket['lat_sum'] += lat
        bucket['lng_sum'] += lng
        bucket['lat_min'] = min(bucket['lat_min'], lat)
        bucket['lat_max'] = max(bucket['lat_max'], lat)
        bucket['lng_min'] = min(bucket['lng_min'], lng)
        bucket['lng_max'] = max(bucket['lng_max'], lng)
        bucket['lats'].append(lat)
        bucket['lngs'].append(lng)
        if bucket.get('anchor') and _distance_km(lat, lng, bucket['anchor']['lat'], bucket['anchor']['lng']) > 85:
            bucket['suspicious_count'] += 1

    groups = []
    for bucket in buckets.values():
        bounds = _bucket_bounds(bucket, bucket['lats'], bucket['lngs'])
        # Same rule as the map clusters: point at the listings, not at the
        # canton's official coordinates.
        center = _medoid(bucket['lats'], bucket['lngs'])
        groups.append({
            'id': bucket['id'],
            'label': bucket['label'],
            'province': bucket['province'],
            'count': bucket['count'],
            'latitude': center['lat'],
            'longitude': center['lng'],
            'zoom': _expansion_zoom_for_bounds(bounds),
            'bounds': bounds,
            'suspicious_count': bucket.get('suspicious_count', 0),
        })
    return sorted(groups, key=lambda item: (-item['count'], item['label'].lower()))
