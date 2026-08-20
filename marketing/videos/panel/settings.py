"""Settings for the panel.

This is a local operator tool, not a deployed service: it binds to loopback,
keeps no database and stores no state of its own. Every fact it shows is read
from the factory on each request, so the panel can never disagree with the
catalogue.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

SECRET_KEY = "video-panel-loopback-only"
DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]

INSTALLED_APPS: list[str] = []

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "panel.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": False,
        "OPTIONS": {"context_processors": []},
    },
]

WSGI_APPLICATION = "panel.wsgi.application"

DATABASES: dict[str, dict] = {}

LANGUAGE_CODE = "es-ec"
TIME_ZONE = "America/Guayaquil"
USE_TZ = True
USE_I18N = False

STATIC_URL = "/static/"
