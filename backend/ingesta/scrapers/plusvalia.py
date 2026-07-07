"""
Scraper de Plusvalía Ecuador (https://www.plusvalia.com) — SCRAPING HTML.

Portal del grupo Navent (misma familia que Properati). No usa API ni dataset:
lee el HTML servido de las páginas y extrae del gran blob JS embebido (SSR) que
cada ficha incluye, igual que Properati con su ``pageData``.

Estructura del sitio (verificada sobre el HTML real):

1. Listados con URL amigable ``/venta/<tipo>`` (p. ej. ``/venta/terrenos``,
   ``/alquiler/terrenos``). Paginación por querystring ``?page=N``. Cada tarjeta
   enlaza a una ficha ``/propiedades/clasificado/<slug>-<ID>.html`` (los
   ``/propiedades/proyecto/...`` y ``/emprendimiento/...`` son desarrollos y se
   ignoran). El ``<ID>`` numérico final es el ``external_id`` estable.
2. La ficha trae en un ``<script>`` inline (objeto JS / dataLayer) casi todo:
   - ``"operationType":{"name":"venta"}`` (operación).
   - ``"prices":[{... "amount":115000, "formattedAmount":"115.000"}]`` (precio).
   - ``"featureId":"NNN","label":"...","value":"..."`` (características).
   - ``'whatsApp': '593 964146666'``  ← **teléfono/WhatsApp del anunciante**
     (server-rendered; también hay un ``'partialPhone'`` enmascarado que se
     ignora). Es el dato prioritario y SÍ se captura.
   - ``'name': 'Inmoimpakto Inmobiliaria'`` (inmobiliaria/publicador).
   Título/URL/imagen principal salen de las meta ``og:*``; la descripción
   completa del cuerpo va en ``<div id="reactDescription">``; provincia/cantón/
   parroquia salen del breadcrumb y del subtítulo bajo el ``<h1>``.

════════════════════════════════════════════════════════════════════════════
CLOUDFLARE — cómo se resuelve (leer antes de tocar el fetch)
════════════════════════════════════════════════════════════════════════════

El dominio está detrás de Cloudflare y responde 403 ("Just a moment…") a
``httpx``/``curl`` normales. El motivo NO es la cookie ni el JS: es el
**fingerprint TLS/JA3** del cliente. Cloudflare identifica a httpx/curl por su
handshake TLS (distinto al de un navegador) y lo marca como bot.

Solución (verificada, sin navegador ni cookies): usar **``curl_cffi`` imitando
el fingerprint de Chrome** (``impersonate="chrome"``). Con eso el handshake es
idéntico al de Chrome real y Cloudflare sirve el HTML normal (200) tanto en
listados como en fichas. No hace falta Playwright, ni resolver Turnstile, ni
``cf_clearance``. ``curl_cffi`` está en ``requirements``; si faltara, el
scraper cae a httpx (que recibirá 403 y degradará con gracia).

LIMITACIÓN QUE QUEDA — SIN COORDENADAS. Plusvalía **no expone lat/lng en el
HTML**: el mapa de la ficha es una IMAGEN PNG pre-renderizada en su CDN
(``img*.naventcdn.com/ficha/map/Plusvalia/<ID>E.png``) con las coordenadas
"quemadas" en el servidor. Sólo hay ubicación por texto (parroquia / cantón /
provincia). Como el pipeline exige lat/lng, los anuncios se geocodifican por
dirección (Nominatim) en ``_parse_detail``; si la geocodificación falla, el
anuncio sale sin coordenadas y el pipeline lo descartará.
"""
import html as html_lib
import os
import re

from .base import BaseScraper, register
from ..pipeline import normalize

# Búsquedas por defecto: (path del listado, categoria, operacion). Terrenos
# primero, igual que Properati. Se puede sobreescribir desde
# ``Fuente.config['searches']``.
DEFAULT_SEARCHES = [
    ("/venta/terrenos", "terreno", "venta"),
    ("/venta/casas", "casa", "venta"),
    ("/venta/departamentos", "departamento", "venta"),
    ("/venta/oficinas-comerciales", "oficina", "venta"),
    ("/venta/locales-comerciales", "local", "venta"),
    ("/alquiler/terrenos", "terreno", "alquiler"),
]

# Ficha individual: /propiedades/clasificado/<slug>-<ID>.html (captura el ID).
# Se excluyen /propiedades/proyecto/ y /emprendimiento/ (son desarrollos).
_DETAIL_RE = re.compile(r'/propiedades/clasificado/[^"\'?\s]+?-(\d+)\.html')
_ID_RE = re.compile(r'-(\d+)\.html')

