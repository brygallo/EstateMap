"""IndexNow: aviso instantáneo a los buscadores cuando cambia una URL.

Bing (y por extensión ChatGPT/Copilot, que se alimentan de su índice) soporta
el protocolo IndexNow: en vez de esperar al recrawl del sitemap, se les avisa
en el momento en que una propiedad se publica, se actualiza o se elimina.

Los pings se acumulan durante unos segundos y se envían en un solo POST
(hasta 10.000 URLs por request según el protocolo), para que una importación
masiva de la ingesta no dispare cientos de requests.
"""

import logging
import os
import threading

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
# Debe coincidir con el archivo servido por el frontend en /<key>.txt.
INDEXNOW_KEY = os.getenv("INDEXNOW_KEY", "8bb1b475c99e1f1d1aec6d62d889ac42")
BATCH_SECONDS = 10

_lock = threading.Lock()
_pending: set[str] = set()
_timer: threading.Timer | None = None


def _site_url() -> str:
    return (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")


def _enabled() -> bool:
    flag = os.getenv("INDEXNOW_ENABLED", "").strip().lower()
    if flag in ("0", "false", "no"):
        return False
    site = _site_url()
    # Sin sitio público no hay nada que indexar (dev/localhost/tests).
    return bool(site) and "localhost" not in site and "127.0.0.1" not in site


def _flush() -> None:
    global _timer
    with _lock:
        urls = sorted(_pending)
        _pending.clear()
        _timer = None
    if not urls:
        return
    site = _site_url()
    host = site.split("://", 1)[-1]
    payload = {
        "host": host,
        "key": INDEXNOW_KEY,
        "keyLocation": f"{site}/{INDEXNOW_KEY}.txt",
        "urlList": urls[:10000],
    }
    try:
        response = requests.post(INDEXNOW_ENDPOINT, json=payload, timeout=10)
        logger.info("IndexNow ping: %s URLs, HTTP %s", len(urls), response.status_code)
    except requests.RequestException as exc:
        logger.warning("IndexNow ping failed: %s", exc)


def submit_urls(paths: list[str]) -> None:
    """Encola rutas (p. ej. ``/propiedad/123``) para el próximo ping IndexNow."""
    if not _enabled():
        return
    global _timer
    site = _site_url()
    with _lock:
        for path in paths:
            url = path if path.startswith("http") else f"{site}{path}"
            _pending.add(url)
        if _timer is None:
            _timer = threading.Timer(BATCH_SECONDS, _flush)
            _timer.daemon = True
            _timer.start()


def submit_property(property_id) -> None:
    """Avisa que la ficha de una propiedad cambió, junto con los hubs afectados."""
    submit_urls([f"/propiedad/{property_id}", "/", "/sitemap.xml"])
