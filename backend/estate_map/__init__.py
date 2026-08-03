"""
Importing the Celery app here is what makes @shared_task bind to it. Without
this, tasks defined in the apps would register against no app and .delay()
would fail at runtime rather than at import time.
"""

from .celery import app as celery_app

__all__ = ("celery_app",)
