"""
Which campaigns a slot may serve, and in what order.

If nobody paid, a house brand takes the space; if there is no house brand, an
explicit promo campaign may offer it for sale. With no active campaign of any
kind, the placement stays empty (ADS-016).

The three kinds are served strictly in order and never mixed: showing a paid
campaign next to a "this space is available" sign would be telling the customer
their money bought half a slot.
"""

from .models import Campaign
from .placements import MAX_PER_PLACEMENT

# The order is the point of the module.
PRIORITY = [Campaign.Kind.PAID, Campaign.Kind.PARTNER, Campaign.Kind.PROMO]


def campaigns_for(placement, city=None, province=None, limit=MAX_PER_PLACEMENT):
    """The creatives a slot should hand out, best class first.

    Returns the highest-priority non-empty group rather than a merge of all
    three, which is what keeps a paid campaign from ever sharing a placement
    with a house ad.
    """
    live = Campaign.objects.live(placement=placement, city=city, province=province)
    by_kind = {}
    for campaign in live:
        by_kind.setdefault(campaign.kind, []).append(campaign)

    for kind in PRIORITY:
        group = by_kind.get(kind)
        if group:
            # The closest audience wins inside the same commercial class:
            # city, then province, then the national fallback.
            specificity = lambda item: 2 if item.target_cities else (1 if item.target_provinces else 0)
            best = max(specificity(item) for item in group)
            group = [item for item in group if specificity(item) == best]
            # Heaviest first, so the truncation below drops the campaigns whose
            # owner asked for the smallest share — and `overbooked_placements`
            # tells the panel when that is happening at all (ADS-019).
            group.sort(key=lambda item: (-item.weight, -item.pk))
            return group[:limit]

    return []
