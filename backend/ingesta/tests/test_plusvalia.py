"""
Tests del scraper de Plusvalía (``ingesta.scrapers.plusvalia``).

Se prueba ``_parse_detail`` de forma OFFLINE (sin red ni Cloudflare) contra
fixtures HTML que reproducen los marcadores reales del sitio:

  - Un **proyecto** trae ``postingGeolocation`` con lat/lng EXACTAS -> se parsea
    entero (coordenadas reales, teléfono/WhatsApp, precio, inmobiliaria, etc.).
  - Un **clasificado** NO trae coordenadas -> ``_parse_detail`` devuelve ``None``
    (no se inventa la ubicación).

Las constantes de fixture están tomadas del HTML servido real por Plusvalía.
"""
import pytest

from ingesta.scrapers.base import ScraperBlocked
from ingesta.scrapers.plusvalia import PlusvaliaScraper


# --- Fragmentos comunes reproducidos del HTML real -------------------------
_SCRIPT_COMMON = """
<script>
mainFeatures = {"CFT100":{"featureId":"CFT100","label":"tot.","measure":"m²","value":"5000"},
"CFT101":{"featureId":"CFT101","label":"cub.","measure":"m²","value":"180"},
"CFT2":{"featureId":"CFT2","label":"hab.","measure":null,"value":"3"},
"CFT3":{"featureId":"CFT3","label":"ba&ntilde;os","measure":null,"value":"1"},
"CFT4":{"featureId":"CFT4","label":"medio ba&ntilde;o","measure":null,"value":"1"}};
var x = {"operationType":{"name":"venta","operationTypeId":"1"},
"prices":[{"isoCode":"USD","currencyId":"2","currency":"USD","amount":292500,"formattedAmount":"292.500"}],
"publisherId":50178801,"name":"GRUPO 3 INVERSIONES",
'partialPhone': '+593 ', 'whatsApp': '593 995806119', 'premier':true};
</script>
<div id="reactDescription"><div><p>Proyecto de casas en Tumbaco.<br>Areas verdes.</p></div></div></section>
<img src="https://img10.naventcdn.com/avisos/9/01/48/15/45/11/1200x1200/1611512005.jpg"/>
<img src="https://img10.naventcdn.com/avisos/9/01/48/15/45/11/360x266/1611512023.jpg"/>
"""

# Proyecto: incluye postingGeolocation con coordenadas EXACTAS.
PROYECTO_HTML = """<html><head>
<meta property="og:title" content="Nuevo Proyecto de Casas en Venta Sector Pacho Salas, Tumbaco, Provincia de Pichincha - Plusvalía"/>
<meta property="og:url" content="https://www.plusvalia.com/propiedades/proyecto/ememhoin-nuevo-proyecto-de-casas-148154511.html"/>
<meta property="og:image" content="https://img10.naventcdn.com/avisos/9/01/48/15/45/11/720x532/1611512005.jpg"/>
</head><body>
<div class="section-location-property"><svg></svg><h2>Pacho Salas, Tumbaco, Quito</h2></div>
<script>var loc = {"postingGeolocation":{"geolocation":{"latitude":-0.221344763440787,"longitude":-78.414314025994880}}};</script>
""" + _SCRIPT_COMMON + "</body></html>"

# Clasificado: MISMO cuerpo pero SIN postingGeolocation (sin coordenadas).
CLASIFICADO_HTML = """<html><head>
<meta property="og:title" content="Terreno en Venta - Pintag, Provincia de Pichincha - Plusvalía"/>
<meta property="og:url" content="https://www.plusvalia.com/propiedades/clasificado/vecltein-terreno-en-venta-pintag-150117697.html"/>
<meta property="og:image" content="https://img10.naventcdn.com/avisos/9/01/50/11/76/97/720x532/1611512005.jpg"/>
</head><body>
<div class="section-location-property"><svg></svg><h2>Pintag, Sangolqui, Quito</h2></div>
""" + _SCRIPT_COMMON + "</body></html>"


