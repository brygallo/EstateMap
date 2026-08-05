"""How many real visitors each social network brought back to a listing.

The promotion kit already tags every link and QR it hands out with
``utm_campaign=owner_kit`` and ``utm_source=<network>`` (SOC-008). The browser
stores that first touch and replays it inside ``ActivityEvent.payload`` under
``attribution``, so the data has been accumulating without anything reading it.
This module is the reading half: it groups those events by network for one
listing, and it is what turns the kit from a one-off screen into something
worth opening again.

Two things are load bearing here and neither is cosmetic:

* **Bots do not count.** A counter inflated by crawlers is worse than no
  counter, because it discredits every other number on the same screen. The
  exclusion reuses ``is_bot``, decided server-side from the User-Agent, exactly
  like the admin metrics do.
* **Zero is never reported bare.** "0 visitas" reads as a failure of the portal
  rather than as "nobody has shared this yet", so the payload carries a ``state``
  that lets the interface tell those two apart instead of printing a naked zero.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone as dt_timezone

from django.db.models import Count
from django.db.models.fields.json import KeyTextTransform
from django.utils import timezone

from ..models import ActivityEvent

# The campaign the kit stamps on every link and QR it produces. Anything else
# arriving with UTM parameters was not shared from the kit and is not this
# report's business.
KIT_CAMPAIGN = "owner_kit"

# The networks the kit builds links for. They are listed even when they brought
# nobody, so the breakdown reads as "Instagram brought 9, Facebook brought none"
# instead of quietly hiding the networks that did not work.
KIT_NETWORKS = ("facebook", "instagram", "tiktok", "whatsapp")

# Events that mean "the owner actually used the kit". They are what separates
# "nobody has shared this" from "it was shared and brought nobody" — a
# distinction the owner needs, because only one of the two is their problem.
KIT_SHARE_EVENTS = (
    "promotion_kit_shared",
    "promotion_kit_downloaded",
    "promotion_kit_copied",
)

# How far back the report looks. Long enough that a listing shared once a month
# still shows something, short enough that the number describes the campaign
# running now rather than the whole life of the listing.
DEFAULT_WINDOW_DAYS = 90

# ``is_bot`` is filled from the User-Agent, and that only started on this date.
# Every row written before it carries the field default, ``False``, with no
# User-Agent left to re-evaluate: about 78% of those sessions were crawlers. So
# the window never reaches further back than this, because "real visitors"
# would be a lie about anything older.
BOT_FLAGGING_SINCE = datetime(2026, 8, 3, tzinfo=dt_timezone.utc)

# Reported as the network of an event whose attribution has a campaign but no
# source. The kit always writes both, so this only shows up for hand-edited
# links.
UNKNOWN_SOURCE = "unknown"

STATE_NOT_SHARED = "not_shared"
STATE_SHARED_WITHOUT_VISITORS = "shared_without_visitors"
STATE_HAS_VISITORS = "has_visitors"


def window_start(window_days: int = DEFAULT_WINDOW_DAYS, now=None):
    """First instant the report is allowed to describe."""
    now = now or timezone.now()
    return max(now - timedelta(days=window_days), BOT_FLAGGING_SINCE)


def promotion_stats(property_id: int, window_days: int = DEFAULT_WINDOW_DAYS, now=None) -> dict:
    """Per-network visitor counts for one listing, crawlers excluded.

    A "visitor" is a distinct ``session_id``, not a raw event: the browser keeps
    one session id and replays it with every beacon, so counting rows would turn
    a single person clicking around into a dozen visits. ``events`` is kept
    alongside it because engagement per visitor is the interesting part.
    """
    now = now or timezone.now()
    since = window_start(window_days, now=now)

    # `property` and `is_bot` come first on purpose: they hit
    # activity_prop_human_idx and leave the JSON test with almost nothing to
    # walk. Ordering must be cleared or the model's `-created_at` default joins
    # the GROUP BY and every row becomes its own group.
    kit_events = (
        ActivityEvent.objects.filter(
            property_id=property_id,
            is_bot=False,
            created_at__gte=since,
        )
        .filter(payload__attribution__campaign=KIT_CAMPAIGN)
        .annotate(
            network=KeyTextTransform("source", KeyTextTransform("attribution", "payload"))
        )
        .values("network")
        .annotate(
            visitors=Count("session_id", distinct=True),
            events=Count("id"),
        )
        .order_by()
    )

    counts: dict[str, dict[str, int]] = {}
    for row in kit_events:
        network = row["network"] or UNKNOWN_SOURCE
        bucket = counts.setdefault(network, {"visitors": 0, "events": 0})
        bucket["visitors"] += row["visitors"]
        bucket["events"] += row["events"]

    shares = ActivityEvent.objects.filter(
        property_id=property_id,
        is_bot=False,
        created_at__gte=since,
        event_name__in=KIT_SHARE_EVENTS,
    ).count()

    networks = [
        {
            "source": source,
            "visitors": counts.get(source, {}).get("visitors", 0),
            "events": counts.get(source, {}).get("events", 0),
        }
        for source in list(KIT_NETWORKS) + sorted(set(counts) - set(KIT_NETWORKS))
    ]
    # Best first, and a stable order among ties so the list does not reshuffle
    # between two reads that say the same thing.
    order = {source: index for index, source in enumerate(KIT_NETWORKS)}
    networks.sort(key=lambda row: (-row["visitors"], order.get(row["source"], len(order)), row["source"]))

    total_visitors = sum(row["visitors"] for row in networks)
    total_events = sum(row["events"] for row in networks)

    if total_visitors:
        state = STATE_HAS_VISITORS
    elif shares or total_events:
        state = STATE_SHARED_WITHOUT_VISITORS
    else:
        state = STATE_NOT_SHARED

    return {
        "property_id": property_id,
        "state": state,
        "window_days": window_days,
        "since": since,
        "measured_since": BOT_FLAGGING_SINCE,
        "total_visitors": total_visitors,
        "total_events": total_events,
        "shares": shares,
        "networks": networks,
    }
