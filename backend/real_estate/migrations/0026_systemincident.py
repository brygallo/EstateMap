from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("real_estate", "0025_activityevent_is_bot"),
    ]

    operations = [
        migrations.CreateModel(
            name="SystemIncident",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fingerprint", models.CharField(max_length=64, unique=True)),
                ("kind", models.CharField(default="http_error", max_length=80)),
                ("severity", models.CharField(choices=[("critical", "Critical"), ("error", "Error"), ("warning", "Warning")], default="error", max_length=12)),
                ("status_code", models.PositiveSmallIntegerField(default=500)),
                ("method", models.CharField(blank=True, default="", max_length=10)),
                ("path", models.CharField(blank=True, default="", max_length=500)),
                ("message", models.CharField(blank=True, default="", max_length=500)),
                ("request_id", models.CharField(blank=True, default="", max_length=64)),
                ("occurrences", models.PositiveIntegerField(default=1)),
                ("resolved", models.BooleanField(db_index=True, default=False)),
                ("first_seen_at", models.DateTimeField(auto_now_add=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["resolved", "-last_seen_at"],
                "indexes": [models.Index(fields=["resolved", "severity", "-last_seen_at"], name="incident_status_seen_idx")],
            },
        ),
    ]
