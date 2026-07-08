from django.core.management.base import BaseCommand

from real_estate.models import Property
from real_estate.serializers import polygon_center_lat_lng


class Command(BaseCommand):
    help = "Fill latitude/longitude from polygon center for legacy properties."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many properties would be updated without saving.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        queryset = Property.objects.filter(
            polygon__isnull=False,
            latitude__isnull=True,
            longitude__isnull=True,
        )

        updated = 0
        skipped = 0
        for property_obj in queryset.iterator():
            center = polygon_center_lat_lng(property_obj.polygon)
            if not center:
                skipped += 1
                continue
            updated += 1
            if not dry_run:
                property_obj.latitude = center[0]
                property_obj.longitude = center[1]
                property_obj.save(update_fields=["latitude", "longitude"])

        action = "would update" if dry_run else "updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} {updated} properties with polygon centers; skipped {skipped}."
            )
        )
