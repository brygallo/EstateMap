"""Moving a property to another account, and what travels with it."""

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from django.utils import timezone

from ingesta.models import Fuente
from real_estate.models import Lead, Property, PropertyPriceHistory

User = get_user_model()


@pytest.fixture
def staff_client(api_client, create_user):
    user = create_user(username='staffer', email='staff@example.com', is_staff=True)
    api_client.force_authenticate(user=user)
    api_client.user = user
    return api_client


@pytest.fixture
def seller(create_user):
    return create_user(username='vendedor', email='vendedor@example.com')


@pytest.fixture
def prop(db, seller):
    return Property.objects.create(
        owner=seller,
        title='Terreno en Macas',
        property_type='land',
        status='for_sale',
        city='Macas',
        province='Morona Santiago',
        price=25000,
        area=600,
    )


def transfer_url(prop):
    return reverse('admin_properties_transfer_owner', kwargs={'pk': prop.pk})


@pytest.mark.django_db
def test_staff_transfers_a_property_to_an_existing_account(staff_client, prop, create_user):
    """SPEC:OWN-001 — a change of title deed is its own verb, and staff holds it."""
    target = create_user(username='compradora', email='compradora@example.com')

    response = staff_client.post(
        transfer_url(prop), {'user_id': target.pk}, format='json'
    )

    assert response.status_code == 200
    prop.refresh_from_db()
    assert prop.owner == target


@pytest.mark.django_db
def test_the_admin_patch_still_refuses_to_touch_owner(staff_client, prop, create_user, seller):
    """SPEC:OWN-001 — owner stays out of the moderation whitelist."""
    target = create_user(username='compradora', email='compradora@example.com')

    response = staff_client.patch(
        reverse('admin_properties_detail', kwargs={'pk': prop.pk}),
        {'owner': target.pk},
        format='json',
    )

    assert response.status_code == 400
    prop.refresh_from_db()
    assert prop.owner == seller


@pytest.mark.django_db
def test_a_plain_authenticated_user_cannot_transfer(api_client, create_user, prop, seller):
    """SPEC:OWN-001 — the panel route is staff-only, like every other admin verb."""
    api_client.force_authenticate(user=create_user(username='cualquiera', email='c@example.com'))

    response = api_client.post(transfer_url(prop), {'email': 'x@example.com'}, format='json')

    assert response.status_code == 403
    prop.refresh_from_db()
    assert prop.owner == seller


@pytest.mark.django_db
def test_the_current_owner_cannot_hand_their_own_property_away(api_client, prop, seller):
    """SPEC:OWN-001 — giving a property away would also give away its leads."""
    api_client.force_authenticate(user=seller)

    response = api_client.post(transfer_url(prop), {'email': 'x@example.com'}, format='json')

    assert response.status_code == 403
    prop.refresh_from_db()
    assert prop.owner == seller


@pytest.mark.django_db
def test_transferring_to_an_unknown_email_creates_an_invited_account(staff_client, prop, clear_mailbox):
    """SPEC:OWN-002 — requiring the person to register first rebuilds the wall."""
    response = staff_client.post(
        transfer_url(prop), {'email': 'nuevo@example.com'}, format='json'
    )

    assert response.status_code == 200
    invited = User.objects.get(email='nuevo@example.com')
    prop.refresh_from_db()
    assert prop.owner == invited
    assert not invited.has_usable_password()
    assert invited.is_active
    assert len(mail.outbox) == 1
    assert '/reset-password?token=' in mail.outbox[0].body


@pytest.mark.django_db
def test_transferring_to_a_deactivated_account_is_refused(staff_client, prop, create_user, seller):
    """SPEC:OWN-002 — an account nobody can enter cannot receive a property."""
    create_user(username='suspendida', email='suspendida@example.com', is_active=False)

    response = staff_client.post(
        transfer_url(prop), {'email': 'suspendida@example.com'}, format='json'
    )

    assert response.status_code == 400
    prop.refresh_from_db()
    assert prop.owner == seller


