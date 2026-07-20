"""
LOCAL: scrapea un portal y genera un *paquete* de datos ya validado.

Ejemplos::

    python manage.py ingesta_scrape --source properati
    python manage.py ingesta_scrape --source properati --limit 200 --out paquetes/prueba
    python manage.py ingesta_scrape --source properati --dry-run
    python manage.py ingesta_scrape --all

Requiere las dependencias de scraping (httpx). NO se corre en producción.
"""
import os

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from ingesta.models import Fuente, ListingCruda
from ingesta.packaging import PaqueteWriter
from ingesta.pipeline.images import download_images
from ingesta.pipeline.location import validate_location
from ingesta.scrapers import available_scrapers, get_scraper


class Command(BaseCommand):
    help = "Scrapea un portal (HTML) y genera un paquete de datos validado (LOCAL)."

    def add_arguments(self, parser):
        parser.add_argument("--source", help="slug del scraper, ej. 'properati'")
        parser.add_argument("--all", action="store_true", help="todas las fuentes disponibles")
        parser.add_argument("--out", help="carpeta destino del paquete")
        parser.add_argument("--limit", type=int, default=None, help="tope de anuncios")
        parser.add_argument("--dry-run", action="store_true", help="no escribe paquete, solo reporta")
        parser.add_argument("--no-images", action="store_true", help="no descargar imágenes")
        parser.add_argument(
            "--skip-known",
            action="store_true",
            help="saltar URLs ya guardadas en ListingCruda para generar lotes sucesivos",
        )

    def handle(self, *args, **opts):
        if opts["all"]:
            keys = available_scrapers()
            if not keys:
                raise CommandError("No hay scrapers registrados.")
        elif opts["source"]:
            keys = [opts["source"]]
        else:
            raise CommandError("Indica --source <slug> o --all. Disponibles: "
                               + ", ".join(available_scrapers()))

        for key in keys:
            self._scrape_one(key, opts)

    def _scrape_one(self, key, opts):
        scraper = get_scraper(key)
        if scraper is None:
            raise CommandError(f"Scraper '{key}' no existe. Disponibles: "
                               + ", ".join(available_scrapers()))

        fuente, _ = Fuente.objects.update_or_create(
            slug=scraper.key, defaults=scraper.fuente_defaults()
        )

        out = opts["out"] or os.path.join(
            "paquetes", f"{scraper.key}-{timezone.now():%Y-%m-%d}"
        )
        dry = opts["dry_run"]
        do_images = not opts["no_images"]
        searches = (fuente.config or {}).get("searches")

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n== Scraping {scraper.nombre} =="
            + (f"  ->  {out}" if not dry else "  (dry-run)")
        ))

        counters = {"ok": 0, "sin_ubicacion": 0, "fuera_ec": 0, "imagenes": 0}
        skip_url = None
        if opts["skip_known"]:
            # Union de crudas + propiedades ya importadas: en LOCAL gobiernan
            # las crudas; en PRODUCCIÓN (donde no hay crudas históricas) son
            # las Property las que saben qué anuncios ya existen.
            from real_estate.models import Property

            conocidas = set(
                ListingCruda.objects.filter(fuente=fuente)
                .exclude(source_url="")
                .values_list("source_url", flat=True)
            )
            conocidas |= set(
                Property.objects.filter(source__slug=fuente.slug)
                .exclude(source_url="")
                .values_list("source_url", flat=True)
            )
            known_ids = set(
                ListingCruda.objects.filter(fuente=fuente)
                .exclude(external_id="")
                .values_list("external_id", flat=True)
            )
            known_ids |= set(
                Property.objects.filter(source__slug=fuente.slug)
                .exclude(external_id="")
                .values_list("external_id", flat=True)
            )

            def skip_url(url, external_id=None):
                return (bool(external_id) and str(external_id) in known_ids) or url in conocidas

            self._log(f"saltando {len(known_ids)} IDs y {len(conocidas)} URLs ya conocidas")

        def run(writer):
            for data in scraper.scrape(limit=opts["limit"], log=self._log,
                                       searches=searches, skip_url=skip_url):
                ok, lat, lng, motivo = validate_location(
                    data.get("latitude"), data.get("longitude")
                )
                if not ok:
                    counters["sin_ubicacion" if motivo == "sin_coordenadas" else "fuera_ec"] += 1
                    continue
                data["latitude"], data["longitude"] = lat, lng

                image_urls = data.pop("image_urls", [])

                if not dry:
                    ListingCruda.objects.update_or_create(
                        fuente=fuente, external_id=data["external_id"],
                        defaults={"source_url": data.get("source_url", ""),
                                  "payload": dict(data, image_urls=image_urls)},
                    )
                    if do_images and image_urls:
                        saved = download_images(
                            image_urls, writer.image_dir(data["external_id"])
                        )
                        counters["imagenes"] += len(saved)
                    writer.append_listing(data)

                counters["ok"] += 1
                if counters["ok"] % 25 == 0:
                    self._log(f"  {counters['ok']} anuncios válidos...")

        if dry:
            run(writer=None)
        else:
            with PaqueteWriter(out) as writer:
                run(writer)
                writer.write_manifest(fuente, extra={
                    "generado": timezone.now().isoformat(),
                    "descartados_sin_ubicacion": counters["sin_ubicacion"],
                    "descartados_fuera_ecuador": counters["fuera_ec"],
                })
            fuente.last_scrape_at = timezone.now()
            fuente.save(update_fields=["last_scrape_at"])

        self.stdout.write(self.style.SUCCESS(
            f"Válidos: {counters['ok']}  |  sin ubicación: {counters['sin_ubicacion']}"
            f"  |  fuera de Ecuador: {counters['fuera_ec']}"
            f"  |  imágenes: {counters['imagenes']}"
        ))
        if not dry:
            self.stdout.write(f"Paquete listo en: {out}")
            self.stdout.write("Para publicar en producción: "
                              f"python manage.py ingesta_import {out}")

    def _log(self, msg):
        self.stdout.write(f"  {msg}")
