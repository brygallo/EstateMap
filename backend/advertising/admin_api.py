"""Staff-only API behind /admin/campanas."""

from datetime import timedelta

from django.db import models
from django.db.models import Sum
from django.utils import timezone
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from real_estate.cache_utils import bump_props_version
from real_estate.permissions import IsAdminUser
from real_estate.views import AdminPagination

from .models import Advertiser, Campaign, overbooked_placements
from .placements import GEO_TARGETABLE, MAX_PER_PLACEMENT, Placement
from .serializers import AdminAdvertiserSerializer, AdminCampaignSerializer

# How far ahead the panel looks for campaigns about to run out. A campaign that
# expires without anyone writing to the advertiser is a renewal lost, and
# renewing costs far less than selling (ADS-031).
EXPIRING_WINDOW_DAYS = 7


class AdminCampaignViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminCampaignSerializer
    pagination_class = AdminPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["headline", "body", "advertiser__name"]
    ordering_fields = ["created_at", "updated_at", "ends_at", "weight", "click_count"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        queryset = Campaign.objects.select_related("advertiser").all()
        placement = self.request.query_params.get("placement")
        if placement in Placement.values:
            queryset = queryset.filter(placement=placement)
        kind = self.request.query_params.get("kind")
        if kind in Campaign.Kind.values:
            queryset = queryset.filter(kind=kind)
        return queryset.order_by("-updated_at")

    # Pausing and resuming are named actions rather than a PATCH of `is_active`
    # so the log says what was done and not only what was left behind.
    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        campaign = self.get_object()
        campaign.is_active = False
        campaign.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(campaign).data)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        campaign = self.get_object()
        campaign.is_active = True
        campaign.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(campaign).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Copy a complete creative as a paused draft with no commercial history."""
        source = self.get_object()
        campaign = Campaign.objects.create(
            advertiser=source.advertiser,
            placement=source.placement,
            kind=source.kind,
            headline=f"{source.headline} (copia)",
            body=source.body,
            cta_label=source.cta_label,
            target_url=source.target_url,
            image=source.image,
            image_alt=source.image_alt,
            starts_at=source.starts_at,
            ends_at=source.ends_at,
            target_cities=source.target_cities,
            target_provinces=source.target_provinces,
            weight=source.weight,
            is_active=False,
            amount_charged_usd=source.amount_charged_usd,
        )
        return Response(self.get_serializer(campaign).data, status=201)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """What the panel needs above the list.

        Three numbers and two warnings — deliberately not a dashboard. With the
        selling happening on WhatsApp, the panel only has to answer "what is on
        screen, what is about to fall off, and what am I overselling".
        """
        now = timezone.now()
        live = Campaign.objects.live()

        charged = (
            Campaign.objects.filter(kind=Campaign.Kind.PAID, is_active=True)
            .filter(models.Q(starts_at__isnull=True) | models.Q(starts_at__lte=now))
            .filter(ends_at__isnull=True)
            .aggregate(total=Sum("amount_charged_usd"))["total"]
        )
        charged_live = live.filter(kind=Campaign.Kind.PAID).aggregate(
            total=Sum("amount_charged_usd")
        )["total"]

        expiring = (
            live.filter(ends_at__isnull=False, ends_at__lte=now + timedelta(days=EXPIRING_WINDOW_DAYS))
            .select_related("advertiser")
            .order_by("ends_at")
        )

        overbooked = overbooked_placements()

        return Response(
            {
                "live_count": live.count(),
                "charged_live_usd": charged_live or 0,
                "charged_open_ended_usd": charged or 0,
                "expiring": AdminCampaignSerializer(expiring, many=True).data,
                "expiring_window_days": EXPIRING_WINDOW_DAYS,
                # The silent failure made visible: more live campaigns in a
                # placement than a response can carry means the lightest ones
                # never appear at all (ADS-019).
                "overbooked": [
                    {
                        "placement": placement,
                        "label": Placement(placement).label,
                        "live": total,
                        "served": MAX_PER_PLACEMENT,
                    }
                    for placement, total in overbooked.items()
                ],
                "max_per_placement": MAX_PER_PLACEMENT,
            }
        )

    @action(detail=False, methods=["get"])
    def placements(self, request):
        """The catalogue, so the form does not hardcode a copy of it."""
        return Response(
            [
                {
                    "code": code,
                    "label": label,
                    "geo_targetable": code in GEO_TARGETABLE,
                }
                for code, label in Placement.choices
            ]
        )


class AdminAdvertiserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminAdvertiserSerializer
    pagination_class = AdminPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "tagline", "website", "contact_name"]
    ordering = ["name"]

    def get_queryset(self):
        return Advertiser.objects.all()

    def perform_destroy(self, instance):
        # Deleting an advertiser takes its campaigns with it, so the payloads
        # have to stop being addressable before the next reader arrives.
        super().perform_destroy(instance)
        bump_props_version("ads")
