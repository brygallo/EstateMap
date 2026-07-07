"""
Formato del *paquete* de datos: el artefacto que genera el scraping en LOCAL y
que producción solo importa.

Estructura en disco::

    <paquete>/
      manifest.json        # metadatos de la fuente + estadísticas
      listings.jsonl       # una propiedad normalizada por línea (JSON)
      images/<external_id>/0.jpg, 1.jpg, ...

El paquete es autocontenido y portátil: se copia a producción y se importa con
``python manage.py ingesta_import <paquete>``.
"""
import json
import os


MANIFEST_NAME = "manifest.json"
LISTINGS_NAME = "listings.jsonl"
IMAGES_DIR = "images"


class PaqueteWriter:
    """Escribe un paquete durante ``ingesta_scrape`` (uso en LOCAL)."""

    def __init__(self, path):
        self.path = path
        self.listings_path = os.path.join(path, LISTINGS_NAME)
        os.makedirs(os.path.join(path, IMAGES_DIR), exist_ok=True)
        self._listings_file = None
        self.count = 0

    def __enter__(self):
        self._listings_file = open(self.listings_path, "w", encoding="utf-8")
        return self

    def __exit__(self, *exc):
        if self._listings_file:
            self._listings_file.close()

    def image_dir(self, external_id):
        """Carpeta (creada) donde guardar las imágenes de un anuncio."""
        d = os.path.join(self.path, IMAGES_DIR, _safe(external_id))
        os.makedirs(d, exist_ok=True)
        return d

    def append_listing(self, listing):
        """Escribe una propiedad normalizada (dict) como una línea JSONL."""
        self._listings_file.write(json.dumps(listing, ensure_ascii=False) + "\n")
        self._listings_file.flush()
        self.count += 1

    def write_manifest(self, fuente, extra=None):
        manifest = {
            "fuente": {
                "slug": fuente["slug"] if isinstance(fuente, dict) else fuente.slug,
                "nombre": fuente["nombre"] if isinstance(fuente, dict) else fuente.nombre,
                "base_url": fuente["base_url"] if isinstance(fuente, dict) else fuente.base_url,
            },
            "total": self.count,
            "formato": 1,
        }
        if extra:
            manifest.update(extra)
        with open(os.path.join(self.path, MANIFEST_NAME), "w", encoding="utf-8") as fh:
            json.dump(manifest, fh, ensure_ascii=False, indent=2)


class PaqueteReader:
    """Lee un paquete durante ``ingesta_import`` (uso en PRODUCCIÓN)."""

    def __init__(self, path):
        self.path = path
        self.listings_path = os.path.join(path, LISTINGS_NAME)
        if not os.path.isfile(self.listings_path):
            raise FileNotFoundError(f"No se encontró {LISTINGS_NAME} en {path}")

    def read_manifest(self):
        with open(os.path.join(self.path, MANIFEST_NAME), encoding="utf-8") as fh:
            return json.load(fh)

    def iter_listings(self):
        with open(self.listings_path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    yield json.loads(line)

    def image_paths(self, external_id):
        """Rutas absolutas de las imágenes de un anuncio, ordenadas."""
        d = os.path.join(self.path, IMAGES_DIR, _safe(external_id))
        if not os.path.isdir(d):
            return []
        files = [f for f in os.listdir(d) if not f.startswith(".")]
        files.sort(key=_natural_key)
        return [os.path.join(d, f) for f in files]


def _safe(external_id):
    """Nombre de carpeta seguro a partir del id externo."""
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in str(external_id))


def _natural_key(name):
    base = os.path.splitext(name)[0]
    return int(base) if base.isdigit() else base
