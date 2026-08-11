"""Give the two city guides the city they are about.

The seed file now carries `city`, but the guides were already in the database
before the field existed, and the loader deliberately leaves existing posts
alone so an editorial fix in the admin survives a redeploy. So the value has to
be written once, here, by slug.
"""

from django.db import migrations

GUIDE_CITIES = {
    "mejores-zonas-para-vivir-en-quito": "Quito",
    "mejores-zonas-para-vivir-en-cuenca": "Cuenca",
}


def set_guide_cities(apps, schema_editor):
    Post = apps.get_model("blog", "Post")
    for slug, city in GUIDE_CITIES.items():
        Post.objects.filter(slug=slug, city="").update(city=city)


def clear_guide_cities(apps, schema_editor):
    Post = apps.get_model("blog", "Post")
    for slug, city in GUIDE_CITIES.items():
        Post.objects.filter(slug=slug, city=city).update(city="")


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0003_post_author_slug_post_city"),
    ]

    operations = [
        migrations.RunPython(set_guide_cities, clear_guide_cities),
    ]
