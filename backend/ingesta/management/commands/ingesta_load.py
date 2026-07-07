"""
Flujo de UN SOLO PASO (el que dispara el admin en producción):

    scrape del portal  ->  valida ubicación  ->  dedup  ->  imágenes a MinIO
    (temporal en memoria -> sube -> libera)  ->  crea/actualiza Property

No genera paquete. Recorre todo el país (todas las búsquedas por defecto del
scraper) salvo que se acote con --limit. Registra el progreso en un ``IngestaRun``
que se puede seguir desde el panel de admin.

Ejemplos::

    python manage.py ingesta_load --source properati
    python manage.py ingesta_load --source properati --limit 500
    python manage.py ingesta_load --run-id 12          # continúa un run creado por el admin
"""
from django.core.management.base import BaseCommand, CommandError

from ingesta.models import Fuente, IngestaRun
from ingesta.runner import execute
from ingesta.scrapers import available_scrapers, get_scraper


class Command(BaseCommand):
    help = "Scrapea un portal y carga directo a la base + MinIO (un solo paso)."

    def add_arguments(self, parser):
        parser.add_argument("--source", default="properati", help="slug del scraper")
        parser.add_argument("--limit", type=int, default=None, help="tope de anuncios")
        parser.add_argument("--no-images", action="store_true", help="no descargar imágenes")
        parser.add_argument("--only-new", action="store_true",
                            help="salta los ya importados y avanza a los que faltan (por tandas)")
        parser.add_argument("--refresh", action="store_true",
                            help="actualiza las ya importadas y verifica vigencia (no busca nuevas)")
        parser.add_argument("--run-id", type=int, default=None,
                            help="ID de un IngestaRun existente (lo usa el admin)")

    def handle(self, *args, **opts):
        if opts["run_id"]:
            try:
                run = IngestaRun.objects.get(pk=opts["run_id"])
            except IngestaRun.DoesNotExist:
                raise CommandError(f"IngestaRun {opts['run_id']} no existe.")
        else:
            scraper = get_scraper(opts["source"])
            if scraper is None:
                raise CommandError(f"Scraper '{opts['source']}' no existe. Disponibles: "
                                   + ", ".join(available_scrapers()))
            fuente, _ = Fuente.objects.update_or_create(
                slug=scraper.key, defaults=scraper.fuente_defaults()
            )
            run = IngestaRun.objects.create(
                fuente=fuente, limit=opts["limit"],
                modo="refresh" if opts["refresh"] else "load",
                con_imagenes=not opts["no_images"],
                solo_nuevas=opts["only_new"], lanzado_por="cli",
            )

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n== {run.get_modo_display()} · {run.fuente.nombre} (run #{run.id}) =="
        ))
        execute(run, log=self._log)
        self.stdout.write(self.style.SUCCESS(
            f"\nEstado: {run.get_estado_display()}\n"
            f"  Vistos: {run.vistos}\n"
            f"  Creadas: {run.creadas}  |  Actualizadas: {run.actualizadas}\n"
            f"  Duplicadas (misma ubicación): {run.duplicadas}\n"
            f"  Caducadas (no vigentes): {run.caducadas}\n"
            f"  Descartadas sin ubicación: {run.sin_ubicacion}"
        ))

    def _log(self, msg):
        self.stdout.write(f"  {msg}")
