from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate

from ingesta.models import Fuente, IngestaRun, ListingRetirada
from real_estate.models import ActivityEvent, Lead, PendingPublication, Property, PropertyImage


DETAIL_EVENTS = ["property_card_details_opened", "property_pin_clicked"]
DISCOVERY_EVENTS = DETAIL_EVENTS + ["map_filter_changed", "map_city_group_clicked"]
PUBLISH_INTENT_EVENTS = ["publish_cta_clicked", "publication_form_started", "publication_form_viewed"]


def _change(current, previous):
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def _audience(queryset):
    sessions = queryset.exclude(session_id="").values("session_id").distinct().count()
    users_without_session = (
        queryset.filter(session_id="", user__isnull=False).values("user_id").distinct().count()
    )
    return sessions + users_without_session


def _daily_counts(queryset, date_field, since):
    return {
        row["day"]: row["count"]
        for row in (
            queryset.filter(**{f"{date_field}__gte": since})
            .annotate(day=TruncDate(date_field))
            .values("day")
            .annotate(count=Count("id"))
        )
    }


class AdminMetricsService:
    """Build decision-oriented metrics for the project owner dashboard."""

    def __init__(self, now=None):
        self.now = now

    def build(self):
        return _build_owner_metrics(now=self.now)


def _build_owner_metrics(now=None):
    from django.utils import timezone

    now = now or timezone.now()
    current_start = now - timedelta(days=7)
    previous_start = now - timedelta(days=14)
    month_start = now - timedelta(days=30)
    trend_since = now - timedelta(days=13)
    trend_start = trend_since.date()

    # Human traffic only: crawler events are stored with is_bot=True and stay out
    # of every metric the owner reads as "people". Bot volume is reported apart.
    human_events = ActivityEvent.objects.filter(is_bot=False)
    current_events = human_events.filter(created_at__gte=current_start)
    previous_events = human_events.filter(
        created_at__gte=previous_start, created_at__lt=current_start
    )
    current_users = get_user_model().objects.filter(date_joined__gte=current_start).count()
    previous_users = get_user_model().objects.filter(
        date_joined__gte=previous_start, date_joined__lt=current_start
    ).count()
    current_contacts = current_events.filter(event_name="property_contact_clicked").count()
    previous_contacts = previous_events.filter(event_name="property_contact_clicked").count()
    current_details = current_events.filter(event_name__in=DETAIL_EVENTS).count()
    previous_details = previous_events.filter(event_name__in=DETAIL_EVENTS).count()
    current_publications = human_events.filter(
        created_at__gte=current_start, event_name="publication_created"
    ).count()
    previous_publications = human_events.filter(
        created_at__gte=previous_start,
        created_at__lt=current_start,
        event_name="publication_created",
    ).count()

    period = {
        "sessions": {"value": _audience(current_events), "change": _change(_audience(current_events), _audience(previous_events))},
        "new_users": {"value": current_users, "change": _change(current_users, previous_users)},
        "details": {"value": current_details, "change": _change(current_details, previous_details)},
        "contacts": {"value": current_contacts, "change": _change(current_contacts, previous_contacts)},
        "publications": {"value": current_publications, "change": _change(current_publications, previous_publications)},
    }

    month_events = human_events.filter(created_at__gte=month_start)
    month_bot_events = ActivityEvent.objects.filter(created_at__gte=month_start, is_bot=True)
    contact_events_month = month_events.filter(event_name="property_contact_clicked")
    contact_methods = [
        {
            "method": row["payload__method"] or "unknown",
            "count": row["count"],
        }
        for row in (
            contact_events_month
            .values("payload__method")
            .annotate(count=Count("id"))
            .order_by("-count", "payload__method")
        )
    ]

    contacts_total = contact_events_month.count()
    # Dedup by (session_id or user, property): a person who reveals the phone,
    # opens WhatsApp and then calls is still a single interested contact.
    seen_contacts = set()
    property_unique_contacts = {}
    for event in contact_events_month.values("id", "session_id", "user_id", "property_id"):
        # Person key: session, then user, then (as a last resort) the event
        # itself. An event with neither session_id nor user still represents
        # a real contact — falling back to a per-event key keeps it counted
        # in contacts_unique instead of silently dropping it, at the cost of
        # never being deduped against another event from the same person.
        person = (
            event["session_id"]
            or (f"user:{event['user_id']}" if event["user_id"] else "")
            or f"event:{event['id']}"
        )
        # Property-less contacts still count towards contacts_unique (someone
        # did contact), but they can't contribute to top_contacted_properties,
        # so give each one its own key (never dedupe them against each other)
        # instead of dropping them entirely.
        property_key = event["property_id"] if event["property_id"] else f"noprop:{event['id']}"
        key = (person, property_key)
        if key in seen_contacts:
            continue
        seen_contacts.add(key)
        if event["property_id"]:
            property_unique_contacts[event["property_id"]] = (
                property_unique_contacts.get(event["property_id"], 0) + 1
            )
    contacts_unique = len(seen_contacts)
    # Denominator for contact_rate: unique audience over BOTH map-page detail
    # events (DETAIL_EVENTS only fire there) and property-page views, so a
    # contact made from /propiedad/<id> (which never fires a DETAIL_EVENTS
    # event) still has a matching detail view in the denominator instead of
    # inflating the rate above 100%. Property-page views are identified by
    # payload.page_type == "property", which is what AnalyticsPageView emits
    # for /propiedad/<id> — not by path, which is brittle to route changes.
    month_detail_or_property_view = month_events.filter(
        Q(event_name__in=DETAIL_EVENTS)
        | Q(event_name="page_view", payload__page_type="property")
    )
    detail_audience = _audience(month_detail_or_property_view)
    contact_rate = (
        round((contacts_unique / detail_audience) * 100, 1) if detail_audience else 0.0
    )

    top_contacted_ids = sorted(
        property_unique_contacts, key=lambda pid: property_unique_contacts[pid], reverse=True
    )[:10]
    top_contacted_lookup = {
        row["id"]: row
        for row in Property.objects.filter(id__in=top_contacted_ids).values("id", "title", "city")
    }
    top_contacted_properties = [
        {
            "id": pid,
            "title": top_contacted_lookup[pid]["title"],
            "city": top_contacted_lookup[pid]["city"],
            "count": property_unique_contacts[pid],
        }
        for pid in top_contacted_ids
        if pid in top_contacted_lookup
    ]
    # Atribución first-touch capturada por el cliente. Se agrupa por sesión para
    # no inflar visitas cuando una misma persona genera varios eventos.
    acquisition = {}
    seen_sessions = set()
    for event in month_events.order_by("created_at").values(
        "session_id", "event_name", "payload"
    ):
        payload = event["payload"] if isinstance(event["payload"], dict) else {}
        attribution = payload.get("attribution") if isinstance(payload.get("attribution"), dict) else {}
        source = str(attribution.get("source") or "unknown")[:100]
        channel = str(attribution.get("channel") or "unknown")[:50]
        key = (source, channel)
        row = acquisition.setdefault(key, {"source": source, "channel": channel, "sessions": 0, "contacts": 0})
        session = event["session_id"] or f"event:{source}:{event['event_name']}"
        session_key = (key, session)
        if session_key not in seen_sessions:
            seen_sessions.add(session_key)
            row["sessions"] += 1
        if event["event_name"] == "property_contact_clicked":
            row["contacts"] += 1
    acquisition_channels = sorted(acquisition.values(), key=lambda row: (-row["sessions"], row["source"]))
    for row in acquisition_channels:
        row["conversion"] = round(row["contacts"] / row["sessions"] * 100, 1) if row["sessions"] else 0
    funnel_stages = [
        ("Sesiones activas", month_events),
        ("Exploraron propiedades", month_events.filter(event_name__in=DISCOVERY_EVENTS)),
        ("Abrieron detalles", month_events.filter(event_name__in=DETAIL_EVENTS)),
        ("Contactaron", month_events.filter(event_name="property_contact_clicked")),
        ("Intentaron publicar", month_events.filter(event_name__in=PUBLISH_INTENT_EVENTS)),
        ("Publicaron", month_events.filter(event_name="publication_created")),
    ]
    funnel = []
    base_count = _audience(funnel_stages[0][1])
    for label, queryset in funnel_stages:
        value = _audience(queryset)
        funnel.append({
            "label": label,
            "value": value,
            "rate": round((value / base_count) * 100, 1) if base_count else 0,
        })

    event_days = _daily_counts(human_events, "created_at", trend_since)
    user_days = _daily_counts(get_user_model().objects.all(), "date_joined", trend_since)
    property_days = _daily_counts(Property.objects.all(), "created_at", trend_since)
    lead_days = _daily_counts(Lead.objects.all(), "created_at", trend_since)
    trends = []
    for offset in range(14):
        day = trend_start + timedelta(days=offset)
        trends.append({
            "date": day.isoformat(),
            "events": event_days.get(day, 0),
            "users": user_days.get(day, 0),
            "properties": property_days.get(day, 0),
            "leads": lead_days.get(day, 0),
        })

    top_properties = list(
        Property.objects.annotate(
            detail_events=Count(
                "activity_events",
                filter=Q(
                    activity_events__created_at__gte=month_start,
                    activity_events__event_name__in=DETAIL_EVENTS,
                    activity_events__is_bot=False,
                ),
            ),
            contact_events=Count(
                "activity_events",
                filter=Q(
                    activity_events__created_at__gte=month_start,
                    activity_events__event_name="property_contact_clicked",
                    activity_events__is_bot=False,
                ),
            ),
        )
        .filter(Q(detail_events__gt=0) | Q(contact_events__gt=0))
        .order_by("-contact_events", "-detail_events")
        .values("id", "title", "city", "source__slug", "detail_events", "contact_events")[:8]
    )

    source_performance = []
    for source in Fuente.objects.all():
        source_properties = Property.objects.filter(source=source, is_imported=True)
        source_events = human_events.filter(
            created_at__gte=month_start, property__source=source
        )
        details = source_events.filter(event_name__in=DETAIL_EVENTS).count()
        contacts = source_events.filter(event_name="property_contact_clicked").count()
        source_performance.append({
            "slug": source.slug,
            "name": source.nombre,
            "active": source_properties.exclude(status="inactive").filter(is_duplicate=False).count(),
            "retired": source.retiradas.count(),
            "details_30d": details,
            "contacts_30d": contacts,
            "conversion": round((contacts / details) * 100, 1) if details else 0,
            "last_import_at": source.last_import_at,
        })
    source_performance.sort(key=lambda item: (item["contacts_30d"], item["details_30d"]), reverse=True)

    active_users_30d = _audience(month_events)
    bot_events_30d = month_bot_events.count()
    bot_sessions_30d = _audience(month_bot_events)
    recurring_sessions = (
        month_events.exclude(session_id="")
        .annotate(day=TruncDate("created_at"))
        .values("session_id")
        .annotate(active_days=Count("day", distinct=True))
        .filter(active_days__gte=2)
        .count()
    )
    high_intent_users = (
        month_events.filter(
            user__isnull=False,
            event_name__in=["property_contact_clicked", "publication_created", "publication_form_started"],
        )
        .values("user_id")
        .distinct()
        .count()
    )

    stale_properties = Property.objects.exclude(status="inactive").filter(
        last_seen_at__isnull=False, last_seen_at__lt=now - timedelta(days=30)
    ).count()
    pending_old = PendingPublication.objects.filter(
        status="new", created_at__lt=now - timedelta(days=2)
    ).count()
    failed_runs = IngestaRun.objects.filter(
        estado="error", created_at__gte=now - timedelta(days=1)
    ).count()
    alerts = []
    if failed_runs:
        alerts.append({"severity": "critical", "title": "Ingestas con error", "value": failed_runs, "href": "/admin/ingesta"})
    if pending_old:
        alerts.append({"severity": "warning", "title": "Solicitudes sin atender por más de 48 h", "value": pending_old, "href": "/admin/pending-publications"})
    if stale_properties:
        alerts.append({"severity": "warning", "title": "Propiedades sin verificar en 30 días", "value": stale_properties, "href": "/admin/ingesta"})
    if not alerts:
        alerts.append({"severity": "ok", "title": "No hay alertas críticas pendientes", "value": 0, "href": "/admin"})

    best_source = source_performance[0]["name"] if source_performance else "Sin datos"
    weekly_summary = [
        f"{period['sessions']['value']} sesiones con actividad en los últimos 7 días ({period['sessions']['change']:+g}%).",
        f"{period['contacts']['value']} contactos generados ({period['contacts']['change']:+g}% frente al periodo anterior).",
        f"{period['publications']['value']} publicaciones completadas en la semana.",
        f"La fuente con mayor intención registrada es {best_source}.",
        f"Hay {len([alert for alert in alerts if alert['severity'] != 'ok'])} alertas que requieren revisión.",
    ]

    storage_bytes = PropertyImage.objects.aggregate(total=Sum("file_size"))["total"] or 0
    return {
        "period": period,
        "funnel": funnel,
        "trends": trends,
        "top_properties": top_properties,
        "source_performance": source_performance,
        "acquisition_channels": acquisition_channels[:20],
        "contact_methods": contact_methods,
        "contacts_total": contacts_total,
        "contacts_unique": contacts_unique,
        "contact_rate": contact_rate,
        "top_contacted_properties": top_contacted_properties,
        "audience": {
            "active_30d": active_users_30d,
            "recurring_30d": recurring_sessions,
            "high_intent_users_30d": high_intent_users,
            # Additive keys: how much traffic was discarded as non-human, so the
            # panel can show the bot share without polluting the human numbers.
            "bot_events_30d": bot_events_30d,
            "bot_sessions_30d": bot_sessions_30d,
        },
        "alerts": alerts,
        "weekly_summary": weekly_summary,
        "technical": {
            "database": "online",
            "storage_bytes": storage_bytes,
            "release": getattr(settings, "RELEASE_SHA", "development"),
            "environment": getattr(settings, "ENVIRONMENT", "development"),
            "failed_runs_24h": failed_runs,
            "removed_listings": ListingRetirada.objects.count(),
        },
    }
