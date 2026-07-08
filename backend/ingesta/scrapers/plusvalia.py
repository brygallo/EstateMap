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

COORDENADAS (reales y EXACTAS, NO se adivinan). Plusvalía publica la
geolocalización exacta de cada anuncio en el objeto
``"postingGeolocation":{"geolocation":{"latitude":X,"longitude":Y}}``, con la
marca ``address.visibility = "EXACT"``. Dónde aparece:
  - En el **LISTADO**: para TODOS los anuncios (clasificados Y proyectos). Este
    scraper lee ahí las coordenadas (``_coords_from_listing``) y las inyecta al
    parsear cada ficha -> los clasificados también entran al mapa con su punto
    exacto.
  - En la **FICHA**: sólo los proyectos repiten ``postingGeolocation`` (los
    clasificados no la repiten en su ficha; por eso se toma del listado).
Un anuncio sin coordenadas se descarta (no se inventa la ubicación), igual que
hace Properati.

Gancho opcional: ``PLUSVALIA_GEOCODE=1`` geocodifica por dirección (Nominatim,
aproximado) como último recurso si algún anuncio no trajera coordenadas.
Desactivado por defecto.
"""
import html as html_lib
import os
import re

from .base import BaseScraper, ScraperBlocked, register
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

# Ficha: /propiedades/{clasificado,proyecto}/<slug>-<ID>.html (captura el ID).
# Se incluyen ambos tipos: los "proyecto" (desarrollos) son los que traen
# coordenadas exactas; los "clasificado" se descartan luego por falta de lat/lng.
_DETAIL_RE = re.compile(r'/propiedades/(?:clasificado|proyecto)/[^"\'?\s]+?-(\d+)\.html')
_ID_RE = re.compile(r'-(\d+)\.html')

# Coordenadas REALES del anuncio (objeto SSR postingGeolocation).
_GEO_RE = re.compile(
    r'"postingGeolocation"\s*:\s*\{\s*"geolocation"\s*:\s*\{\s*'
    r'"latitude"\s*:\s*([-0-9.]+)\s*,\s*"longitude"\s*:\s*([-0-9.]+)'
)
# En el LISTADO cada anuncio (clasificado o proyecto) trae su postingId y, en el
# mismo objeto, su postingGeolocation exacta y su ubicación (dirección + jerarquía
# zona/ciudad/provincia). Se extrae todo por segmentos (entre postingIds).
_LISTING_ID_RE = re.compile(r'"postingId"\s*:\s*"?(\d{6,})"?')
_LISTING_ADDR_RE = re.compile(r'"address"\s*:\s*\{\s*"name"\s*:\s*"([^"]*)"')


def _label_re(label):
    return re.compile(r'"name"\s*:\s*"([^"]*)"\s*,\s*"label"\s*:\s*"' + label + '"')


_PROV_RE = _label_re("PROVINCIA")
_CITY_RE = _label_re("CIUDAD")
_ZONA_RE = _label_re("ZONA")
# Superficie: caption "<Tipo> · 2500m²" del propio anuncio (campo JSON "title").
_AREA_CAP_RE = re.compile(r'"title"\s*:\s*"[^"]*·\s*([0-9][0-9.,]*)\s*m(?:²|2|&sup2;)', re.I)

# Datos del blob JS embebido de la ficha.
_OP_RE = re.compile(r'"operationType"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"')
# Precio por operación: los anuncios venta+alquiler traen AMBOS en pricesData,
# cada uno con su operationType y su amount. Se empareja (operación -> monto).
_PRICES_BY_OP_RE = re.compile(
    r'"operationType"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"[^}]*\}\s*,\s*'
    r'"prices"\s*:\s*\[\s*\{[^\]]*?"amount"\s*:\s*([0-9]+)'
)
# Primer "amount" dentro del array "prices" (fallback).
_PRICE_RE = re.compile(r'"prices"\s*:\s*\[\s*\{[^}]*?"amount"\s*:\s*([0-9]+)')
_PRICE_FMT_RE = re.compile(r'"formattedAmount"\s*:\s*"([^"]+)"')
# Teléfono/WhatsApp del anunciante (clave con comillas simples en el dataLayer).
_PHONE_RE = re.compile(r"'whatsApp'\s*:\s*'([^']+)'")
# Inmobiliaria: 'name' contiguo a 'publisherId' (dataLayer), en comillas simples
# o dobles según el bloque.
_AGENCY_RE = re.compile(
    r"""["']publisherId["']\s*:\s*["']?\d+["']?\s*,\s*["']name["']\s*:\s*["']([^"']+)["']"""
)
# Características PRINCIPALES (bloque ``mainFeatures``, ids CFT estables):
#   CFT100 = superficie total (m²)   CFT101 = superficie cubierta (m²)
#   CFT2   = dormitorios             CFT3   = baños   CFT4 = medio baño
# Son la fuente fiable; la otra lista ("Baño de servicio", "Niveles
# construidos", etc.) son atributos secundarios y NO se usan para estos campos.
_MAIN_FEAT_RE = re.compile(r'"(CFT\d+)"\s*:\s*\{[^{}]*?"value"\s*:\s*"?([^",}]+)')
# Descripción completa del cuerpo.
_DESC_RE = re.compile(r'id="reactDescription">(.*?)</section>', re.S)
_DESC_CTA_RE = re.compile(
    r'(?:[\s\xa0]*(?:Leer\s+descripci[oó]n\s+completa|Leer\s+m[aá]s|Ver\s+m[aá]s)\s*)+$',
    re.I,
)
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


def _clean_detail_description(value):
    """Limpia el cuerpo de descripción y quita CTAs visibles del colapsador."""
    text = normalize.clean_description(value).replace("\\t", " ")
    return _DESC_CTA_RE.sub("", text).strip()


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

    Sólo se usa como fallback OPCIONAL para clasificados cuando el llamador lo
    pide (``PLUSVALIA_GEOCODE=1``); por defecto no se invoca.
    """
    if not query:
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
    # Si Cloudflare bloquea (403/challenge) esta cantidad de peticiones seguidas,
    # asumimos un bloqueo real del cliente (no un fallo puntual) y abortamos el
    # run con ScraperBlocked en vez de reportar "0 resultados" como éxito.
    _BLOCK_LIMIT = 3

    def __init__(self):
        self._block_streak = 0

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
            # SIEMPRE INTERCALADO: se recorren todas las búsquedas en round-robin
            # (una URL de cada una por vuelta) para que cada tanda traiga una
            # mezcla de tipos (terrenos, casas, departamentos, oficinas, ...) en
            # lugar de agotar terrenos primero.
            active = []
            for path, categoria, operacion in searches:
                start = _abs(path, self.base_url)
                active.append([self._iter_detail_urls(client, start, log),
                               categoria, operacion])

            while active:
                still = []
                for entry in active:
                    it, categoria, operacion = entry
                    try:
                        detail_url, ext, rec = next(it)
                    except StopIteration:
                        continue  # esta búsqueda se agotó; no vuelve a 'still'
                    still.append(entry)
                    if detail_url in seen:
                        continue
                    seen.add(detail_url)
                    if skip_url and skip_url(detail_url):
                        saltados += 1
                        if saltados % 200 == 0:
                            log(f"[plusvalia] saltados {saltados} ya importados...")
                        continue
                    self._sleep()
                    data = self._scrape_detail(client, detail_url, categoria,
                                               operacion, log, rec)
                    if data is None:
                        continue
                    yield data
                    produced += 1
                    if limit and produced >= limit:
                        log(f"[plusvalia] límite alcanzado: {limit}")
                        return
                active = still

    def _iter_detail_urls(self, client, start_url, log):
        """
        Genera ``(url_ficha, external_id, coords)`` recorriendo las páginas del
        listado con ``?page=N`` hasta que una página no aporte URLs nuevas.
        ``coords`` es ``(lat, lng)`` (cadenas) leído del propio listado, donde
        Plusvalía SÍ publica la geolocalización exacta de cada anuncio
        (clasificados incluidos), o ``None`` si ese anuncio no la trae.
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

            records = self._records_from_listing(html_text)
            # URLs completas + registro del listado (coords/ubicación) por id.
            seen_here = []
            out = []
            for m in re.finditer(_DETAIL_RE, html_text):
                ext = m.group(1)
                url_full = _abs(m.group(0), self.base_url)
                if (url_full, ext) in seen_here:
                    continue
                seen_here.append((url_full, ext))
                out.append((url_full, ext, records.get(ext)))
            ids_now = [e for _u, e in seen_here]
            if not out or ids_now == prev:
                return
            prev = ids_now
            for triple in out:
                yield triple
            self._sleep()

    @staticmethod
    def _records_from_listing(html_text):
        """
        ``{external_id: {"coords": (lat, lng), "address", "city", "province"}}``
        a partir del JSON incrustado del listado. Plusvalía publica ahí, para
        CADA anuncio (clasificados y proyectos), su geolocalización EXACTA y su
        ubicación (dirección + jerarquía zona/ciudad/provincia). Se extrae por
        segmentos: cada objeto va desde su ``postingId`` hasta el siguiente.
        """
        ids = [(m.start(), m.group(1)) for m in _LISTING_ID_RE.finditer(html_text)]
        records = {}
        for k, (pos, pid) in enumerate(ids):
            if pid in records:
                continue
            end = ids[k + 1][0] if k + 1 < len(ids) else pos + 8000
            seg = html_text[pos:end]
            g = _GEO_RE.search(seg)
            a = _LISTING_ADDR_RE.search(seg)
            pr = _PROV_RE.search(seg)
            ci = _CITY_RE.search(seg)
            zo = _ZONA_RE.search(seg)
            # address = calle + zona/barrio (lo que haya), sin duplicar.
            parts = []
            for val in (a.group(1) if a else "", zo.group(1) if zo else ""):
                val = val.strip()
                if val and val not in parts:
                    parts.append(val)
            records[pid] = {
                "coords": (g.group(1), g.group(2)) if g else None,
                "address": ", ".join(parts),
                "city": ci.group(1) if ci else "",
                "province": pr.group(1) if pr else "",
            }
        return records

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
            return None  # error de red transitorio: no cuenta como bloqueo
        if resp.status_code != 200:
            hint = " (Cloudflare; ¿curl_cffi instalado?)" if resp.status_code == 403 else ""
            log(f"[plusvalia] {url} -> HTTP {resp.status_code}{hint}")
            if resp.status_code == 403:
                self._note_block(url, log)
            return None
        text = resp.text
        # Página real de challenge = documento minúsculo con ese <title>. (El
        # tag <script> de turnstile aparece también en páginas legítimas, así
        # que NO se usa como señal.)
        if len(text) < 20000 and "<title>Just a moment" in text:
            log(f"[plusvalia] {url} devolvió el challenge de Cloudflare")
            self._note_block(url, log)
            return None
        self._block_streak = 0  # respuesta legítima: se reinicia la racha
        return text

    def _note_block(self, url, log):
        """Contabiliza un bloqueo (403/challenge). Si se repite ``_BLOCK_LIMIT``
        veces seguidas, lanza ``ScraperBlocked`` para que el run falle con un
        mensaje claro en vez de terminar con 0 resultados como si todo fuera
        bien."""
        self._block_streak += 1
        if self._block_streak >= self._BLOCK_LIMIT:
            raise ScraperBlocked(
                f"Cloudflare bloqueó {self._block_streak} peticiones seguidas a Plusvalía "
                f"(última: {url}). Revisa que curl_cffi esté instalado y actualizado."
            )

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
            if "/propiedades/" not in str(resp.url):
                return "GONE"
            # Nota: al re-scrapear un clasificado suelto no hay contexto de
            # listado, así que sus coordenadas (que sólo publica el listado) no
            # están disponibles aquí; sí para proyectos (postingGeolocation).
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

    def _scrape_detail(self, client, detail_url, categoria, operacion, log, listing=None):
        html_text = self._fetch(client, detail_url, log)
        if html_text is None:
            return None
        return self._parse_detail(html_text, detail_url, categoria, operacion, listing)

    def _parse_detail(self, h, detail_url, categoria, operacion, listing=None):
        ext = _ID_RE.search(detail_url)
        external_id = ext.group(1) if ext else detail_url

        title = _meta(h, "og:title")
        # Limpiar el sufijo ", Provincia de X"/" - Plusvalía" del título de meta.
        title_clean = re.split(r",\s*Provincia\s+de\b|\s+-\s+Plusval", title)[0].strip()

        property_type = normalize.map_property_type(title_clean, categoria, detail_url)

        # Precios por operación. Un anuncio puede ser venta Y alquiler a la vez
        # (pricesData trae ambos). Se guardan los dos, priorizando la VENTA:
        #   - venta+alquiler -> status=for_sale, price=venta, rent_price=alquiler
        #   - solo alquiler  -> status=for_rent, price=alquiler, rent_price=None
        #   - solo venta     -> status=for_sale, price=venta,   rent_price=None
        # Así el resultado es determinista (no depende de la búsqueda que lo
        # encontró) y no aparece "$600.000 en alquiler".
        prices_by_op = {}
        for opn, amount in _PRICES_BY_OP_RE.findall(h):
            prices_by_op.setdefault(opn.lower(), amount)
        sale = normalize.parse_price(prices_by_op.get("venta"))
        rent = normalize.parse_price(prices_by_op.get("alquiler"))
        rent_price = None
        if sale is not None:
            status, price = "for_sale", sale
            rent_price = rent  # si también es alquiler, queda como secundario
        elif rent is not None:
            status, price = "for_rent", rent
        else:  # sin pricesData por operación: fallback al primer amount
            op_norm = "alquiler" if str(operacion).lower().startswith("alq") else "venta"
            status = normalize.map_status(op_norm, operacion)
            pm = _PRICE_RE.search(h)
            fmt = _PRICE_FMT_RE.search(h)
            price = normalize.parse_price(pm.group(1) if pm else (fmt.group(1) if fmt else None))

        # Características principales del bloque mainFeatures (ids CFT estables).
        # first-wins: el anuncio principal aparece antes que los recomendados.
        cft = {}
        for fid, val in _MAIN_FEAT_RE.findall(h):
            cft.setdefault(fid, val)
        rooms = normalize.parse_int(cft.get("CFT2", ""))
        bathrooms = (normalize.parse_int(cft.get("CFT3", ""))
                     + normalize.parse_int(cft.get("CFT4", "")))  # baños + medios
        total_area = normalize.parse_area(cft.get("CFT100", ""))
        built_area = normalize.parse_area(cft.get("CFT101", ""))
        # Superficie si no vino en mainFeatures: caption "<Tipo> · Nm²" del propio
        # anuncio, luego un "Nm²" en el título de meta.
        if total_area is None:
            cap = _AREA_CAP_RE.search(h)
            mt = cap or re.search(r'([0-9][0-9.,]*)\s*m(?:²|2|<sup>2)', title, re.I)
            if mt:
                total_area = normalize.parse_area(mt.group(1))
        area = total_area or built_area
        built = built_area if property_type != "land" else None

        # Descripción completa (cuerpo) o, si no, la meta recortada. El texto
        # completo ya viene en el HTML (colapsado por CSS); "Leer descripción
        # completa"/"Ver más" es SÓLO el botón que expande la vista, así que se
        # quita para que no quede pegado al final del texto.
        desc_m = _DESC_RE.search(h)
        description = (
            _clean_detail_description(desc_m.group(1)) if desc_m
            else normalize.clean_text(_meta(h, "og:description"))
        )

        # Ubicación. Fuente principal: el registro del LISTADO (``listing``),
        # que trae dirección + cantón + provincia limpios para cada anuncio.
        # Fallback a lo que se pueda leer de la ficha.
        listing = listing or {}
        province = listing.get("province") or ""
        city = listing.get("city") or ""
        addr = listing.get("address") or ""
        if not province:
            pm = re.search(r"Provincia de ([^,\-|]+)", title)
            if pm:
                province = pm.group(1).strip()
        if not addr:
            loc_m = re.search(
                r'section-location-property[^>]*>.*?<[^>]*>([^<]{3,120})<', h, re.S
            )
            if loc_m:
                addr = normalize.clean_text(loc_m.group(1))
        if not city and addr:
            parts = [p.strip() for p in addr.split(",") if p.strip()]
            if parts:
                city = parts[-1]

        # Coordenadas REALES y EXACTAS del anuncio. Prioridad:
        #  1) las del LISTADO (``listing['coords']``): clasificados y proyectos.
        #  2) las de la ficha (``postingGeolocation``): presentes en proyectos.
        #  3) fallback opcional de geocodificación (PLUSVALIA_GEOCODE=1).
        # Sin coordenadas -> se descarta (no se adivina).
        latitude = longitude = None
        coords = listing.get("coords")
        if coords and coords[0] and coords[1]:
            latitude, longitude = coords[0], coords[1]
        else:
            geo_m = _GEO_RE.search(h)
            if geo_m:
                latitude, longitude = geo_m.group(1), geo_m.group(2)
            elif os.environ.get("PLUSVALIA_GEOCODE") == "1":
                geo_query = ", ".join([p for p in [addr, province, "Ecuador"] if p])
                latitude, longitude = _geocode(geo_query)
        if latitude is None or longitude is None:
            return None  # sin ubicación exacta -> no entra al mapa

        # Teléfono / WhatsApp del anunciante (PRIORITARIO). Normalizar a dígitos.
        phone_m = _PHONE_RE.search(h)
        contact_phone = ""
        if phone_m:
            contact_phone = re.sub(r"[^\d+]", "", html_lib.unescape(phone_m.group(1)))

        agency_m = _AGENCY_RE.search(h)
        source_agency = normalize.clean_text(agency_m.group(1) if agency_m else "", 150)

        # Imágenes únicas (por nombre de archivo final), orden de aparición. Se
        # limita a 40: la ficha incluye también fotos de anuncios recomendados
        # al final, que no son de esta propiedad.
        images = []
        seen_img = set()
        for u in _IMG_RE.findall(h):
            fname = u.rsplit("/", 1)[-1].split("?")[0]
            if fname in seen_img:
                continue
            seen_img.add(fname)
            images.append(u)
            if len(images) >= 40:
                break

        return {
            "external_id": external_id,
            "source_url": _meta(h, "og:url") or detail_url,
            "title": normalize.clean_text(title_clean, 150),
            "description": description,
            "property_type": property_type,
            "status": status,
            "price": price,
            "rent_price": rent_price,  # precio de alquiler si es venta Y alquiler
            "area": area,
            "built_area": built,
            "rooms": rooms,
            "bathrooms": bathrooms,
            # Coordenadas REALES del anuncio (postingGeolocation SSR).
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
