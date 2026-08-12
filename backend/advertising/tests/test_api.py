"""The public endpoints and the panel's, from the outside."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from advertising.models import Advertiser, Campaign
from advertising.placements import Placement

from .test_serving import make_advertiser, make_campaign

pytestmark = pytest.mark.django_db
User = get_user_model()

CRAWLER_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
HUMAN_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120"


def test_slot_payload_never_leaks_the_destination_or_the_money():
    """SPEC:ADS-014 — the counter and the price are nobody else's business."""
    make_campaign(target_url="https://example.com/oferta", amount_charged_usd=Decimal("90.00"))

    response = APIClient().get(f"/api/ads/?placement={Placement.PROPERTY_SIDEBAR}")

    assert response.status_code == 200
    payload = response.json()[0]
    assert "target_url" not in payload
    assert "click_count" not in payload
    assert "amount_charged_usd" not in payload
    # The client links to the redirect, so a creative cannot be rendered in a
    # way that skips the counter.
    assert payload["click_path"] == f"/api/ads/{payload['id']}/go/"


def test_house_sign_has_no_redirect_because_it_goes_to_whatsapp():
    """SPEC:ADS-018 — the frontend builds the link with the page's context."""
    make_campaign(kind=Campaign.Kind.PROMO, headline="Espacio disponible", target_url="")

    response = APIClient().get(f"/api/ads/?placement={Placement.PROPERTY_SIDEBAR}")

    assert response.json()[0]["click_path"] is None


def test_unknown_placement_returns_nothing_rather_than_everything():
    """SPEC:ADS-002 — a typo must not turn into a site-wide takeover."""
    make_campaign()

    response = APIClient().get("/api/ads/?placement=el_mejor_sitio")

    assert response.status_code == 200
    assert response.json() == []


def test_click_from_a_human_counts_and_redirects():
    """SPEC:ADS-014 — the redirect is what makes the count possible at all."""
    campaign = make_campaign(target_url="https://example.com/catalogo")

    response = APIClient().get(f"/api/ads/{campaign.pk}/go/", HTTP_USER_AGENT=HUMAN_UA)

    assert response.status_code == 302
    assert response["Location"] == "https://example.com/catalogo"
    assert response["Referrer-Policy"] == "origin"
    assert "no-store" in response["Cache-Control"]
    campaign.refresh_from_db()
    assert campaign.click_count == 1


def test_click_from_a_crawler_redirects_without_counting():
    """SPEC:ADS-014 — 78% of the sessions counted before filtering were bots."""
    campaign = make_campaign(target_url="https://example.com/catalogo")

    response = APIClient().get(f"/api/ads/{campaign.pk}/go/", HTTP_USER_AGENT=CRAWLER_UA)

    assert response.status_code == 302
    campaign.refresh_from_db()
    assert campaign.click_count == 0


def test_expired_campaign_stops_serving_but_its_link_still_works():
    """SPEC:ADS-015 — a 404 is a worse outcome than one late click."""
    now = timezone.now()
    campaign = make_campaign(
        target_url="https://example.com/catalogo",
        starts_at=now - timedelta(days=30),
        ends_at=now - timedelta(days=1),
    )
    client = APIClient()

    assert client.get(f"/api/ads/?placement={Placement.PROPERTY_SIDEBAR}").json() == []
    assert client.get(f"/api/ads/{campaign.pk}/go/").status_code == 302


def test_anonymous_user_cannot_reach_the_panel_api():
    """SPEC:ADS-030 — the frontend is not a security boundary."""
    assert APIClient().get("/api/admin/ads/campaigns/").status_code in (401, 403)


def test_regular_user_cannot_create_a_campaign():
    """SPEC:ADS-030 — publishing an image on the portal is staff-only."""
    client = APIClient()
    client.force_authenticate(User.objects.create_user(username="curioso", password="x"))

    response = client.post(
        "/api/admin/ads/campaigns/",
        {
            "placement": Placement.PROPERTY_SIDEBAR,
            "kind": Campaign.Kind.PAID,
            "headline": "Mi negocio",
            "body": "Texto",
            "target_url": "https://example.com",
            "amount_charged_usd": "10.00",
        },
        format="json",
    )

    assert response.status_code == 403
    assert Campaign.objects.count() == 0


