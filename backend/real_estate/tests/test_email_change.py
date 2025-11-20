"""
Tests for email change functionality
"""
import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework import status
from real_estate.models import EmailChangeToken

User = get_user_model()


@pytest.mark.django_db
@pytest.mark.auth
@pytest.mark.email
class TestRequestEmailChange:
    """Test requesting email change"""

    def test_request_email_change_success(self, authenticated_client, clear_mailbox):
        """Test successfully requesting email change"""
        new_email = 'newemail@example.com'
        url = reverse('request_email_change')

        response = authenticated_client.post(
            url,
            {'new_email': new_email},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'código de verificación' in response.data['message'].lower()
        assert response.data['new_email'] == new_email

        # Check token was created
        assert EmailChangeToken.objects.filter(
            user=authenticated_client.user,
            new_email=new_email
        ).exists()

        # Check email was sent to NEW email
        assert len(mail.outbox) == 1
        assert 'Verifica tu nuevo correo' in mail.outbox[0].subject
        assert new_email in mail.outbox[0].to

    def test_request_email_change_requires_authentication(self, api_client):
        """Test email change requires authentication"""
        url = reverse('request_email_change')
        response = api_client.post(
            url,
            {'new_email': 'new@example.com'},
            format='json'
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_request_email_change_duplicate_email(self, authenticated_client, create_user):
        """Test changing to existing email fails"""
        existing_user = create_user(email='existing@example.com', username='existinguser')
        url = reverse('request_email_change')

        response = authenticated_client.post(
            url,
            {'new_email': existing_user.email},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'ya está en uso' in str(response.data).lower()

    def test_request_email_change_same_email(self, authenticated_client):
        """Test changing to same email fails"""
        url = reverse('request_email_change')

        response = authenticated_client.post(
            url,
            {'new_email': authenticated_client.user.email},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # El mensaje puede ser "correo actual" o "ya está en uso" dependiendo de la validación
        error_msg = str(response.data).lower()
        assert 'correo' in error_msg or 'email' in error_msg

    def test_request_email_change_invalidates_old_tokens(self, authenticated_client):
        """Test requesting change invalidates previous tokens"""
        url = reverse('request_email_change')

        # First request
        authenticated_client.post(
            url,
            {'new_email': 'email1@example.com'},
            format='json'
        )
        first_token = EmailChangeToken.objects.filter(
            user=authenticated_client.user
        ).latest('created_at')

        # Second request
        authenticated_client.post(
            url,
            {'new_email': 'email2@example.com'},
            format='json'
        )

        # First token should be invalidated
        first_token.refresh_from_db()
        assert first_token.is_used is True


@pytest.mark.django_db
@pytest.mark.auth
@pytest.mark.email
class TestVerifyEmailChange:
    """Test verifying email change"""

    def test_verify_email_change_success(self, authenticated_client, clear_mailbox):
        """Test successfully verifying email change"""
        new_email = 'newemail@example.com'
        old_email = authenticated_client.user.email

        # Request email change
        request_url = reverse('request_email_change')
        authenticated_client.post(
            request_url,
            {'new_email': new_email},
            format='json'
        )

        # Get verification token
        token = EmailChangeToken.objects.filter(
            user=authenticated_client.user
        ).latest('created_at')

        # Verify email change
        verify_url = reverse('verify_email_change')
        response = authenticated_client.post(
            verify_url,
            {'code': token.code},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'actualizado exitosamente' in response.data['message'].lower()
        assert response.data['new_email'] == new_email

        # Check email was changed
        authenticated_client.user.refresh_from_db()
        assert authenticated_client.user.email == new_email

        # Check token is marked as used
        token.refresh_from_db()
        assert token.is_used is True

        # Check notification email was sent to OLD email
        notification_emails = [email for email in mail.outbox if old_email in email.to]
        assert len(notification_emails) == 1
        assert 'Tu correo ha sido cambiado' in notification_emails[0].subject

    def test_verify_email_change_requires_authentication(self, api_client):
        """Test verification requires authentication"""
        url = reverse('verify_email_change')
        response = api_client.post(url, {'code': '123456'}, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_verify_email_change_invalid_code(self, authenticated_client):
        """Test verification with invalid code fails"""
        url = reverse('verify_email_change')
        response = authenticated_client.post(url, {'code': '999999'}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'inválido' in response.data['error'].lower()

    def test_verify_email_change_expired_code(self, authenticated_client):
        """Test verification with expired code fails"""
        from django.utils import timezone
        from datetime import timedelta

        new_email = 'newemail@example.com'

        # Create expired token
        token = EmailChangeToken.objects.create(
            user=authenticated_client.user,
            new_email=new_email,
            code='123456',
            expires_at=timezone.now() - timedelta(hours=1)
        )

        url = reverse('verify_email_change')
        response = authenticated_client.post(url, {'code': token.code}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expirado' in response.data['error'].lower()

    def test_verify_email_change_email_now_taken(self, authenticated_client, create_user):
        """Test verification fails if email is now taken by another user"""
        new_email = 'newemail@example.com'

        # Request email change
        request_url = reverse('request_email_change')
        authenticated_client.post(
            request_url,
            {'new_email': new_email},
            format='json'
        )

        # Get token
        token = EmailChangeToken.objects.filter(
            user=authenticated_client.user
        ).latest('created_at')

        # Another user takes the email
        create_user(email=new_email, username='otheruser')

        # Try to verify
        verify_url = reverse('verify_email_change')
        response = authenticated_client.post(
            verify_url,
            {'code': token.code},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'ya está en uso' in response.data['error'].lower()


@pytest.mark.django_db
@pytest.mark.auth
class TestEmailChangeToken:
    """Test EmailChangeToken model"""

    def test_token_is_valid(self, create_user):
        """Test token is_valid method"""
        from django.utils import timezone
        from datetime import timedelta

        user = create_user()

        # Valid token
        valid_token = EmailChangeToken.objects.create(
            user=user,
            new_email='new@example.com',
            code='123456',
            expires_at=timezone.now() + timedelta(hours=1)
        )
        assert valid_token.is_valid() is True

        # Expired token
        expired_token = EmailChangeToken.objects.create(
            user=user,
            new_email='new2@example.com',
            code='234567',
            expires_at=timezone.now() - timedelta(hours=1)
        )
        assert expired_token.is_valid() is False

        # Used token
        used_token = EmailChangeToken.objects.create(
            user=user,
            new_email='new3@example.com',
            code='345678',
            expires_at=timezone.now() + timedelta(hours=1),
            is_used=True
        )
        assert used_token.is_valid() is False
