"""
Scraper de Properati Ecuador (https://www.properati.com.ec) — SCRAPING HTML.

No usa API ni dataset. Funciona en dos pasos:

1. Recorre las páginas de resultados ``/s/<categoria>/<operacion>`` siguiendo el
   enlace ``rel="next"`` (paginación por segmento: /2, /3, ...). De cada página
   saca las URLs de los anuncios (``/detalle/...``).
2. Abre cada página de detalle y extrae del HTML:
   - ``pageData`` (objeto JS embebido): id estable + coordenadas del mapa +
     provincia/cantón/dirección.
   - meta ``og:*``: título, descripción, imagen principal.
   - DOM: precio (``data-test="listing-price"``), área (``data-test="area-value"``),
     operación (``js-mortgage-operationType``) e imágenes (``img.properati.com``).

La ubicación sale del widget de mapa que Properati muestra en cada anuncio, así
que casi todos traen lat/lng (requisito para entrar al mapa).
"""
import html as html_lib
import re

from .base import BaseScraper, extract_html_source_dates, register
from ..pipeline import normalize

# Búsquedas por defecto (categoria, operacion). Terrenos primero. Se puede
# sobreescribir desde ``Fuente.config['searches']``.
DEFAULT_SEARCHES = [
    ("terreno", "venta"),
    ("casa", "venta"),
    ("departamento", "venta"),
    ("oficina", "venta"),
    ("local", "venta"),
    ("terreno", "alquiler"),
]

_DETAIL_RE = re.compile(r'https://www\.properati\.com\.ec/detalle/[a-z0-9-]+')
_NEXT_RE = re.compile(r'rel="next"\s+href="([^"]+)"')
_ID_RE = re.compile(r'\bid:\s*"([0-9a-f-]{36})"')
_LAT_RE = re.compile(r'latitude:\s*"([-0-9.]+)"')
_LNG_RE = re.compile(r'longitude:\s*"([-0-9.]+)"')
_OP_RE = re.compile(r'js-mortgage-operationType"\s*value="([^"]*)"')
_PRICE_RE = re.compile(r'data-test="listing-price"[^>]*>\s*([^<]*)<')
_IMG_RE = re.compile(r'https://img\.properati\.com/[A-Za-z0-9=_-]+')
# Descripción completa (texto plano) en el cuerpo del anuncio.
_DESC_RE = re.compile(r'id="description-text"[^>]*>(.*?)</div>', re.S)
# Total de anuncios que muestra el portal en la cabecera de resultados.
_TOTAL_RE = re.compile(r'([0-9][0-9.,]*)\s+(?:Inmuebles|Terrenos|Casas|Departamentos|Oficinas|Locales)', re.I)


def _meta(html_text, prop):
    m = re.search(
        r'<meta[^>]+(?:property|name)="' + re.escape(prop) + r'"[^>]*content="([^"]*)"',
        html_text,
    )
    return html_lib.unescape(m.group(1)) if m else ""


def _dt_value(html_text, name):
    """
    Lee un campo estructurado ``data-test="<name>"``. Cubre las dos formas del
    sitio: valor directo (``data-test="x">Terreno``) o en un span contiguo
    (``data-test="x"></div><span>357m²</span>``). '' si no está.
    """
    m = re.search(r'data-test="' + re.escape(name) + r'"[^>]*>\s*([^<]{1,40})', html_text)
    if m and m.group(1).strip():
        return html_lib.unescape(m.group(1).strip())
    m = re.search(r'data-test="' + re.escape(name) + r'".{0,90}?<span>\s*([^<]{1,40})',
                  html_text, re.S)
    return html_lib.unescape(m.group(1).strip()) if m else ""


def _loc_field(html_text, field):
    """Extrae un campo de ``adLocationData`` (province/district/address)."""
    idx = html_text.find("adLocationData")
    if idx < 0:
        return ""
    block = html_text[idx: idx + 500]
    m = re.search(field + r':\s*"([^"]*)"', block)
    return m.group(1) if m else ""


