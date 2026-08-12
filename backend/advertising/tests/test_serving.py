"""What a slot serves, to whom, and what it refuses to do."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from advertising.models import Advertiser, Campaign, overbooked_placements
from advertising.placements import MAX_PER_PLACEMENT, Placement
from advertising.selection import campaigns_for

pytestmark = pytest.mark.django_db


def make_advertiser(name="Ferretería El Constructor", **overrides):
    fields = {
        "name": name,
        "slug": name.lower().replace(" ", "-")[:140],
        "website": "https://example.com",
    }
    fields.update(overrides)
    return Advertiser.objects.create(**fields)


def make_campaign(advertiser=None, **overrides):
    fields = {
        "advertiser": advertiser,
        "placement": Placement.PROPERTY_SIDEBAR,
        "kind": Campaign.Kind.PAID,
        "headline": "Todo para tu obra",
        "body": "Entrega el mismo día en Macas.",
        "target_url": "https://example.com/catalogo",
        "amount_charged_usd": Decimal("45.00"),
    }
    fields.update(overrides)
    if fields["kind"] != Campaign.Kind.PAID:
        fields.setdefault("amount_charged_usd", None)
        fields["amount_charged_usd"] = None
    if fields.get("advertiser") is None and fields["kind"] == Campaign.Kind.PAID:
        fields["advertiser"] = make_advertiser()
    return Campaign.objects.create(**fields)


def test_paid_campaign_requires_the_amount_that_was_charged():
    """SPEC:ADS-001 — if it was charged, it gets written down."""
    campaign = Campaign(
        advertiser=make_advertiser(),
        placement=Placement.PROPERTY_SIDEBAR,
        kind=Campaign.Kind.PAID,
        headline="Todo para tu obra",
        body="Entrega el mismo día.",
        target_url="https://example.com",
        amount_charged_usd=None,
    )

    with pytest.raises(ValidationError) as error:
        campaign.full_clean()

    assert "amount_charged_usd" in error.value.message_dict


def test_house_campaign_cannot_carry_an_amount():
    """SPEC:ADS-017 — otherwise the panel's total counts money nobody paid."""
    campaign = Campaign(
        placement=Placement.PROPERTY_SIDEBAR,
        kind=Campaign.Kind.PROMO,
        headline="¿Quieres aparecer en este espacio?",
        body="Escríbenos y lo hablamos.",
        amount_charged_usd=Decimal("45.00"),
    )

    with pytest.raises(ValidationError) as error:
        campaign.full_clean()

    assert "amount_charged_usd" in error.value.message_dict


def test_paid_campaign_wins_over_house_ones():
    """SPEC:ADS-017 — paid first, then the group's, then the sign."""
    make_campaign(kind=Campaign.Kind.PROMO, headline="Espacio disponible", target_url="")
    make_campaign(
        advertiser=make_advertiser("Aents"),
        kind=Campaign.Kind.PARTNER,
        headline="Aents",
    )
    paid = make_campaign(headline="Ferretería")

    served = campaigns_for(Placement.PROPERTY_SIDEBAR)

    assert [campaign.pk for campaign in served] == [paid.pk]


def test_partner_campaign_fills_in_when_nobody_paid():
    """SPEC:ADS-017 — the group's brand takes the space before the sign does."""
    make_campaign(kind=Campaign.Kind.PROMO, headline="Espacio disponible", target_url="")
    partner = make_campaign(
        advertiser=make_advertiser("Aents"),
        kind=Campaign.Kind.PARTNER,
        headline="Aents",
    )

    served = campaigns_for(Placement.PROPERTY_SIDEBAR)

    assert [campaign.pk for campaign in served] == [partner.pk]


def test_empty_placement_falls_back_to_the_house_sign():
    """SPEC:ADS-016 — an empty hole is not a possible outcome."""
    promo = make_campaign(
        kind=Campaign.Kind.PROMO,
        headline="¿Quieres aparecer en este espacio?",
        target_url="",
    )

    served = campaigns_for(Placement.PROPERTY_SIDEBAR)

    assert [campaign.pk for campaign in served] == [promo.pk]


def test_expired_campaign_is_not_served():
    """SPEC:ADS-015 — a campaign is a date range, not a switch."""
    now = timezone.now()
    make_campaign(
        starts_at=now - timedelta(days=30),
        ends_at=now - timedelta(days=1),
    )

    assert campaigns_for(Placement.PROPERTY_SIDEBAR) == []


def test_future_campaign_is_not_served_yet():
    """SPEC:ADS-015 — it starts on its own, too."""
    make_campaign(starts_at=timezone.now() + timedelta(days=2))

    assert campaigns_for(Placement.PROPERTY_SIDEBAR) == []


def test_campaign_targeted_at_one_city_stays_there():
    """SPEC:ADS-002 — what this portal sells is context, not reach."""
    make_campaign(target_cities=["Macas"])

    assert len(campaigns_for(Placement.PROPERTY_SIDEBAR, city="macas")) == 1
    assert campaigns_for(Placement.PROPERTY_SIDEBAR, city="quito") == []


