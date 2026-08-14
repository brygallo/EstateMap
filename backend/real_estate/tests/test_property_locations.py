import pytest

from real_estate.models import Property


pytestmark = pytest.mark.django_db


def test_locations_include_active_city_center(api_client):
    """SPEC:MCLUS-003 — city filters receive a usable map center."""
    Property.objects.create(
        title='North listing',
        price=100000,
        province='Pichincha',
        city='Quito',
        latitude=-0.16,
        longitude=-78.49,
    )
    Property.objects.create(
        title='South listing',
        price=120000,
        province='Pichincha',
        city='Quito',
        latitude=-0.20,
        longitude=-78.45,
    )
    Property.objects.create(
        title='Inactive outlier',
        price=90000,
        status='inactive',
        province='Pichincha',
        city='Quito',
        latitude=1.0,
        longitude=-80.0,
    )

    response = api_client.get('/api/properties/locations/')

    assert response.status_code == 200
    pichincha = next(group for group in response.json() if group['province'] == 'Pichincha')
    assert pichincha['centers']['Quito']['latitude'] == pytest.approx(-0.18)
    assert pichincha['centers']['Quito']['longitude'] == pytest.approx(-78.47)
