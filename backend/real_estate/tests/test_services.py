from unittest.mock import patch

import pytest
from django.urls import reverse

from real_estate.models import Property
from real_estate.services.authentication import (
    GoogleAuthenticationService,
    GoogleIdentityError,
)


@pytest.mark.django_db
def test_google_service_rejects_unverified_email():
    with pytest.raises(GoogleIdentityError):
        GoogleAuthenticationService().authenticate({
            "sub": "google-1",
            "email": "person@example.com",
            "email_verified": False,
        })


@pytest.mark.django_db
def test_google_service_links_existing_account(create_user):
    existing = create_user(email="person@example.com", is_email_verified=False)

    user, tokens = GoogleAuthenticationService().authenticate({
        "sub": "google-1",
        "email": "PERSON@example.com",
        "email_verified": True,
        "picture": "https://example.com/avatar.png",
    })

    existing.refresh_from_db()
    assert user.pk == existing.pk
    assert existing.oauth_id == "google-1"
    assert existing.is_email_verified is True
    assert set(tokens) == {"access", "refresh"}


@pytest.mark.django_db
def test_google_endpoint_does_not_expose_internal_exception(api_client):
    with patch(
        "real_estate.views.id_token.verify_oauth2_token",
        side_effect=RuntimeError("secret internal detail"),
    ):
        response = api_client.post(
            reverse("google_login"), {"token": "credential"}, format="json"
        )

    assert response.status_code == 500
    assert "secret internal detail" not in str(response.data)


@pytest.mark.django_db
def test_public_property_serializer_ignores_internal_fields(authenticated_client):
    response = authenticated_client.post(
        reverse("property-list"),
        {
            "title": "Propiedad segura",
            "property_type": "house",
            "status": "for_sale",
            "price": "100000.00",
            "views_count": 999999,
            "is_imported": True,
            "is_duplicate": True,
            "external_id": "forged-id",
            "dedup_key": "forged-key",
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    property_obj = Property.objects.get(pk=response.data["id"])
    assert property_obj.owner == authenticated_client.user
    assert property_obj.views_count == 0
    assert property_obj.is_imported is False
    assert property_obj.is_duplicate is False
    assert property_obj.external_id == ""
    assert property_obj.dedup_key == ""


@pytest.mark.django_db
def test_lead_notification_service_logs_delivery_failure(caplog):
    from real_estate.services.notifications import LeadNotificationService

    lead = type("LeadStub", (), {"pk": 42})()
    with patch(
        "real_estate.services.notifications.send_lead_notification",
        side_effect=RuntimeError("mail offline"),
    ):
        delivered = LeadNotificationService().notify_created(lead)

    assert delivered is False
    assert "lead_notification_failed lead_id=42" in caplog.text

