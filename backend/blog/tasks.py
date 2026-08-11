"""
Scheduled publishing.

The beat task below is not what makes a post public — the date is (see
``blog.models``). What it does is fire the side effects a publication needs and
a passing clock cannot: tell IndexNow the URL exists, and drop the Next.js cache
entries so the new article shows up on `/blog` within seconds instead of waiting
out the ISR window.
"""

import logging

from celery import shared_task

from real_estate.cache_utils import bump_props_version
from real_estate.services.indexnow import submit_urls

from .models import Post

logger = logging.getLogger(__name__)


@shared_task
def publish_scheduled_posts():
    """Flip every scheduled post whose date has arrived and announce it.

    Runs hourly. Editors pick a publication hour, not a minute, so an hourly
    cadence is enough and keeps the worker idle the rest of the time.
    """
    due = list(Post.objects.due().only("id", "slug"))
    if not due:
        return {"published": 0}

    Post.objects.filter(id__in=[post.id for post in due]).update(
        status=Post.Status.PUBLISHED
    )
    bump_props_version("blog")

    paths = ["/blog", "/sitemap.xml"] + [post.absolute_path for post in due]
    submit_urls(paths)

    tags = ["blog"] + [f"blog-{post.slug}" for post in due]
    try:
        from real_estate.tasks import revalidate_frontend_tags

        revalidate_frontend_tags.delay(tags)
    except Exception:
        # Deliberately broad, same reasoning as real_estate.signals: a broker
        # hiccup must not turn into a failed publication. The pages catch up
        # when their own ISR window expires.
        logger.warning("Could not queue blog revalidation for %s", tags, exc_info=True)

    logger.info("publish_scheduled_posts: %s posts published", len(due))
    return {"published": len(due), "slugs": [post.slug for post in due]}
