"""
The blog's sponsorship endpoints, kept alive at their old paths.

The implementation moved to `advertising/`. These two names stay because
`/api/blog/sponsors/` is already being called by the blog pages in production
and by whatever CDN copies of them are still warm — changing the path would buy
nothing and break something.

New surfaces call `/api/ads/` instead.
"""

from advertising.serializers import PublicCampaignSerializer as SponsorSlotSerializer  # noqa: F401
from advertising.views import CACHE_TTL_ADS as CACHE_TTL_SPONSORS  # noqa: F401
from advertising.views import AdSlotViewSet as SponsorSlotViewSet  # noqa: F401
from advertising.placements import MAX_PER_PLACEMENT  # noqa: F401

__all__ = [
    "SponsorSlotViewSet",
    "SponsorSlotSerializer",
    "CACHE_TTL_SPONSORS",
    "MAX_PER_PLACEMENT",
]
