"""
Tests for login and authentication
"""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
@pytest.mark.auth
class TestLogin:
    """Test user login functionality"""

    def test_login_success(self, api_client, create_user):
        """Test successful login with email and password"""
        password = 'TestPass123!'
        user = create_user(password=password)

        url = reverse('token_obtain_pair')
        response = api_client.post(
            url,
            {'email': user.email, 'password': password},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
        assert response.data['user']['email'] == user.email
        assert response.data['user']['username'] == user.username

    def test_login_wrong_password(self, api_client, create_user):
        """Test login with wrong password fails"""
        user = create_user(password='CorrectPass123!')

        url = reverse('token_obtain_pair')
        response = api_client.post(
            url,
            {'email': user.email, 'password': 'WrongPass123!'},
            format='json'
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]

    def test_login_nonexistent_email(self, api_client):
        """Test login with non-existent email fails"""
        url = reverse('token_obtain_pair')
        response = api_client.post(
            url,
            {'email': 'fake@example.com', 'password': 'TestPass123!'},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_inactive_user(self, api_client, create_user):
        """Test login with inactive user fails"""
        password = 'TestPass123!'
        user = create_user(password=password, is_active=False)

        url = reverse('token_obtain_pair')
        response = api_client.post(
            url,
            {'email': user.email, 'password': password},
            format='json'
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]

    def test_login_unverified_email(self, api_client, create_user):
        """Test login with unverified email is blocked"""
        password = 'TestPass123!'
        user = create_user(
            password=password,
            is_active=False,  # User is not active (not verified)
            is_email_verified=False  # Email not verified
        )

        url = reverse('token_obtain_pair')
        response = api_client.post(
            url,
            {'email': user.email, 'password': password},
            format='json'
        )

        # Should fail with specific error about email not verified
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email_not_verified' in str(response.data.get('code', ''))
        detail = str(response.data.get('detail', ''))
        assert 'verificada' in detail.lower()

    def test_login_unverified_then_resend_code(self, api_client, create_user):
        """Test full flow: login fails, resend code, verify, then login succeeds"""
        from real_estate.models import EmailVerificationToken

        password = 'TestPass123!'
        user = create_user(
            password=password,
            is_active=False,
            is_email_verified=False
        )

        # Step 1: Try to login - should fail
        login_url = reverse('token_obtain_pair')
        response = api_client.post(
            login_url,
            {'email': user.email, 'password': password},
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email_not_verified' in str(response.data.get('code', ''))

        # Step 2: Request new verification code
        resend_url = reverse('resend_verification')
        response = api_client.post(
            resend_url,
            {'email': user.email},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK

        # Step 3: Get the code and verify
        token = EmailVerificationToken.objects.filter(user=user, is_used=False).latest('created_at')
        verify_url = reverse('verify_email')
        response = api_client.post(
            verify_url,
            {'email': user.email, 'code': token.code},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK

        # Step 4: Now login should succeed
        response = api_client.post(
            login_url,
            {'email': user.email, 'password': password},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_login_missing_email(self, api_client):
        """Test login without email fails"""
        url = reverse('token_obtain_pair')
        response = api_client.post(
            url,
            {'password': 'TestPass123!'},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data

    def test_login_missing_password(self, api_client):
        """Test login without password fails"""
        url = reverse('token_obtain_pair')
        response = api_client.post(
            url,
            {'email': 'test@example.com'},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data


@pytest.mark.django_db
@pytest.mark.auth
class TestAuthentication:
    """Test authentication and JWT token functionality"""

    def test_authenticated_request_success(self, authenticated_client):
        """Test making authenticated request with valid token"""
        # Try to access a protected endpoint
        # Using properties endpoint as example
        url = '/api/properties/my_properties/'
        response = authenticated_client.get(url)

        # Should not return 401
        assert response.status_code != status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_request_fails(self, api_client):
        """Test accessing protected endpoint without token fails"""
        # Try to request email change without authentication
        url = reverse('request_email_change')
        response = api_client.post(
            url,
            {'new_email': 'new@example.com'},
            format='json'
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_contains_user_info(self, api_client, create_user):
        """Test JWT token contains user information"""
        import jwt
        from django.conf import settings

        password = 'TestPass123!'
        user = create_user(password=password)

        # Login
        url = reverse('token_obtain_pair')
        response = api_client.post(
            url,
            {'email': user.email, 'password': password},
            format='json'
        )

        access_token = response.data['access']

        # Decode token (without verification for testing)
        decoded = jwt.decode(
            access_token,
            options={"verify_signature": False}
        )

        assert decoded['user_id'] == str(user.id)
        assert decoded['username'] == user.username


@pytest.mark.django_db
@pytest.mark.unit
class TestUserModel:
    """Test User model"""

    def test_create_user(self, db):
        """Test creating user with valid data"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            first_name='Test',
            last_name='User'
        )

        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.first_name == 'Test'
        assert user.last_name == 'User'
        assert user.is_active is True
        assert user.check_password('TestPass123!') is True

    def test_user_email_unique(self, create_user):
        """Test email uniqueness constraint"""
        from django.db import IntegrityError

        create_user(email='test@example.com')

        with pytest.raises(IntegrityError):
            User.objects.create_user(
                username='anotheruser',
                email='test@example.com',
                password='Pass123!'
            )

    def test_user_str_method(self, create_user):
        """Test user string representation"""
        user = create_user(username='testuser')
        assert str(user) == 'testuser'
