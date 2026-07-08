import pytest
from django.core import mail
from django.urls import reverse

from real_estate.models import Lead, Property


@pytest.mark.django_db
def test_public_lead_creation_notifies_property_owner(api_client, create_user, clear_mailbox):
    owner = create_user(email='owner@example.com', username='owner')
    property_obj = Property.objects.create(
        owner=owner,
        title='Casa en Quito',
        city='Quito',
        province='Pichincha',
        price=120000,
        contact_email='contacto@example.com',
    )

    response = api_client.post(
        reverse('lead-list'),
        {
            'property': property_obj.id,
            'name': 'Maria Interesada',
            'phone': '0999999999',
            'email': 'maria@example.com',
            'message': 'Me interesa visitar la propiedad.',
            'source': 'property_modal',
        },
        format='json',
    )

    assert response.status_code == 201
    assert Lead.objects.filter(property=property_obj, name='Maria Interesada').exists()
    assert len(mail.outbox) == 1
    assert 'Nuevo interesado en Casa en Quito' in mail.outbox[0].subject
    assert mail.outbox[0].to == ['owner@example.com', 'contacto@example.com']
    assert 'Maria Interesada' in mail.outbox[0].body
    assert '0999999999' in mail.outbox[0].body


@pytest.mark.django_db
def test_user_only_lists_leads_for_own_properties(api_client, create_user):
    owner = create_user(email='owner@example.com', username='owner')
    other_owner = create_user(email='other@example.com', username='other')
    own_property = Property.objects.create(owner=owner, title='Propia', price=100000)
    other_property = Property.objects.create(owner=other_owner, title='Otra', price=90000)
    Lead.objects.create(property=own_property, name='Lead propio', phone='0991111111')
    Lead.objects.create(property=other_property, name='Lead ajeno', phone='0992222222')

    api_client.force_authenticate(user=owner)
    response = api_client.get(reverse('lead-list'))

    assert response.status_code == 200
    assert [lead['name'] for lead in response.data] == ['Lead propio']
