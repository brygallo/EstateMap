"""
Tests for password reset functionality
"""
import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework import status
from real_estate.models import PasswordResetToken

User = get_user_model()


@pytest.mark.django_db
@pytest.mark.auth
@pytest.mark.email
class TestPasswordReset:
    """Test password reset request functionality"""

    def test_request_password_reset_success(self, api_client, create_user, clear_mailbox):
        """Test successful password reset request"""
        user = create_user()
        url = reverse('request_password_reset')

        response = api_client.post(url, {'email': user.email}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'enlace de recuperación' in response.data['message'].lower()

        # Check token was created
        assert PasswordResetToken.objects.filter(user=user).exists()

        # Check email was sent
        assert len(mail.outbox) == 1
        assert 'Recupera tu contraseña' in mail.outbox[0].subject
        assert user.email in mail.outbox[0].to

        # Check email contains reset link
        email_body = mail.outbox[0].body
        assert 'reset-password?token=' in email_body

    def test_request_password_reset_nonexistent_email(self, api_client):
        """Test password reset request with non-existent email"""
        url = reverse('request_password_reset')
        response = api_client.post(url, {'email': 'fake@example.com'}, format='json')

        # Should return success for security (don't reveal if email exists)
        assert response.status_code == status.HTTP_200_OK
        assert 'enlace de recuperación' in response.data['message'].lower()

        # But no email should be sent
        assert len(mail.outbox) == 0

    def test_request_password_reset_invalidates_old_tokens(self, api_client, create_user):
        """Test requesting reset invalidates previous tokens"""
        user = create_user()
        url = reverse('request_password_reset')

        # Request first reset
        api_client.post(url, {'email': user.email}, format='json')
        first_token = PasswordResetToken.objects.filter(user=user).latest('created_at')

        # Request second reset
        api_client.post(url, {'email': user.email}, format='json')

        # First token should be invalidated
        first_token.refresh_from_db()
        assert first_token.is_used is True


@pytest.mark.django_db
@pytest.mark.auth
class TestResetPassword:
    """Test password reset execution functionality"""

    def test_reset_password_success(self, api_client, create_user):
        """Test successfully resetting password with valid token"""
        user = create_user()
        old_password = 'TestPass123!'

        # Create reset token
        from real_estate.email_utils import create_password_reset_token
        token = create_password_reset_token(user)

        # Reset password
        url = reverse('reset_password')
        new_password = 'NewSecurePass456!'
        response = api_client.post(
            url,
            {'token': token.token, 'new_password': new_password},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'actualizada exitosamente' in response.data['message'].lower()

        # Check token is marked as used
        token.refresh_from_db()
        assert token.is_used is True

        # Check password was changed
        user.refresh_from_db()
        assert user.check_password(new_password) is True
        assert user.check_password(old_password) is False

    def test_reset_password_invalid_token(self, api_client):
        """Test reset with invalid token fails"""
        url = reverse('reset_password')
        response = api_client.post(
            url,
            {'token': 'invalid_token', 'new_password': 'NewPass123!'},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'inválido' in response.data['error'].lower()

    def test_reset_password_expired_token(self, api_client, create_user):
        """Test reset with expired token fails"""
        from django.utils import timezone
        from datetime import timedelta

        user = create_user()

        # Create expired token
        token = PasswordResetToken.objects.create(
            user=user,
            token='expired_token_12345',
            expires_at=timezone.now() - timedelta(hours=1)
        )

        url = reverse('reset_password')
        response = api_client.post(
            url,
            {'token': token.token, 'new_password': 'NewPass123!'},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expirado' in response.data['error'].lower()

    def test_reset_password_used_token(self, api_client, create_user):
        """Test reset with already used token fails"""
        user = create_user()

        from real_estate.email_utils import create_password_reset_token
        token = create_password_reset_token(user)

        # Use token once
        url = reverse('reset_password')
        api_client.post(
            url,
            {'token': token.token, 'new_password': 'NewPass1!'},
            format='json'
        )

        # Try to use same token again
        response = api_client.post(
            url,
            {'token': token.token, 'new_password': 'NewPass2!'},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'inválido' in response.data['error'].lower()

    def test_reset_password_weak_password(self, api_client, create_user):
        """Test reset with weak password fails"""
        user = create_user()

        from real_estate.email_utils import create_password_reset_token
        token = create_password_reset_token(user)

        url = reverse('reset_password')
        response = api_client.post(
            url,
            {'token': token.token, 'new_password': '123'},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'new_password' in response.data


@pytest.mark.django_db
@pytest.mark.auth
class TestPasswordResetToken:
    """Test PasswordResetToken model"""

    def test_token_is_valid(self, create_user):
        """Test token is_valid method"""
        from django.utils import timezone
        from datetime import timedelta

        user = create_user()

        # Valid token
        valid_token = PasswordResetToken.objects.create(
            user=user,
            token='valid_token',
            expires_at=timezone.now() + timedelta(hours=1)
        )
        assert valid_token.is_valid() is True

        # Expired token
        expired_token = PasswordResetToken.objects.create(
            user=user,
            token='expired_token',
            expires_at=timezone.now() - timedelta(hours=1)
        )
        assert expired_token.is_valid() is False

        # Used token
        used_token = PasswordResetToken.objects.create(
            user=user,
            token='used_token',
            expires_at=timezone.now() + timedelta(hours=1),
            is_used=True
        )
        assert used_token.is_valid() is False