def test_staff_creates_a_campaign_with_what_was_charged():
    """SPEC:ADS-001 — three data points: what, until when, how much."""
    advertiser = make_advertiser()
    client = APIClient()
    client.force_authenticate(
        User.objects.create_user(username="staff", password="x", is_staff=True)
    )

    response = client.post(
        "/api/admin/ads/campaigns/",
        {
            "advertiser": advertiser.pk,
            "placement": Placement.CITY_HERO,
            "kind": Campaign.Kind.PAID,
            "headline": "Todo para tu obra",
            "body": "Entrega el mismo día en Macas.",
            "target_url": "https://example.com/catalogo",
            "ends_at": (timezone.now() + timedelta(days=30)).isoformat(),
            "target_cities": ["Macas"],
            "amount_charged_usd": "45.00",
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    campaign = Campaign.objects.get()
    assert campaign.amount_charged_usd == Decimal("45.00")
    assert campaign.target_cities == ["macas"]


def test_staff_cannot_create_a_paid_campaign_without_the_amount():
    """SPEC:ADS-001 — the API cannot write a row the admin would reject."""
    advertiser = make_advertiser()
    client = APIClient()
    client.force_authenticate(
        User.objects.create_user(username="staff", password="x", is_staff=True)
    )

    response = client.post(
        "/api/admin/ads/campaigns/",
        {
            "advertiser": advertiser.pk,
            "placement": Placement.CITY_HERO,
            "kind": Campaign.Kind.PAID,
            "headline": "Todo para tu obra",
            "body": "Entrega el mismo día.",
            "target_url": "https://example.com/catalogo",
        },
        format="json",
    )

    assert response.status_code == 400


def test_panel_multipart_creates_a_province_campaign():
    """SPEC:ADS-020 — the React form sends geographic arrays as multipart JSON."""
    advertiser = make_advertiser()
    client = APIClient()
    client.force_authenticate(User.objects.create_user(username="geo-staff", password="x", is_staff=True))

    response = client.post(
        "/api/admin/ads/campaigns/",
        {
            "advertiser": str(advertiser.pk),
            "placement": Placement.CITY_HERO,
            "kind": Campaign.Kind.PAID,
            "headline": "Cobertura provincial",
            "body": "Para toda Morona Santiago.",
            "target_url": "https://example.com/provincia",
            "target_cities": "[]",
            "target_provinces": '["Morona Santiago"]',
            "amount_charged_usd": "90.00",
        },
        format="multipart",
    )

    assert response.status_code == 201, response.data
    assert Campaign.objects.get().target_provinces == ["morona santiago"]


def test_staff_duplicates_complete_campaign_as_paused():
    """SPEC:ADS-032 — duplication keeps the creative but never publishes by surprise."""
    source = make_campaign(target_provinces=["Morona Santiago"], image_alt="Marca sobre fondo azul")
    client = APIClient()
    client.force_authenticate(User.objects.create_user(username="copy-staff", password="x", is_staff=True))

    response = client.post(f"/api/admin/ads/campaigns/{source.pk}/duplicate/")

    assert response.status_code == 201, response.data
    copy = Campaign.objects.exclude(pk=source.pk).get()
    assert copy.headline.endswith("(copia)")
    assert copy.target_provinces == ["morona santiago"]
    assert copy.image_alt == source.image_alt
    assert copy.is_active is False
    assert copy.click_count == 0


def test_pausing_a_campaign_takes_it_off_the_slot():
    """SPEC:ADS-033 — half an hour of TTL is half an hour of angry advertiser."""
    campaign = make_campaign()
    client = APIClient()
    client.force_authenticate(
        User.objects.create_user(username="staff", password="x", is_staff=True)
    )

    response = client.post(f"/api/admin/ads/campaigns/{campaign.pk}/pause/")

    assert response.status_code == 200
    public = APIClient().get(f"/api/ads/?placement={Placement.PROPERTY_SIDEBAR}")
    assert public.json() == []


def test_summary_flags_a_placement_that_was_oversold():
    """SPEC:ADS-019 — «vendí de más» has to be distinguishable from «le cobré por nada»."""
    for index in range(6):
        make_campaign(
            advertiser=make_advertiser(f"Anunciante {index}"),
            headline=f"Campaña {index}",
        )
    client = APIClient()
    client.force_authenticate(
        User.objects.create_user(username="staff", password="x", is_staff=True)
    )

    response = client.get("/api/admin/ads/campaigns/summary/")

    assert response.status_code == 200
    overbooked = response.json()["overbooked"]
    assert len(overbooked) == 1
    assert overbooked[0]["placement"] == Placement.PROPERTY_SIDEBAR
    assert overbooked[0]["live"] == 6


def test_summary_lists_what_is_about_to_expire():
    """SPEC:ADS-031 — a campaign that lapses unnoticed is a renewal lost."""
    make_campaign(ends_at=timezone.now() + timedelta(days=3), headline="Se acaba")
    make_campaign(
        advertiser=make_advertiser("Otro"),
        ends_at=timezone.now() + timedelta(days=60),
        headline="Va larga",
        placement=Placement.CITY_HERO,
    )
    client = APIClient()
    client.force_authenticate(
        User.objects.create_user(username="staff", password="x", is_staff=True)
    )

    response = client.get("/api/admin/ads/campaigns/summary/")

    expiring = response.json()["expiring"]
    assert [row["headline"] for row in expiring] == ["Se acaba"]


def test_house_campaigns_do_not_count_as_money():
    """SPEC:ADS-017 — the total must not include sponsorships nobody paid for."""
    make_campaign(headline="Pagada", amount_charged_usd=Decimal("120.00"))
    make_campaign(
        advertiser=make_advertiser("Aents"),
        kind=Campaign.Kind.PARTNER,
        headline="Aents",
        placement=Placement.CITY_HERO,
    )
    client = APIClient()
    client.force_authenticate(
        User.objects.create_user(username="staff", password="x", is_staff=True)
    )

    response = client.get("/api/admin/ads/campaigns/summary/")

    assert Decimal(str(response.json()["charged_live_usd"])) == Decimal("120.00")


def test_advertiser_list_is_staff_only():
    """SPEC:ADS-030 — contact details are not public."""
    Advertiser.objects.create(name="Aents", slug="aents", website="https://aents.net")

    assert APIClient().get("/api/admin/ads/advertisers/").status_code in (401, 403)
