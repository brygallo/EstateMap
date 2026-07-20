from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("real_estate", "0020_activityevent")]

    operations = [
        migrations.CreateModel(
            name="PropertyPriceHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("recorded_at", models.DateTimeField(auto_now_add=True)),
                ("property", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="price_history", to="real_estate.property")),
            ],
            options={"ordering": ["recorded_at"]},
        ),
        migrations.AddIndex(
            model_name="propertypricehistory",
            index=models.Index(fields=["property", "recorded_at"], name="property_price_date_idx"),
        ),
    ]
