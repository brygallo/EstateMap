# Catch-up migration, unrelated to the image pipeline.
#
# These indexes were declared in Meta.indexes but never migrated, so `models.py`
# and the database had drifted apart and every makemigrations run picked them up
# again. Split into its own migration so the async-image change can be deployed
# or rolled back without carrying eleven CREATE INDEX statements with it.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ingesta', '0008_ingestarun_revisados_saltados'),
        ('real_estate', '0023_propertyimage_async_optimization'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['property', 'status'], name='lead_property_status_idx'),
        ),
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['status', 'created_at'], name='lead_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['source', 'created_at'], name='lead_source_created_idx'),
        ),
        migrations.AddIndex(
            model_name='pendingpublication',
            index=models.Index(fields=['status', 'created_at'], name='pending_status_created_idx'),
        ),
        migrations.AddIndex(
            model_name='pendingpublication',
            index=models.Index(fields=['source', 'created_at'], name='pending_source_created_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['status', 'is_duplicate', 'latitude', 'longitude'], name='prop_map_bbox_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['status', 'property_type', 'price'], name='prop_filter_price_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['province', 'city', 'status'], name='prop_location_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['owner', 'status'], name='prop_owner_status_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['source', 'is_imported', 'status'], name='prop_source_status_idx'),
        ),
        migrations.AddIndex(
            model_name='property',
            index=models.Index(fields=['-views_count'], name='prop_views_desc_idx'),
        ),
    ]