class TestPlusvaliaParseDetail:
    """Contrato de ``PlusvaliaScraper._parse_detail`` sobre fixtures reales."""

    def setup_method(self):
        self.scraper = PlusvaliaScraper()

    def _parse_proyecto(self):
        return self.scraper._parse_detail(
            PROYECTO_HTML,
            "https://www.plusvalia.com/propiedades/proyecto/ememhoin-nuevo-proyecto-de-casas-148154511.html",
            "casa", "venta",
        )

    def test_proyecto_devuelve_dict(self):
        assert self._parse_proyecto() is not None

    def test_coordenadas_reales_exactas(self):
        """Las coordenadas salen de postingGeolocation, sin geocodificar."""
        d = self._parse_proyecto()
        assert d["latitude"] == "-0.221344763440787"
        assert d["longitude"] == "-78.414314025994880"

    def test_captura_whatsapp(self):
        """El teléfono/WhatsApp del anunciante se captura y se normaliza."""
        assert self._parse_proyecto()["contact_phone"] == "593995806119"

    def test_precio_y_operacion(self):
        d = self._parse_proyecto()
        assert d["price"] == 292500.0
        assert d["status"] == "for_sale"

    def test_inmobiliaria_e_id(self):
        d = self._parse_proyecto()
        assert d["source_agency"] == "GRUPO 3 INVERSIONES"
        assert d["external_id"] == "148154511"

    def test_imagenes_y_descripcion(self):
        d = self._parse_proyecto()
        assert len(d["image_urls"]) == 2
        assert all("naventcdn.com" in u for u in d["image_urls"])
        assert "Tumbaco" in d["description"]

    def test_uses_highest_resolution_variant_for_each_image(self):
        html = PROYECTO_HTML.replace(
            "</body>",
            '<img src="https://img10.naventcdn.com/avisos/9/01/48/15/45/11/360x266/1611512005.jpg"/>'
            '<img src="https://img10.naventcdn.com/avisos/9/01/48/15/45/11/1200x1200/1611512005.jpg"/>'
            "</body>",
        )

        data = self.scraper._parse_detail(
            html,
            "https://www.plusvalia.com/propiedades/proyecto/ememhoin-nuevo-proyecto-de-casas-148154511.html",
            "casa",
            "venta",
        )

        assert "/1200x1200/1611512005.jpg" in data["image_urls"][0]

    def test_descripcion_quita_cta_leer_descripcion_completa(self):
        html = CLASIFICADO_HTML.replace(
            '<div id="reactDescription"><div><p>Proyecto de casas en Tumbaco.<br>Areas verdes.</p></div></div></section>',
            '<div id="reactDescription"><div><p>Vive con tranquilidad y con estupendo clima cálido.<br>'
            'Contáctame, estaré gustosa de atenderte.<br><br>\\t\\t\\tLeer descripción completa</p></div></div></section>',
        )
        d = self.scraper._parse_detail(
            html,
            "https://www.plusvalia.com/propiedades/clasificado/h-puembo-150000001.html",
            "terreno", "venta",
            listing={"coords": ("-0.17", "-78.35"), "address": "Puembo",
                     "city": "Quito", "province": "Pichincha"},
        )
        assert d["description"].endswith("Contáctame, estaré gustosa de atenderte.")
        assert "Leer descripción completa" not in d["description"]

    def test_dormitorios_y_banos(self):
        d = self._parse_proyecto()
        assert d["rooms"] == 3
        assert d["bathrooms"] == 2

    def test_clasificado_sin_coordenadas_se_descarta(self):
        """Sin coords (ni de listado ni de ficha) -> None (no se inventa)."""
        d = self.scraper._parse_detail(
            CLASIFICADO_HTML,
            "https://www.plusvalia.com/propiedades/clasificado/vecltein-terreno-en-venta-pintag-150117697.html",
            "terreno", "venta",
        )
        assert d is None

    def test_clasificado_usa_datos_del_listado(self):
        """Un clasificado entra con coords + ubicación del listado."""
        d = self.scraper._parse_detail(
            CLASIFICADO_HTML,
            "https://www.plusvalia.com/propiedades/clasificado/vecltein-terreno-en-venta-pintag-150117697.html",
            "terreno", "venta",
            listing={"coords": ("-0.3164948", "-78.4713053"),
                     "address": "Los Cedros, Capelo", "city": "Quito",
                     "province": "Pichincha"},
        )
        assert d is not None
        assert d["latitude"] == "-0.3164948"
        assert d["longitude"] == "-78.4713053"
        assert d["city"] == "Quito"
        assert d["province"] == "Pichincha"
        assert d["address"] == "Los Cedros, Capelo"
        assert d["contact_phone"] == "593995806119"  # sigue capturando el WhatsApp

    def test_coords_listado_tienen_prioridad_sobre_ficha(self):
        """Las coords del listado prevalecen sobre las de la ficha (proyecto)."""
        d = self.scraper._parse_detail(
            PROYECTO_HTML,
            "https://www.plusvalia.com/propiedades/proyecto/ememhoin-nuevo-proyecto-de-casas-148154511.html",
            "casa", "venta",
            listing={"coords": ("-1.111111", "-79.222222")},
        )
        assert d["latitude"] == "-1.111111"
        assert d["longitude"] == "-79.222222"

    def test_extrae_registros_del_listado_por_id(self):
        """_records_from_listing empareja id -> coords + ubicación por segmento."""
        listing = (
            '{"postingId":"111111","postingLocation":{"address":{"name":"Calle A"},'
            '"location":{"name":"Cumbaya","label":"ZONA","parent":{"name":"Quito",'
            '"label":"CIUDAD","parent":{"name":"Pichincha","label":"PROVINCIA"}}},'
            '"postingGeolocation":{"geolocation":{"latitude":-0.11,"longitude":-78.11}}}}'
            '{"postingId":"222222","postingLocation":{"address":{"name":"Calle B"},'
            '"postingGeolocation":{"geolocation":{"latitude":-0.22,"longitude":-78.22}}}}'
        )
        got = self.scraper._records_from_listing(listing)
        assert got["111111"]["coords"] == ("-0.11", "-78.11")
        assert got["111111"]["city"] == "Quito"
        assert got["111111"]["province"] == "Pichincha"
        assert got["111111"]["address"] == "Calle A, Cumbaya"
        assert got["222222"]["coords"] == ("-0.22", "-78.22")

    _DUAL_HTML = (
        '<html><head>'
        '<meta property="og:title" content="Terreno Comercial 825 m2 - Urdesa, Guayaquil"/>'
        '<meta property="og:url" content="https://www.plusvalia.com/propiedades/clasificado/x-149790800.html"/>'
        '</head><body><script>'
        "'pricesData': ["
        '{"operationType":{"name":"venta","operationTypeId":"1"},'
        '"prices":[{"amount":600000,"formattedAmount":"600.000"}]},'
        '{"operationType":{"name":"alquiler","operationTypeId":"2"},'
        '"prices":[{"amount":5000,"formattedAmount":"5.000"}]}],'
        "'whatsApp': '593 993833168'"
        '</script></body></html>'
    )
    _DUAL_URL = "https://www.plusvalia.com/propiedades/clasificado/x-149790800.html"
    _DUAL_REC = {"coords": ("-2.1", "-79.9"), "city": "Guayaquil",
                 "province": "Guayas", "address": "Urdesa"}

    def test_venta_y_alquiler_guarda_ambos_precios(self):
        """Anuncio venta+alquiler: prioriza venta y guarda el alquiler aparte,
        de forma determinista (mismo resultado venga de la búsqueda que venga)."""
        for op in ("venta", "alquiler"):
            d = self.scraper._parse_detail(self._DUAL_HTML, self._DUAL_URL,
                                           "terreno", op, self._DUAL_REC)
            assert d["status"] == "for_sale"      # venta como principal
            assert d["price"] == 600000.0
            assert d["rent_price"] == 5000.0      # alquiler como secundario
            assert d["contact_phone"] == "593993833168"

    def test_solo_alquiler_sin_rent_price_secundario(self):
        """Anuncio SOLO alquiler: precio de alquiler en price, rent_price None."""
        html = self._DUAL_HTML.replace(
            '{"operationType":{"name":"venta","operationTypeId":"1"},'
            '"prices":[{"amount":600000,"formattedAmount":"600.000"}]},', '')
        d = self.scraper._parse_detail(html, self._DUAL_URL, "terreno",
                                       "alquiler", self._DUAL_REC)
        assert d["status"] == "for_rent"
        assert d["price"] == 5000.0
        assert d["rent_price"] is None


