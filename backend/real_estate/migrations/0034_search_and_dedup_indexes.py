from django.db import migrations, models
from django.db.models.functions import Upper


class Migration(migrations.Migration):
    dependencies = [
        ("real_estate", "0033_remove_obsolete_dedup_fields"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="property",
            index=models.Index(Upper("city"), name="prop_city_upper_idx"),
        ),
        migrations.AddIndex(
            model_name="property",
            index=models.Index(Upper("province"), name="prop_province_upper_idx"),
        ),
        migrations.AddIndex(
            model_name="property",
            index=models.Index(
                fields=["latitude", "longitude"],
                condition=models.Q(is_imported=True, is_duplicate=False),
                name="prop_dedup_bbox_idx",
            ),
        ),
        # Trigram indexes for the free-text search (title/address/city/
        # description OR'ed with icontains). All four columns need one: the
        # planner only turns the OR into a BitmapOr when every branch is
        # indexable. They live in raw SQL, outside the model state, because
        # pg_trgm may be absent from ancillary databases (the test database is
        # built straight from the models under --nomigrations) and the indexes
        # are performance-only. CREATE EXTENSION needs enough privilege; on a
        # hardened host run `CREATE EXTENSION pg_trgm;` as a superuser first —
        # the IF NOT EXISTS then makes this a no-op.
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql=(
                'CREATE INDEX IF NOT EXISTS "prop_title_trgm_idx" '
                'ON "real_estate_property" USING gin ("title" gin_trgm_ops);'
            ),
            reverse_sql='DROP INDEX IF EXISTS "prop_title_trgm_idx";',
        ),
        migrations.RunSQL(
            sql=(
                'CREATE INDEX IF NOT EXISTS "prop_address_trgm_idx" '
                'ON "real_estate_property" USING gin ("address" gin_trgm_ops);'
            ),
            reverse_sql='DROP INDEX IF EXISTS "prop_address_trgm_idx";',
        ),
        migrations.RunSQL(
            sql=(
                'CREATE INDEX IF NOT EXISTS "prop_city_trgm_idx" '
                'ON "real_estate_property" USING gin ("city" gin_trgm_ops);'
            ),
            reverse_sql='DROP INDEX IF EXISTS "prop_city_trgm_idx";',
        ),
        migrations.RunSQL(
            sql=(
                'CREATE INDEX IF NOT EXISTS "prop_description_trgm_idx" '
                'ON "real_estate_property" USING gin ("description" gin_trgm_ops);'
            ),
            reverse_sql='DROP INDEX IF EXISTS "prop_description_trgm_idx";',
        ),
    ]
