from django.db import migrations

from real_estate.models import sector_key


def clear_headline_sectors(apps, schema_editor):
    """Drop the zones that were never places.

    `sector_key` now refuses a segment that describes what is for sale rather
    than where it is, but the rule only runs on save, and the catalogue is
    imported. Without this, «Casa en Venta» keeps its page, its sitemap entry
    and its published price per square metre until each of those 19 listings
    happens to be edited.

    In batches and with `update`, not `save()`: this runs over the whole
    catalogue and a per-row save would fire the rest of the model logic and
    move `updated_at`, which feeds the sitemap's `lastmod` (SEO-006). A
    backfill is not a change to the listing.
    """
    Property = apps.get_model("real_estate", "Property")
    batch = []
    for row in (
        Property.objects.exclude(sector_key="")
        .only("id", "address", "city", "sector_key", "sector_label")
        .iterator(chunk_size=2000)
    ):
        key = sector_key(row.address, row.city)
        label = (row.address or "").split(",")[0].strip() if key else ""
        if (row.sector_key, row.sector_label) == (key, label):
            continue
        row.sector_key, row.sector_label = key, label
        batch.append(row)
        if len(batch) >= 2000:
            Property.objects.bulk_update(batch, ["sector_key", "sector_label"])
            batch = []
    if batch:
        Property.objects.bulk_update(batch, ["sector_key", "sector_label"])


class Migration(migrations.Migration):
    dependencies = [("real_estate", "0036_marketsnapshot")]

    operations = [
        migrations.RunPython(clear_headline_sectors, migrations.RunPython.noop),
    ]
