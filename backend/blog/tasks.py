"""
Scheduled publishing and editorial upkeep.

The beat task below is not what makes a post public — the date is (see
``blog.models``). What it does is fire the side effects a publication needs and
a passing clock cannot: tell IndexNow the URL exists, and drop the Next.js cache
entries so the new article shows up on `/blog` within seconds instead of waiting
out the ISR window.
"""

import logging
import re
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

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


# An article that quotes a figure in its own text stops being true the day the
# market moves. The blocks the page renders — the price per m², the live
# ranking — recalculate themselves, but a number typed into a paragraph does
# not, and nothing in the system knew which articles carried one.
STALE_AFTER_DAYS = 90
FIGURE_PATTERN = re.compile(r"\$\s?\d[\d.,]{2,}|\d[\d.,]*\s?(?:m²|USD|dólares)")


@shared_task
def flag_stale_figures():
    """Report published articles whose typed figures are older than a quarter.

    Reports, never edits. Rewriting a published paragraph without a person
    reading it is how a portal ends up publishing a sentence that contradicts
    the block right below it. What this gives the editor is the list worth
    reviewing, which is the part nobody was going to compile by hand.
    """
    cutoff = timezone.now() - timedelta(days=STALE_AFTER_DAYS)
    candidates = Post.objects.filter(
        status=Post.Status.PUBLISHED, updated_at__lt=cutoff
    ).only("id", "slug", "updated_at", "body", "city")

    stale = [
        {
            "slug": post.slug,
            "city": post.city,
            "updated_at": post.updated_at.isoformat(),
            "figures": len(FIGURE_PATTERN.findall(post.body or "")),
        }
        for post in candidates
        if FIGURE_PATTERN.search(post.body or "")
    ]
    if stale:
        logger.warning(
            "blog.stale_figures", extra={"count": len(stale), "posts": stale}
        )
    return {"stale": len(stale), "checked_after_days": STALE_AFTER_DAYS}
