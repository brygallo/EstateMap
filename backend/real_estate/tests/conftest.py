"""
Pytest fixtures for testing authentication and email functionality
"""
import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient

# Fixtures used by the tests generated from specs/. Imported here so pytest
# discovers them; the implementation lives in spec_support.py.
from real_estate.tests.spec_support import spec_request, spec_world  # noqa: F401

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


@pytest.fixture(autouse=True)
def media_stays_on_local_disk(settings, tmp_path_factory):
    """
    Write uploaded files to a temp directory instead of object storage.

    The default storage is S3/MinIO, so any test saving an ImageField reaches
    for a bucket and dies on missing credentials wherever MinIO is not running
    — CI, most notably. Each test gets its own directory, so files written by
    one never show up in another.
    """
    settings.STORAGES = {
        **settings.STORAGES,
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
            "OPTIONS": {"location": str(tmp_path_factory.mktemp("media"))},
        },
    }


@pytest.fixture(autouse=True)
def throttle_counters_dont_leak_between_tests(settings):
    """
    Give every test its own cache, and therefore its own throttle counters.

    DRF keeps rate-limit state in the default cache, which in this project is a
    shared Redis. Without this, the counters survive from one test to the next
    and accumulate across the whole run: the suite eats its own 30/hour write
    budget and later tests start getting 429 instead of the status they assert.
    It shows up as tests that pass alone and fail together, which is the most
    expensive kind of failure to chase.
    """
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "spec-tests",
        }
    }
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def celery_runs_inline():
    """
    Run tasks in-process during tests.

    Without this, anything calling .delay() tries to reach a real broker and the
    test fails on a refused connection instead of on its own assertion.
    """
    from estate_map.celery import app

    previous = app.conf.task_always_eager
    app.conf.task_always_eager = True
    yield
    app.conf.task_always_eager = previous
