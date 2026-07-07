"""
Tests del scraper de RE/MAX (``ingesta.scrapers.remax``).

Se prueba ``_parse`` OFFLINE contra objetos JSON que reproducen la forma real
del API de RE/MAX (``findAll`` / ``findBySlug``):

  - Un anuncio con ``location.coordinates`` se parsea entero (coords exactas,
    teléfono del agente, precio, tipo/operación, dimensiones, imágenes).
  - Un anuncio SIN coordenadas -> ``None`` (no se inventa la ubicación).
  - ``addressInfo`` (ciudad/provincia) sale del item de listado aunque el
    detalle la traiga en null.
"""
from ingesta.scrapers.remax import RemaxScraper, IMG_BASE

# Item de LISTADO (findAll): trae addressInfo, coords, agente, fotos.
LIST_ITEM = {
    "id": "fff8884f-b719-433e-8dbf-ab76c2dabeec",
    "slug": "vendo-casa-en-ponceano-alto",
    "title": "VENDO CASA EN PONCEANO ALTO",
    "location": {"type": "Point", "coordinates": [-78.3735076, -0.2171459]},
    "totalRooms": 8, "bedrooms": 4, "bathrooms": 3, "toilets": 1,
    "price": 115000.0, "currency": {"id": 1, "value": "USD"},
    "displayAddress": "Oe31 S/N",
    "addressInfo": "El Condado, Quito, Pichincha",
    "dimensionLand": 285.0, "dimensionTotalBuilt": 237.0, "dimensionCovered": 163.0,
    "type": {"id": 2, "value": "casa"},
    "operation": {"id": 1, "value": "sale"},
    "associate": {
        "name": "Marco Andrade",
        "office": {"name": "REMAX Asesoría Inmobiliaria"},
        "phones": [{"type": "mobile", "value": "+593 9 78900016", "primary": True}],
        "emails": [{"value": "mandrade@remax.com.ec", "primary": True}],
    },
    "photos": [
        {"value": "listings/fff8884f/a.jpg", "is360": None, "position": 0},
        {"value": "listings/fff8884f/b.jpg", "is360": None, "position": 1},
        {"value": "listings/fff8884f/pano.jpg", "is360": True, "position": 2},
    ],
}

# Objeto DETALLE (findBySlug): añade description; addressInfo viene null.
DETAIL = dict(LIST_ITEM, description="Casa amplia y cómoda.\n\nExcelente distribución.",
              addressInfo=None)


class TestRemaxParse:
    def setup_method(self):
        self.scraper = RemaxScraper()

    def test_devuelve_dict(self):
        assert self.scraper._parse(DETAIL, LIST_ITEM) is not None

    def test_coordenadas_exactas(self):
        """location.coordinates = [lng, lat] -> latitude/longitude correctos."""
        d = self.scraper._parse(DETAIL, LIST_ITEM)
        assert d["latitude"] == -0.2171459
        assert d["longitude"] == -78.3735076

    def test_captura_telefono_y_email(self):
        d = self.scraper._parse(DETAIL, LIST_ITEM)
        assert d["contact_phone"] == "+593978900016"
        assert d["contact_email"] == "mandrade@remax.com.ec"

    def test_tipo_operacion_precio(self):
        d = self.scraper._parse(DETAIL, LIST_ITEM)
        assert d["property_type"] == "house"
        assert d["status"] == "for_sale"
        assert d["price"] == 115000.0

    def test_dimensiones_y_ambientes(self):
        d = self.scraper._parse(DETAIL, LIST_ITEM)
        assert d["area"] == 285.0          # terreno
        assert d["built_area"] == 163.0    # cubierta
        assert d["rooms"] == 4             # bedrooms
        assert d["bathrooms"] == 4         # baños + toilets

    def test_ubicacion_desde_addressinfo_del_listado(self):
        """addressInfo (null en detalle) se toma del item de listado."""
        d = self.scraper._parse(DETAIL, LIST_ITEM)
        assert d["city"] == "Quito"
        assert d["province"] == "Pichincha"
        assert d["source_agency"] == "REMAX Asesoría Inmobiliaria"

    def test_imagenes_excluye_360_y_usa_cdn(self):
        d = self.scraper._parse(DETAIL, LIST_ITEM)
        assert d["image_urls"] == [IMG_BASE + "listings/fff8884f/a.jpg",
                                   IMG_BASE + "listings/fff8884f/b.jpg"]

    def test_descripcion_del_detalle(self):
        d = self.scraper._parse(DETAIL, LIST_ITEM)
        assert "Excelente distribución" in d["description"]

    def test_source_url_por_operacion(self):
        assert self.scraper._parse(DETAIL, LIST_ITEM)["source_url"].endswith(
            "/listings/buy/vendo-casa-en-ponceano-alto")

    def test_sin_coordenadas_se_descarta(self):
        obj = dict(DETAIL, location=None)
        rec = dict(LIST_ITEM, location=None)
        assert self.scraper._parse(obj, rec) is None
