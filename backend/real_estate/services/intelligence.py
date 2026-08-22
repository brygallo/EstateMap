"""What a listing is worth compared to the ones beside it.

This is the only block on a ficha that is not the advertiser's. Everything else
— photos, description, specs — is published elsewhere too, so a search engine
choosing between two copies of the same listing has no reason to prefer this
one. The analysis is computed here, from the whole active catalogue, and it is
what makes the page worth ranking and worth reading.

Three things it must never do, because each of them turns the block from an
argument into a claim nobody can check:

- **Compare against a universe it does not name.** The zone range is built from
  listings in the same named zone when there are enough of them, and from the
  city when there are not — and the payload says which of the two it used. The
  supply figure counts that same universe, not a different one.
- **Report an interest it cannot measure.** Demand comes from the human
  arrivals recorded in the last thirty days, not from a lifetime counter: the
  ficha is served from cache now, so a lifetime counter measures renders. The
  raw numbers stay private (VIS-001); only the level travels.
- **Hide how sure it is.** A range built from four listings and one built from
  eighty are not the same statement, so the sample and a confidence level ship
  with every figure.

Prices are asking prices, never closed operations. That is stated in the
payload and repeated on the page.
"""

from __future__ import annotations

from datetime import timedelta
from math import asin, cos, radians, sin, sqrt

from django.db.models import Count, F, FloatField
from django.db.models.expressions import ExpressionWrapper
from django.db.models.functions import Abs
from django.utils import timezone

from real_estate.models import ActivityEvent, Property

# Below this a named zone is not a market, it is a handful of listings, and the
# comparison falls back to the city. Same threshold a zone page needs to exist
# (SEO-001 / SEC-002), so the ficha never claims a zone the site would not
# publish.
MIN_SCOPE_SAMPLE = 5

# How many comparables the page shows. Enough to be checkable, few enough that
# the section stays readable on a phone.
COMPARABLES_SHOWN = 5

# The window human interest is measured over. Long enough to survive a quiet
# week, short enough that it describes the listing as it is now.
DEMAND_WINDOW_DAYS = 30

# A price per m² outside this band is a data error, not a market signal.
MIN_PRICE_PER_M2 = 1
MAX_PRICE_PER_M2 = 10_000

EARTH_RADIUS_KM = 6371


def _distance_km(lat_a, lng_a, lat_b, lng_b):
    """Great-circle distance, or None when either end has no coordinates."""
    if None in (lat_a, lng_a, lat_b, lng_b):
        return None
    lat1, lng1, lat2, lng2 = (radians(float(v)) for v in (lat_a, lng_a, lat_b, lng_b))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lng2 - lng1) / 2) ** 2
    return round(2 * EARTH_RADIUS_KM * asin(sqrt(h)), 2)


def _percentile(ordered_values, ratio):
    """Linear-interpolated percentile over an already sorted list."""
    if not ordered_values:
        return None
    position = (len(ordered_values) - 1) * ratio
    low, high = int(position), min(int(position) + 1, len(ordered_values) - 1)
    span = ordered_values[high] - ordered_values[low]
    return round(ordered_values[low] + span * (position - low), 2)


