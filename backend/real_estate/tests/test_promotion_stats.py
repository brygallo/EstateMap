"""API tests for the promotion report the kit shows its owner (SOC-101).

The endpoint answers one question — which network brought real people back to
this listing — and two things about it are worth guarding with tests rather than
trusting: crawlers must never reach the count, and the answer must never be a
bare zero, because "0 visitas" reads as a broken portal instead of as "nobody
has shared this yet".
"""

import pytest
from django.urls import reverse

from real_estate.models import ActivityEvent, Property


PROPERTY_PATH = '/propiedad/{pk}?utm_source=instagram&utm_medium=social&utm_campaign=owner_kit'


def kit_attribution(source='instagram', campaign='owner_kit'):
    """The first-touch attribution the browser replays inside every beacon."""
    return {
        'attribution': {
            'source': source,
            'medium': 'social',
            'campaign': campaign,
            'channel': 'social',
        }
    }


def visit(prop, source='instagram', session='session-1', is_bot=False, campaign='owner_kit'):
    return ActivityEvent.objects.create(
        property=prop,
        session_id=session,
        event_name='page_view',
        path=PROPERTY_PATH.format(pk=prop.pk),
        payload=kit_attribution(source, campaign),
        is_bot=is_bot,
    )


@pytest.fixture
def listing(create_user):
    owner = create_user(username='kit_owner', email='kit_owner@example.com')
    return Property.objects.create(
        owner=owner,
        title='Terreno con vista',
        city='Macas',
        province='Morona Santiago',
        price=25000,
        area=500,
        status='for_sale',
    )


def stats_url(prop):
    return reverse('property-promotion-stats', args=[prop.pk])


@pytest.mark.django_db
def test_promotion_stats_groups_visitors_by_network(api_client, listing):
    """SPEC:SOC-101 — visits are grouped by the utm_source of the kit link."""
    visit(listing, source='instagram', session='s1')
    visit(listing, source='instagram', session='s1')
    visit(listing, source='instagram', session='s2')
    visit(listing, source='facebook', session='s3')

    api_client.force_authenticate(user=listing.owner)
    response = api_client.get(stats_url(listing))

    assert response.status_code == 200
    by_source = {row['source']: row for row in response.data['networks']}
    assert by_source['instagram']['visitors'] == 2
    assert by_source['instagram']['events'] == 3
    assert by_source['facebook']['visitors'] == 1
    assert response.data['total_visitors'] == 3
    assert response.data['state'] == 'has_visitors'
    # Every network the kit builds links for is listed, so a network that
    # brought nobody says so instead of disappearing.
    assert {'facebook', 'instagram', 'tiktok', 'whatsapp'} <= set(by_source)
    assert by_source['tiktok']['visitors'] == 0


@pytest.mark.django_db
def test_promotion_stats_ignores_crawlers(api_client, listing):
    """SPEC:SOC-101 — an event flagged is_bot never reaches the counter."""
    visit(listing, source='instagram', session='human')
    visit(listing, source='instagram', session='crawler-1', is_bot=True)
    visit(listing, source='facebook', session='crawler-2', is_bot=True)

    api_client.force_authenticate(user=listing.owner)
    response = api_client.get(stats_url(listing))

    assert response.status_code == 200
    by_source = {row['source']: row for row in response.data['networks']}
    assert by_source['instagram']['visitors'] == 1
    assert by_source['facebook']['visitors'] == 0
    assert response.data['total_visitors'] == 1


@pytest.mark.django_db
def test_promotion_stats_ignores_traffic_from_outside_the_kit(api_client, listing):
    """SPEC:SOC-101 — only links carrying the owner_kit campaign are counted."""
    visit(listing, source='google', session='organic', campaign='')
    visit(listing, source='instagram', session='paid', campaign='summer_ads')

    api_client.force_authenticate(user=listing.owner)
    response = api_client.get(stats_url(listing))

    assert response.status_code == 200
    assert response.data['total_visitors'] == 0
    assert response.data['state'] == 'not_shared'


