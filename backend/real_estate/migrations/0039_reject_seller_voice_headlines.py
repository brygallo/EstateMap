from django.db import migrations

from real_estate.models import sector_key


def clear_seller_voice_headlines(apps, schema_editor):
    """Drop the last headlines: the ones with no property word at all.

    0038 recognised the first person only when a property word stood beside it,
    so «LAGUNA DEL SOL POR VIAJE VENDO US$ 390.» survived as a zone of Guayaquil,
    and «Vendo Dpto 2 Dormitorios…» survived because «dpto» was not in the list
    of property words. A verb in the first person settles it on its own now: it
    is something a seller says, never something a place is called.

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
    dependencies = [("real_estate", "0038_reject_first_person_headlines")]

    operations = [
        migrations.RunPython(clear_seller_voice_headlines, migrations.RunPython.noop),
    ]
