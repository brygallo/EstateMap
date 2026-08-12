"""Keep the cached slot payloads in step with what staff edits.

Campaigns are cached for half an hour. Pausing one without invalidating leaves
it on screen for up to thirty minutes — which is exactly the stretch during
which an unhappy advertiser keeps seeing themselves.

Only the Redis payloads move. The pages are not revalidated: swapping a sponsor
is not a content change, and forcing Next to rebuild every listing for it would
be a lot of work for a slot that refreshes on its own within the TTL.
"""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from real_estate.cache_utils import bump_props_version

from .models import Advertiser, Campaign


@receiver([post_save, post_delete], sender=Campaign)
@receiver([post_save, post_delete], sender=Advertiser)
def advertising_changed(sender, instance, **kwargs):
    bump_props_version("ads")
