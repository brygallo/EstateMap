# Background image optimization: a PropertyImage row now exists before its file
# reaches MinIO, so `image` becomes optional and the row carries the pipeline
# state plus the staging path the worker reads from.
#
# Existing rows default to 'ready': they were optimized synchronously on upload,
# which is exactly what that state means.

import real_estate.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('real_estate', '0022_property_source_dates'),
    ]

    operations = [
        migrations.AddField(
            model_name='propertyimage',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pendiente de optimizar'),
                    ('ready', 'Optimizada'),
                    ('failed', 'Falló la optimización'),
                ],
                db_index=True,
                default='ready',
                help_text='Estado del pipeline de optimización',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='propertyimage',
            name='pending_path',
            field=models.CharField(
                blank=True,
                help_text='Ruta del original en disco mientras espera al worker',
                max_length=500,
            ),
        ),
        migrations.AddField(
            model_name='propertyimage',
            name='optimization_error',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='propertyimage',
            name='image',
            field=models.ImageField(
                blank=True,
                upload_to='properties/',
                validators=[
                    real_estate.validators.validate_image_size,
                    real_estate.validators.validate_image_dimensions,
                    real_estate.validators.validate_image_format,
                ],
            ),
        ),
    ]
