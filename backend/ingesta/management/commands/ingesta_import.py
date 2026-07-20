"""
PRODUCCIÓN: importa un paquete de datos ya validado. No scrapea, no toca los
portales, no requiere httpx/Playwright.

Ejemplos::

    python manage.py ingesta_import paquetes/properati-2026-07-07
    python manage.py ingesta_import paquetes/properati-2026-07-07 --expire

Con ``--expire`` (solo si el paquete es un snapshot COMPLETO de la fuente) se
marcan ``inactive`` las propiedades importadas que ya no vienen en el paquete y
se **borran sus imágenes** de MinIO para liberar espacio.
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from ingesta.models import Fuente
from ingesta.packaging import PaqueteInvalido, PaqueteReader
from ingesta.pipeline.images import delete_property_images
from ingesta.pipeline.upsert import upsert_property


class Command(BaseCommand):
    help = "Importa un paquete de propiedades a la base (PRODUCCIÓN, sin scraping)."

    def add_arguments(self, parser):
        parser.add_argument("paquete", help="ruta a la carpeta del paquete")
        parser.add_argument("--expire", action="store_true",
                            help="caducar (inactivar) lo que ya no está en el paquete")
        parser.add_argument("--limit", type=int, default=None, help="tope de anuncios (pruebas)")
        parser.add_argument(
            "--validate-only", action="store_true",
            help="validar integridad del paquete sin modificar la base",
        )

    def handle(self, *args, **opts):
        try:
            reader = PaqueteReader(opts["paquete"])
        except FileNotFoundError as exc:
            raise CommandError(str(exc))

        try:
            manifest = reader.validate()
        except (OSError, PaqueteInvalido) as exc:
            raise CommandError(f"Paquete inválido: {exc}") from exc

        if opts["validate_only"]:
            self.stdout.write(self.style.SUCCESS(
                f"Paquete válido: {manifest['total']} anuncios de "
                f"{manifest['fuente']['nombre']}"
            ))
            return

        if opts["expire"] and opts["limit"] is not None:
            raise CommandError("No se puede combinar --expire con --limit: caducaría anuncios válidos.")
        f = manifest["fuente"]
        fuente, _ = Fuente.objects.get_or_create(
            slug=f["slug"],
            defaults={"nombre": f["nombre"], "base_url": f["base_url"], "scraper": f["slug"]},
        )

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n== Importando paquete de {fuente.nombre} =="
        ))

        counters = {"created": 0, "updated": 0,
                    "skipped_no_location": 0, "skipped_duplicate": 0}
        seen_ids = []

        for i, listing in enumerate(reader.iter_listings()):
            if opts["limit"] and i >= opts["limit"]:
                break
            result, prop = upsert_property(listing, fuente, reader=reader)
            counters[result] = counters.get(result, 0) + 1
            if listing.get("external_id"):
                seen_ids.append(listing["external_id"])
            if (i + 1) % 50 == 0:
                self.stdout.write(f"  procesados {i + 1}...")

        expirados = 0
        if opts["expire"]:
            expirados = self._expire(fuente, seen_ids)

        fuente.last_import_at = timezone.now()
        fuente.save(update_fields=["last_import_at"])

        self.stdout.write(self.style.SUCCESS(
            f"Creadas: {counters['created']}  |  actualizadas: {counters['updated']}"
            f"  |  duplicadas omitidas: {counters['skipped_duplicate']}"
            f"  |  sin ubicación: {counters['skipped_no_location']}"
            + (f"  |  caducadas: {expirados}" if opts["expire"] else "")
        ))

    def _expire(self, fuente, seen_ids):
        from real_estate.models import Property

        stale = Property.objects.filter(
            source=fuente, is_imported=True
        ).exclude(external_id__in=seen_ids).exclude(status="inactive")
        count = 0
        for prop in stale:
            delete_property_images(prop)
            prop.status = "inactive"
            prop.save(update_fields=["status"])
            count += 1
        return count
