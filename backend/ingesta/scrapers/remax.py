"""
Scraper de RE/MAX Ecuador (https://www.remax.com.ec).

El sitio es una SPA de Angular sin HTML server-render: TODO el contenido lo
sirve su propio backend JSON (el mismo que consume el front del navegador), en
``https://api-ec.redremax.com/remaxweb-ec/api``. No es una API de socio ni un
dataset: es el endpoint que el propio front llama. Se lee igual que Plusvalía
lee su blob SSR, sólo que aquí ya viene como JSON limpio.

Estructura:

1. **Listado** ``/listings/findAll?page=N&pageSize=M`` (``page`` 0-based).
   Devuelve ``data.data[]`` con casi todo por anuncio: ``id``/``slug``,
   ``location.coordinates=[lng,lat]`` (COORDENADAS EXACTAS), ``type.value`` y
   ``operation.value`` (sale/rent), precio, dormitorios/baños, dimensiones,
   ``addressInfo`` ("Barrio, Ciudad, Provincia"), ``associate`` (agente:
   teléfono, email, oficina) y ``photos``. También ``totalItems``/``totalPages``.
   La respuesta ya viene MEZCLADA (casas, deptos, terrenos, oficinas, ...) y con
   venta y alquiler, así que un solo stream paginado da variedad.
2. **Detalle** ``/listings/findBySlug/<slug>`` — añade la ``description``
   completa (el listado no la trae). Se fusiona: ``addressInfo`` sale del
   listado (en el detalle viene null), la descripción del detalle.

Coordenadas: ``location.coordinates`` = ``[longitud, latitud]`` (orden GeoJSON).
Se descartan los anuncios sin coordenadas (``return None``), como Properati/
Plusvalía. No se geocodifica.

Teléfono/WhatsApp: ``associate.phones[].value`` (móvil del agente). Email en
``associate.emails[].value``. Inmobiliaria = ``associate.office.name``.

Imágenes: ``photos[].value`` es una ruta relativa; el CDN es
``https://d2hy2ig0r5r41b.cloudfront.net/<value>`` (acepta también prefijos de
tamaño tipo ``AUTOx860/``).

Anti-bot: el API responde 200 a ``curl_cffi`` (impersonate chrome) sin cookies
ni headers especiales; ``httpx`` normal también suele bastar aquí.
"""
import re

from .base import BaseScraper, register
from ..pipeline import normalize

API_BASE = "https://api-ec.redremax.com/remaxweb-ec/api"
IMG_BASE = "https://d2hy2ig0r5r41b.cloudfront.net/"
PAGE_SIZE = 50

# Búsquedas: sufijos de querystring para ``findAll``. Por defecto un único
# stream (ya viene mezclado por tipo y operación). Se puede sobreescribir desde
# ``Fuente.config['searches']``.
DEFAULT_SEARCHES = [""]


