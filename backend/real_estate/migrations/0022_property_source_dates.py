from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("real_estate", "0021_propertypricehistory")]

    operations = [
        migrations.AddField(
            model_name="property",
            name="source_published_at",
            field=models.DateTimeField(blank=True, help_text="Fecha original de publicación declarada por el portal externo", null=True),
        ),
        migrations.AddField(
            model_name="property",
            name="source_updated_at",
            field=models.DateTimeField(blank=True, help_text="Última actualización declarada por el portal externo", null=True),
        ),
    ]
