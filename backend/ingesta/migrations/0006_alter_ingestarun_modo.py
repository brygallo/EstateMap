from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("ingesta", "0005_ingestarun_diagnostics")]

    operations = [
        migrations.AlterField(
            model_name="ingestarun",
            name="modo",
            field=models.CharField(
                choices=[
                    ("load", "Cargar/actualizar desde el portal"),
                    ("verify", "Retirar anuncios desaparecidos"),
                    ("refresh", "Actualizar todos los datos"),
                ],
                default="load",
                max_length=12,
            ),
        ),
    ]
