"""Turning an advertiser whose listings we imported into an account.

The portal carries fifteen thousand listings scraped from another site, and
every one of them names a phone. When somebody writes to one of those numbers
from here, WhatsApp opens with «vi este anuncio en Geo Propiedades» — so the
advertiser learns the portal exists and is already sending them people. This
module is the other half of that: when they arrive, it tells them exactly what
is theirs and lets them take it.

The claim is not a new ownership path. It ends in the same place a staff
transfer does, `is_imported = False` included, because a claimed listing that
stayed marked as imported would delete itself the day the source portal drops
it — taking its leads with it.
"""

import logging

from django.db import transaction
from django.db.models import Count, Q

from .phones import normalize_ec_phone

logger = logging.getLogger(__name__)

class PropertyClaimService:
    """What an account may claim, and the act of claiming it."""

    def __init__(self, user):
        self.user = user

    # -- Reading -----------------------------------------------------------

    def phone(self) -> str:
        return normalize_ec_phone(getattr(self.user, "phone", ""))

    def may_claim(self) -> bool:
        """Whether this account is allowed to claim at all right now."""
        return bool(self.phone() and self.user.phone_verified_at is not None)

    def claimable(self):
        """Imported listings whose advertiser phone is this account's.

        Only ones nobody owns yet: a listing already transferred to somebody —
        by staff or by an earlier claim — is not on offer, even if it still
        carries the same number.
        """
        from real_estate.models import Property

        phone = self.phone()
        if not phone:
            return Property.objects.none()
        return (
            Property.objects.filter(
                deleted_at__isnull=True,
                is_imported=True,
                owner__isnull=True,
                contact_phone_normalized=phone,
            )
            # What they already said is not theirs stays out. A number can end
            # up on listings that were never this person's — reassigned lines,
            # an agent who left, a typo at the source — and without a way to
            # say no those rows hide the ones worth claiming.
            .exclude(claim_dismissals__user=self.user)
            .order_by("-created_at")
        )

    def summary(self) -> dict:
        """Counts for the invitation: what is waiting, and why it is worth it.

        `contacts` is the argument that actually convinces: not «we have your
        listings» but «people wrote to you from here N times». It counts real
        people only — crawlers are excluded at capture — over every listing
        this account could claim.
        """
        from real_estate.models import ActivityEvent

        claimable = self.claimable()
        total = claimable.count()
        contacts = 0
        if total:
            contacts = ActivityEvent.objects.filter(
                is_bot=False,
                event_name="property_contact_clicked",
                property__in=claimable.values("id"),
            ).count()
        return {
            "phone": self.phone(),
            "may_claim": self.may_claim(),
            "phone_verified": self.user.phone_verified_at is not None,
            "claimable_count": total,
            "contacts_received": contacts,
        }

    # -- Writing -----------------------------------------------------------

    @transaction.atomic
    def claim(self, property_ids) -> list:
        """Hand over the listings among `property_ids` this account may take.

        Silently skips anything outside the claimable set rather than failing
        the whole request: the list comes from a page that may be a few seconds
        stale, and a listing claimed by somebody else in between is a normal
        race, not an error worth throwing away the other nine claims for.
        """
        if not self.may_claim():
            return []

        wanted = [int(pk) for pk in property_ids if str(pk).isdigit()]
        if not wanted:
            return []

        # Locked so two tabs cannot both claim the same listing.
        rows = list(self.claimable().filter(id__in=wanted).select_for_update())
        for prop in rows:
            prop.owner = self.user
            # Retirement selects by `is_imported` and deletes whatever stopped
            # appearing in the source portal. Unlinking is what makes the claim
            # survive the day that portal drops the listing.
            prop.is_imported = False
            prop.save(update_fields=["owner", "is_imported"])

        if rows:
            logger.info(
                "claim action=property.claim user=%s phone=%s properties=%s verified=%s",
                self.user.pk, self.phone(), [p.pk for p in rows],
                self.user.phone_verified_at is not None,
            )
        return rows


    @transaction.atomic
    def dismiss(self, property_ids) -> int:
        """Record «this one is not mine» for the given listings.

        Only over what this account could otherwise have claimed: dismissing a
        stranger's listing would be a write with no meaning, and letting it
        through would make the table grow on anybody's request.
        """
        from real_estate.models import ClaimDismissal

        wanted = [int(pk) for pk in property_ids if str(pk).isdigit()]
        if not wanted:
            return 0
        rows = list(self.claimable().filter(id__in=wanted).values_list("id", flat=True))
        if not rows:
            return 0
        ClaimDismissal.objects.bulk_create(
            [ClaimDismissal(user=self.user, property_id=pk) for pk in rows],
            ignore_conflicts=True,
        )
        return len(rows)

class AdvertiserReachService:
    """Which advertisers this portal has already sent people to.

    The list to call first, in the order worth calling: an advertiser whose
    listings received three contacts in two weeks has seen the portal's name
    three times, and the invitation writes itself. Ordered by contacts and not
    by inventory size on purpose — proof beats volume.
    """

    def top(self, since, limit: int = 50) -> list:
        from real_estate.models import ActivityEvent, Property

        reached = (
            ActivityEvent.objects.filter(
                is_bot=False,
                event_name="property_contact_clicked",
                created_at__gte=since,
                property__is_imported=True,
            )
            .exclude(property__contact_phone_normalized="")
            .values("property__contact_phone_normalized")
            .annotate(contacts=Count("id"), listings=Count("property_id", distinct=True))
            .order_by("-contacts", "-listings")[:limit]
        )

        phones = [row["property__contact_phone_normalized"] for row in reached]
        if not phones:
            return []

        # How much each of them has here in total, which is what the invitation
        # promises they can take over.
        inventory = {
            row["contact_phone_normalized"]: row["n"]
            for row in (
                Property.objects.filter(
                    deleted_at__isnull=True,
                    is_imported=True,
                    owner__isnull=True,
                    contact_phone_normalized__in=phones,
                )
                .values("contact_phone_normalized")
                .annotate(n=Count("id"))
            )
        }
        # Whether they already showed up on their own.
        from django.contrib.auth import get_user_model

        registered = set(
            get_user_model().objects.filter(phone__in=phones).values_list("phone", flat=True)
        )

        return [
            {
                "phone": row["property__contact_phone_normalized"],
                "contacts": row["contacts"],
                "listings_contacted": row["listings"],
                "listings_total": inventory.get(row["property__contact_phone_normalized"], 0),
                "has_account": row["property__contact_phone_normalized"] in registered,
            }
            for row in reached
        ]