def test_untargeted_campaign_runs_everywhere():
    """SPEC:ADS-002 — an empty list of cities means the whole country."""
    make_campaign(target_cities=[])

    assert len(campaigns_for(Placement.PROPERTY_SIDEBAR, city="quito")) == 1


def test_city_targeting_ignores_accents_and_case():
    """SPEC:ADS-002 — «Sucúa» and «sucua» are the same town."""
    campaign = make_campaign(target_cities=["Sucúa"])

    assert campaign.target_cities == ["sucua"]
    assert len(campaigns_for(Placement.PROPERTY_SIDEBAR, city="SUCÚA")) == 1


def test_heaviest_campaigns_are_the_ones_that_survive_truncation():
    """SPEC:ADS-019 — and the ones dropped are the ones that asked for least."""
    for index in range(MAX_PER_PLACEMENT + 2):
        make_campaign(
            advertiser=make_advertiser(f"Anunciante {index}"),
            headline=f"Campaña {index}",
            weight=index + 1,
        )

    served = campaigns_for(Placement.PROPERTY_SIDEBAR)

    assert len(served) == MAX_PER_PLACEMENT
    assert [campaign.weight for campaign in served] == sorted(
        (campaign.weight for campaign in served), reverse=True
    )


def test_overbooked_placement_is_reported():
    """SPEC:ADS-019 — the silent failure has to become visible somewhere."""
    for index in range(MAX_PER_PLACEMENT + 1):
        make_campaign(
            advertiser=make_advertiser(f"Anunciante {index}"),
            headline=f"Campaña {index}",
        )

    overbooked = overbooked_placements()

    assert overbooked == {Placement.PROPERTY_SIDEBAR: MAX_PER_PLACEMENT + 1}


def test_a_placement_within_capacity_is_not_reported():
    """SPEC:ADS-019 — no false alarms, or the warning stops being read."""
    make_campaign()

    assert overbooked_placements() == {}


def test_partner_campaign_requires_advertiser():
    campaign = make_campaign(kind=Campaign.Kind.PARTNER, advertiser=None)
    with pytest.raises(ValidationError) as error:
        campaign.full_clean()
    assert "advertiser" in error.value.message_dict


def test_promo_rejects_advertiser_and_external_url():
    """SPEC:ADS-017 — the house sign is nobody's brand and goes to WhatsApp.

    Built with both faults on purpose: the helper leaves `advertiser` empty for
    a promo, so asking it for the default campaign would only exercise half the
    rule.
    """
    campaign = make_campaign(
        advertiser=make_advertiser("Ferretería"),
        kind=Campaign.Kind.PROMO,
        amount_charged_usd=None,
        target_url="https://example.com/catalogo",
    )
    with pytest.raises(ValidationError) as error:
        campaign.full_clean()
    assert {"advertiser", "target_url"} <= error.value.message_dict.keys()


def test_non_geo_placement_rejects_city_targeting():
    """SPEC:ADS-020 — the footer runs site-wide; targeting it is a mistake."""
    campaign = make_campaign(placement=Placement.SITE_FOOTER, target_cities=["Macas"])
    with pytest.raises(ValidationError) as error:
        campaign.full_clean()
    assert "target_cities" in error.value.message_dict


def test_city_normalization_removes_duplicates():
    campaign = make_campaign(target_cities=["Macas", " macas ", "Mácas"])
    assert campaign.target_cities == ["macas"]


def test_city_campaign_wins_over_national_campaign():
    """SPEC:ADS-020 — local inventory outranks the national fallback."""
    """SPEC:ADS-020 — the closest audience wins inside the same class."""
    national = make_campaign(headline="Ecuador")
    local = make_campaign(
        advertiser=make_advertiser("Negocio de Macas"),
        headline="Macas",
        target_cities=["Macas"],
    )
    assert campaigns_for(Placement.PROPERTY_SIDEBAR, city="Macas", province="Morona Santiago") == [local]
    assert campaigns_for(Placement.PROPERTY_SIDEBAR, city="Quito", province="Pichincha") == [national]


def test_province_campaign_is_the_middle_fallback():
    """SPEC:ADS-020 — province inventory covers its cities when no city ad exists."""
    """SPEC:ADS-020 — province sits between the city and the whole country."""
    make_campaign(headline="Ecuador")
    province = make_campaign(
        advertiser=make_advertiser("Negocio provincial"),
        headline="Morona Santiago",
        target_provinces=["Morona Santiago"],
    )
    assert campaigns_for(Placement.PROPERTY_SIDEBAR, city="Sucúa", province="Morona Santiago") == [province]


def test_campaign_cannot_mix_provinces_and_cities():
    """SPEC:ADS-020 — one campaign has one unambiguous audience level."""
    """SPEC:ADS-020 — one level of audience per campaign, never two."""
    campaign = make_campaign(target_cities=["Macas"], target_provinces=["Morona Santiago"])
    with pytest.raises(ValidationError) as error:
        campaign.full_clean()
    assert "target_cities" in error.value.message_dict
