"""
Pytest fixtures for testing authentication and email functionality
"""
import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """API client for making requests"""
    return APIClient()


@pytest.fixture
def user_data():
    """Sample user data for registration"""
    return {
        'username': 'testuser',
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'User',
        'password': 'SecurePass123!',
    }


@pytest.fixture
def create_user(db):
    """Factory fixture to create users"""
    def make_user(**kwargs):
        defaults = {
            'username': 'testuser',
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'is_active': True,
            'is_email_verified': True,
        }
        defaults.update(kwargs)
        password = defaults.pop('password', 'TestPass123!')
        user = User.objects.create_user(**defaults)
        user.set_password(password)
        user.save()
        return user
    return make_user


@pytest.fixture
def authenticated_client(api_client, create_user):
    """API client with authenticated user"""
    user = create_user()
    api_client.force_authenticate(user=user)
    api_client.user = user
    return api_client


@pytest.fixture
def clear_mailbox():
    """Clear Django mail outbox before each test"""
    mail.outbox = []
    return mail.outbox


@pytest.fixture(autouse=True)
def reset_email_backend(settings):
    """Ensure we're using console backend for tests"""
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
