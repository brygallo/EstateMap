import pytest
from django.urls import reverse

from real_estate.models import Property
from real_estate.services.short_codes import ALPHABET


@pytest.mark.django_db
def test_new_property_receives_a_short_code():
    """SPEC:SOC-003 — creating a property assigns it a short code."""
    property_obj = Property.objects.create(title='Casa en Quito', price=120000)

    assert property_obj.short_code
    assert len(property_obj.short_code) == 5


@pytest.mark.django_db
def test_short_code_alphabet_excludes_ambiguous_characters():
    """SPEC:SOC-003 — the alphabet drops 0, O, 1, I and L so a printed code cannot be misread."""
    for ambiguous in '0O1IL':
        assert ambiguous not in ALPHABET

    property_obj = Property.objects.create(title='Terreno en Macas', price=50000)
    for ambiguous in '0O1IL':
        assert ambiguous not in property_obj.short_code


@pytest.mark.django_db
def test_short_code_survives_a_second_save():
    """SPEC:SOC-003 — editing a property does not change its short code, so printed copies stay valid."""
    property_obj = Property.objects.create(title='Casa en Quito', price=120000)
    original_code = property_obj.short_code

    property_obj.title = 'Casa en Quito (remodelada)'
    property_obj.save()
    property_obj.refresh_from_db()

    assert property_obj.short_code == original_code


@pytest.mark.django_db
def test_two_properties_get_different_short_codes():
    """SPEC:SOC-003 — codes are unique across listings."""
    first = Property.objects.create(title='Casa 1', price=1000)
    second = Property.objects.create(title='Casa 2', price=2000)

    assert first.short_code != second.short_code


@pytest.mark.django_db
def test_by_code_resolves_an_existing_property(api_client):
    """SPEC:SOC-003 — GET /api/properties/code/<code>/ returns 200 and the right id."""
    property_obj = Property.objects.create(title='Casa en Quito', price=120000)

    response = api_client.get(f'/api/properties/code/{property_obj.short_code}/')

    assert response.status_code == 200
    assert response.data['id'] == property_obj.id


@pytest.mark.django_db
def test_by_code_resolves_regardless_of_case(api_client):
    """SPEC:SOC-003 — a lowercase code, as someone would type it from a photo, also resolves."""
    property_obj = Property.objects.create(title='Casa en Quito', price=120000)

    response = api_client.get(f'/api/properties/code/{property_obj.short_code.lower()}/')

    assert response.status_code == 200
    assert response.data['id'] == property_obj.id


@pytest.mark.django_db
def test_by_code_with_unknown_code_returns_404(api_client):
    """SPEC:SOC-003 — an unknown code answers 404."""
    response = api_client.get('/api/properties/code/ZZZZZ/')

    assert response.status_code == 404


@pytest.mark.django_db
def test_by_code_for_inactive_property_returns_404(api_client):
    """SPEC:SOC-003 — an inactive listing's code is not resolvable either."""
    property_obj = Property.objects.create(title='Casa retirada', price=90000, status='inactive')

    response = api_client.get(f'/api/properties/code/{property_obj.short_code}/')

    assert response.status_code == 404


@pytest.mark.django_db
def test_client_cannot_set_short_code_via_api(authenticated_client):
    """SPEC:SOC-003 — short_code is read-only: a client cannot pick its own via POST/PATCH."""
    response = authenticated_client.post(
        reverse('property-list'),
        {
            'title': 'Casa nueva',
            'property_type': 'house',
            'status': 'for_sale',
            'price': '100000.00',
            'short_code': 'ABCDE',
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['short_code'] != 'ABCDE'

    created = Property.objects.get(id=response.data['id'])
    assert created.short_code != 'ABCDE'

    other_code = created.short_code
    patch_response = authenticated_client.patch(
        reverse('property-detail', kwargs={'pk': created.id}),
        {'short_code': 'FGHJK'},
        format='json',
    )

    assert patch_response.status_code == 200
    created.refresh_from_db()
    assert created.short_code == other_code
    assert created.short_code != 'FGHJK'