class PropertyIntelligenceService:
    """Builds the analysis payload for one listing."""

    def __init__(self, prop: Property, *, viewer=None, now=None):
        self.prop = prop
        self.viewer = viewer
        self.now = now or timezone.now()
        self._scope = None

    # -- The universe every figure is measured against -------------------

    def _active(self):
        return Property.objects.exclude(status="inactive").filter(is_duplicate=False)

    def _same_offer(self, queryset):
        """Same kind of property and same operation. A house for sale is not
        comparable to a house for rent, whatever the zone says."""
        return queryset.filter(
            property_type=self.prop.property_type, status=self.prop.status
        )

    def _in_scope(self, queryset, scope):
        if scope == "sector":
            return queryset.filter(sector_key=self.prop.sector_key)
        return queryset.filter(city__iexact=self.prop.city)

    def resolve_scope(self):
        """The finest geography with enough inventory to say anything.

        A named zone if the listing has one and it holds enough comparable
        listings; the city otherwise. Whichever wins is named in the payload,
        because «la zona» meaning the whole city is how a comparison stops
        being true without anybody noticing.
        """
        if self._scope:
            return self._scope
        if self.prop.sector_key:
            in_sector = self._same_offer(self._in_scope(self._active(), "sector")).exclude(
                pk=self.prop.pk
            )
            if in_sector.count() >= MIN_SCOPE_SAMPLE:
                self._scope = ("sector", self.prop.sector_label or self.prop.city or "la zona")
                return self._scope
        self._scope = ("city", self.prop.city or "el mercado")
        return self._scope

    def comparable_queryset(self):
        scope, _ = self.resolve_scope()
        return (
            self._same_offer(self._in_scope(self._active(), scope))
            .exclude(pk=self.prop.pk)
            .filter(price__gt=0, area__gt=0)
        )

    # -- Price ------------------------------------------------------------

    def _own_price_per_m2(self):
        if self.prop.price and self.prop.area and self.prop.area > 0:
            return round(float(self.prop.price) / float(self.prop.area), 2)
        return None

    def _price_values(self, queryset):
        annotated = queryset.annotate(
            price_per_m2=ExpressionWrapper(F("price") / F("area"), output_field=FloatField())
        ).filter(price_per_m2__gt=MIN_PRICE_PER_M2, price_per_m2__lt=MAX_PRICE_PER_M2)
        return sorted(float(v) for v in annotated.values_list("price_per_m2", flat=True))

    @staticmethod
    def confidence_for(sample_size):
        """How much weight the reader should put on the range.

        Named rather than left to the reader's arithmetic: «12 comparables» is
        a number, «confianza media» is what to do with it.
        """
        if sample_size >= 20:
            return "high"
        if sample_size >= 8:
            return "medium"
        if sample_size >= 4:
            return "low"
        return "insufficient"

    # -- Demand -----------------------------------------------------------

    def _demand(self):
        """Human arrivals in the window, positioned against the same universe.

        Counting distinct sessions rather than events: someone who reloads the
        page four times is one interested person, and a listing that happens to
        be reloaded is not in more demand than one that is not.
        """
        since = self.now - timedelta(days=DEMAND_WINDOW_DAYS)
        own = (
            ActivityEvent.objects.filter(property=self.prop, is_bot=False, created_at__gte=since)
            .values("session_id")
            .distinct()
            .count()
        )

        scope_listings = self.comparable_queryset()
        scope_total = scope_listings.count()
        rows = (
            ActivityEvent.objects.filter(
                property__in=scope_listings, is_bot=False, created_at__gte=since
            )
            .values("property")
            .annotate(people=Count("session_id", distinct=True))
        )
        counted = [row["people"] for row in rows]
        # Every listing in the universe takes part, including the ones nobody
        # opened. Leaving the zeros out would compare this listing only against
        # the ones that already worked, and almost everything would read «high».
        distribution = sorted(counted + [0] * max(0, scope_total - len(counted)))
        p25 = _percentile(distribution, 0.25) or 0
        p75 = _percentile(distribution, 0.75) or 0

        if not distribution:
            level = "medium"
        elif own >= max(p75, 1) and own >= 3:
            level = "high"
        elif own <= p25:
            level = "low"
        else:
            level = "medium"

        demand = {
            "level": level,
            "window_days": DEMAND_WINDOW_DAYS,
            "basis": "human_sessions",
        }
        # The counters themselves are the owner's business (VIS-001): what a
        # listing moves tells a competitor what to copy and a visitor what
        # nobody wants.
        viewer = self.viewer
        if viewer is not None and viewer.is_authenticated and (
            viewer.is_staff or self.prop.owner_id == viewer.id
        ):
            demand.update(
                {
                    "sessions": own,
                    "scope_median": _percentile(distribution, 0.5) or 0,
                    "contacts": ActivityEvent.objects.filter(
                        property=self.prop,
                        event_name="property_contact_clicked",
                        is_bot=False,
                        created_at__gte=since,
                    ).count(),
                }
            )
        return demand

    # -- The comparables the reader can open -------------------------------

    def _comparables(self, own_price_per_m2):
        """The listings the range is built from, closest in size first.

        Shown rather than merely counted for two reasons. A reader can check
        the claim instead of trusting it, and every card is an internal link:
        the crawler that reached this ficha reaches five more from here, which
        is the only way a catalogue this size gets visited at all.
        """
        own_area = float(self.prop.area) if self.prop.area else None
        candidates = self.comparable_queryset().prefetch_related("images")
        if own_area:
            # Closest in size, resolved in SQL so the ordering does not depend
            # on pulling the whole city into memory.
            candidates = candidates.annotate(
                area_gap=Abs(
                    ExpressionWrapper(F("area") - own_area, output_field=FloatField())
                )
            ).order_by("area_gap")
        else:
            candidates = candidates.order_by("-updated_at")

        shown = []
        for other in candidates[: COMPARABLES_SHOWN * 3]:
            if len(shown) >= COMPARABLES_SHOWN:
                break
            price_per_m2 = (
                round(float(other.price) / float(other.area), 2)
                if other.price and other.area
                else None
            )
            if price_per_m2 is None or not (
                MIN_PRICE_PER_M2 < price_per_m2 < MAX_PRICE_PER_M2
            ):
                continue
            image = next(
                (img for img in other.images.all() if img.is_main),
                next(iter(other.images.all()), None),
            )
            shown.append(
                {
                    "id": other.pk,
                    "title": other.title,
                    "price": other.price,
                    "area": other.area,
                    "rooms": other.rooms,
                    "bathrooms": other.bathrooms,
                    "price_per_m2": price_per_m2,
                    "difference_pct": (
                        round((own_price_per_m2 - price_per_m2) / price_per_m2 * 100, 1)
                        if own_price_per_m2 and price_per_m2
                        else None
                    ),
                    "distance_km": _distance_km(
                        self.prop.latitude, self.prop.longitude, other.latitude, other.longitude
                    ),
                    "image": image.image.url if image and image.image else None,
                }
            )
        return shown

    # -- How complete the listing itself is --------------------------------

    def _listing_quality(self):
        """What the ficha does and does not declare.

        A neutral inventory of the information, never a judgement of the
        property: «sin planos» is a fact about the advertisement, «mala casa»
        would be an opinion the portal has no business having.
        """
        photos = self.prop.images.count()
        missing = []
        if not photos:
            missing.append("fotografías")
        if not self.prop.area:
            missing.append("superficie")
        if not (self.prop.latitude and self.prop.longitude) and not self.prop.polygon:
            missing.append("ubicación en el mapa")
        if not (self.prop.description or "").strip():
            missing.append("descripción")
        return {
            "photos": photos,
            "has_location": bool(
                (self.prop.latitude and self.prop.longitude) or self.prop.polygon
            ),
            "updated_at": self.prop.updated_at,
            "missing": missing,
        }

    # -- The payload -------------------------------------------------------

    def build(self):
        scope, scope_label = self.resolve_scope()
        comparables_qs = self.comparable_queryset()
        values = self._price_values(comparables_qs)
        q1, median, q3 = (
            _percentile(values, 0.25),
            _percentile(values, 0.5),
            _percentile(values, 0.75),
        )
        own_price_m2 = self._own_price_per_m2()
        deviation = (
            round((own_price_m2 - median) / median * 100, 1) if own_price_m2 and median else None
        )

        alert = None
        if deviation is not None and len(values) >= 4 and q1 is not None and q3 is not None:
            spread = q3 - q1
            if own_price_m2 < q1 - 1.5 * spread:
                alert = "below_range"
            elif own_price_m2 > q3 + 1.5 * spread:
                alert = "above_range"

        # What the same square metres would cost at the median of the universe,
        # and the gap in money. A percentage is an abstraction; a number of
        # dollars is the thing being decided.
        area = float(self.prop.area) if self.prop.area else None
        estimated = round(median * area, 2) if median and area else None
        difference_amount = (
            round(float(self.prop.price) - estimated, 2)
            if estimated is not None and self.prop.price
            else None
        )

        history = list(self.prop.price_history.values("price", "recorded_at"))
        if not history and self.prop.price is not None:
            history = [{"price": self.prop.price, "recorded_at": self.prop.created_at}]

        publication_start = (
            self.prop.source_published_at or self.prop.imported_at or self.prop.created_at
        )
        publication_basis = (
            "source"
            if self.prop.source_published_at
            else ("detected" if self.prop.is_imported else "platform")
        )

        return {
            "property_id": self.prop.pk,
            "price_per_m2": own_price_m2,
            # `zone` stays for the surfaces that already read it; `scope` says
            # what it actually is, which is what stops «la zona» from quietly
            # meaning the whole city.
            "zone": scope_label,
            "scope": scope,
            "scope_label": scope_label,
            "zone_range": {"low": q1, "median": median, "high": q3},
            "comparison": {
                "sample_size": len(values),
                "difference_pct": deviation,
                "confidence": self.confidence_for(len(values)),
            },
            "estimated_price": estimated,
            "difference_amount": difference_amount,
            "price_alert": alert,
            "price_history": history,
            "comparables": self._comparables(own_price_m2),
            # The same universe the range came from. It used to be a different
            # one — a text match on the address, mixing types and operations —
            # so the two numbers described different markets.
            "available_supply": comparables_qs.count(),
            "listing_quality": self._listing_quality(),
            "published_days": max(0, (self.now - publication_start).days),
            "publication_basis": publication_basis,
            "source_published_at": self.prop.source_published_at,
            "source_updated_at": self.prop.source_updated_at,
            "detected_at": self.prop.imported_at or self.prop.created_at,
            "last_seen_at": self.prop.last_seen_at,
            "demand": self._demand(),
            "methodology": (
                "Comparables activos del mismo tipo y operación en {scope}; "
                "rango habitual P25–P75 y alerta atípica mediante IQR. "
                "Son precios pedidos por quien anuncia, no operaciones cerradas."
            ).format(scope=scope_label),
        }
