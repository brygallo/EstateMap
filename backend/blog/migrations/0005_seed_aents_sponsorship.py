"""Put the first advertiser in the slots: Aents, which built the portal.

Seeded rather than left empty on purpose. An ad unit with nothing in it cannot
be reviewed — you cannot see whether the disclosure reads clearly, whether the
spacing separates it from the article, or whether the contrast holds in the
grid. A real creative makes all three visible the moment the page renders.

Idempotent on (advertiser, placement), so a redeploy never duplicates a slot and
never overwrites a creative someone edited in the admin.
"""

from django.db import migrations

from blog.seed_loader import seed_sponsors


def load_sponsors(apps, schema_editor):
    Advertiser = apps.get_model("blog", "Advertiser")
    SponsorSlot = apps.get_model("blog", "SponsorSlot")
    seed_sponsors(Advertiser, SponsorSlot)


def unload_sponsors(apps, schema_editor):
    Advertiser = apps.get_model("blog", "Advertiser")
    from blog.seed_loader import load_sponsor_seed

    slugs = [entry["slug"] for entry in load_sponsor_seed()["advertisers"]]
    # Slots cascade with their advertiser.
    Advertiser.objects.filter(slug__in=slugs).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0004_advertiser_sponsorslot"),
    ]

    operations = [
        migrations.RunPython(load_sponsors, unload_sponsors),
    ]
