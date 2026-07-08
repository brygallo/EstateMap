"""
Registro de scrapers. Cada portal registra su clase con ``@register``.
"""
from .base import BaseScraper, available_scrapers, get_scraper, register  # noqa: F401

# Importar los scrapers concretos para que se auto-registren.
from . import properati  # noqa: F401,E402
from . import plusvalia  # noqa: F401,E402
# RE/MAX desactivado (no se usa). No se importa para que no se registre ni
# reaparezca como Fuente en el panel. El archivo remax.py se conserva por si se
# reactiva en el futuro.
# from . import remax  # noqa: F401,E402
