"""Payloads for the public slots and for the panel."""

from rest_framework import serializers

from .models import Advertiser, Campaign


class PublicCampaignSerializer(serializers.ModelSerializer):
    advertiser = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    click_path = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        # `target_url` is deliberately absent: the client links to `click_path`,
        # so a creative cannot be rendered in a way that skips the counter.
        # `click_count` is absent for the same reason every other metric is —
        # it is nobody's business but the advertiser's. And `amount_charged_usd`
        # obviously never leaves the panel.
        fields = [
            "id",
            "placement",
            "kind",
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
        if obj.advertiser is None:
            return None
        return {
            "name": obj.advertiser.name,
            "slug": obj.advertiser.slug,
            "tagline": obj.advertiser.tagline,
            "logo": obj.advertiser.logo.url if obj.advertiser.logo else None,
            "logo_alt": obj.advertiser.logo_alt,
        }

    def get_image(self, obj):
        return obj.image.url if obj.image else None

    def get_click_path(self, obj):
        # A house ad has nowhere to redirect to: the frontend builds a WhatsApp
        # link carrying the placement and the city, because that context is what
        # lets the conversation open with a price instead of three questions
        # (ADS-018).
        if obj.kind == Campaign.Kind.PROMO:
            return None
        return obj.click_path


class AdminAdvertiserSerializer(serializers.ModelSerializer):
    live_campaigns = serializers.SerializerMethodField()
    total_clicks = serializers.SerializerMethodField()

    class Meta:
        model = Advertiser
        fields = [
            "id",
            "name",
            "slug",
            "website",
            "tagline",
            "logo",
            "logo_alt",
            "contact_name",
            "contact_phone",
            "is_active",
            "created_at",
            "live_campaigns",
            "total_clicks",
        ]
        read_only_fields = ["created_at"]

    def get_live_campaigns(self, obj):
        return obj.campaigns.live().count()

    def get_total_clicks(self, obj):
        return sum(obj.campaigns.values_list("click_count", flat=True))


class AdminCampaignSerializer(serializers.ModelSerializer):
    advertiser_name = serializers.CharField(source="advertiser.name", read_only=True)
    placement_label = serializers.CharField(source="get_placement_display", read_only=True)
    is_live = serializers.BooleanField(read_only=True)
    state = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            "id",
            "advertiser",
            "advertiser_name",
            "placement",
            "placement_label",
            "kind",
            "headline",
            "body",
            "cta_label",
            "target_url",
            "image",
            "image_alt",
            "starts_at",
            "ends_at",
            "target_cities",
            "target_provinces",
            "weight",
            "is_active",
            "amount_charged_usd",
            "click_count",
            "is_live",
            "state",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["click_count", "created_at", "updated_at"]

    def get_state(self, obj):
        """What the row should say, which the dates alone do not tell.

        `paused` and `scheduled` both mean "not on screen" and need different
        answers from whoever is looking at the list.
        """
        from django.utils import timezone

        if obj.is_live:
            return "live"
        if not obj.is_active or (obj.advertiser and not obj.advertiser.is_active):
            return "paused"
        now = timezone.now()
        if obj.starts_at and obj.starts_at > now:
            return "scheduled"
        return "ended"

    def validate(self, attrs):
        # Run the model's own rules so the API cannot write a row the admin
        # would reject: a paid campaign without an amount, a house one with it.
        instance = Campaign(**{**self._current(), **attrs})
        instance.full_clean(exclude=["image"], validate_unique=False)
        return attrs

    def _current(self):
        if self.instance is None:
            return {}
        return {
            field.name: getattr(self.instance, field.name)
            for field in Campaign._meta.fields
            if field.name != "id"
        }
