"""
Public endpoints for the sponsorship slots.

Two of them, and each earns its place:

- ``GET /api/blog/sponsors/?placement=…`` — what to render in a slot. Cached
  like every other public read, keyed by placement.
- ``GET /api/blog/sponsors/<id>/go/`` — the click. A redirect rather than a
  tracking pixel or a beacon, because a redirect works with JavaScript off, is
  the only thing an AI crawler could conceivably follow, and puts the bot filter
  and the referrer policy on the server side where they cannot be edited away.
"""

from django.core.cache import cache
from django.db.models import F
from django.http import HttpResponseRedirect
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from real_estate.bot_detection import is_bot_request
from real_estate.cache_utils import versioned_key
from real_estate.views import _is_public_read, _public_response

from .ads import Placement, SponsorSlot

# Campaigns change on human timescales, so this can sit well above the post TTL.
CACHE_TTL_SPONSORS = 60 * 30

# How many creatives a slot may receive. The frontend picks one; sending a few
# lets it rotate without a request per impression, which would defeat the cache.
MAX_PER_PLACEMENT = 4


class SponsorSlotSerializer(serializers.ModelSerializer):
    advertiser = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    click_path = serializers.CharField(read_only=True)

    class Meta:
        model = SponsorSlot
        # `target_url` is deliberately absent: the client links to `click_path`,
        # so a creative cannot be rendered in a way that skips the counter.
        # `click_count` is absent for the same reason every other metric is —
        # it is nobody's business but the advertiser's.
        fields = [
            "id",
            "placement",
            "headline",
            "body",
            "cta_label",
            "image",
            "image_alt",
            "click_path",
            "weight",
            "advertiser",
        ]

    def get_advertiser(self, obj):
        return {
            "name": obj.advertiser.name,
            "slug": obj.advertiser.slug,
            "tagline": obj.advertiser.tagline,
            "logo": obj.advertiser.logo.url if obj.advertiser.logo else None,
            "logo_alt": obj.advertiser.logo_alt,
        }

    def get_image(self, obj):
        return obj.image.url if obj.image else None


class SponsorSlotViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = SponsorSlotSerializer
    queryset = SponsorSlot.objects.none()

    def get_queryset(self):
        return SponsorSlot.objects.live()

    def list(self, request, *args, **kwargs):
        placement = (request.query_params.get("placement") or "").strip()
        if placement and placement not in Placement.values:
            return _public_response([], request, s_maxage=CACHE_TTL_SPONSORS)

        cache_key = versioned_key("blog_sponsors", placement, scope="blog")
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_SPONSORS)

        slots = list(SponsorSlot.objects.live(placement or None)[:MAX_PER_PLACEMENT])
        data = SponsorSlotSerializer(slots, many=True).data
        if _is_public_read(request):
            cache.set(cache_key, data, CACHE_TTL_SPONSORS)
        return _public_response(data, request, s_maxage=CACHE_TTL_SPONSORS)

    @action(detail=True, methods=["get"], url_path="go")
    def go(self, request, pk=None):
        """Count the click and send the reader on.

        A dead or expired campaign still redirects: the link may live in a page
        cached by a CDN or in someone's history, and a 404 there is a worse
        outcome than one click on a campaign that just ended.
        """
        slot = SponsorSlot.objects.select_related("advertiser").filter(pk=pk).first()
        if slot is None:
            return HttpResponseRedirect("/blog")

        if not is_bot_request(request):
            # F() so concurrent clicks add up instead of overwriting each other,
            # and `update` so this never fires the post_save signal that would
            # bust the blog cache on every click.
            SponsorSlot.objects.filter(pk=slot.pk).update(
                click_count=F("click_count") + 1
            )

        response = HttpResponseRedirect(slot.target_url)
        # Never cached anywhere: a cached redirect is a click that never reaches
        # the counter, and nginx would happily hold this one.
        response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        # The destination is a third party: it gets to know a click came from
        # the site, not which article the reader was on.
        response["Referrer-Policy"] = "origin"
        response["X-Robots-Tag"] = "noindex, nofollow"
        return response
