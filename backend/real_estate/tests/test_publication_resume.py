"""Resume links: handing an abandoned draft back to the person who wrote it."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from django.utils import timezone

from real_estate.email_utils import create_publication_resume_token
from real_estate.models import PendingPublication, Property, PublicationResumeToken

User = get_user_model()


DRAFT = {
    'title': 'Terreno en la vía a Sucúa',
    'description': 'Plano, con acceso a agua.',
    'property_type': 'land',
    'status': 'for_sale',
    'city': 'Macas',
    'province': 'Morona Santiago',
    'latitude': -2.3080,
    'longitude': -78.1180,
    'area': 800,
    'price': '32000',
    'images_count': 4,
}


@pytest.fixture(autouse=True)
def isolated_throttle_counters(settings):
    """
    Give each test its own rate-limit counters.

    The suite talks to the real Redis, so the 5/hour ceiling on redemptions is
    shared by every test in the file and the sixth one gets a 429 for reasons
    that have nothing to do with what it asserts.
    """
    from django.core.cache import cache

    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'publication-resume-tests',
        }
    }
    cache.clear()


@pytest.fixture
def pending(db):
    return PendingPublication.objects.create(
        title='Terreno en la vía a Sucúa',
        contact_phone='0991234567',
        contact_email='duenio@example.com',
        city='Macas',
        province='Morona Santiago',
        property_type='land',
        operation='for_sale',
        price='32000',
        draft=dict(DRAFT),
        source='account_required',
    )


@pytest.fixture
def staff_client(api_client, create_user):
    user = create_user(username='staffer', email='staff@example.com', is_staff=True)
    api_client.force_authenticate(user=user)
    api_client.user = user
    return api_client


def issue_link(client, pending):
    return client.post(
        reverse('pending-publication-resume-link', kwargs={'pk': pending.pk}),
        format='json',
    )


def valid_property_payload():
    return {
        'title': 'Terreno en la vía a Sucúa',
        'description': 'Plano, con acceso a agua.',
        'property_type': 'land',
        'status': 'for_sale',
        'city': 'Macas',
        'province': 'Morona Santiago',
        'latitude': -2.3080,
        'longitude': -78.1180,
        'area': 800,
        'price': '32000',
    }


@pytest.mark.django_db
def test_staff_issues_a_resume_link_and_the_request_moves_to_contacted(staff_client, pending):
    """SPEC:RSM-001 — staff issues the link and the tray stops saying the request is untouched."""
    response = issue_link(staff_client, pending)

    assert response.status_code == 201
    assert '/continuar-publicacion/' in response.data['url']
    pending.refresh_from_db()
    assert pending.status == 'contacted'
    assert pending.resume_tokens.count() == 1


@pytest.mark.django_db
def test_issuing_a_second_link_retires_the_first(staff_client, pending):
    """SPEC:RSM-003 — two live links to one draft would let the same person publish twice."""
    first = issue_link(staff_client, pending).data['url'].rsplit('/', 1)[-1]
    issue_link(staff_client, pending)

    assert PublicationResumeToken.objects.get(token=first).revoked_at is not None
    assert PublicationResumeToken.objects.filter(
        pending=pending, revoked_at__isnull=True, redeemed_at__isnull=True
    ).count() == 1


@pytest.mark.django_db
def test_a_converted_request_does_not_get_a_new_link(staff_client, pending):
    """SPEC:RSM-009 — a request that already became a listing has nothing left to resume."""
    pending.status = 'converted'
    pending.save(update_fields=['status'])

    response = issue_link(staff_client, pending)

    assert response.status_code == 400
    assert pending.resume_tokens.count() == 0


@pytest.mark.django_db
def test_an_expired_token_no_longer_opens_the_draft(api_client, pending):
    """SPEC:RSM-002 — fourteen days later the forwarded message is worth nothing."""
    token = create_publication_resume_token(pending)
    token.expires_at = timezone.now() - timedelta(seconds=1)
    token.save(update_fields=['expires_at'])

    response = api_client.get(
        reverse('publication_draft', kwargs={'token': token.token})
    )

    assert response.status_code == 410
    assert response.data['code'] == 'resume_token_invalid'


@pytest.mark.django_db
def test_expiry_matches_the_configured_window(pending, settings):
    """SPEC:RSM-002 — the window is a setting, not a number buried in a view."""
    settings.PUBLICATION_RESUME_TOKEN_EXPIRY_DAYS = 14
    token = create_publication_resume_token(pending)

    assert 13 < (token.expires_at - timezone.now()).days + 1 <= 14


@pytest.mark.django_db
def test_staff_revokes_a_link_and_it_stops_working(staff_client, api_client, pending):
    """SPEC:RSM-004 — a credential you cannot withdraw is a credential you cannot send."""
    token_string = issue_link(staff_client, pending).data['url'].rsplit('/', 1)[-1]

    revoke = staff_client.post(
        reverse('pending-publication-revoke-resume-link', kwargs={'pk': pending.pk}),
        format='json',
    )
    assert revoke.status_code == 200
    assert revoke.data['revoked'] == 1

    response = api_client.get(
        reverse('publication_draft', kwargs={'token': token_string})
    )
    assert response.status_code == 410


@pytest.mark.django_db
def test_a_non_staff_user_can_neither_issue_nor_revoke(api_client, create_user, pending):
    """SPEC:RSM-001 — the tray and everything hanging off it stays staff-only."""
    api_client.force_authenticate(user=create_user(username='vecina', email='vecina@example.com'))

    assert issue_link(api_client, pending).status_code == 403
    assert api_client.post(
        reverse('pending-publication-revoke-resume-link', kwargs={'pk': pending.pk}),
        format='json',
    ).status_code == 403


@pytest.mark.django_db
def test_the_token_opens_the_draft_and_nothing_else(api_client, pending):
    """SPEC:RSM-005 — a forwarded link must not become a key to the account."""
    token = create_publication_resume_token(pending)

    response = api_client.get(
        reverse('publication_draft', kwargs={'token': token.token})
    )

    assert response.status_code == 200
    assert response.data['draft']['title'] == DRAFT['title']
    assert response.data['contact_email'] == 'duenio@example.com'
    # Nothing that could stand in for a session, and nothing about anybody else.
    forbidden = {'access', 'refresh', 'token', 'password', 'id', 'user', 'owner'}
    assert forbidden.isdisjoint(response.data.keys())


@pytest.mark.django_db
def test_the_draft_carries_everything_except_the_photos(api_client, pending):
    """SPEC:RSM-006 — the form recovers the typing and the geometry; the files never arrived."""
    token = create_publication_resume_token(pending)

    draft = api_client.get(
        reverse('publication_draft', kwargs={'token': token.token})
    ).data['draft']

    for field in ('title', 'description', 'property_type', 'city', 'latitude', 'area', 'price'):
        assert draft[field] == DRAFT[field]
    assert 'images' not in draft
    assert draft['images_count'] == 4


@pytest.mark.django_db
def test_redeeming_publishes_and_creates_the_account(api_client, pending, clear_mailbox):
    """SPEC:RSM-007 — publish first, register after: the account was the wall."""
    token = create_publication_resume_token(pending)

    response = api_client.post(
        reverse('publication_draft_redeem', kwargs={'token': token.token}),
        valid_property_payload(),
        format='json',
    )

    assert response.status_code == 201
    assert response.data['account_created'] is True

    owner = User.objects.get(email='duenio@example.com')
    prop = Property.objects.get(pk=response.data['property']['id'])
    assert prop.owner == owner
    assert len(mail.outbox) == 1
    assert '/reset-password?token=' in mail.outbox[0].body
    assert f'/propiedad/{prop.pk}' in mail.outbox[0].body


@pytest.mark.django_db
def test_redeeming_onto_an_existing_account_does_not_touch_its_password(api_client, pending, create_user):
    """SPEC:RSM-007 — an address that already has an account just receives the listing."""
    existing = create_user(username='duenio', email='duenio@example.com', password='YaTengoClave123!')
    token = create_publication_resume_token(pending)

    response = api_client.post(
        reverse('publication_draft_redeem', kwargs={'token': token.token}),
        valid_property_payload(),
        format='json',
    )

    assert response.status_code == 201
    assert response.data['account_created'] is False
    assert User.objects.filter(email='duenio@example.com').count() == 1
    existing.refresh_from_db()
    assert existing.check_password('YaTengoClave123!')


@pytest.mark.django_db
def test_a_draft_without_an_email_cannot_be_redeemed(api_client, pending):
    """SPEC:RSM-007 — with no address there is nobody to hand the listing to."""
    pending.contact_email = ''
    pending.save(update_fields=['contact_email'])
    token = create_publication_resume_token(pending)

    response = api_client.post(
        reverse('publication_draft_redeem', kwargs={'token': token.token}),
        valid_property_payload(),
        format='json',
    )

    assert response.status_code == 400
    assert not Property.objects.exists()


@pytest.mark.django_db
def test_the_token_burns_on_the_first_redemption(api_client, pending):
    """SPEC:RSM-003 — the same WhatsApp message forwarded twice must not publish twice."""
    token = create_publication_resume_token(pending)
    url = reverse('publication_draft_redeem', kwargs={'token': token.token})

    first = api_client.post(url, valid_property_payload(), format='json')
    second = api_client.post(url, valid_property_payload(), format='json')

    assert first.status_code == 201
    assert second.status_code == 410
    assert Property.objects.count() == 1


@pytest.mark.django_db
def test_the_invited_account_cannot_log_in_until_it_has_a_password(api_client, pending):
    """SPEC:RSM-008 — holding the link is not proof of owning the mailbox."""
    token = create_publication_resume_token(pending)
    api_client.post(
        reverse('publication_draft_redeem', kwargs={'token': token.token}),
        valid_property_payload(),
        format='json',
    )

    owner = User.objects.get(email='duenio@example.com')
    assert not owner.has_usable_password()
    assert owner.is_active

    login = api_client.post(
        reverse('token_obtain_pair'),
        {'email': 'duenio@example.com', 'password': ''},
        format='json',
    )
    assert login.status_code >= 400


@pytest.mark.django_db
def test_setting_the_password_from_the_email_unlocks_the_account(api_client, pending, clear_mailbox):
    """SPEC:RSM-008 — the mailbox is where the proof of identity actually happens."""
    token = create_publication_resume_token(pending)
    api_client.post(
        reverse('publication_draft_redeem', kwargs={'token': token.token}),
        valid_property_payload(),
        format='json',
    )
    reset_token = mail.outbox[0].body.split('/reset-password?token=')[1].split()[0]

    reset = api_client.post(
        reverse('reset_password'),
        {'token': reset_token, 'new_password': 'ClaveNueva123!'},
        format='json',
    )
    assert reset.status_code == 200

    login = api_client.post(
        reverse('token_obtain_pair'),
        {'email': 'duenio@example.com', 'password': 'ClaveNueva123!'},
        format='json',
    )
    assert login.status_code == 200


@pytest.mark.django_db
def test_a_closed_redemption_marks_the_request_converted_and_linked(api_client, pending):
    """SPEC:RSM-009 — 'converted' has to be a claim somebody can check."""
    token = create_publication_resume_token(pending)

    response = api_client.post(
        reverse('publication_draft_redeem', kwargs={'token': token.token}),
        valid_property_payload(),
        format='json',
    )

    pending.refresh_from_db()
    assert pending.status == 'converted'
    assert pending.property_id == response.data['property']['id']


@pytest.mark.django_db
def test_an_unknown_token_answers_exactly_like_a_spent_one(api_client, pending):
    """SPEC:RSM-002 — telling the four failures apart would map which links existed."""
    spent = create_publication_resume_token(pending)
    spent.redeemed_at = timezone.now()
    spent.save(update_fields=['redeemed_at'])

    unknown = api_client.get(
        reverse('publication_draft', kwargs={'token': 'no-existe-este-token'})
    )
    burnt = api_client.get(
        reverse('publication_draft', kwargs={'token': spent.token})
    )

    assert unknown.status_code == burnt.status_code == 410
    assert unknown.data == burnt.data
