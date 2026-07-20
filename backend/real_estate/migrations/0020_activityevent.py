import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('real_estate', '0019_property_rent_price'),
    ]

    operations = [
        migrations.CreateModel(
            name='ActivityEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_id', models.CharField(blank=True, default='', max_length=64)),
                ('event_name', models.CharField(max_length=100)),
                ('path', models.CharField(blank=True, default='', max_length=300)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('property', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='activity_events', to='real_estate.property')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='activity_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.AddIndex(model_name='activityevent', index=models.Index(fields=['event_name', 'created_at'], name='activity_event_date_idx')),
        migrations.AddIndex(model_name='activityevent', index=models.Index(fields=['user', 'created_at'], name='activity_user_date_idx')),
        migrations.AddIndex(model_name='activityevent', index=models.Index(fields=['property', 'created_at'], name='activity_property_date_idx')),
    ]
