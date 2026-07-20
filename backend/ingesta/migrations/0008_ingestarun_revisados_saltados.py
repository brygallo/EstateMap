from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ingesta", "0007_listingretirada"),
    ]

    operations = [
        migrations.AddField(
            model_name="ingestarun",
            name="revisados",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Anuncios encontrados en listados, incluidos los ya importados",
            ),
        ),
        migrations.AddField(
            model_name="ingestarun",
            name="saltados",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Anuncios omitidos porque ya estaban importados",
            ),
        ),
    ]
