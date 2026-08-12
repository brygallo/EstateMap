"""
Public endpoints for the advertising slots.

Two of them, and each earns its place:

- ``GET /api/ads/?placement=…&city=…`` — what to render in a slot. Cached like
  every other public read, keyed by placement and city.
- ``GET /api/ads/<id>/go/`` — the click. A redirect rather than a tracking pixel
  or a beacon, because a redirect works with JavaScript off, is the only thing
  an AI crawler could conceivably follow, and puts the bot filter and the
  referrer policy on the server side where they cannot be edited away.
"""

from django.core.cache import cache
from django.db.models import F
from django.http import HttpResponseRedirect
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from real_estate.bot_detection import is_bot_request
from real_estate.cache_utils import versioned_key
from real_estate.views import _is_public_read, _public_response

from .models import Campaign, canonical_city
from .placements import Placement
from .selection import campaigns_for
from .serializers import PublicCampaignSerializer

# Campaigns change on human timescales, so this can sit well above the post TTL.
# It is also the length of the rotation window the frontend uses: the slot a
# page shows changes when this expires, which is what makes the same listing
# cycle through advertisers over the day without costing a single extra request
# (ADS-013).
CACHE_TTL_ADS = 60 * 30


class AdSlotViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = PublicCampaignSerializer
    queryset = Campaign.objects.none()

    def get_queryset(self):
        return Campaign.objects.live()

    def list(self, request, *args, **kwargs):
        placement = (request.query_params.get("placement") or "").strip()
        if placement and placement not in Placement.values:
            return _public_response([], request, s_maxage=CACHE_TTL_ADS)

        city = canonical_city(request.query_params.get("city"))
        province = canonical_city(request.query_params.get("province"))

        cache_key = versioned_key("ads_slots", placement, city, province, scope="ads")
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_ADS)

        campaigns = campaigns_for(placement or None, city=city or None, province=province or None)
        data = PublicCampaignSerializer(campaigns, many=True).data
        if _is_public_read(request):
            cache.set(cache_key, data, CACHE_TTL_ADS)
        return _public_response(data, request, s_maxage=CACHE_TTL_ADS)

    @action(detail=True, methods=["get"], url_path="go")
    def go(self, request, pk=None):
        """Count the click and send the reader on.

        A dead or expired campaign still redirects: the link may live in a page
        cached by a CDN or in someone's history, and a 404 there is a worse
        outcome than one click on a campaign that just ended (ADS-015).
        """
        campaign = Campaign.objects.select_related("advertiser").filter(pk=pk).first()
        if campaign is None or not campaign.target_url:
            return HttpResponseRedirect("/")

        if not is_bot_request(request):
            # F() so concurrent clicks add up instead of overwriting each other,
            # and `update` so this never fires the post_save signal that would
            # bust the cache on every click.
            Campaign.objects.filter(pk=campaign.pk).update(
                click_count=F("click_count") + 1
            )

        response = HttpResponseRedirect(campaign.target_url)
        # Never cached anywhere: a cached redirect is a click that never reaches
        # the counter, and nginx would happily hold this one.
        response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        # The destination is a third party: it gets to know a click came from
        # the site, not which listing the reader was on.
        response["Referrer-Policy"] = "origin"
        response["X-Robots-Tag"] = "noindex, nofollow"
        return response