@pytest.mark.django_db
def test_promotion_stats_tells_never_shared_apart_from_no_visitors(api_client, listing):
    """SPEC:SOC-101 — a listing nobody shared is distinguishable from one that brought nobody."""
    api_client.force_authenticate(user=listing.owner)
    never_shared = api_client.get(stats_url(listing)).data
    assert never_shared['state'] == 'not_shared'
    assert never_shared['total_visitors'] == 0

    ActivityEvent.objects.create(
        property=listing,
        session_id='owner-session',
        event_name='promotion_kit_shared',
        path=f'/propiedad/{listing.pk}/promocionar',
        payload={'network': 'instagram'},
    )

    shared = api_client.get(stats_url(listing)).data
    assert shared['state'] == 'shared_without_visitors'
    assert shared['total_visitors'] == 0
    # Same zero, different sentence: that is the whole point of the field.
    assert shared['state'] != never_shared['state']


@pytest.mark.django_db
def test_promotion_stats_is_denied_to_another_authenticated_user(api_client, listing, create_user):
    """SPEC:SOC-101 — only the owner sees the breakdown; a third party gets 403."""
    visit(listing, source='instagram', session='s1')
    intruder = create_user(username='intruder', email='intruder@example.com')

    api_client.force_authenticate(user=intruder)
    response = api_client.get(stats_url(listing))

    assert response.status_code == 403
    assert 'networks' not in response.data


@pytest.mark.django_db
def test_promotion_stats_is_denied_to_anonymous(api_client, listing):
    """SPEC:SOC-101 — the breakdown is not public, unlike the promotion images."""
    visit(listing, source='instagram', session='s1')

    response = api_client.get(stats_url(listing))

    assert response.status_code == 401
    assert 'networks' not in response.data


@pytest.mark.django_db
def test_promotion_stats_is_visible_to_staff(api_client, listing, create_user):
    """SPEC:SOC-101 — staff moderate from the same screens, so they see it too."""
    visit(listing, source='whatsapp', session='s1')
    staff = create_user(username='mod', email='mod@example.com', is_staff=True)

    api_client.force_authenticate(user=staff)
    response = api_client.get(stats_url(listing))

    assert response.status_code == 200
    by_source = {row['source']: row for row in response.data['networks']}
    assert by_source['whatsapp']['visitors'] == 1


@pytest.mark.django_db
def test_promotion_stats_still_answers_for_a_sold_listing(api_client, listing):
    """SPEC:SOC-101 — a closed listing is the one whose owner most wants the report."""
    visit(listing, source='facebook', session='s1')
    listing.closed_reason = 'sold'
    listing.save()

    api_client.force_authenticate(user=listing.owner)
    response = api_client.get(stats_url(listing))

    assert response.status_code == 200
    assert response.data['total_visitors'] == 1


@pytest.mark.django_db
def test_page_view_of_a_ficha_is_attributed_to_its_listing(api_client, listing):
    """SPEC:SOC-101 — an arrival with no property_id is attributed from the path.

    The generic page-view beacon only knows the URL, so without this the visit a
    shared link produced would never be tied to the listing it landed on and the
    report would be empty for everyone.
    """
    response = api_client.post(
        reverse('activity-event-list'),
        {
            'event_name': 'page_view',
            'session_id': 'visitor-1',
            'path': PROPERTY_PATH.format(pk=listing.pk),
            'payload': {**kit_attribution(), 'page_type': 'property'},
        },
        format='json',
        HTTP_USER_AGENT='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605.1',
    )

    assert response.status_code == 201
    event = ActivityEvent.objects.get(session_id='visitor-1')
    assert event.property_id == listing.pk
    assert event.is_bot is False

    api_client.force_authenticate(user=listing.owner)
    stats = api_client.get(stats_url(listing)).data
    assert stats['total_visitors'] == 1
