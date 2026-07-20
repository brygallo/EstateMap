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
import re
import time
from datetime import datetime, time as datetime_time

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

_REGISTRY = {}


def parse_source_datetime(value):
    """Normalize portal ISO dates and return None when the value is unreliable."""
    if not value:
        return None
    raw = str(value).strip()
    if raw.isdigit():
        stamp = int(raw)
        if stamp > 10_000_000_000:
            stamp /= 1000
        try:
            return datetime.fromtimestamp(stamp, tz=timezone.get_current_timezone())
        except (OverflowError, OSError, ValueError):
            return None
    parsed = parse_datetime(raw)
    if parsed is None:
        day = parse_date(raw[:10])
        parsed = datetime.combine(day, datetime_time.min) if day else None
    if parsed is not None and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def extract_html_source_dates(html_text):
    """Extract Schema.org or meta dates without fabricating unavailable values."""
    def find(keys):
        for key in keys:
            patterns = [
                rf'<meta[^>]+(?:property|name|itemprop)=["\']{key}["\'][^>]+content=["\']([^"\']+)',
                rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name|itemprop)=["\']{key}["\']',
                rf'["\']{key}["\']\s*:\s*["\']([^"\']+)',
                rf'["\']{key}["\']\s*:\s*([0-9]{{10,13}})',
            ]
            for pattern in patterns:
                match = re.search(pattern, html_text, re.I)
                if match:
                    parsed = parse_source_datetime(match.group(1))
                    if parsed:
                        return parsed
        return None
    return {
        "source_published_at": find(("datePosted", "datePublished", "dateCreated", "article:published_time")),
        "source_updated_at": find(("dateModified", "dateUpdated", "article:modified_time")),
    }


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

    def scrape(self, limit=None, log=None, searches=None, skip_url=None, on_gone=None):
        """
        Generador que produce dicts canónicos. ``limit`` acota el total.
        ``log`` es un callable opcional para mensajes de progreso.
        ``searches`` acota qué categorías/operaciones recorrer.
        ``skip_url`` es un predicado ``url -> bool``: si devuelve True para la
        URL de un anuncio, se salta sin descargarlo (modo "solo nuevas" / tandas).
        ``on_gone`` receives ``(url, external_id, http_status)`` when the portal
        confirms that a detail page is gone, allowing callers to persist it.
        """
        raise NotImplementedError

    def scrape_one(self, url, categoria="", operacion="venta", listing=None):
        """
        Re-scrapea un solo anuncio por su URL. Debe devolver el dict canónico,
        la cadena ``'GONE'`` si ya no existe, o ``None`` ante error transitorio.
        Por defecto no soportado (los que quieran 'actualizar/vigencia' lo
        implementan).
        """
        return None

    def check_exists(self, url):
        """Comprueba vigencia sin exigir datos completos. True/False/None;
        None representa un fallo transitorio y nunca debe retirar el anuncio."""
        result = self.scrape_one(url)
        if result == "GONE":
            return False
        if result is None:
            return None
        return True

    def check_many(self, urls):
        """Versión por lote; los scrapers pueden reutilizar una sesión HTTP."""
        for url in urls:
            yield self.check_exists(url)

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
