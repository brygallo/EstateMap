from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("real_estate", "0032_property_numeric_bounds"),
    ]

    operations = [
        migrations.RemoveField(model_name="property", name="dedup_key"),
        migrations.RemoveField(model_name="property", name="duplicate_of"),
    ]
