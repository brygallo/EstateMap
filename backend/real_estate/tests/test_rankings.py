"""Rankings that feed the living pages of the blog.

Every test here defends the same thing from a different side: a ranking is only
worth publishing if a reader can check it. What is excluded, why each position
is there, and what it is compared against.
"""

import pytest
from rest_framework.test import APIClient

from real_estate.models import Property
from real_estate.services.rankings import (
    CRITERIA,
    MIN_RANKING_LISTINGS,
    build_ranking,
)


pytestmark = pytest.mark.django_db


def land(price, area, *, city='Quito', title=None, status='for_sale', **extra):
    return Property.objects.create(
        title=title or f'Terreno de {area:.0f} m² en {city}',
        city=city,
        province='Pichincha',
        property_type='land',
        status=status,
        price=price,
        area=area,
        **extra,
    )


def a_market(count=12, *, base_price=50_000, area=500, city='Quito'):
    """Enough plausible inventory for a scope to qualify."""
    return [
        land(base_price + index * 10_000, area, city=city, title=f'Terreno {index} en {city}')
        for index in range(count)
    ]


def test_a_scope_without_enough_inventory_does_not_rank():
    """SPEC:LIVE-004 — a top ten built on nine listings is thin content."""
    a_market(MIN_RANKING_LISTINGS - 1)

    ranking = build_ranking('cheapest', property_type='land', city='Quito')

    assert ranking['sample_size'] == MIN_RANKING_LISTINGS - 1
    assert ranking['eligible'] is False
    assert ranking['items'] == []
    # The context still travels: the page has to be able to explain itself.
    assert ranking['context']['avg_price'] is not None


def test_a_scope_with_inventory_ranks_and_declares_its_sample():
    """SPEC:LIVE-004 — over the threshold the page exists and says on what."""
    a_market(14)

    ranking = build_ranking('cheapest', property_type='land', city='Quito', limit=10)

    assert ranking['eligible'] is True
    assert ranking['sample_size'] == 14
    assert len(ranking['items']) == 10
    prices = [item['price'] for item in ranking['items']]
    assert prices == sorted(prices)


def test_a_ranking_never_shows_more_than_it_has():
    """SPEC:LIVE-005 — eleven candidates and a top ten is a top ten; ten is ten."""
    a_market(MIN_RANKING_LISTINGS)

    ranking = build_ranking('cheapest', property_type='land', city='Quito', limit=10)

    assert len(ranking['items']) == MIN_RANKING_LISTINGS == ranking['sample_size']


def test_an_impossible_price_never_leads_the_cheapest():
    """SPEC:LIVE-003 — a sale under the sanity floor is a typo, not a bargain."""
    a_market(12)
    land(250, 500, title='Terreno con precio mal cargado')

    ranking = build_ranking('cheapest', property_type='land', city='Quito')

    assert 250 not in [item['price'] for item in ranking['items']]
    assert ranking['implausible_excluded'] >= 1


def test_a_price_far_below_its_own_market_is_a_typo_too():
    """SPEC:LIVE-003 — 3 USD/m² where the city averages 100 is a rent in a sale.

    The absolute floor cannot catch this one: 1.700 dollars is a plausible
    price for *something*, just not for 540 m² in this scope. What catches it
    is the distance to the scope's own average.
    """
    a_market(12, base_price=50_000, area=500)  # 100 USD/m² and up
    land(1_700, 540, title='Terreno con un alquiler escrito como venta')

    ranking = build_ranking('cheapest', property_type='land', city='Quito')

    titles = [item['title'] for item in ranking['items']]
    assert 'Terreno con un alquiler escrito como venta' not in titles


def test_an_area_off_by_three_orders_of_magnitude_never_leads_the_largest():
    """SPEC:LIVE-003 — «10 Has» stored as 100.000.000 m² is a unit slip."""
    a_market(12, area=1_000)
    land(47_000, 100_000_000, title='Terreno de 10 Has con el área mal cargada')

    ranking = build_ranking('largest', property_type='land', city='Quito')

    assert 'Terreno de 10 Has con el área mal cargada' not in [
        item['title'] for item in ranking['items']
    ]


def test_the_same_property_published_twice_takes_one_position():
    """SPEC:LIVE-003 — in a catalogue a repeat is noise; in a top ten it is the page."""
    a_market(12, base_price=80_000)
    for _ in range(2):
        land(20_000, 400, title='Terreno repetido en dos agencias')

    ranking = build_ranking('cheapest', property_type='land', city='Quito')

    repeated = [item for item in ranking['items'] if item['title'] == 'Terreno repetido en dos agencias']
    assert len(repeated) == 1
    assert ranking['duplicates_collapsed'] == 1


def test_each_position_is_compared_on_price_per_square_metre():
    """SPEC:LIVE-006 — the distance to the average is what explains the position.

    Comparing total prices would call the smallest lot the best deal. The axis
    has to be the one where a reader can tell a bargain from a small plot.
    """
    a_market(12, base_price=100_000, area=1_000)  # 100 USD/m²
    land(30_000, 600, title='Terreno barato de verdad')  # 50 USD/m²

    ranking = build_ranking('cheapest', property_type='land', city='Quito')

    assert ranking['comparison'] == 'price_per_m2'
    leader = ranking['items'][0]
    assert leader['title'] == 'Terreno barato de verdad'
    assert leader['delta_pct'] < 0


def test_two_identical_prices_always_come_back_in_the_same_order():
    """SPEC:LIVE-003 — a ranking that reshuffles between renders is not a ranking."""
    a_market(12)
    first = land(40_000, 500, title='Empate A')
    second = land(40_000, 500, title='Empate B')

    ids = [
        [item['id'] for item in build_ranking('cheapest', property_type='land', city='Quito')['items']]
        for _ in range(3)
    ]
    assert ids[0] == ids[1] == ids[2]
    assert first.pk in ids[0] or second.pk in ids[0]


def test_no_criterion_ranks_by_a_private_signal():
    """SPEC:LIVE-009 — publishing which listing moves is what VIS-001 refuses."""
    forbidden = {'views_count', 'contacts', 'leads'}
    assert all(criterion.field not in forbidden for criterion in CRITERIA.values())

    a_market(12)
    ranking = build_ranking('cheapest', property_type='land', city='Quito')
    assert all(field not in ranking['items'][0] for field in forbidden)


@pytest.mark.api
def test_the_endpoint_answers_a_known_criterion():
    """SPEC:LIVE-003 — the living pages are server-rendered from this."""
    a_market(12)

    response = APIClient().get(
        '/api/properties/rankings/',
        {'criterion': 'cheapest', 'type': 'land', 'city': 'Quito', 'status': 'for_sale'},
    )

    assert response.status_code == 200
    assert response.data['eligible'] is True
    assert len(response.data['items']) == 10
    assert response.data['context']['updated_at'] is not None


@pytest.mark.api
def test_the_endpoint_rejects_a_criterion_it_does_not_know():
    """SPEC:LIVE-002 — a slug nobody defined is not a page."""
    response = APIClient().get('/api/properties/rankings/', {'criterion': 'most_viewed'})

    assert response.status_code == 400