def _num(v):
    """Devuelve float positivo o None (para precio/dimensiones ya numéricas)."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f > 0 else None


def _phone(associate):
    for ph in (associate or {}).get("phones") or []:
        val = ph.get("value")
        if val:
            return re.sub(r"[^\d+]", "", val)
    return ""


def _email(associate):
    for em in (associate or {}).get("emails") or []:
        if em.get("value"):
            return em["value"]
    return ""


@register
class RemaxScraper(BaseScraper):
    key = "remax"
    nombre = "RE/MAX Ecuador"
    base_url = "https://www.remax.com.ec"
    request_delay = 1.5

    def _client(self):
        """Cliente HTTP. ``curl_cffi`` (impersonate chrome) o ``httpx`` de reserva."""
        headers = {"Accept": "application/json", "Accept-Language": "es-EC,es;q=0.9"}
        try:
            from curl_cffi import requests as cffi_requests
            return cffi_requests.Session(
                impersonate="chrome", timeout=30.0, headers=headers, allow_redirects=True,
            )
        except Exception:  # pragma: no cover - fallback sin curl_cffi
            import httpx
            headers["User-Agent"] = (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
            )
            return httpx.Client(timeout=25.0, headers=headers, follow_redirects=True)

    def _get_json(self, client, url, log):
        try:
            resp = client.get(url)
        except Exception as exc:
            log(f"[remax] error en {url}: {exc}")
            return None
        if resp.status_code != 200:
            log(f"[remax] {url} -> HTTP {resp.status_code}")
            return None
        try:
            return resp.json()
        except Exception:
            log(f"[remax] {url} -> respuesta no-JSON")
            return None

    def scrape(self, limit=None, log=None, searches=None, skip_url=None):
        searches = searches or DEFAULT_SEARCHES
        log = log or (lambda *_: None)
        seen = set()
        produced = 0
        saltados = 0

        with self._client() as client:
            # Round-robin entre búsquedas (con la por defecto es un único stream,
            # ya mezclado por tipo y operación).
            active = [[self._iter_listings(client, q, log)] for q in searches]
            while active:
                still = []
                for entry in active:
                    it = entry[0]
                    try:
                        slug, ext, rec = next(it)
                    except StopIteration:
                        continue
                    still.append(entry)
                    if ext in seen:
                        continue
                    seen.add(ext)
                    source_url = self._source_url(rec)
                    if skip_url and skip_url(source_url):
                        saltados += 1
                        if saltados % 200 == 0:
                            log(f"[remax] saltados {saltados} ya importados...")
                        continue
                    self._sleep()
                    data = self._scrape_detail(client, slug, ext, rec, log)
                    if data is None:
                        continue
                    yield data
                    produced += 1
                    if limit and produced >= limit:
                        log(f"[remax] límite alcanzado: {limit}")
                        return
                active = still

    def _iter_listings(self, client, query, log):
        """
        Pagina ``findAll`` y produce ``(slug, id, listing_item)`` por anuncio.
        """
        page = 0
        max_pages = 4000  # tope de seguridad
        while page < max_pages:
            sep = "&" if query else ""
            url = f"{API_BASE}/listings/findAll?page={page}&pageSize={PAGE_SIZE}{sep}{query}"
            payload = self._get_json(client, url, log)
            data = (payload or {}).get("data") or {}
            items = data.get("data") or []
            if not items:
                return
            for it in items:
                slug = it.get("slug")
                ext = it.get("id")
                if slug and ext:
                    yield slug, ext, it
            total_pages = data.get("totalPages")
            page += 1
            if total_pages is not None and page >= total_pages:
                return
            self._sleep()

    def scrape_one(self, url, categoria="", operacion="venta", listing=None):
        """Re-scrapea por URL. Devuelve dict / 'GONE' / None."""
        m = re.search(r"/listings/(?:buy|rent)/([a-z0-9\-]+)", url) or \
            re.search(r"/([a-z0-9\-]+)/?$", url)
        if not m:
            return None
        slug = m.group(1)
        with self._client() as client:
            payload = self._get_json(client, f"{API_BASE}/listings/findBySlug/{slug}", lambda *_: None)
            obj = (payload or {}).get("data")
            if payload is not None and obj is None:
                return "GONE"
            if obj is None:
                return None
            return self._parse(obj, obj)

    def count_available(self):
        with self._client() as client:
            payload = self._get_json(
                client, f"{API_BASE}/listings/findAll?page=0&pageSize=1", lambda *_: None
            )
            return int(((payload or {}).get("data") or {}).get("totalItems") or 0)

    def _scrape_detail(self, client, slug, ext, rec, log):
        payload = self._get_json(client, f"{API_BASE}/listings/findBySlug/{slug}", log)
        obj = (payload or {}).get("data")
        # Si el detalle falla, se parsea el item del listado (trae casi todo
        # menos la descripción).
        return self._parse(obj or rec, rec)

    def _source_url(self, obj):
        op = (obj.get("operation") or {}).get("value")
        seg = "rent" if op == "rent" else "buy"
        slug = obj.get("slug") or ""
        return f"{self.base_url}/listings/{seg}/{slug}"

    def _parse(self, obj, listrec):
        if not obj:
            return None
        # Coordenadas EXACTAS: location.coordinates = [lng, lat]. Sin ellas, fuera.
        coords = ((obj.get("location") or {}).get("coordinates")) or \
                 ((listrec.get("location") or {}).get("coordinates"))
        if not coords or len(coords) < 2 or coords[0] is None or coords[1] is None:
            return None
        longitude, latitude = coords[0], coords[1]

        type_value = (obj.get("type") or {}).get("value") or ""
        op_value = (obj.get("operation") or {}).get("value") or ""
        title = obj.get("title") or ""

        property_type = normalize.map_property_type(type_value, title)
        status = normalize.map_status(op_value)

        # Dimensiones: terreno vs construida.
        land = _num(obj.get("dimensionLand"))
        total_built = _num(obj.get("dimensionTotalBuilt"))
        covered = _num(obj.get("dimensionCovered"))
        area = land or total_built or covered
        built = (covered or total_built) if property_type != "land" else None

        rooms = normalize.parse_int(obj.get("bedrooms") or obj.get("totalRooms"))
        bathrooms = (normalize.parse_int(obj.get("bathrooms"))
                     + normalize.parse_int(obj.get("toilets")))

        # Ubicación: addressInfo ("Barrio, Ciudad, Provincia") viene en el listado.
        address_info = obj.get("addressInfo") or listrec.get("addressInfo") or ""
        parts = [p.strip() for p in address_info.split(",") if p.strip()]
        province = parts[-1] if parts else ""
        city = parts[-2] if len(parts) >= 2 else ""
        address = obj.get("displayAddress") or (parts[0] if parts else "")

        associate = obj.get("associate") or listrec.get("associate") or {}
        office = associate.get("office") or {}
        source_agency = office.get("name") or associate.get("name") or ""

        photos = obj.get("photos") or listrec.get("photos") or []
        images = []
        for p in photos:
            if p.get("is360"):
                continue
            val = p.get("value")
            if val:
                images.append(IMG_BASE + val.lstrip("/"))
            if len(images) >= 40:
                break

        return {
            "external_id": str(obj.get("id") or listrec.get("id")),
            "source_url": self._source_url(obj if obj.get("slug") else listrec),
            "title": normalize.clean_text(title, 150),
            "description": normalize.clean_description(obj.get("description") or ""),
            "property_type": property_type,
            "status": status,
            "price": _num(obj.get("price")),
            "area": area,
            "built_area": built,
            "rooms": rooms,
            "bathrooms": bathrooms,
            "latitude": latitude,
            "longitude": longitude,
            "address": normalize.clean_text(address, 255),
            "city": normalize.clean_text(city, 100),
            "province": normalize.clean_text(province, 100),
            "contact_phone": _phone(associate),
            "contact_email": _email(associate),
            "source_agency": normalize.clean_text(source_agency, 150),
            "image_urls": images,
        }
