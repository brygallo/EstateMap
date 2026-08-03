"""
Celery application for Geo Propiedades.

The broker is shared with the other Aents systems on the same host, so every
project gets its own Redis database index instead of its own Redis. Workers are
never shared: a worker executes this project's Python code, so each system runs
its own. See docs/celery.md for the index registry.
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "estate_map.settings")

app = Celery("estate_map")

# Namespace keeps every Celery option under CELERY_* in settings.py, so the
# broker URL and the Django settings stay in one file.
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
