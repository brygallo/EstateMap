"""Keep the caches and the search engines in sync with what staff edits.

A post saved in the admin has to reach three places: the Redis payloads (bumped
by version, never deleted key by key), the Next.js pages (revalidated by tag),
and IndexNow (so Bing — and through it ChatGPT and Copilot — recrawls the URL
the same minute). Scheduling a post for next month must trigger none of that,
which is why every hook below checks `is_public` first.
"""

import logging

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from real_estate.cache_utils import bump_props_version
from real_estate.services.indexnow import submit_urls

from .models import Category, Post

logger = logging.getLogger(__name__)


def _announce(paths, tags):
    bump_props_version("blog")

    def dispatch():
        submit_urls(paths)
        try:
            from real_estate.tasks import revalidate_frontend_tags

            revalidate_frontend_tags.delay(tags)
        except Exception:
            logger.warning("Could not queue blog revalidation for %s", tags, exc_info=True)

    transaction.on_commit(dispatch)


@receiver(post_save, sender=Post)
def post_saved(sender, instance, **kwargs):
    # A draft or a future-dated post has no public URL yet: bump the cache in
    # case it was public a second ago (unpublished, re-scheduled) and stop.
    if not instance.is_public:
        bump_props_version("blog")
        return
    _announce(
        paths=[instance.absolute_path, "/blog", "/sitemap.xml"],
        tags=["blog", f"blog-{instance.slug}"],
    )


@receiver(post_delete, sender=Post)
def post_deleted(sender, instance, **kwargs):
    bump_props_version("blog")

    def dispatch():
        try:
            from real_estate.tasks import revalidate_frontend_tags

            revalidate_frontend_tags.delay(["blog", f"blog-{instance.slug}"])
        except Exception:
            logger.warning("Could not queue blog revalidation on delete", exc_info=True)

    transaction.on_commit(dispatch)


@receiver([post_save, post_delete], sender=Category)
def category_changed(sender, instance, **kwargs):
    bump_props_version("blog")


# Sponsorships moved to `advertising/`, and so did the receiver that keeps their
# payloads fresh — they are cached under their own version key now, so bumping
# the blog's would not have reached them anyway. See `advertising/signals.py`.
