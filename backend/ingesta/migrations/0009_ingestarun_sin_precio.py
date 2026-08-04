from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ingesta", "0008_ingestarun_revisados_saltados"),
    ]

    operations = [
        migrations.AddField(
            model_name="ingestarun",
            name="sin_precio",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Anuncios omitidos porque el portal publicó precio cero",
            ),
        ),
    ]
