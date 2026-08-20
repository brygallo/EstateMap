"""Rankings of live inventory: the cheapest, the largest, the best value.

These feed the living pages of the blog, where a ranking is not a reordered
catalogue but an answer: ten listings, why each one is there, and what they are
compared against. Three decisions shape everything below.

**A ranking needs a floor, and it is not the one an average needs.** Market
stats trim the interquartile tail, which is right for a mean and wrong here: on
«the largest land in the country» that trim deletes precisely what the page
promises, because a genuine 500-hectare farm sits far outside any fence built
from the middle of the distribution. What a ranking has to exclude is the
impossible, not the extreme — a price that is really a phone number, an area
entered in the wrong unit. So the guard is a plausibility bound: the same one
the import pipeline applies to prices (IMP-003), plus a window for areas and
for price per m².

**The comparison is the content.** Every ranking carries the average of its own
scope so each position can state how far it sits from it. A number without what
it is measured against is trivia.

**Nothing here reads a private signal.** No view counts, no contact counts:
publishing which listing moves is exactly what VIS-001 refuses to do.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.db.models import Avg, Count, F, FloatField, Max, Q, QuerySet
from django.db.models.expressions import ExpressionWrapper

from ingesta.pipeline.normalize import (
    _PRICE_MAX,
    _RENT_PRICE_MIN,
    _SALE_PRICE_MIN,
)
from real_estate.models import Property, PropertyImage

DEFAULT_LIMIT = 10
MAX_LIMIT = 25

# Three thresholds, all read as multiples of what a page shows.
#
# 1x — a ranking of ten over a sample of ten is not a ranking: it is the
#      catalogue in another order, and the catalogue page for that city already
#      exists. Below this there is no page at all.
# 2x — from here the page selects: it shows the top half of what it read. This
#      is where it earns a place in the index and in the sitemap.
# 5x — «los más pequeños» or «los más caros» describe a segment only where
#      there is a market to segment. Under fifty listings those cuts are
#      curiosities; the two broad ones — cheapest, largest — carry a real query
#      anywhere and do not wait for this.
#
# The middle band is not thrown away: those pages answer, they just say
# `noindex, follow`, the same shape SEO-001 uses for a local landing that is
# still filling up. When the market grows they enter the index on their own.
MIN_RANKING_LISTINGS = DEFAULT_LIMIT
MIN_INDEXABLE_SAMPLE = DEFAULT_LIMIT * 2
MIN_SAMPLE_FOR_NARROW_CRITERIA = DEFAULT_LIMIT * 5

# Plausibility windows. A listing outside them is a data error, not a bargain
# and not a record. The ceiling is 1.000 hectares: above that, every case in
# this catalogue turned out to be a unit slip — «Terreno de 10 Has» stored as
# 100.000.000 m², which is a thousand times its own title. The trade is
# explicit: a genuine estate larger than 1.000 ha would be left out, and that
# is preferable to opening «the largest in the country» with a typo. Below
# 10 m² there is no property, only another typo.
AREA_MIN = 10
AREA_MAX = 10_000_000
PRICE_PER_M2_MIN = 1
PRICE_PER_M2_MAX = 10_000

# The absolute bounds above catch what is impossible anywhere in the country;
# this one catches what is impossible *here*. A lot priced at 3 USD/m² in a
# city averaging 760 is not a bargain, it is a rent typed into a sale, and it
# would sit at the top of «the cheapest in Quito» forever. Five per cent of the
# scope average leaves genuine cheap inventory alone — a lot at 38 USD/m² in
# that same city still qualifies — while removing what is off by two orders of
# magnitude. It only guards the cheap side: upwards, the absolute bounds are
# enough, and trimming further would delete the very record the page is about.
RELATIVE_FLOOR_RATIO = 0.05


@dataclass(frozen=True)
class Criterion:
    """One way of ranking inventory.

    `field` is the annotated or model column the order runs on, `descending`
    its direction, and the two `requires_` flags what a listing must carry to
    qualify at all.
    """

    slug: str
    field: str
    descending: bool
    label: str
    requires_area: bool = False
    requires_price: bool = True
    # Whether the criterion carries a query on its own. «Terrenos baratos en
    # Quito» is typed into a search box; «locales comerciales más pequeños de
    # Cotopaxi» is not, and only earns an index slot in a deep market.
    broad: bool = False
    # The axis each position is compared against. Ranking by total price but
    # comparing on total price is misleading: the cheapest lot in a city is
    # «99 % below average» only because it is also the smallest. Price per m²
    # is the axis on which a reader can tell a bargain from a small plot.
    comparison: str = 'price_per_m2'


CRITERIA: dict[str, Criterion] = {
    'cheapest': Criterion('cheapest', 'price', False, 'más baratos', broad=True),
    'most_expensive': Criterion('most_expensive', 'price', True, 'más caros'),
    'largest': Criterion(
        'largest', 'area', True, 'más grandes',
        requires_area=True, requires_price=False, comparison='area', broad=True,
    ),
    'smallest': Criterion(
        'smallest', 'area', False, 'más pequeños',
        requires_area=True, requires_price=False, comparison='area',
    ),
    'best_value': Criterion(
        'best_value', 'price_per_m2', False, 'mejor precio por m²', requires_area=True
    ),
    'newest': Criterion(
        'newest', 'created_at', True, 'más recientes', requires_price=False, comparison='none'
    ),
}

ITEM_FIELDS = (
    'id',
    'title',
    'property_type',
    'status',
    'city',
    'province',
    'address',
    'price',
    'area',
    'latitude',
    'longitude',
    'created_at',
    'updated_at',
)


def _sane_price_filter() -> Q:
    """Prices the market can actually explain, per IMP-003."""
    return (
        Q(status='for_sale', price__gte=_SALE_PRICE_MIN, price__lte=_PRICE_MAX)
        | Q(status='for_rent', price__gte=_RENT_PRICE_MIN, price__lte=_PRICE_MAX)
    )


def _scope_queryset(
    *,
    property_type: str | None,
    status: str | None,
    city: str | None,
    province: str | None,
) -> QuerySet:
    """Everything publicly visible inside the scope, before plausibility."""
    queryset = Property.objects.filter(is_duplicate=False).exclude(status='inactive')
    if property_type:
        queryset = queryset.filter(property_type=property_type)
    if status:
        queryset = queryset.filter(status=status)
    if city:
        queryset = queryset.filter(city__iexact=city)
    if province:
        queryset = queryset.filter(province__iexact=province)
    return queryset


def _qualified_queryset(queryset: QuerySet, criterion: Criterion) -> QuerySet:
    """The rows that can honestly take part in this particular ranking."""
    if criterion.requires_price:
        queryset = queryset.filter(price__isnull=False).filter(_sane_price_filter())
    if criterion.requires_area:
        queryset = queryset.filter(area__gte=AREA_MIN, area__lte=AREA_MAX)
    # The price-per-m² window guards the *pair*, so it applies whenever both
    # numbers exist — including on rankings that do not need a price. It is
    # what catches an area off by three orders of magnitude: a 10.000.000 m²
    # lot at 47.000 dollars prices itself at half a cent per metre.
    return _with_price_per_m2(queryset)


def _with_price_per_m2(queryset: QuerySet) -> QuerySet:
    """Annotate price per m² and drop the pairs that cannot be true.

    A listing with no usable area keeps its place: not knowing its size is not
    the same as having an impossible one, and excluding it would quietly empty
    the ranking of everything published without measurements.
    """
    queryset = queryset.annotate(
        price_per_m2=ExpressionWrapper(F('price') / F('area'), output_field=FloatField())
    )
    return queryset.filter(
        Q(area__isnull=True)
        | Q(area__lte=0)
        | Q(price_per_m2__gte=PRICE_PER_M2_MIN, price_per_m2__lte=PRICE_PER_M2_MAX)
    )


def _apply_relative_floor(queryset: QuerySet, criterion: Criterion) -> QuerySet:
    """Remove what is impossibly cheap *for this scope*, not for the country."""
    if criterion.descending or not criterion.requires_price:
        return queryset
    average = queryset.aggregate(value=Avg('price_per_m2'))['value']
    if not average:
        return queryset
    floor = float(average) * RELATIVE_FLOOR_RATIO
    return queryset.filter(Q(area__isnull=True) | Q(area__lte=0) | Q(price_per_m2__gte=floor))


def is_indexable(criterion: Criterion, sample_size: int) -> bool:
    """Whether a ranking of this size deserves a slot in the index."""
    if sample_size < MIN_INDEXABLE_SAMPLE:
        return False
    return criterion.broad or sample_size >= MIN_SAMPLE_FOR_NARROW_CRITERIA


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_ranking(
    criterion_slug: str,
    *,
    property_type: str | None = None,
    status: str | None = None,
    city: str | None = None,
    province: str | None = None,
    limit: int = DEFAULT_LIMIT,
) -> dict[str, Any]:
    """Resolve one ranking, sample and comparison included.

    `eligible` answers "does this page deserve to exist". Below
    MIN_RANKING_LISTINGS the caller still gets the context so the page can
    explain itself, but no items and no reason to be indexed.
    """
    criterion = CRITERIA.get(criterion_slug)
    if criterion is None:
        raise ValueError(f'unknown ranking criterion: {criterion_slug}')

    limit = max(1, min(int(limit or DEFAULT_LIMIT), MAX_LIMIT))
    scope = _scope_queryset(
        property_type=property_type, status=status, city=city, province=province
    )
    queryset = _apply_relative_floor(_qualified_queryset(scope, criterion), criterion)

    aggregates = queryset.aggregate(
        sample_size=Count('id'),
        avg_price=Avg('price'),
        avg_area=Avg('area'),
        updated_at=Max('updated_at'),
    )
    sample_size = aggregates['sample_size'] or 0
    # Declared, not hidden: a page that filters listings out has to say how
    # many, or nobody can check what it left behind.
    implausible_excluded = max(0, scope.count() - sample_size)
    average = None if criterion.field == 'created_at' else _as_float(
        queryset.aggregate(value=Avg(criterion.field))['value']
    )
    benchmark = _benchmark(queryset, criterion, aggregates)

    payload: dict[str, Any] = {
        'criterion': criterion.slug,
        'label': criterion.label,
        'scope': {
            'property_type': property_type,
            'status': status,
            'city': city,
            'province': province,
        },
        'limit': limit,
        'sample_size': sample_size,
        'implausible_excluded': implausible_excluded,
        'minimum': MIN_RANKING_LISTINGS,
        'eligible': sample_size >= MIN_RANKING_LISTINGS,
        'indexable': is_indexable(criterion, sample_size),
        'comparison': criterion.comparison,
        'context': {
            'average': average,
            'benchmark': benchmark,
            'avg_price': _as_float(aggregates['avg_price']),
            'avg_area': _as_float(aggregates['avg_area']),
            'avg_price_m2': _as_float(
                queryset.aggregate(value=Avg('price_per_m2'))['value']
            ) if criterion.requires_price else None,
            'updated_at': aggregates['updated_at'],
        },
        'items': [],
    }
    if not payload['eligible']:
        return payload

    order = (
        F(criterion.field).desc(nulls_last=True)
        if criterion.descending
        else F(criterion.field).asc(nulls_last=True)
    )
    fields = list(ITEM_FIELDS)
    if criterion.field not in fields:
        fields.append(criterion.field)
    # `id` breaks ties so two equal prices always come back in the same order:
    # a ranking that reshuffles between renders is not a ranking. The window is
    # wider than the limit because the collapse below removes rows, and a top
    # ten that ends at eight because two were the same listing is a top eight
    # that nobody asked for.
    window = min(limit * 4, MAX_LIMIT * 4)
    rows = list(queryset.order_by(order, 'id').values(*fields)[:window])
    unique_rows, collapsed = _collapse_repeats(rows)
    visible = unique_rows[:limit]
    covers = _cover_images([row['id'] for row in visible])

    payload['duplicates_collapsed'] = collapsed
    payload['items'] = [_item(row, criterion, benchmark, covers) for row in visible]
    return payload


def _cover_images(property_ids: list[int]) -> dict[int, dict[str, str | None]]:
    """The main photo of each listing in the ranking, in one query.

    A list of properties without photographs is a spreadsheet. The lookup runs
    once for the ten rows that survive the collapse, not for the window, so a
    duplicate never costs an image fetch.
    """
    if not property_ids:
        return {}

    covers: dict[int, dict[str, str | None]] = {}
    images = (
        PropertyImage.objects.filter(property_id__in=property_ids)
        .order_by('property_id', '-is_main', 'id')
    )
    for image in images:
        if image.property_id in covers:
            continue
        covers[image.property_id] = {
            'thumbnail': image.thumbnail.url if image.thumbnail else None,
            'image': image.image.url if image.image else None,
        }
    return covers


def _repeat_keys(row: dict[str, Any]) -> tuple[tuple, ...]:
    """Two ways the same property shows up twice under different ids."""
    price = _as_float(row.get('price'))
    area = _as_float(row.get('area'))
    title = (row.get('title') or '').strip().casefold()
    latitude, longitude = _as_float(row.get('latitude')), _as_float(row.get('longitude'))

    keys: list[tuple] = [('same-listing', title, price, area, (row.get('city') or '').casefold())]
    if latitude is not None and longitude is not None and price is not None:
        keys.append(('same-spot', round(latitude, 5), round(longitude, 5), price))
    return tuple(keys)


def _collapse_repeats(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """Keep one row per property.

    The duplicate detector of the ingest flags what it can prove; what reaches
    here are the pairs it could not — the same lot published twice by two
    agencies, with the same title, price and coordinates. In a catalogue that is
    noise. In a top ten it is the whole page repeating itself, so the ranking
    collapses them even though the catalogue does not.
    """
    seen: set[tuple] = set()
    unique: list[dict[str, Any]] = []
    collapsed = 0
    for row in rows:
        keys = _repeat_keys(row)
        if any(key in seen for key in keys):
            collapsed += 1
            continue
        seen.update(keys)
        unique.append(row)
    return unique, collapsed


def _benchmark(queryset: QuerySet, criterion: Criterion, aggregates: dict) -> float | None:
    """The scope average on the axis each position is compared against."""
    if criterion.comparison == 'none':
        return None
    if criterion.comparison == 'area':
        return _as_float(aggregates['avg_area'])
    return _as_float(queryset.aggregate(value=Avg('price_per_m2'))['value'])


def _item(
    row: dict[str, Any],
    criterion: Criterion,
    benchmark: float | None,
    covers: dict[int, dict[str, str | None]] | None = None,
) -> dict[str, Any]:
    # Prices and areas arrive as Decimal, and `created_at` as a datetime that
    # has no numeric value to compare against an average.
    raw_value = row.get(criterion.field)
    value = _as_float(raw_value) if not isinstance(raw_value, (str, bytes)) else None
    if criterion.field == 'created_at':
        value = None
    price = _as_float(row.get('price'))
    area = _as_float(row.get('area'))

    price_per_m2 = price / area if price and area else None
    # How far this listing sits from the average of its own scope, on the axis
    # that makes the distance mean something. Negative means below it: the good
    # side for a price, the plain reading for an area.
    compared = area if criterion.comparison == 'area' else price_per_m2
    delta_pct = None
    if compared is not None and benchmark:
        delta_pct = round((compared - benchmark) / benchmark * 100, 1)

    cover = (covers or {}).get(row['id']) or {}
    return {
        'id': row['id'],
        'title': row['title'],
        'image': cover.get('thumbnail') or cover.get('image'),
        'property_type': row['property_type'],
        'status': row['status'],
        'city': row['city'],
        'province': row['province'],
        'address': row['address'],
        'price': price,
        'area': area,
        'price_per_m2': price_per_m2,
        'latitude': _as_float(row.get('latitude')),
        'longitude': _as_float(row.get('longitude')),
        'created_at': row.get('created_at'),
        'updated_at': row.get('updated_at'),
        'value': value,
        'delta_pct': delta_pct,
    }


def _qualifying_counts() -> tuple[Q, Q]:
    """Conditions a listing meets to take part in a price or an area ranking."""
    price_ok = Q(price__isnull=False) & _sane_price_filter()
    area_ok = Q(area__gte=AREA_MIN, area__lte=AREA_MAX)
    return price_ok, area_ok


def available_scopes(minimum: int = MIN_RANKING_LISTINGS) -> dict[str, Any]:
    """Which scopes hold enough inventory to deserve a page.

    One aggregation instead of one request per candidate page: the alternative
    is asking the ranking endpoint thousands of times at build to find out that
    most of them have nothing. Callers combine these counts with their own
    recipes; the threshold lives here so it cannot drift between the page that
    renders and the sitemap that advertises it.
    """
    price_ok, area_ok = _qualifying_counts()
    base = Property.objects.filter(is_duplicate=False).exclude(status='inactive')

    def rows(*fields: str) -> list[dict[str, Any]]:
        aggregated = (
            base.values(*fields)
            .annotate(
                total=Count('id'),
                with_price=Count('id', filter=price_ok),
                with_area=Count('id', filter=area_ok),
            )
            .filter(total__gte=minimum)
            .order_by('-total')
        )
        return [row for row in aggregated if all(row.get(field) for field in fields)]

    country = base.aggregate(
        total=Count('id'),
        with_price=Count('id', filter=price_ok),
        with_area=Count('id', filter=area_ok),
    )

    return {
        'minimum': minimum,
        # The publishing policy travels with the counts so the pages, the
        # sitemap and the index cannot disagree about which rankings exist.
        'minimum_indexable': MIN_INDEXABLE_SAMPLE,
        'minimum_narrow_criteria': MIN_SAMPLE_FOR_NARROW_CRITERIA,
        'broad_criteria': sorted(slug for slug, item in CRITERIA.items() if item.broad),
        'country': country,
        'by_type': rows('property_type'),
        'by_type_status': rows('property_type', 'status'),
        'by_city': rows('city', 'province', 'property_type', 'status'),
        'by_province': rows('province', 'property_type', 'status'),
    }
