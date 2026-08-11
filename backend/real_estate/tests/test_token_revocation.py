"""Refresh tokens die with the session, not with the calendar."""

import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.mark.django_db
def test_logout_blacklists_the_refresh_token(api_client, create_user):
    """SPEC:PERM-073 — handing the token back kills it immediately."""
    user = create_user()
    refresh = RefreshToken.for_user(user)

    response = api_client.post(
        reverse('token_blacklist'), {'refresh': str(refresh)}, format='json'
    )
    assert response.status_code == 200

    retry = api_client.post(
        reverse('token_refresh'), {'refresh': str(refresh)}, format='json'
    )
    assert retry.status_code == 401


@pytest.mark.django_db
def test_changing_the_password_revokes_every_live_session(api_client, create_user):
    """SPEC:PERM-073 — a stolen token must not survive a password change."""
    user = create_user(password='Original123!')
    stolen = RefreshToken.for_user(user)

    api_client.force_authenticate(user=user)
    response = api_client.post(reverse('change_password'), {
        'old_password': 'Original123!',
        'new_password': 'Renovada456!',
    }, format='json')
    assert response.status_code == 200

    api_client.force_authenticate(user=None)
    retry = api_client.post(
        reverse('token_refresh'), {'refresh': str(stolen)}, format='json'
    )
    assert retry.status_code == 401


@pytest.mark.django_db
def test_resetting_the_password_revokes_every_live_session(api_client, create_user):
    """SPEC:PERM-073 — the reset link is how a victim expels whoever holds a token."""
    from real_estate.email_utils import create_password_reset_token

    user = create_user(password='Original123!')
    stolen = RefreshToken.for_user(user)
    reset = create_password_reset_token(user)

    response = api_client.post(reverse('reset_password'), {
        'token': reset.token,
        'new_password': 'Renovada456!',
    }, format='json')
    assert response.status_code == 200

    retry = api_client.post(
        reverse('token_refresh'), {'refresh': str(stolen)}, format='json'
    )
    assert retry.status_code == 401
