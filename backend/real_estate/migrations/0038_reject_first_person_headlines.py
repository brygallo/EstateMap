from django.db import migrations

from real_estate.models import sector_key


def clear_first_person_headlines(apps, schema_editor):
    """Drop the zones that were headlines written in the first person.

    0037 only recognised «Casa en Venta». Half this catalogue is written by the
    seller, who says «Vendo casa independiente Lomas de Monteserrín» — and that
    string had become a zone of Quito, reachable at a URL of its own. Ninety-two
    of them survived the first pass.

    In batches and with `update`, not `save()`: a backfill is not a change to
    the listing and must not move `updated_at`, which feeds the sitemap's
    `lastmod` (SEO-006).
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
    dependencies = [("real_estate", "0037_reject_headline_sectors")]

    operations = [
        migrations.RunPython(clear_first_person_headlines, migrations.RunPython.noop),
    ]
