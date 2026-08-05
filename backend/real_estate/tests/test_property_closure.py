"""API tests for saying "sold" out loud, and for the price that came before it.

SOC-102 needs two facts the model could not express: that a listing left the
catalogue because it closed successfully rather than because someone gave up on
it, and what it used to cost. Both are what turn a listing into an excuse to
post again — the congratulation image and the price-drop image.
"""

import pytest
from django.urls import reverse

from real_estate.models import Property, PropertyPriceHistory


@pytest.fixture
def listing(create_user):
    owner = create_user(username='closing_owner', email='closing_owner@example.com')
    return Property.objects.create(
        owner=owner,
        title='Casa en Macas',
        city='Macas',
        province='Morona Santiago',
        price=90000,
        area=180,
        status='for_sale',
    )


def detail_url(prop):
    return reverse('property-detail', args=[prop.pk])


@pytest.mark.django_db
def test_marking_a_listing_sold_records_the_reason_and_the_date(api_client, listing):
    """SPEC:PROP-033 — a sold listing is stored as sold, not merely as inactive."""
    api_client.force_authenticate(user=listing.owner)
    response = api_client.patch(detail_url(listing), {'closed_reason': 'sold'}, format='json')

    assert response.status_code == 200
    listing.refresh_from_db()
    assert listing.closed_reason == 'sold'
    assert listing.closed_at is not None
    # Closing is what takes it off the market: the only mechanism the model has
    # for leaving the public catalogue is status='inactive' (PROP-002).
    assert listing.status == 'inactive'
    assert listing.is_closed_successfully is True


@pytest.mark.django_db
def test_a_withdrawn_listing_is_not_a_sale(api_client, listing):
    """SPEC:PROP-033 — deactivating a listing is not a sale and earns no congratulation."""
    api_client.force_authenticate(user=listing.owner)
    response = api_client.patch(detail_url(listing), {'status': 'inactive'}, format='json')

    assert response.status_code == 200
    listing.refresh_from_db()
    assert listing.status == 'inactive'
    assert listing.closed_reason == ''
    assert listing.closed_at is None
    assert listing.is_closed_successfully is False


@pytest.mark.django_db
def test_a_sold_listing_leaves_the_public_catalogue(api_client, listing):
    """SPEC:PROP-033 — a sold listing stops being offered on the map and in the list."""
    listing.closed_reason = 'sold'
    listing.save()

    listed = api_client.get(reverse('property-list'))
    assert listing.pk not in [row['id'] for row in listed.data['results']]


@pytest.mark.django_db
def test_a_sold_listing_keeps_a_resolvable_ficha_and_short_code(api_client, listing):
    """SPEC:PROP-034 — the "vendido" image is meant to be forwarded, so its links must work."""
    listing.closed_reason = 'sold'
    listing.save()
    listing.refresh_from_db()

    detail = api_client.get(detail_url(listing))
    assert detail.status_code == 200
    assert detail.data['closed_reason'] == 'sold'
    assert detail.data['closed_at'] is not None

    by_code = api_client.get(reverse('property-by-code', args=[listing.short_code]))
    assert by_code.status_code == 200
    assert by_code.data['id'] == listing.pk


@pytest.mark.django_db
def test_a_merely_inactive_listing_stays_unreachable(api_client, listing):
    """SPEC:PROP-034 — withdrawing an ad still takes it off the air entirely."""
    listing.status = 'inactive'
    listing.save()

    assert api_client.get(detail_url(listing)).status_code == 404
    assert api_client.get(reverse('property-by-code', args=[listing.short_code])).status_code == 404


@pytest.mark.django_db
def test_the_owner_reaches_their_own_closed_listing(api_client, listing):
    """SPEC:PROP-034 — closing must not lock the owner out of their own listing."""
    listing.status = 'inactive'
    listing.save()

    api_client.force_authenticate(user=listing.owner)
    assert api_client.get(detail_url(listing)).status_code == 200


@pytest.mark.django_db
def test_reactivating_a_listing_reopens_it(api_client, listing):
    """SPEC:PROP-033 — putting a listing back on the market clears the closure."""
    listing.closed_reason = 'sold'
    listing.save()

    api_client.force_authenticate(user=listing.owner)
    response = api_client.patch(detail_url(listing), {'status': 'for_sale'}, format='json')

    assert response.status_code == 200
    listing.refresh_from_db()
    assert listing.status == 'for_sale'
    assert listing.closed_reason == ''
    assert listing.closed_at is None


@pytest.mark.django_db
def test_the_detail_exposes_the_previous_price_after_a_drop(api_client, listing):
    """SPEC:PROP-035 — the price-drop image needs both figures, so both are published."""
    api_client.force_authenticate(user=listing.owner)
    response = api_client.patch(detail_url(listing), {'price': '79000.00'}, format='json')

    assert response.status_code == 200
    assert response.data['price'] == '79000.00'
    assert response.data['previous_price'] == '90000.00'
    assert response.data['price_changed_at'] is not None
    assert PropertyPriceHistory.objects.filter(property=listing).count() == 2


@pytest.mark.django_db
def test_a_listing_whose_price_never_moved_has_no_previous_price(api_client, listing):
    """SPEC:PROP-035 — with a single asking price there is no drop to announce."""
    response = api_client.get(detail_url(listing))

    assert response.status_code == 200
    assert response.data['previous_price'] is None
    assert response.data['price_changed_at'] is None


@pytest.mark.django_db
def test_the_public_detail_of_a_sold_listing_leaks_nothing_new(api_client, listing):
    """SPEC:PROP-035 — closing publishes the fact of the sale, not the owner's private data."""
    api_client.force_authenticate(user=listing.owner)
    api_client.patch(detail_url(listing), {'price': '79000.00'}, format='json')
    listing.refresh_from_db()
    listing.closed_reason = 'sold'
    listing.save()

    anonymous = api_client.__class__()
    response = anonymous.get(detail_url(listing))

    assert response.status_code == 200
    assert response.data['previous_price'] == '90000.00'
    # VIS-001 is about what a listing must never publish. Neither of the two new
    # fields is a metric, and nothing else came along for the ride.
    assert 'promotion_stats' not in response.data
    assert 'networks' not in response.data


@pytest.mark.django_db
def test_bulk_reactivation_from_the_admin_panel_reopens(api_client, listing, create_user):
    """SPEC:PROP-033 — the bulk path writes with .update(), which never reaches save()."""
    listing.closed_reason = 'sold'
    listing.save()
    staff = create_user(username='bulk_mod', email='bulk_mod@example.com', is_staff=True)

    api_client.force_authenticate(user=staff)
    response = api_client.post(
        reverse('admin_properties_bulk_status'),
        {'ids': [listing.pk], 'status': 'for_sale'},
        format='json',
    )

    assert response.status_code == 200
    listing.refresh_from_db()
    assert listing.status == 'for_sale'
    assert listing.closed_reason == ''
    assert listing.closed_at is None
