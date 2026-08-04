"""The inventory panel behind /api/properties/my_properties/.

Two questions this file answers: who sees what (an owner sees their own rows, a
staff account sees the catalogue), and whether the numbers on screen describe the
whole inventory instead of the page that happened to load.
"""

import pytest
from django.contrib.auth import get_user_model

from real_estate.models import Property

User = get_user_model()

URL = '/api/properties/my_properties/'


@pytest.fixture
def seller(create_user):
    return create_user(username='vendedora', email='vendedora@example.com')


@pytest.fixture
def staff(create_user):
    return create_user(username='moderador', email='moderador@example.com', is_staff=True)


def make_property(owner=None, **kwargs):
    defaults = {
        'title': 'Terreno en Macas',
        'property_type': 'land',
        'status': 'for_sale',
        'city': 'Macas',
        'province': 'Morona Santiago',
        'price': 25000,
        'area': 600,
    }
    defaults.update(kwargs)
    return Property.objects.create(owner=owner, **defaults)


@pytest.mark.django_db
def test_owner_only_sees_their_own_inventory(api_client, seller, create_user):
    """SPEC:PERM-006 — the scope comes from the token, never from a parameter."""
    mine = make_property(owner=seller, title='Mi terreno')
    make_property(owner=create_user(username='ajena', email='ajena@example.com'), title='Terreno ajeno')
    make_property(title='Anuncio importado', is_imported=True)

    api_client.force_authenticate(user=seller)
    response = api_client.get(URL)

    assert response.status_code == 200
    assert [row['id'] for row in response.data['results']] == [mine.pk]
    assert response.data['scope'] == 'own'
    assert response.data['stats']['total'] == 1


@pytest.mark.django_db
def test_staff_sees_the_whole_catalogue(api_client, staff, seller):
    """SPEC:PERM-006 — moderation happens from this same screen."""
    make_property(owner=seller, title='De la vendedora')
    make_property(owner=staff, title='Del moderador')
    make_property(title='Importada', is_imported=True)
    make_property(owner=seller, title='Retirada', status='inactive')
    make_property(owner=seller, title='Duplicada', is_duplicate=True)

    api_client.force_authenticate(user=staff)
    response = api_client.get(URL)

    assert response.status_code == 200
    assert response.data['scope'] == 'catalog'
    assert response.data['count'] == 5
    titles = {row['title'] for row in response.data['results']}
    assert titles == {'De la vendedora', 'Del moderador', 'Importada', 'Retirada', 'Duplicada'}


@pytest.mark.django_db
def test_counters_describe_the_inventory_not_the_page(api_client, staff):
    """SPEC:PROP-030 — read off the page, the totals would lie."""
    for index in range(30):
        make_property(owner=staff, title=f'Lote {index}', views_count=2)
    make_property(owner=staff, title='Retirada', status='inactive', views_count=5)

    api_client.force_authenticate(user=staff)
    response = api_client.get(URL)

    assert response.status_code == 200
    assert len(response.data['results']) == 24
    assert response.data['next'] is not None
    stats = response.data['stats']
    assert stats['total'] == 31
    assert stats['inactive'] == 1
    assert stats['active'] == 30
    assert stats['for_sale'] == 30
    assert stats['views'] == 65


@pytest.mark.django_db
def test_search_and_status_are_resolved_by_the_server(api_client, staff, seller):
    """SPEC:PROP-030 — filtering the loaded page would answer another question."""
    make_property(owner=seller, title='Casa en Cuenca', city='Cuenca')
    make_property(owner=seller, title='Terreno en Macas', city='Macas')
    make_property(owner=seller, title='Casa retirada', city='Cuenca', status='inactive')

    api_client.force_authenticate(user=staff)

    by_city = api_client.get(URL, {'search': 'cuenca'})
    assert {row['title'] for row in by_city.data['results']} == {'Casa en Cuenca', 'Casa retirada'}
    assert by_city.data['stats']['total'] == 2

    by_status = api_client.get(URL, {'status': 'inactive'})
    assert {row['title'] for row in by_status.data['results']} == {'Casa retirada'}


@pytest.mark.django_db
def test_staff_can_filter_imported_listings_apart(api_client, staff, seller):
    """SPEC:PROP-030 — origin separates what a person published from what was scraped."""
    make_property(owner=seller, title='Publicada por una persona')
    make_property(title='Traída del portal', is_imported=True)

    api_client.force_authenticate(user=staff)

    imported = api_client.get(URL, {'origin': 'imported'})
    assert {row['title'] for row in imported.data['results']} == {'Traída del portal'}

    from_users = api_client.get(URL, {'origin': 'users'})
    assert {row['title'] for row in from_users.data['results']} == {'Publicada por una persona'}


@pytest.mark.django_db
def test_price_sorting_does_not_let_a_missing_price_win(api_client, staff):
    """A listing without price must not head the "highest price" ordering."""
    make_property(owner=staff, title='Sin precio', price=None)
    make_property(owner=staff, title='Cara', price=90000)
    make_property(owner=staff, title='Barata', price=1000)

    api_client.force_authenticate(user=staff)
    response = api_client.get(URL, {'ordering': 'price_desc'})

    assert [row['title'] for row in response.data['results']] == ['Cara', 'Barata', 'Sin precio']


@pytest.mark.django_db
def test_staff_edits_and_deletes_a_listing_they_do_not_own(api_client, staff, seller):
    """SPEC:PERM-004 — the panel offers the buttons, the API has to honour them."""
    target = make_property(owner=seller, title='Anuncio ajeno')

    api_client.force_authenticate(user=staff)

    edited = api_client.patch(f'/api/properties/{target.pk}/', {'title': 'Moderado'}, format='json')
    assert edited.status_code == 200
    target.refresh_from_db()
    assert target.title == 'Moderado'

    deleted = api_client.delete(f'/api/properties/{target.pk}/')
    assert deleted.status_code == 204
    assert not Property.objects.filter(pk=target.pk).exists()


@pytest.mark.django_db
def test_staff_reaches_an_inactive_listing_the_public_queryset_hides(api_client, staff, seller):
    """SPEC:PERM-004 — a row listed in the panel must not 404 when opened."""
    hidden = make_property(owner=seller, title='Retirada del mapa', status='inactive')

    api_client.force_authenticate(user=staff)
    response = api_client.patch(f'/api/properties/{hidden.pk}/', {'title': 'Revisada'}, format='json')

    assert response.status_code == 200


@pytest.mark.django_db
def test_a_third_party_still_cannot_touch_someone_elses_listing(api_client, seller, create_user):
    """SPEC:PERM-004 — the staff shortcut is for staff, not for every account."""
    target = make_property(owner=seller, title='Anuncio ajeno')

    api_client.force_authenticate(user=create_user(username='intrusa', email='intrusa@example.com'))
    response = api_client.patch(f'/api/properties/{target.pk}/', {'title': 'Secuestrado'}, format='json')

    assert response.status_code == 403
