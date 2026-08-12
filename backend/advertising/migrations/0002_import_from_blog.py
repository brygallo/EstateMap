"""Bring the blog's sponsorships across, then let `blog` drop its own tables.

The rows matter: production is already serving one, so a migration that created
empty tables and left the originals behind would silently turn the blog's slots
off. Copying by slug also keeps this re-runnable — applying it twice updates
instead of duplicating.

Reversible on purpose. Going back does not delete anything: `blog`'s tables are
dropped in its own later migration, and reversing that one recreates them empty,
so the safe direction here is to leave the copies alone.
"""

from django.db import migrations

# Everything that came over from the blog was, by definition, sold or given
# away as a sponsorship — the old model had no notion of kinds. Aents is the one
# seeded advertiser and it runs for free, so the honest import marks the lot as
# `partner` and leaves the amount empty rather than inventing a price nobody
# paid. Anything that really was paid gets its amount typed in from the panel.
DEFAULT_KIND = "partner"


def copy_from_blog(apps, schema_editor):
    old_advertiser = apps.get_model("blog", "Advertiser")
    old_slot = apps.get_model("blog", "SponsorSlot")
    new_advertiser = apps.get_model("advertising", "Advertiser")
    new_campaign = apps.get_model("advertising", "Campaign")

    advertiser_by_slug = {}
    for row in old_advertiser.objects.all():
        obj, _ = new_advertiser.objects.update_or_create(
            slug=row.slug,
            defaults={
                "name": row.name,
                "website": row.website,
                "tagline": row.tagline,
                "logo": row.logo,
                "logo_alt": row.logo_alt,
                "is_active": row.is_active,
            },
        )
        advertiser_by_slug[row.slug] = obj

    for row in old_slot.objects.select_related("advertiser").all():
        advertiser = advertiser_by_slug.get(row.advertiser.slug)
        if advertiser is None:
            continue
        # Placement plus advertiser plus headline is enough to identify a slot:
        # the old table had no natural key and this keeps a re-run idempotent.
        new_campaign.objects.update_or_create(
            advertiser=advertiser,
            placement=row.placement,
            headline=row.headline,
            defaults={
                "kind": DEFAULT_KIND,
                "body": row.body,
                "cta_label": row.cta_label,
                "target_url": row.target_url,
                "image": row.image,
                "image_alt": row.image_alt,
                "starts_at": row.starts_at,
                "ends_at": row.ends_at,
                "target_cities": [],
                "weight": row.weight,
                "is_active": row.is_active,
                "amount_charged_usd": None,
                "click_count": row.click_count,
            },
        )


def keep_the_copies(apps, schema_editor):
    """Reverse is a no-op: see the module docstring."""


class Migration(migrations.Migration):

    dependencies = [
        ("advertising", "0001_initial"),
        ("blog", "0006_seed_aents_sponsorship"),
    ]

    operations = [
        migrations.RunPython(copy_from_blog, keep_the_copies),
    ]
