# Generated manually for Google OAuth integration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('real_estate', '0009_province_city'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='oauth_provider',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='oauth_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='user',
            name='avatar_url',
            field=models.URLField(blank=True, null=True),
        ),
    ]