# Datos del blob JS embebido de la ficha.
_OP_RE = re.compile(r'"operationType"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"')
# Primer "amount" dentro del array "prices".
_PRICE_RE = re.compile(r'"prices"\s*:\s*\[\s*\{[^}]*?"amount"\s*:\s*([0-9]+)')
_PRICE_FMT_RE = re.compile(r'"formattedAmount"\s*:\s*"([^"]+)"')
# Teléfono/WhatsApp del anunciante (clave con comillas simples en el dataLayer).
_PHONE_RE = re.compile(r"'whatsApp'\s*:\s*'([^']+)'")
# Inmobiliaria: 'name' contiguo a 'publisherId' (dataLayer), en comillas simples
# o dobles según el bloque.
_AGENCY_RE = re.compile(
    r"""["']publisherId["']\s*:\s*["']?\d+["']?\s*,\s*["']name["']\s*:\s*["']([^"']+)["']"""
)
# Características (id -> label/value) para deducir dormitorios/baños/superficie.
_FEATURE_RE = re.compile(
    r'"featureId"\s*:\s*"(\d+)"\s*,\s*"label"\s*:\s*"([^"]*)"\s*,\s*"measure"\s*:\s*[^,]*,\s*"value"\s*:\s*"([^"]*)"'
)
# Descripción completa del cuerpo.
_DESC_RE = re.compile(r'id="reactDescription">(.*?)</section>', re.S)
# Total de anuncios que muestra el portal en la cabecera / <title> del listado.
_TOTAL_RE = re.compile(
    r'([0-9][0-9.,]*)\s+(?:Inmuebles|Terrenos|Casas|Departamentos|Oficinas|Locales)',
    re.I,
)
# Imágenes del anuncio en el CDN de Navent.
_IMG_RE = re.compile(
    r'https://img\d*\.naventcdn\.com/avisos/(?:resize/)?[0-9/]+?/\d+x\d+/\d+\.(?:jpe?g|png|webp)',
    re.I,
)


def _meta(html_text, prop):
    m = re.search(
        r'<meta[^>]+(?:property|name)="' + re.escape(prop) + r'"[^>]*content="([^"]*)"',
        html_text,
    )
    return html_lib.unescape(m.group(1)) if m else ""


def _abs(url, base):
    if url.startswith("http"):
        return url
    return base.rstrip("/") + "/" + url.lstrip("/")


# Caché de geocodificación (Nominatim) por consulta, en memoria del proceso.
_GEOCODE_CACHE = {}


def _geocode(query, log=None):
    """
    Geocodifica una dirección aproximada con Nominatim (OSM). Plusvalía NO
    expone coordenadas (ver docstring), así que ubicamos el anuncio por su
    texto (parroquia / cantón / provincia). El resultado es a nivel de
    barrio/parroquia — NO es la ubicación exacta del inmueble. Cachea por
    consulta y respeta el límite de ~1 req/s de Nominatim. Devuelve
    ``(lat, lng)`` como cadenas o ``(None, None)``.

    Se puede desactivar con la variable de entorno ``PLUSVALIA_NO_GEOCODE=1``
    (entonces los anuncios saldrán sin coordenadas y el pipeline los descartará).
    """
    if not query or os.environ.get("PLUSVALIA_NO_GEOCODE") == "1":
        return None, None
    if query in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[query]
    import time
    import httpx

    result = (None, None)
    try:
        time.sleep(1.1)  # cortesía con Nominatim (máx 1 req/s)
        r = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "ec"},
            headers={"User-Agent": "GeoPropiedadesEC/1.0 (agregador de propiedades Ecuador)"},
            timeout=20.0,
        )
        data = r.json() if r.status_code == 200 else []
        if data:
            result = (data[0]["lat"], data[0]["lon"])
    except Exception as exc:  # pragma: no cover - red externa
        if log:
            log(f"[plusvalia] geocode error '{query}': {exc}")
    _GEOCODE_CACHE[query] = result
    return result


