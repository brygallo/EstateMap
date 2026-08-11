import django.db.models.deletion
from django.db import migrations, models
import real_estate.models


class Migration(migrations.Migration):
    dependencies = [("real_estate", "0030_property_closed_at_property_closed_reason_and_more")]

    operations = [
        migrations.AddField(
            model_name="pendingpublication",
            name="draft_key",
            field=models.UUIDField(blank=True, editable=False, null=True, unique=True),
        ),
        migrations.CreateModel(
            name="PendingPublicationImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to=real_estate.models.pending_publication_image_path)),
                ("position", models.PositiveSmallIntegerField(default=0)),
                ("original_filename", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("pending", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="temporary_images", to="real_estate.pendingpublication")),
            ],
            options={"ordering": ["position", "id"]},
        ),
    ]