class _FakeClient:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class _GoneResponse:
    status_code = 410


class _GoneClient(_FakeClient):
    def get(self, _url):
        return _GoneResponse()


class _RedirectResponse:
    status_code = 200
    url = "https://www.plusvalia.com/"
    text = "<html></html>"


class _RedirectClient(_FakeClient):
    def get(self, _url):
        return _RedirectResponse()


class _Response:
    def __init__(self, status_code, headers=None):
        self.status_code = status_code
        self.headers = headers or {}
        self.url = "https://www.plusvalia.com/propiedades/clasificado/x-10.html"
        self.text = "<html>" + ("x" * 20000) + "</html>"


class _SequenceClient:
    def __init__(self, responses):
        self.responses = iter(responses)

    def get(self, _url):
        return next(self.responses)


def test_429_aplica_backoff_y_reintenta(monkeypatch):
    scraper = PlusvaliaScraper()
    sleeps = []
    monkeypatch.setattr("ingesta.scrapers.plusvalia.time.sleep", sleeps.append)
    monkeypatch.setattr("ingesta.scrapers.plusvalia.random.uniform", lambda *_: 1.0)
    client = _SequenceClient([_Response(429, {"Retry-After": "20"}), _Response(200)])

    response = scraper._get_with_backoff(client, "https://example.test/10", lambda *_: None)

    assert response.status_code == 200
    assert sleeps == [20]


