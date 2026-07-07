"""
Lista los scrapers disponibles y las fuentes en la base; permite
activar/desactivar una fuente.

Ejemplos::

    python manage.py ingesta_sources
    python manage.py ingesta_sources --activate properati
    python manage.py ingesta_sources --deactivate properati
"""
from django.core.management.base import BaseCommand

from ingesta.models import Fuente
from ingesta.scrapers import available_scrapers


class Command(BaseCommand):
    help = "Lista fuentes/scrapers y activa o desactiva una fuente."

    def add_arguments(self, parser):
        parser.add_argument("--activate", metavar="SLUG")
        parser.add_argument("--deactivate", metavar="SLUG")

    def handle(self, *args, **opts):
        for slug, activa in (("activate", True), ("deactivate", False)):
            target = opts[slug]
            if target:
                updated = Fuente.objects.filter(slug=target).update(activa=activa)
                msg = f"Fuente '{target}' {'activada' if activa else 'desactivada'}."
                self.stdout.write(self.style.SUCCESS(msg) if updated
                                  else self.style.WARNING(f"No existe la fuente '{target}'."))

        self.stdout.write(self.style.MIGRATE_HEADING("\nScrapers registrados (código):"))
        for key in available_scrapers():
            self.stdout.write(f"  - {key}")

        self.stdout.write(self.style.MIGRATE_HEADING("\nFuentes en la base:"))
        fuentes = Fuente.objects.all()
        if not fuentes:
            self.stdout.write("  (ninguna todavía; se crean al correr ingesta_scrape)")
        for f in fuentes:
            estado = "activa" if f.activa else "inactiva"
            ult = f.last_scrape_at.strftime("%Y-%m-%d %H:%M") if f.last_scrape_at else "nunca"
            self.stdout.write(f"  - {f.slug:<14} [{estado}]  último scrape: {ult}")