@register
class ProperatiScraper(BaseScraper):
    key = "properati"
    nombre = "Properati Ecuador"
    base_url = "https://www.properati.com.ec"
    # UA de navegador real: el sitio responde 403 a clientes sin navegador.
    request_delay = 1.5

    def _client(self):
        import httpx

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
            ),
            "Accept-Language": "es-EC,es;q=0.9",
        }
        return httpx.Client(timeout=25.0, headers=headers, follow_redirects=True)

    def scrape(self, limit=None, log=None, searches=None, skip_url=None, on_gone=None):
        searches = searches or DEFAULT_SEARCHES
        log = log or (lambda *_: None)
        seen_ids = set()
        produced = 0
        saltados = 0

        with self._client() as client:
            for categoria, operacion in searches:
                start = f"{self.base_url}/s/{categoria}/{operacion}"
                for detail_url in self._iter_detail_urls(client, start, log):
                    if detail_url in seen_ids:
                        continue
                    seen_ids.add(detail_url)
                    # Modo "solo nuevas": si ya está importado, no lo descargamos.
                    if skip_url and skip_url(detail_url):
                        saltados += 1
                        if saltados % 200 == 0:
                            log(f"[properati] saltados {saltados} ya importados...")
                        continue
                    self._sleep()
                    data = self._scrape_detail(client, detail_url, categoria, operacion, log)
                    if data is None:
                        continue
                    yield data
                    produced += 1
                    if limit and produced >= limit:
                        log(f"[properati] límite alcanzado: {limit}")
                        return

    def _iter_detail_urls(self, client, start_url, log):
        """Genera URLs de detalle siguiendo la paginación rel=next."""
        url = start_url
        page = 0
        max_pages = 400  # tope de seguridad (~12k anuncios por búsqueda)
        while url and page < max_pages:
            page += 1
            try:
                resp = client.get(url)
                if resp.status_code != 200:
                    log(f"[properati] {url} -> HTTP {resp.status_code}, corto búsqueda")
                    return
                html_text = resp.text
            except Exception as exc:
                log(f"[properati] error en {url}: {exc}")
                return

            urls = list(dict.fromkeys(_DETAIL_RE.findall(html_text)))
            if not urls:
                return
            for u in urls:
                yield u

            nxt = _NEXT_RE.search(html_text)
            url = html_lib.unescape(nxt.group(1)) if nxt else None
            self._sleep()

    def scrape_one(self, url, categoria="", operacion="venta", listing=None):
        """
        Re-scrapea un anuncio por su URL (para actualizar / verificar vigencia).
        Devuelve el dict canónico, la cadena 'GONE' si ya no existe (404/410 o
        redirige fuera del detalle), o ``None`` ante un error transitorio.
        """
        with self._client() as client:
            try:
                resp = client.get(url)
            except Exception:
                return None
            if resp.status_code in (404, 410):
                return "GONE"
            if resp.status_code != 200:
                return None
            if "/detalle/" not in str(resp.url):
                return "GONE"  # Properati redirige los caídos al listado
            return self._parse_detail(resp.text, url, categoria, operacion)

    def count_available(self):
        """
        Cuenta cuántos anuncios muestra el portal (suma de las búsquedas por
        defecto). Aproximado: lee el total de la cabecera de la primera página.
        """
        total = 0
        with self._client() as client:
            for categoria, operacion in DEFAULT_SEARCHES:
                try:
                    resp = client.get(f"{self.base_url}/s/{categoria}/{operacion}")
                    m = _TOTAL_RE.search(resp.text) if resp.status_code == 200 else None
                    if m:
                        total += int(re.sub(r"[.,]", "", m.group(1)))
                except Exception:
                    continue
                self._sleep()
        return total

    def _scrape_detail(self, client, detail_url, categoria, operacion, log):
        try:
            resp = client.get(detail_url)
            if resp.status_code != 200:
                return None
            h = resp.text
        except Exception as exc:
            log(f"[properati] error detalle {detail_url}: {exc}")
            return None
        return self._parse_detail(h, detail_url, categoria, operacion)

    def _parse_detail(self, h, detail_url, categoria, operacion):
        lat = _LAT_RE.search(h)
        lng = _LNG_RE.search(h)
        if not lat or not lng:
            return None  # sin coordenadas -> no entra al mapa

        ext = _ID_RE.search(h)
        external_id = ext.group(1) if ext else detail_url.rsplit("/", 1)[-1]

        title = _meta(h, "og:title")

        # Descripción COMPLETA del cuerpo; si no está, cae a la meta (recortada).
        desc_m = _DESC_RE.search(h)
        description = (normalize.clean_description(desc_m.group(1)) if desc_m
                       else normalize.clean_text(_meta(h, "og:description")))

        # Campos estructurados (más fiables que parsear el título).
        type_value = _dt_value(h, "property-type-value")
        op_value = _dt_value(h, "operation-type-value") or \
            (_OP_RE.search(h).group(1) if _OP_RE.search(h) else operacion)
        price_m = _PRICE_RE.search(h)

        property_type = normalize.map_property_type(type_value, title, categoria, detail_url)

        # Área: 'plot-area-value' = terreno; 'area-value' = construida/total.
        plot_area = normalize.parse_area(_dt_value(h, "plot-area-value"))
        built_area = normalize.parse_area(_dt_value(h, "area-value"))
        if property_type == "land":
            area = plot_area or built_area
            built = None
        else:
            area = plot_area or built_area
            built = built_area

        # Dormitorios / baños (baños = completos + medios).
        rooms = normalize.parse_int(_dt_value(h, "bedrooms-value"))
        bathrooms = (normalize.parse_int(_dt_value(h, "full-bathrooms-value"))
                     + normalize.parse_int(_dt_value(h, "half-bathrooms-value")))

        # Imágenes únicas preservando el orden (la og:image queda primera).
        images = list(dict.fromkeys(_IMG_RE.findall(h)))

        return {
            "external_id": external_id,
            "source_url": _meta(h, "og:url") or detail_url,
            "title": normalize.clean_text(title, 150),
            "description": description,
            "property_type": property_type,
            "status": normalize.map_status(op_value, operacion),
            "price": normalize.parse_price(price_m.group(1) if price_m else None),
            "area": area,
            "built_area": built,
            "rooms": rooms,
            "bathrooms": bathrooms,
            "latitude": lat.group(1),
            "longitude": lng.group(1),
            "address": normalize.clean_text(_loc_field(h, "address"), 255),
            "city": normalize.clean_text(_loc_field(h, "district"), 100),
            "province": normalize.clean_text(_loc_field(h, "province"), 100),
            # Properati enruta el WhatsApp por su propio número (concierge de la
            # empresa), no expone el celular individual del dueño -> sin teléfono.
            "contact_phone": "",
            "contact_email": "",
            "source_agency": normalize.clean_text(_dt_value(h, "agency-name"), 150),
            "image_urls": images,
            **extract_html_source_dates(h),
        }
