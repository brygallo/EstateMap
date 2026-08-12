"""Django admin for advertising — the rescue tool, not the working interface.

The work happens in /admin/publicidad, which is React like the rest of the
panel. This stays for the things a purpose-built screen does badly: bulk edits,
poking at a row that a bug left in a strange state, and looking at data without
going through the API.
"""

from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from real_estate.cache_utils import bump_props_version

from .models import Advertiser, Campaign


class CampaignInline(admin.TabularInline):
    model = Campaign
    extra = 0
    fields = ["placement", "kind", "headline", "starts_at", "ends_at", "weight", "is_active"]
    show_change_link = True


@admin.register(Advertiser)
class AdvertiserAdmin(admin.ModelAdmin):
    list_display = ["name", "website", "live_campaigns", "total_clicks", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "tagline", "website", "contact_name"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [CampaignInline]

    @admin.display(description="Campañas en línea")
    def live_campaigns(self, obj):
        return obj.campaigns.live().count()

    @admin.display(description="Clics (sin bots)")
    def total_clicks(self, obj):
        return sum(obj.campaigns.values_list("click_count", flat=True))


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = [
        "__str__",
        "kind",
        "state_badge",
        "weight",
        "click_count",
        "amount_charged_usd",
    ]
    list_filter = ["placement", "kind", "is_active", "advertiser"]
    search_fields = ["headline", "body", "advertiser__name"]
    autocomplete_fields = ["advertiser"]
    readonly_fields = ["click_count", "created_at", "updated_at"]
    actions = ["activate", "deactivate"]

    fieldsets = (
        (None, {"fields": ("advertiser", "placement", "kind", "is_active", "weight")}),
        (
            "Creatividad",
            {"fields": ("headline", "body", "cta_label", "target_url", "image", "image_alt")},
        ),
        (
            "Campaña",
            {
                "fields": ("starts_at", "ends_at", "target_provinces", "target_cities", "amount_charged_usd"),
                "description": (
                    "Las ciudades vacías significan todo el país. El importe es "
                    "lo que se cobró: una anotación, no un cobro."
                ),
            },
        ),
        (
            "Rendimiento",
            {
                "fields": ("click_count", "created_at", "updated_at"),
                "description": (
                    "Los clics excluyen bots: se cuentan en el redirect "
                    "/api/ads/&lt;id&gt;/go/ y nunca se muestran en público."
                ),
            },
        ),
    )

    @admin.display(description="Estado")
    def state_badge(self, obj):
        if obj.is_live:
            return format_html('<span style="color:#15803d;font-weight:600">● En línea</span>')
        if not obj.is_active or (obj.advertiser and not obj.advertiser.is_active):
            return format_html('<span style="color:#6b7280">Desactivada</span>')
        now = timezone.now()
        if obj.starts_at and obj.starts_at > now:
            return format_html(
                '<span style="color:#b45309;font-weight:600">◷ Empieza</span> {}',
                obj.starts_at.strftime("%d/%m %H:%M"),
            )
        return format_html('<span style="color:#b91c1c">Terminada</span>')

    # A bulk `update()` skips post_save, so these bump the cache by hand — the
    # slot payloads would otherwise keep serving a campaign that was just
    # switched off, for up to half an hour.
    @admin.action(description="Activar")
    def activate(self, request, queryset):
        updated = queryset.update(is_active=True)
        bump_props_version("ads")
        self.message_user(request, f"{updated} campañas activadas.", messages.SUCCESS)

    @admin.action(description="Desactivar")
    def deactivate(self, request, queryset):
        updated = queryset.update(is_active=False)
        bump_props_version("ads")
        self.message_user(request, f"{updated} campañas desactivadas.", messages.WARNING)
