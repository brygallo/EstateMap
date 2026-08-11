"""Bring the seven `/guias` articles into the blog as its first posts.

Runs as a data migration rather than a deploy step on purpose: `/guias/<slug>`
now 301s to `/blog/<slug>`, so between `migrate` and a forgotten command the
site would answer redirects to pages that do not exist yet. Tying the content
to the schema removes that window.

Re-running is safe (the loader keys on slug) and it never touches a post that
already exists, so editorial changes made in the admin survive a redeploy.
"""

from django.db import migrations

from blog.seed_loader import seed_blog


def load_guides(apps, schema_editor):
    Category = apps.get_model("blog", "Category")
    Post = apps.get_model("blog", "Post")
    seed_blog(Category, Post)


def unload_guides(apps, schema_editor):
    Post = apps.get_model("blog", "Post")
    Category = apps.get_model("blog", "Category")
    from blog.seed_loader import load_seed

    data = load_seed()
    Post.objects.filter(slug__in=[post["slug"] for post in data["posts"]]).delete()
    Category.objects.filter(
        slug__in=[category["slug"] for category in data["categories"]]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(load_guides, unload_guides),
    ]