@pytest.mark.django_db
def test_transferring_to_the_current_owner_is_refused(staff_client, prop, seller):
    """SPEC:OWN-002 — a no-op that emails and audits would be worse than an error."""
    response = staff_client.post(
        transfer_url(prop), {'user_id': seller.pk}, format='json'
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_a_transfer_needs_a_target(staff_client, prop):
    """SPEC:OWN-002 — neither user_id nor email means there is nothing to do."""
    response = staff_client.post(transfer_url(prop), {}, format='json')

    assert response.status_code == 400


@pytest.mark.django_db
def test_the_leads_follow_the_property(staff_client, prop, seller, create_user):
    """SPEC:OWN-003 — a lead is a question about an inmueble, not about who published it."""
    lead = Lead.objects.create(
        property=prop, name='Ana Interesada', phone='0991112222', message='¿Sigue disponible?'
    )
    target = create_user(username='compradora', email='compradora@example.com')

    staff_client.post(transfer_url(prop), {'user_id': target.pk}, format='json')

    new_owner_client, previous_owner_client = _clients_for(target, seller)
    inbox = new_owner_client.get(reverse('lead-list'))
    assert inbox.status_code == 200
    assert [item['id'] for item in inbox.data] == [lead.pk]

    old_inbox = previous_owner_client.get(reverse('lead-list'))
    assert list(old_inbox.data) == []


@pytest.mark.django_db
def test_after_the_transfer_the_usual_permissions_take_over(staff_client, prop, seller, create_user):
    """SPEC:OWN-004 — the transfer moves `owner` and lets PERM-004 do its job."""
    target = create_user(username='compradora', email='compradora@example.com')
    staff_client.post(transfer_url(prop), {'user_id': target.pk}, format='json')

    new_owner_client, previous_owner_client = _clients_for(target, seller)
    detail = reverse('property-detail', kwargs={'pk': prop.pk})

    assert new_owner_client.patch(detail, {'title': 'Terreno actualizado'}, format='json').status_code == 200
    assert previous_owner_client.patch(detail, {'title': 'Secuestro'}, format='json').status_code == 403


@pytest.mark.django_db
def test_the_property_moves_between_inventories(staff_client, prop, seller, create_user):
    """SPEC:OWN-004 — my_properties follows ownership, so both sides see the change."""
    target = create_user(username='compradora', email='compradora@example.com')
    staff_client.post(transfer_url(prop), {'user_id': target.pk}, format='json')

    new_owner_client, previous_owner_client = _clients_for(target, seller)
    mine = reverse('property-my-properties')

    received = new_owner_client.get(mine).data
    lost = previous_owner_client.get(mine).data
    assert [item['id'] for item in received['results']] == [prop.pk]
    assert lost['results'] == []
    assert lost['stats']['total'] == 0


@pytest.mark.django_db
def test_transferring_an_imported_listing_unlinks_it_from_the_source(staff_client, create_user):
    """SPEC:OWN-005 — left as imported, a claimed listing deletes itself when the portal drops it."""
    source = Fuente.objects.create(nombre='Plusvalía', slug='plusvalia')
    imported = Property.objects.create(
        title='Casa importada',
        city='Macas',
        province='Morona Santiago',
        price=50000,
        source=source,
        external_id='abc-123',
        is_imported=True,
        last_seen_at=timezone.now(),
    )

    response = staff_client.post(
        transfer_url(imported), {'email': 'duenio.real@example.com'}, format='json'
    )

    assert response.status_code == 200
    imported.refresh_from_db()
    assert imported.is_imported is False
    assert imported.owner.email == 'duenio.real@example.com'


@pytest.mark.django_db
def test_the_transfer_is_written_to_the_audit_log(staff_client, prop, seller, create_user, caplog):
    """SPEC:OWN-006 — 'who saw this data and since when' has to have an answer."""
    target = create_user(username='compradora', email='compradora@example.com')

    with caplog.at_level('INFO', logger='real_estate.views'):
        staff_client.post(transfer_url(prop), {'user_id': target.pk}, format='json')

    line = next(m for m in caplog.messages if 'property.transfer_owner' in m)
    assert f'target_property={prop.pk}' in line
    assert f'from={seller.pk}' in line
    assert f'to={target.pk}' in line
    assert f'actor={staff_client.user.pk}' in line


@pytest.mark.django_db
def test_the_new_owner_is_told(staff_client, prop, create_user, clear_mailbox):
    """SPEC:OWN-006 — a change made by somebody else has to be something you can dispute."""
    target = create_user(username='compradora', email='compradora@example.com')

    staff_client.post(transfer_url(prop), {'user_id': target.pk}, format='json')

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ['compradora@example.com']
    assert 'Terreno en Macas' in mail.outbox[0].body


@pytest.mark.django_db
def test_a_dead_smtp_does_not_roll_back_the_transfer(staff_client, prop, create_user, settings):
    """SPEC:OWN-006 — otherwise the audit line would describe something that did not happen."""
    target = create_user(username='compradora', email='compradora@example.com')
    settings.EMAIL_BACKEND = 'real_estate.tests.test_owner_transfer.ExplodingEmailBackend'

    response = staff_client.post(
        transfer_url(prop), {'user_id': target.pk}, format='json'
    )

    assert response.status_code == 200
    prop.refresh_from_db()
    assert prop.owner == target


@pytest.mark.django_db
def test_the_public_detail_shows_the_new_owner(staff_client, api_client, prop, create_user):
    """SPEC:OWN-007 — without invalidation the portal keeps crediting the wrong person."""
    target = create_user(
        username='compradora', email='compradora@example.com',
        first_name='Ana', last_name='Compradora',
    )
    detail = reverse('property-detail', kwargs={'pk': prop.pk})
    api_client.get(detail)  # Warm whatever cache the public read populates.

    staff_client.post(transfer_url(prop), {'user_id': target.pk}, format='json')

    fresh = api_client.get(detail)
    assert fresh.status_code == 200
    assert fresh.data['owner'] == target.pk


@pytest.mark.django_db
def test_the_transfer_keeps_the_history_and_the_metrics(staff_client, prop, create_user):
    """SPEC:OWN-008 — the history describes the inmueble, not whoever held the title."""
    prop.price = 26000
    prop.save()
    Property.objects.filter(pk=prop.pk).update(views_count=42)
    prop.refresh_from_db()
    created_at = prop.created_at
    history_before = PropertyPriceHistory.objects.filter(property=prop).count()
    target = create_user(username='compradora', email='compradora@example.com')

    staff_client.post(transfer_url(prop), {'user_id': target.pk}, format='json')

    prop.refresh_from_db()
    assert prop.views_count == 42
    assert prop.created_at == created_at
    assert PropertyPriceHistory.objects.filter(property=prop).count() == history_before


def _clients_for(*users):
    """One authenticated client per user, in the order given."""
    from rest_framework.test import APIClient

    clients = []
    for user in users:
        client = APIClient()
        client.force_authenticate(user=user)
        clients.append(client)
    return clients


class ExplodingEmailBackend:
    """An SMTP that is always down, to prove the transfer does not depend on it."""

    def __init__(self, *args, **kwargs):
        pass

    def send_messages(self, messages):
        raise OSError('SMTP caído')

    def open(self):
        raise OSError('SMTP caído')

    def close(self):
        pass
