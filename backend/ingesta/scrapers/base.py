"""
Contrato común de los scrapers y su registro.

Un scraper visita las páginas HTML de un portal y **produce dicts canónicos**
(la misma forma que consume el paquete/upsert). No escribe en la base ni baja
imágenes: solo devuelve datos + URLs de imagen. La orquestación (validar
ubicación, bajar imágenes, escribir el paquete) la hace ``ingesta_scrape``.

Forma del dict canónico que debe devolver ``scrape()``::

    {
      "external_id": str,          # id estable en el portal (obligatorio)
      "source_url": str,           # URL del anuncio original (obligatorio)
      "title": str,
      "description": str,
      "property_type": str,        # land/house/apartment/commercial/other
      "status": str,               # for_sale/for_rent
      "price": float | None,
      "area": float | None,
      "latitude": float | None,    # OBLIGATORIO para que entre al mapa
      "longitude": float | None,
      "address": str, "city": str, "province": str,
      "contact_phone": str, "contact_email": str,
      "image_urls": [str, ...],
    }
"""
import random
import time

_REGISTRY = {}


class ScraperBlocked(Exception):
    """
    El portal está bloqueando el acceso de forma sostenida (p. ej. Cloudflare
    respondiendo 403 / challenge a cada petición). Se lanza para que el run
    termine en estado ``error`` con un mensaje claro, en vez de reportar
    "0 resultados" como si fuera un éxito.
    """


def register(cls):
    """Decorador: registra un scraper por su ``key``."""
    _REGISTRY[cls.key] = cls
    return cls


def get_scraper(key):
    """Devuelve una instancia del scraper registrado o ``None``."""
    cls = _REGISTRY.get(key)
    return cls() if cls else None


def available_scrapers():
    return sorted(_REGISTRY.keys())


class BaseScraper:
    """Clase base. Los concretos definen ``key``, ``nombre``, ``base_url`` y ``scrape``."""

    key = ""
    nombre = ""
    base_url = ""
    # Segundos de espera entre peticiones (cortesía / evitar bloqueos).
    request_delay = 1.0

    def fuente_defaults(self):
        """Datos para crear/actualizar la ``Fuente`` en la base."""
        return {"slug": self.key, "nombre": self.nombre, "base_url": self.base_url, "scraper": self.key}

    def scrape(self, limit=None, log=None, searches=None, skip_url=None):
        """
        Generador que produce dicts canónicos. ``limit`` acota el total.
        ``log`` es un callable opcional para mensajes de progreso.
        ``searches`` acota qué categorías/operaciones recorrer.
        ``skip_url`` es un predicado ``url -> bool``: si devuelve True para la
        URL de un anuncio, se salta sin descargarlo (modo "solo nuevas" / tandas).
        """
        raise NotImplementedError

    def scrape_one(self, url, categoria="", operacion="venta"):
        """
        Re-scrapea un solo anuncio por su URL. Debe devolver el dict canónico,
        la cadena ``'GONE'`` si ya no existe, o ``None`` ante error transitorio.
        Por defecto no soportado (los que quieran 'actualizar/vigencia' lo
        implementan).
        """
        return None

    def count_available(self):
        """Total aproximado de anuncios que ofrece el portal. 0 si no aplica."""
        return 0

    # --- utilidades para subclases ---
    def _sleep(self):
        """Espera ``request_delay`` con un jitter aleatorio (±30%) para que el
        patrón de peticiones no sea perfectamente regular y fácil de marcar
        como bot."""
        if self.request_delay:
            jitter = self.request_delay * random.uniform(-0.3, 0.3)
            time.sleep(max(0.0, self.request_delay + jitter))

    @staticmethod
    def _http_client():
        import httpx

        headers = {
            "User-Agent": (
                "GeoPropiedadesBot/1.0 (agregador de propiedades de Ecuador; "
                "enlaza a la fuente original)"
            ),
            "Accept-Language": "es-EC,es;q=0.9",
        }
        return httpx.Client(timeout=25.0, headers=headers, follow_redirects=True)
