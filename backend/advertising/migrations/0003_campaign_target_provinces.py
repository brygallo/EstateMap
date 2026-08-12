from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("advertising", "0002_import_from_blog")]

    operations = [
        migrations.AddField(
            model_name="campaign",
            name="target_provinces",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Vacío junto con ciudades = todo Ecuador.",
                verbose_name="Provincias",
            ),
        ),
    ]
