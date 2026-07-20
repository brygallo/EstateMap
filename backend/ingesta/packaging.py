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
SUPPORTED_FORMATS = {1}


class PaqueteInvalido(ValueError):
    """El paquete está incompleto, corrupto o no cumple el contrato."""


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
        self.manifest_path = os.path.join(path, MANIFEST_NAME)
        if not os.path.isdir(path):
            raise FileNotFoundError(f"No se encontró el paquete {path}")
        if not os.path.isfile(self.listings_path):
            raise FileNotFoundError(f"No se encontró {LISTINGS_NAME} en {path}")
        if not os.path.isfile(self.manifest_path):
            raise FileNotFoundError(
                f"No se encontró {MANIFEST_NAME} en {path}; "
                "el paquete puede estar incompleto"
            )

    def read_manifest(self):
        try:
            with open(self.manifest_path, encoding="utf-8") as fh:
                manifest = json.load(fh)
        except json.JSONDecodeError as exc:
            raise PaqueteInvalido(
                f"{MANIFEST_NAME} no contiene JSON válido: {exc}"
            ) from exc
        self._validate_manifest(manifest)
        return manifest

    def validate(self):
        """Valida todo antes de que la importación modifique la base de datos."""
        manifest = self.read_manifest()
        total = 0
        ids = set()
        for line_number, listing in self._iter_listings_with_line():
            if not isinstance(listing, dict):
                raise PaqueteInvalido(
                    f"{LISTINGS_NAME}, línea {line_number}: se esperaba un objeto JSON"
                )
            external_id = str(listing.get("external_id") or "").strip()
            if not external_id:
                raise PaqueteInvalido(
                    f"{LISTINGS_NAME}, línea {line_number}: external_id es obligatorio"
                )
            if external_id in ids:
                raise PaqueteInvalido(
                    f"{LISTINGS_NAME}, línea {line_number}: external_id duplicado: {external_id}"
                )
            ids.add(external_id)
            total += 1
        if manifest["total"] != total:
            raise PaqueteInvalido(
                f"El manifiesto declara {manifest['total']} anuncios, pero "
                f"{LISTINGS_NAME} contiene {total}"
            )
        return manifest

    @staticmethod
    def _validate_manifest(manifest):
        if not isinstance(manifest, dict):
            raise PaqueteInvalido("manifest.json debe contener un objeto JSON")
        if manifest.get("formato") not in SUPPORTED_FORMATS:
            raise PaqueteInvalido(
                f"Formato de paquete no soportado: {manifest.get('formato')!r}"
            )
        fuente = manifest.get("fuente")
        if not isinstance(fuente, dict):
            raise PaqueteInvalido("Falta el objeto 'fuente' en manifest.json")
        for field in ("slug", "nombre", "base_url"):
            if not isinstance(fuente.get(field), str) or not fuente[field].strip():
                raise PaqueteInvalido(f"Falta fuente.{field} en manifest.json")
        if not isinstance(manifest.get("total"), int) or manifest["total"] < 0:
            raise PaqueteInvalido("manifest.total debe ser un entero no negativo")

    def iter_listings(self):
        for _line_number, listing in self._iter_listings_with_line():
            yield listing

    def _iter_listings_with_line(self):
        with open(self.listings_path, encoding="utf-8") as fh:
            for line_number, line in enumerate(fh, 1):
                line = line.strip()
                if line:
                    try:
                        yield line_number, json.loads(line)
                    except json.JSONDecodeError as exc:
                        raise PaqueteInvalido(
                            f"{LISTINGS_NAME}, línea {line_number}: JSON inválido: {exc}"
                        ) from exc

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
