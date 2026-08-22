"""Claiming imported listings: who may, what it changes, and what survives it.

The portal carries thousands of listings scraped from another site. When a
visitor writes from here, WhatsApp opens naming Geo Propiedades, so the
advertiser learns the portal is sending them buyers. These tests cover the
other half — what happens when that advertiser arrives — and, above all, that
a claimed listing cannot be taken back by the machinery that imported it.
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from ingesta.models import Fuente
from real_estate.models import ActivityEvent, ClaimDismissal, Property
from real_estate.services.claims import PropertyClaimService
from real_estate.services.phones import is_plausible_ec_mobile, normalize_ec_phone


pytestmark = pytest.mark.django_db

PHONE = "0987654321"
NORMALIZED = "593987654321"


def advertiser(username="anunciante", phone=NORMALIZED):
    user = get_user_model().objects.create_user(
        username=username, email=f"{username}@example.com", password="test-password"
    )
    user.phone = phone
    user.save()
    return user


def imported(phone=PHONE, **extra):
    defaults = {
        "title": "Casa en Manta",
        "status": "for_sale",
        "price": 90000,
        "latitude": -0.95,
        "longitude": -80.7,
        "contact_phone": phone,
        "is_imported": True,
    }
    defaults.update(extra)
    return Property.objects.create(**defaults)


# -- The lookup key ---------------------------------------------------------

@pytest.mark.parametrize(
    "written,expected",
    [
        ("0987654321", NORMALIZED),
        ("+593 98 765 4321", NORMALIZED),
        ("593987654321", NORMALIZED),
        ("(09) 8765-4321", NORMALIZED),
        ("00593987654321", NORMALIZED),
        ("", ""),
        ("593", ""),
        ("no es un teléfono", ""),
    ],
)
def test_the_same_number_written_four_ways_matches_once(written, expected):
    """SPEC:CLM-001 — ownership cannot depend on how somebody typed it."""
    assert normalize_ec_phone(written) == expected


def test_the_normalised_column_is_written_on_every_save():
    """SPEC:CLM-001 — including the import pipeline, which never calls the API."""
    prop = imported(phone="+593 98 765 4321")
    assert prop.contact_phone_normalized == NORMALIZED
    assert Property.objects.get(pk=prop.pk).contact_phone_normalized == NORMALIZED


def test_a_landline_is_not_a_claimable_number():
    """SPEC:CLM-001 — claiming is a WhatsApp conversation."""
    assert is_plausible_ec_mobile("0987654321")
    assert not is_plausible_ec_mobile("022345678")


# -- What an account may claim ---------------------------------------------

def test_the_advertiser_sees_only_their_own_listings():
    """SPEC:CLM-002 — the phone decides, and nothing else does."""
    mine = imported()
    imported(phone="0991112222", title="De otro anunciante")
    client = APIClient()
    client.force_authenticate(advertiser())

    response = client.get(reverse("property-claimable"))

    assert response.status_code == 200
    assert response.data["claimable_count"] == 1
    assert [row["id"] for row in response.data["results"]] == [mine.pk]


def test_a_listing_that_already_has_an_owner_is_not_on_offer():
    """SPEC:CLM-002 — claimed once is claimed; it is not a queue."""
    other = advertiser("otro", phone="593991112222")
    prop = imported()
    prop.owner = other
    prop.save()

    service = PropertyClaimService(advertiser())
    assert service.claimable().count() == 0


def test_an_account_without_a_phone_is_offered_nothing():
    """SPEC:CLM-002 — no key, no inventory."""
    user = get_user_model().objects.create_user(
        username="sin-telefono", email="sin@example.com", password="test-password"
    )
    imported()
    service = PropertyClaimService(user)

    assert service.may_claim() is False
    assert service.claimable().count() == 0


def test_the_summary_counts_the_contacts_that_justify_the_invitation():
    """SPEC:CLM-002 — «te escribieron N veces» is the argument that convinces."""
    prop = imported()
    ActivityEvent.objects.create(event_name="property_contact_clicked", property=prop, session_id="s1")
    ActivityEvent.objects.create(event_name="property_contact_clicked", property=prop, session_id="s2")
    # A crawler is not a person, and this figure is shown to somebody deciding.
    ActivityEvent.objects.create(
        event_name="property_contact_clicked", property=prop, session_id="bot", is_bot=True
    )

    summary = PropertyClaimService(advertiser()).summary()

    assert summary["claimable_count"] == 1
    assert summary["contacts_received"] == 2


# -- Claiming ---------------------------------------------------------------

def test_claiming_hands_over_the_listing_and_unlinks_it_from_the_import():
    """SPEC:CLM-003 — unlinking is what makes the claim survive."""
    prop = imported()
    user = advertiser()
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(
        reverse("property-claim"), {"property_ids": [prop.pk]}, format="json"
    )

    assert response.status_code == 200
    assert response.data["claimed"] == 1
    prop.refresh_from_db()
    assert prop.owner_id == user.pk
    assert prop.is_imported is False


def test_nobody_can_claim_a_listing_that_carries_another_number():
    """SPEC:CLM-003 — the request is answered, and it hands over nothing."""
    prop = imported(phone="0991112222")
    client = APIClient()
    client.force_authenticate(advertiser())

    response = client.post(
        reverse("property-claim"), {"property_ids": [prop.pk]}, format="json"
    )

    assert response.status_code == 200
    assert response.data["claimed"] == 0
    prop.refresh_from_db()
    assert prop.owner_id is None


def test_a_partly_stale_selection_still_claims_the_rest():
    """SPEC:CLM-003 — a race is not a reason to throw away the other claims."""
    mine = imported()
    taken = imported(title="Ya reclamada por otro")
    taken.owner = advertiser("otro", phone="593991112222")
    taken.save()
    client = APIClient()
    client.force_authenticate(advertiser())

    response = client.post(
        reverse("property-claim"), {"property_ids": [mine.pk, taken.pk]}, format="json"
    )

    assert response.data["claimed"] == 1
    mine.refresh_from_db()
    assert mine.owner is not None


def test_an_account_without_a_phone_cannot_claim():
    """SPEC:CLM-003 — refused at the door, with a reason."""
    user = get_user_model().objects.create_user(
        username="sin-telefono", email="sin@example.com", password="test-password"
    )
    prop = imported()
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(
        reverse("property-claim"), {"property_ids": [prop.pk]}, format="json"
    )

    assert response.status_code == 400
    prop.refresh_from_db()
    assert prop.owner_id is None


def test_an_anonymous_visitor_cannot_claim_anything():
    """SPEC:CLM-003 — the whole flow is behind a session."""
    prop = imported()

    assert APIClient().get(reverse("property-claimable")).status_code == 401
    assert APIClient().post(
        reverse("property-claim"), {"property_ids": [prop.pk]}, format="json"
    ).status_code == 401


# -- «Esta no es mía» -------------------------------------------------------

def test_a_dismissed_listing_leaves_the_list_for_that_account_only():
    """SPEC:CLM-004 — a personal dismissal, not a claim about the listing."""
    prop = imported()
    user = advertiser()
    other = advertiser("otro-con-mismo-numero")
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(
        reverse("property-dismiss-claim"), {"property_ids": [prop.pk]}, format="json"
    )

    assert response.status_code == 200
    assert response.data["dismissed"] == 1
    assert PropertyClaimService(user).claimable().count() == 0
    # Somebody else with the same number still sees it: nothing about the
    # listing changed, only what this one account wants shown.
    assert PropertyClaimService(other).claimable().count() == 1


def test_dismissing_the_same_listing_twice_is_not_an_error():
    """SPEC:CLM-004 — a double tap on a phone must not 500."""
    prop = imported()
    client = APIClient()
    client.force_authenticate(advertiser())
    url = reverse("property-dismiss-claim")

    client.post(url, {"property_ids": [prop.pk]}, format="json")
    second = client.post(url, {"property_ids": [prop.pk]}, format="json")

    assert second.status_code == 200
    assert ClaimDismissal.objects.count() == 1


def test_nobody_can_dismiss_a_listing_they_could_not_claim():
    """SPEC:CLM-004 — otherwise the table grows on anybody's request."""
    prop = imported(phone="0991112222")
    client = APIClient()
    client.force_authenticate(advertiser())

    response = client.post(
        reverse("property-dismiss-claim"), {"property_ids": [prop.pk]}, format="json"
    )

    assert response.data["dismissed"] == 0
    assert ClaimDismissal.objects.count() == 0


