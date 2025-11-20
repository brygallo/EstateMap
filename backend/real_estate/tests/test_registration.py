"""
Tests for user registration and email verification
"""
import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework import status
from real_estate.models import EmailVerificationToken

User = get_user_model()


@pytest.mark.django_db
@pytest.mark.auth
class TestUserRegistration:
    """Test user registration functionality"""

    def test_register_user_success(self, api_client, user_data, clear_mailbox):
        """Test successful user registration"""
        url = reverse('register')
        response = api_client.post(url, user_data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email=user_data['email']).exists()

        # Check user is created but not active
        user = User.objects.get(email=user_data['email'])
        assert user.is_active is False
        assert user.is_email_verified is False

        # Check verification email was sent
        assert len(mail.outbox) == 1
        assert 'Verifica tu correo' in mail.outbox[0].subject
        assert user_data['email'] in mail.outbox[0].to

    def test_register_duplicate_email(self, api_client, create_user, user_data):
        """Test registration with existing email fails"""
        create_user(email=user_data['email'])
        url = reverse('register')
        response = api_client.post(url, user_data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data

    def test_register_invalid_password(self, api_client, user_data):
        """Test registration with weak password fails"""
        user_data['password'] = '123'
        url = reverse('register')
        response = api_client.post(url, user_data, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data

    def test_register_missing_required_fields(self, api_client):
        """Test registration with missing fields fails"""
        url = reverse('register')
        response = api_client.post(url, {}, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in response.data
        assert 'email' in response.data
        assert 'password' in response.data


@pytest.mark.django_db
@pytest.mark.auth
@pytest.mark.email
class TestEmailVerification:
    """Test email verification functionality"""

    def test_verify_email_success(self, api_client, user_data, clear_mailbox):
        """Test successful email verification"""
        # Register user
        register_url = reverse('register')
        api_client.post(register_url, user_data, format='json')

        # Get verification token
        user = User.objects.get(email=user_data['email'])
        token = EmailVerificationToken.objects.filter(user=user).latest('created_at')

        # Verify email
        verify_url = reverse('verify_email')
        response = api_client.post(
            verify_url,
            {'email': user_data['email'], 'code': token.code},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'verificado exitosamente' in response.data['message'].lower()

        # Check user is now active
        user.refresh_from_db()
        assert user.is_active is True
        assert user.is_email_verified is True

        # Check welcome email was sent
        assert len(mail.outbox) == 2  # Verification + Welcome
        welcome_email = mail.outbox[1]
        assert 'Bienvenido' in welcome_email.subject

    def test_verify_email_invalid_code(self, api_client, create_user):
        """Test verification with invalid code fails"""
        user = create_user(is_active=False, is_email_verified=False)
        verify_url = reverse('verify_email')

        response = api_client.post(
            verify_url,
            {'email': user.email, 'code': '999999'},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'inválido' in response.data['error'].lower()

    def test_verify_email_expired_code(self, api_client, create_user):
        """Test verification with expired code fails"""
        from django.utils import timezone
        from datetime import timedelta

        user = create_user(is_active=False, is_email_verified=False)

        # Create expired token
        token = EmailVerificationToken.objects.create(
            user=user,
            code='123456',
            expires_at=timezone.now() - timedelta(hours=1)
        )

        verify_url = reverse('verify_email')
        response = api_client.post(
            verify_url,
            {'email': user.email, 'code': token.code},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expirado' in response.data['error'].lower()

    def test_verify_email_already_verified(self, api_client, create_user):
        """Test verifying already verified email"""
        from real_estate.email_utils import create_verification_token

        user = create_user()  # Already active and verified
        token = create_verification_token(user)

        verify_url = reverse('verify_email')
        response = api_client.post(
            verify_url,
            {'email': user.email, 'code': token.code},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'ya ha sido verificado' in response.data['message'].lower()


@pytest.mark.django_db
@pytest.mark.auth
@pytest.mark.email
class TestResendVerification:
    """Test resending verification code"""

    def test_resend_verification_success(self, api_client, create_user, clear_mailbox):
        """Test successfully resending verification code"""
        user = create_user(is_active=False, is_email_verified=False)

        url = reverse('resend_verification')
        response = api_client.post(url, {'email': user.email}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'nuevo código' in response.data['message'].lower()

        # Check email was sent
        assert len(mail.outbox) == 1
        assert user.email in mail.outbox[0].to

    def test_resend_verification_already_verified(self, api_client, create_user):
        """Test resending to already verified user"""
        user = create_user()  # Already verified

        url = reverse('resend_verification')
        response = api_client.post(url, {'email': user.email}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'ya ha sido verificado' in response.data['message'].lower()

    def test_resend_verification_invalid_email(self, api_client):
        """Test resending to non-existent email"""
        url = reverse('resend_verification')
        response = api_client.post(url, {'email': 'fake@example.com'}, format='json')

        assert response.status_code == status.HTTP_404_NOT_FOUND
