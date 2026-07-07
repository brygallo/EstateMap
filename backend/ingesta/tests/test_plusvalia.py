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