def test_403_repetido_aborta_despues_de_backoff(monkeypatch):
    scraper = PlusvaliaScraper()
    sleeps = []
    monkeypatch.setattr("ingesta.scrapers.plusvalia.time.sleep", sleeps.append)
    monkeypatch.setattr("ingesta.scrapers.plusvalia.random.uniform", lambda *_: 1.0)
    client = _SequenceClient([_Response(403), _Response(403), _Response(403)])

    with pytest.raises(ScraperBlocked):
        scraper._get_with_backoff(client, "https://example.test/10", lambda *_: None)

    assert sleeps == [15, 30]


def test_incremental_compara_id_y_corta_franja_historica(monkeypatch):
    scraper = PlusvaliaScraper()
    scraper._KNOWN_STREAK_LIMIT = 3
    monkeypatch.setattr(scraper, "_client", lambda: _FakeClient())
    monkeypatch.setattr(scraper, "_sleep", lambda: None)
    urls = [
        (f"https://www.plusvalia.com/propiedades/clasificado/slug-{n}.html", str(n), {})
        for n in range(10, 15)
    ]
    monkeypatch.setattr(scraper, "_iter_detail_urls", lambda *_args: iter(urls))
    opened = []
    scanned = []
    monkeypatch.setattr(scraper, "_scrape_detail", lambda _client, url, *_args: opened.append(url))

    results = list(scraper.scrape(
        searches=[("/venta/casas", "casa", "venta")],
        skip_url=lambda _url, external_id=None: external_id in {"10", "11", "12"},
        on_scan=lambda **event: scanned.append(event),
    ))

    assert results == []
    assert opened == []
    assert scanned == [{"skipped": True}] * 3


def test_http_gone_se_notifica_y_cuenta_para_corte_historico(monkeypatch):
    scraper = PlusvaliaScraper()
    scraper._KNOWN_STREAK_LIMIT = 2
    monkeypatch.setattr(scraper, "_client", lambda: _GoneClient())
    monkeypatch.setattr(scraper, "_sleep", lambda: None)
    urls = [
        (f"https://www.plusvalia.com/propiedades/clasificado/slug-{n}.html", str(n), {})
        for n in range(10, 14)
    ]
    monkeypatch.setattr(scraper, "_iter_detail_urls", lambda *_args: iter(urls))
    gone = []

    results = list(scraper.scrape(
        searches=[("/venta/casas", "casa", "venta")],
        on_gone=lambda url, external_id, status: gone.append((url, external_id, status)),
    ))

    assert results == []
    assert [(external_id, status) for _url, external_id, status in gone] == [
        ("10", 410),
        ("11", 410),
    ]


def test_redirect_fuera_de_propiedades_se_registra_como_retirada():
    scraper = PlusvaliaScraper()
    gone = []

    result = scraper._scrape_detail(
        _RedirectClient(),
        "https://www.plusvalia.com/propiedades/clasificado/slug-10.html",
        "casa",
        "venta",
        lambda *_args: None,
        {},
        "10",
        lambda url, external_id, status: gone.append((url, external_id, status)),
    )

    assert result == "GONE"
    assert gone == [(
        "https://www.plusvalia.com/propiedades/clasificado/slug-10.html",
        "10",
        410,
    )]
