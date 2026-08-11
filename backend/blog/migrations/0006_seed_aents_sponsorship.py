"""Seed the first advertiser after the sponsorship tables exist."""

from django.db import migrations

from blog.seed_loader import seed_sponsors


def load_sponsors(apps, schema_editor):
    advertiser_model = apps.get_model("blog", "Advertiser")
    sponsor_slot_model = apps.get_model("blog", "SponsorSlot")
    seed_sponsors(advertiser_model, sponsor_slot_model)


def unload_sponsors(apps, schema_editor):
    advertiser_model = apps.get_model("blog", "Advertiser")
    from blog.seed_loader import load_sponsor_seed

    slugs = [entry["slug"] for entry in load_sponsor_seed()["advertisers"]]
    advertiser_model.objects.filter(slug__in=slugs).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0005_blog_assets_and_sponsorships"),
    ]

    operations = [
        migrations.RunPython(load_sponsors, unload_sponsors),
    ]
