"""
Loader for `blog/seed/guides.json`.

The seven guides that used to live hardcoded in the frontend (`lib/guias.ts`)
are the blog's first posts. Their prose was exported from that module verbatim
and converted to Markdown, so the migrated URLs serve exactly the text Google
already indexed under `/guias/<slug>` — only the path changed, and `/guias`
now 301s to `/blog`.

Idempotent by slug: re-running it never duplicates a post, and by default it
leaves an existing post alone so a later editorial fix in the admin is not
overwritten by a redeploy.
"""

import json
from datetime import datetime, timezone as dt_timezone
from pathlib import Path

from django.utils.text import slugify

SEED_FILE = Path(__file__).resolve().parent / "seed" / "guides.json"
SPONSORS_FILE = Path(__file__).resolve().parent / "seed" / "sponsors.json"


def load_seed() -> dict:
    with SEED_FILE.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_sponsor_seed() -> dict:
    with SPONSORS_FILE.open(encoding="utf-8") as handle:
        return json.load(handle)


def seed_sponsors(Advertiser, SponsorSlot) -> dict:
    """Create the house campaigns for Aents.

    Aents built the portal, which makes it both the first advertiser and the
    proof the slot works: an empty ad unit teaches nothing about spacing,
    disclosure or contrast until something real sits in it.

    Idempotent on (advertiser, placement): re-running never duplicates a slot,
    and it leaves an edited creative alone.
    """
    data = load_sponsor_seed()
    advertisers = {}
    created_advertisers = 0
    for entry in data["advertisers"]:
        advertiser, was_created = Advertiser.objects.get_or_create(
            slug=entry["slug"],
            defaults={
                "name": entry["name"],
                "website": entry["website"],
                "tagline": entry["tagline"],
                "logo_alt": entry["logo_alt"],
            },
        )
        advertisers[entry["slug"]] = advertiser
        created_advertisers += int(was_created)

    created_slots = 0
    for entry in data["slots"]:
        advertiser = advertisers.get(entry["advertiser"])
        if advertiser is None:
            continue
        _, was_created = SponsorSlot.objects.get_or_create(
            advertiser=advertiser,
            placement=entry["placement"],
            defaults={
                "headline": entry["headline"],
                "body": entry["body"],
                "cta_label": entry["cta_label"],
                "target_url": entry["target_url"],
                "weight": entry["weight"],
            },
        )
        created_slots += int(was_created)

    return {"advertisers_created": created_advertisers, "slots_created": created_slots}


def seed_blog(Category, Post, *, overwrite: bool = False) -> dict:
    """Create the seed categories and posts.

    ``Category`` and ``Post`` are passed in rather than imported so a data
    migration can hand over its historical models instead of the live ones.
    """
    data = load_seed()
    created_categories = 0
    for entry in data["categories"]:
        _, was_created = Category.objects.get_or_create(
            slug=entry["slug"],
            defaults={
                "name": entry["name"],
                "description": entry["description"],
                "order": entry["order"],
            },
        )
        created_categories += int(was_created)

    categories = {category.slug: category for category in Category.objects.all()}

    created_posts = 0
    updated_posts = 0
    for entry in data["posts"]:
        published_at = datetime.fromisoformat(
            entry["published_at"].replace("Z", "+00:00")
        ).astimezone(dt_timezone.utc)
        fields = {
            "title": entry["title"],
            "excerpt": entry["excerpt"],
            "body": entry["body"],
            "category": categories.get(entry["category"]),
            "tags": entry["tags"],
            "faqs": entry["faqs"],
            "related_links": entry["related_links"],
            "is_featured": entry["is_featured"],
            "city": entry.get("city", ""),
            "author_name": entry["author_name"],
            "author_role": entry["author_role"],
            # A data migration hands over historical models, which have no
            # custom save(), so the derived slug is written explicitly here.
            "author_slug": slugify(entry["author_name"])[:140],
            "published_at": published_at,
            "status": "published",
            "reading_minutes": max(1, round(len(entry["body"].split()) / 200) or 1),
        }

        post = Post.objects.filter(slug=entry["slug"]).first()
        if post is None:
            Post.objects.create(slug=entry["slug"], **fields)
            created_posts += 1
        elif overwrite:
            for name, value in fields.items():
                setattr(post, name, value)
            post.save()
            updated_posts += 1

    return {
        "categories_created": created_categories,
        "posts_created": created_posts,
        "posts_updated": updated_posts,
    }
