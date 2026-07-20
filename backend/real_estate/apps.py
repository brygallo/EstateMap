from django.apps import AppConfig

class RealEstateConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'real_estate'

    def ready(self):
        from . import signals  # noqa: F401
