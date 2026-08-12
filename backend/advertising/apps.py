from django.apps import AppConfig


class AdvertisingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "advertising"
    verbose_name = "Publicidad"

    def ready(self):
        from . import signals  # noqa: F401
