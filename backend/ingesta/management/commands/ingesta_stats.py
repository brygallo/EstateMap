"""
Estadísticas de las propiedades importadas, por fuente.

Ejemplo::

    python manage.py ingesta_stats
"""
from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from ingesta.models import Fuente


class Command(BaseCommand):
    help = "Muestra cuántas propiedades importadas hay por fuente y su calidad."

    def handle(self, *args, **opts):
        from real_estate.models import Property

        total = Property.objects.filter(is_imported=True).count()
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\nPropiedades importadas en total: {total}"
        ))

        for fuente in Fuente.objects.all():
            qs = Property.objects.filter(source=fuente, is_imported=True)
            # Contar sobre la tabla base (sin join a imágenes, que multiplicaría).
            agg = qs.aggregate(
                n=Count("id"),
                activas=Count("id", filter=~Q(status="inactive")),
                con_precio=Count("id", filter=Q(price__isnull=False)),
                con_area=Count("id", filter=Q(area__isnull=False)),
                con_agencia=Count("id", filter=~Q(source_agency="")),
            )
            con_imagenes = qs.filter(images__isnull=False).distinct().count()
            self.stdout.write(
                f"\n{fuente.nombre} ({fuente.slug}):\n"
                f"  total: {agg['n']}  |  activas: {agg['activas']}\n"
                f"  con precio: {agg['con_precio']}  |  con área: {agg['con_area']}"
                f"  |  con imágenes: {con_imagenes}  |  con inmobiliaria: {agg['con_agencia']}"
            )

        if total == 0:
            self.stdout.write("\n(no hay propiedades importadas todavía)")