@register
class PlusvaliaScraper(BaseScraper):
    key = "plusvalia"
    nombre = "Plusvalía Ecuador"
    base_url = "https://www.plusvalia.com"
    # UA de navegador real (el sitio responde 403 a clientes no-navegador; ver
    # nota de Cloudflare en el docstring del módulo).
    request_delay = 1.5

    def _client(self):
        """
        Cliente HTTP que pasa Cloudflare imitando el fingerprint TLS de Chrome
        (``curl_cffi``, ver docstring del módulo). Si ``curl_cffi`` no está
        instalado, cae a ``httpx`` (que recibirá 403 y degradará con gracia).
        """
        headers = {
            "Accept-Language": "es-EC,es;q=0.9,en;q=0.8",
        }
        try:
            from curl_cffi import requests as cffi_requests
            return cffi_requests.Session(
                impersonate="chrome", timeout=30.0, headers=headers,
                allow_redirects=True,
            )
        except Exception:  # pragma: no cover - fallback sin curl_cffi
            import httpx
            headers["User-Agent"] = (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
            )
            return httpx.Client(timeout=25.0, headers=headers, follow_redirects=True)

    def scrape(self, limit=None, log=None, searches=None, skip_url=None):
        searches = searches or DEFAULT_SEARCHES
        log = log or (lambda *_: None)
        seen = set()
        produced = 0
        saltados = 0

        with self._client() as client:
            for path, categoria, operacion in searches:
                start = _abs(path, self.base_url)
                for detail_url, ext in self._iter_detail_urls(client, start, log):
                    if detail_url in seen:
                        continue
                    seen.add(detail_url)
                    if skip_url and skip_url(detail_url):
                        saltados += 1
                        if saltados % 200 == 0:
                            log(f"[plusvalia] saltados {saltados} ya importados...")
                        continue
                    self._sleep()
                    data = self._scrape_detail(client, detail_url, categoria, operacion, log)
                    if data is None:
                        continue
                    yield data
                    produced += 1
                    if limit and produced >= limit:
                        log(f"[plusvalia] límite alcanzado: {limit}")
                        return

    def _iter_detail_urls(self, client, start_url, log):
        """
        Genera ``(url_ficha, external_id)`` recorriendo las páginas del listado
        con ``?page=N`` hasta que una página no aporte URLs nuevas.
        """
        page = 0
        max_pages = 400  # tope de seguridad
        prev = None
        while page < max_pages:
            page += 1
            sep = "&" if "?" in start_url else "?"
            url = start_url if page == 1 else f"{start_url}{sep}page={page}"
            html_text = self._fetch(client, url, log)
            if html_text is None:
                return

            found = list(dict.fromkeys(_DETAIL_RE.findall(html_text)))  # ids
            # Reconstruir URLs completas (con id) conservando el orden.
            pairs = []
            for m in re.finditer(_DETAIL_RE, html_text):
                pairs.append((_abs(m.group(0), self.base_url), m.group(1)))
            pairs = list(dict.fromkeys(pairs))
            if not pairs or pairs == prev:
                return
            prev = pairs
            for pair in pairs:
                yield pair
            self._sleep()

    def _fetch(self, client, url, log):
        """
        Descarga una URL. Devuelve el HTML o ``None``. Con ``curl_cffi`` pasa
        Cloudflare; si algún día vuelve a caer (403 / página "Just a moment"),
        lo registra y sigue sin reventar.
        """
        try:
            resp = client.get(url)
        except Exception as exc:
            log(f"[plusvalia] error en {url}: {exc}")
            return None
        if resp.status_code != 200:
            hint = " (Cloudflare; ¿curl_cffi instalado?)" if resp.status_code == 403 else ""
            log(f"[plusvalia] {url} -> HTTP {resp.status_code}{hint}")
            return None
        text = resp.text
        # Página real de challenge = documento minúsculo con ese <title>. (El
        # tag <script> de turnstile aparece también en páginas legítimas, así
        # que NO se usa como señal.)
        if len(text) < 20000 and "<title>Just a moment" in text:
            log(f"[plusvalia] {url} devolvió el challenge de Cloudflare")
            return None
        return text

    def scrape_one(self, url, categoria="", operacion="venta"):
        """Re-scrapea una ficha. Devuelve dict / 'GONE' / None (igual patrón)."""
        with self._client() as client:
            try:
                resp = client.get(url)
            except Exception:
                return None
            if resp.status_code in (404, 410):
                return "GONE"
            if resp.status_code != 200:
                return None
            if "/propiedades/clasificado/" not in str(resp.url):
                return "GONE"
            return self._parse_detail(resp.text, url, categoria, operacion)

    def count_available(self):
        """Suma aproximada de anuncios de las búsquedas por defecto (cabecera)."""
        total = 0
        with self._client() as client:
            for path, _cat, _op in DEFAULT_SEARCHES:
                html_text = self._fetch(client, _abs(path, self.base_url), lambda *_: None)
                m = _TOTAL_RE.search(html_text) if html_text else None
                if m:
                    total += int(re.sub(r"[.,]", "", m.group(1)))
                self._sleep()
        return total

    def _scrape_detail(self, client, detail_url, categoria, operacion, log):
        html_text = self._fetch(client, detail_url, log)
        if html_text is None:
            return None
        return self._parse_detail(html_text, detail_url, categoria, operacion)

    def _parse_detail(self, h, detail_url, categoria, operacion):
        ext = _ID_RE.search(detail_url)
        external_id = ext.group(1) if ext else detail_url

        title = _meta(h, "og:title")
        # Limpiar el sufijo ", Provincia de X"/" - Plusvalía" del título de meta.
        title_clean = re.split(r",\s*Provincia\s+de\b|\s+-\s+Plusval", title)[0].strip()

        op_value = _OP_RE.search(h)
        status = normalize.map_status(
            op_value.group(1) if op_value else operacion, operacion
        )

        property_type = normalize.map_property_type(title_clean, categoria, detail_url)

        # Precio: primer "amount" del array "prices"; fallback a formattedAmount.
        price_m = _PRICE_RE.search(h)
        if price_m:
            price = normalize.parse_price(price_m.group(1))
        else:
            fmt = _PRICE_FMT_RE.search(h)
            price = normalize.parse_price(fmt.group(1) if fmt else None)

        # Características: mapear por palabra clave del label.
        rooms = bathrooms = 0
        area = built_area = None
        total_area = None
        for _fid, label, value in _FEATURE_RE.findall(h):
            lbl = normalize._strip_accents(label).lower()
            if "dormitor" in lbl or "habitac" in lbl:
                rooms = rooms or normalize.parse_int(value)
            elif "bano" in lbl:  # 'baño' sin acento
                bathrooms = bathrooms or normalize.parse_int(value)
            elif "superficie total" in lbl or "sup. total" in lbl or lbl == "total":
                total_area = total_area or normalize.parse_area(value)
            elif "superficie cubierta" in lbl or "cubierta" in lbl or "construid" in lbl:
                built_area = built_area or normalize.parse_area(value)
        # Superficie del título si no vino en features (p. ej. "... · 2500m²").
        if total_area is None:
            mt = re.search(r'([0-9][0-9.,]*)\s*m(?:²|2|<sup>2)', title, re.I)
            if mt:
                total_area = normalize.parse_area(mt.group(1))
        area = total_area or built_area
        built = built_area if property_type != "land" else None

        # Descripción completa (cuerpo) o, si no, la meta recortada.
        desc_m = _DESC_RE.search(h)
        description = (
            normalize.clean_description(desc_m.group(1)) if desc_m
            else normalize.clean_text(_meta(h, "og:description"))
        )

        # Ubicación (aproximada; SIN coordenadas — ver nota A del módulo).
        province = ""
        pm = re.search(r"Provincia de ([^,\-|]+)", title)
        if pm:
            province = pm.group(1).strip()
        # Subtítulo bajo el <h1> (p. ej. "Pintag,  Sangolqui, Quito").
        addr = ""
        loc_m = re.search(
            r'section-location-property[^>]*>.*?<[^>]*>([^<]{3,120})<', h, re.S
        )
        if loc_m:
            addr = normalize.clean_text(loc_m.group(1))
        # Cantón: penúltimo/último token del subtítulo.
        city = ""
        if addr:
            parts = [p.strip() for p in addr.split(",") if p.strip()]
            if parts:
                city = parts[-1]

        # SIN coordenadas en el HTML de Plusvalía: geocodificar la dirección
        # aproximada (nivel barrio/parroquia). Ver _geocode() y docstring.
        geo_query = ", ".join([p for p in [addr, province, "Ecuador"] if p])
        latitude, longitude = _geocode(geo_query)

        # Teléfono / WhatsApp del anunciante (PRIORITARIO). Normalizar a dígitos.
        phone_m = _PHONE_RE.search(h)
        contact_phone = ""
        if phone_m:
            contact_phone = re.sub(r"[^\d+]", "", html_lib.unescape(phone_m.group(1)))

        agency_m = _AGENCY_RE.search(h)
        source_agency = normalize.clean_text(agency_m.group(1) if agency_m else "", 150)

        # Imágenes únicas (por nombre de archivo final), orden de aparición.
        images = []
        seen_img = set()
        for u in _IMG_RE.findall(h):
            fname = u.rsplit("/", 1)[-1].split("?")[0]
            if fname in seen_img:
                continue
            seen_img.add(fname)
            images.append(u)

        return {
            "external_id": external_id,
            "source_url": _meta(h, "og:url") or detail_url,
            "title": normalize.clean_text(title_clean, 150),
            "description": description,
            "property_type": property_type,
            "status": status,
            "price": price,
            "area": area,
            "built_area": built,
            "rooms": rooms,
            "bathrooms": bathrooms,
            # Coordenadas APROXIMADAS por geocodificación de la dirección
            # (Plusvalía no da lat/lng); None si la geocodificación falló.
            "latitude": latitude,
            "longitude": longitude,
            "address": normalize.clean_text(addr, 255),
            "city": normalize.clean_text(city, 100),
            "province": normalize.clean_text(province, 100),
            "contact_phone": contact_phone,
            "contact_email": "",
            "source_agency": source_agency,
            "image_urls": images,
        }
