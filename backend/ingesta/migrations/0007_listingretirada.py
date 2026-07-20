from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("ingesta", "0006_alter_ingestarun_modo")]

    operations = [
        migrations.CreateModel(
            name="ListingRetirada",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("external_id", models.CharField(db_index=True, max_length=120)),
                ("source_url", models.URLField(blank=True, default="", max_length=500)),
                ("http_status", models.PositiveSmallIntegerField(default=404)),
                ("first_seen_at", models.DateTimeField(auto_now_add=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True)),
                ("fuente", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="retiradas", to="ingesta.fuente")),
            ],
            options={
                "verbose_name": "Anuncio retirado",
                "verbose_name_plural": "Anuncios retirados",
                "ordering": ["-last_seen_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="listingretirada",
            constraint=models.UniqueConstraint(fields=("fuente", "external_id"), name="uniq_retirada_fuente_external_id"),
        ),
    ]
