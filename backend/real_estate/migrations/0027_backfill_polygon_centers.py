from django.db import migrations

from real_estate.geo import polygon_center_lat_lng


def backfill_centers(apps, schema_editor):
    """
    Give every already-published polygon its centre.

    These rows predate the centre being written on save, so they sit in the
    database with a shape and no coordinates. That makes them invisible to
    distance queries and forces the map's bbox filter to return every one of
    them on every request, since it has no way to place them.

    `polygon_center_lat_lng` is a pure function over the stored geometry, so
    importing it here is safe: no model state is involved.
    """
    Property = apps.get_model('real_estate', 'Property')
    pending = Property.objects.filter(
        polygon__isnull=False,
        latitude__isnull=True,
        longitude__isnull=True,
    )
    for property_obj in pending.iterator():
        center = polygon_center_lat_lng(property_obj.polygon)
        if not center:
            continue
        property_obj.latitude, property_obj.longitude = center
        # Historical models have no custom save(), so this writes plain columns.
        property_obj.save(update_fields=['latitude', 'longitude'])


class Migration(migrations.Migration):

    dependencies = [
        ('real_estate', '0026_systemincident'),
    ]

    operations = [
        # Irreversible by design: nulling the coordinates back would also erase
        # the ones that were always there.
        migrations.RunPython(backfill_centers, migrations.RunPython.noop),
    ]