# -- What must survive the import -------------------------------------------

def test_reimporting_never_takes_a_claimed_listing_back():
    """SPEC:CLM-005 — the claim would otherwise undo itself, silently.

    The importer matches on (source, external_id) and sets is_imported=True on
    everything it touches. Without the guard, the next Plusvalía run would
    overwrite the owner's edits, re-flag the listing as imported, and hand it
    back to the retirement sweep that deletes whatever left the source.
    """
    from ingesta.pipeline.upsert import upsert_property

    fuente = Fuente.objects.create(
        slug="plusvalia", nombre="Plusvalia", base_url="https://www.plusvalia.com"
    )
    prop = imported(source=fuente, external_id="abc-123", title="Título original")
    user = advertiser()
    PropertyClaimService(user).claim([prop.pk])

    result, _ = upsert_property(
        {
            "external_id": "abc-123",
            "title": "TÍTULO PISADO POR EL IMPORTADOR",
            "price": 1,
            "latitude": -0.95,
            "longitude": -80.7,
            "contact_phone": PHONE,
        },
        fuente,
    )

    prop.refresh_from_db()
    assert result == "skipped_claimed"
    assert prop.title == "Título original"
    assert prop.owner_id == user.pk
    assert prop.is_imported is False


def test_retirement_does_not_delete_a_claimed_listing():
    """SPEC:CLM-005 — disappearing from Plusvalía must not take it with it.

    This is the failure that would cost the most and show the least: the
    advertiser claims their listing, the source portal drops it a week later,
    and the sweep deletes the row along with everything the owner had done to
    it. `is_imported=False` is what stands between the two.
    """
    from ingesta.pipeline.retirement import retire_listing, retire_property

    fuente = Fuente.objects.create(
        slug="plusvalia", nombre="Plusvalia", base_url="https://www.plusvalia.com"
    )
    claimed = imported(source=fuente, external_id="claimed-1")
    still_imported = imported(source=fuente, external_id="imported-1", title="Sin dueño")
    PropertyClaimService(advertiser()).claim([claimed.pk])
    claimed.refresh_from_db()

    # Both routes into the sweep: the one that starts from a row, and the one
    # that starts from an external id that vanished at the source.
    assert retire_property(claimed) is None
    retire_listing(fuente=fuente, external_id="claimed-1")
    retire_listing(fuente=fuente, external_id="imported-1")

    assert Property.objects.filter(pk=claimed.pk).exists()
    assert not Property.objects.filter(pk=still_imported.pk).exists()


