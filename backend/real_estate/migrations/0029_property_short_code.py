from django.db import migrations, models

from real_estate.services.short_codes import generate_code


def assign_short_codes(apps, schema_editor):
    """
    Give every existing listing a code.

    Done in one pass with an in-memory set instead of a uniqueness query per
    row: on a table of any size the query-per-row version is thousands of round
    trips to answer a question that a 28-million-value space almost never
    answers "yes" to. The unique index still backstops it.
    """
    Property = apps.get_model("real_estate", "Property")
    taken = set(
        Property.objects.exclude(short_code__isnull=True).values_list("short_code", flat=True)
    )

    pending = []
    for prop in Property.objects.filter(short_code__isnull=True).only("id"):
        code = generate_code()
        while code in taken:
            code = generate_code()
        taken.add(code)
        prop.short_code = code
        pending.append(prop)

    Property.objects.bulk_update(pending, ["short_code"], batch_size=500)


def drop_short_codes(apps, schema_editor):
    """Reversing the data step is a no-op: RemoveField takes the column."""


class Migration(migrations.Migration):

    dependencies = [
        ("real_estate", "0028_pendingpublication_property_publicationresumetoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="property",
            name="short_code",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Código corto imprimible del anuncio; se asigna al crearlo y no cambia nunca",
                max_length=12,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(assign_short_codes, drop_short_codes),
    ]
