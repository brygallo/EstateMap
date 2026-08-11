import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    """Refuse surfaces and prices that describe no property.

    Validators only, no data touched: nothing in the table is rewritten, and the
    columns keep their types. Existing rows outside the new bounds stay as they
    are — the rules apply from the next write on, which is where the typos come
    from.
    """

    dependencies = [("real_estate", "0031_pending_publication_drafts_and_images")]

    operations = [
        migrations.AlterField(
            model_name="property",
            name="area",
            field=models.FloatField(
                blank=True,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100000000.0),
                ],
                help_text="Total area in square meters (opcional en anuncios importados)",
            ),
        ),
        migrations.AlterField(
            model_name="property",
            name="built_area",
            field=models.FloatField(
                blank=True,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100000000.0),
                ],
                help_text="Built area in square meters (for houses)",
            ),
        ),
        migrations.AlterField(
            model_name="property",
            name="price",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
                help_text="Opcional: los anuncios importados pueden no traer precio ('a consultar')",
            ),
        ),
        migrations.AlterField(
            model_name="property",
            name="rent_price",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=12,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)],
                help_text="Precio de alquiler cuando el anuncio es venta Y alquiler a la vez",
            ),
        ),
    ]