def test_an_advertiser_who_already_publishes_here_stops_being_imported():
    """SPEC:CLM-006 — otherwise their own listing and ours become two rows."""
    from ingesta.pipeline.upsert import upsert_property

    fuente = Fuente.objects.create(
        slug="plusvalia", nombre="Plusvalia", base_url="https://www.plusvalia.com"
    )
    user = advertiser()
    Property.objects.create(
        title="Publicada por su dueño", status="for_sale", price=1000,
        latitude=-0.95, longitude=-80.7, owner=user,
    )

    result, prop = upsert_property(
        {
            "external_id": "nuevo-1",
            "title": "Traído de fuera",
            "price": 50000,
            "latitude": -0.95,
            "longitude": -80.7,
            "contact_phone": PHONE,
        },
        fuente,
    )

    assert result == "skipped_owner_publishes"
    assert prop is None


def test_someone_who_registered_but_never_claimed_still_gets_imported():
    """SPEC:CLM-006 — the cut is «already publishes», not «signed up».

    Skipping on registration alone would strand the rest of their inventory:
    an account that signed up and claimed nothing still needs its listings to
    exist here, or the portal loses them and so does the advertiser.
    """
    from ingesta.pipeline.upsert import upsert_property

    fuente = Fuente.objects.create(
        slug="plusvalia", nombre="Plusvalia", base_url="https://www.plusvalia.com"
    )
    advertiser()  # registered, owns nothing

    result, prop = upsert_property(
        {
            "external_id": "nuevo-2",
            "title": "Traído de fuera",
            "price": 50000,
            "latitude": -0.95,
            "longitude": -80.7,
            "contact_phone": PHONE,
        },
        fuente,
    )

    assert result in ("created", "updated")
    assert prop is not None


# -- Lo que no sale de aquí --------------------------------------------------

def test_the_public_payload_never_says_where_a_listing_came_from():
    """SPEC:CLM-007 — the JSON alone could reconstruct the whole arrangement."""
    prop = imported()
    client = APIClient()

    detail = client.get(f"/api/properties/{prop.pk}/").json()
    listing = client.get("/api/properties/", {"page_size": 1}).json()["results"]

    hidden = ("source", "source_agency", "source_url", "external_id",
              "is_imported", "imported_at", "last_seen_at", "image_hash")
    assert [field for field in hidden if field in detail] == []
    assert listing == [] or [f for f in hidden if f in listing[0]] == []


def test_staff_still_see_the_whole_row():
    """SPEC:CLM-007 — hidden from the public, not removed from the system."""
    prop = imported()
    staff = get_user_model().objects.create_user(
        username="staff", email="staff@example.com", password="x", is_staff=True
    )
    client = APIClient()
    client.force_authenticate(staff)

    detail = client.get(f"/api/properties/{prop.pk}/").json()

    assert detail["is_imported"] is True
    assert "source_url" in detail


def test_the_published_methodology_names_no_external_source():
    """SPEC:CLM-007 — it keeps saying what the figures cannot claim, and no more."""
    response = APIClient().get("/api/market-stats/")

    methodology = response.json()["methodology"].lower()
    assert "plusval" not in methodology
    assert "importad" not in methodology
    # What has to stay: these are asking prices, not closed sales.
    assert "precios pedidos" in methodology
