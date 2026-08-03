from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from real_estate.models import ActivityEvent, Property
from real_estate.services.admin_metrics import AdminMetricsService


pytestmark = pytest.mark.django_db


def _create_property(**kwargs):
    defaults = {"title": "Casa en Cumbayá", "city": "Quito", "status": "for_sale"}
    defaults.update(kwargs)
    return Property.objects.create(**defaults)


def _create_contact(property_obj, session_id="", user=None, method="phone_reveal"):
    return ActivityEvent.objects.create(
        property=property_obj,
        session_id=session_id,
        user=user,
        event_name="property_contact_clicked",
        payload={"method": method, "property_id": property_obj.id},
    )


def test_same_session_multiple_methods_counts_as_one_unique_contact():
    prop = _create_property()
    _create_contact(prop, session_id="session-1", method="phone_reveal")
    _create_contact(prop, session_id="session-1", method="whatsapp")
    _create_contact(prop, session_id="session-1", method="call")

    metrics = AdminMetricsService().build()

    assert metrics["contacts_total"] == 3
    assert metrics["contacts_unique"] == 1
    assert metrics["top_contacted_properties"] == [
        {"id": prop.id, "title": prop.title, "city": prop.city, "count": 1}
    ]


def test_different_sessions_count_separately():
    prop = _create_property()
    _create_contact(prop, session_id="session-1", method="phone_reveal")
    _create_contact(prop, session_id="session-2", method="phone_reveal")

    metrics = AdminMetricsService().build()

    assert metrics["contacts_total"] == 2
    assert metrics["contacts_unique"] == 2
    assert metrics["top_contacted_properties"][0]["count"] == 2


def test_dedup_falls_back_to_user_when_session_is_missing():
    user = get_user_model().objects.create_user(username="buyer", email="buyer@example.com", password="pw")
    prop = _create_property()
    _create_contact(prop, session_id="", user=user, method="phone_reveal")
    _create_contact(prop, session_id="", user=user, method="call")

    metrics = AdminMetricsService().build()

    assert metrics["contacts_total"] == 2
    assert metrics["contacts_unique"] == 1


def test_contact_rate_is_zero_when_there_are_no_detail_views():
    prop = _create_property()
    _create_contact(prop, session_id="session-1", method="phone_reveal")

    metrics = AdminMetricsService().build()

    # No property_card_details_opened / property_pin_clicked events exist,
    # so the rate must not raise a ZeroDivisionError and must default to 0.
    assert metrics["contact_rate"] == 0.0
    assert metrics["contacts_unique"] == 1


def test_contact_rate_divides_unique_contacts_by_detail_views():
    prop = _create_property()
    _create_contact(prop, session_id="session-1", method="phone_reveal")
    _create_contact(prop, session_id="session-2", method="whatsapp")
    ActivityEvent.objects.create(
        property=prop, session_id="session-3", event_name="property_card_details_opened", payload={}
    )
    ActivityEvent.objects.create(
        property=prop, session_id="session-4", event_name="property_pin_clicked", payload={}
    )

    metrics = AdminMetricsService().build()

    assert metrics["contacts_unique"] == 2
    assert metrics["contact_rate"] == 100.0


def test_contact_methods_breakdown_is_preserved():
    prop = _create_property()
    _create_contact(prop, session_id="session-1", method="phone_reveal")
    _create_contact(prop, session_id="session-2", method="whatsapp")

    metrics = AdminMetricsService().build()

    methods = {row["method"]: row["count"] for row in metrics["contact_methods"]}
    assert methods == {"phone_reveal": 1, "whatsapp": 1}


def test_contact_with_no_session_and_no_user_is_still_counted():
    # No session_id and no user: there is no person key at all. The event
    # must still fall back to a per-event key instead of being silently
    # dropped from contacts_unique.
    prop = _create_property()
    _create_contact(prop, session_id="", user=None, method="phone_reveal")

    metrics = AdminMetricsService().build()

    assert metrics["contacts_total"] == 1
    assert metrics["contacts_unique"] == 1


def test_contact_without_property_counts_as_unique_but_not_top_contacted():
    # property=None: the contact still represents a real person reaching out,
    # so it must count towards contacts_unique, but it has nothing to
    # attribute to top_contacted_properties.
    ActivityEvent.objects.create(
        property=None,
        session_id="session-1",
        event_name="property_contact_clicked",
        payload={"method": "phone_reveal"},
    )

    metrics = AdminMetricsService().build()

    assert metrics["contacts_total"] == 1
    assert metrics["contacts_unique"] == 1
    assert metrics["top_contacted_properties"] == []


def test_contact_older_than_30_days_is_excluded():
    prop = _create_property()
    old_event = _create_contact(prop, session_id="session-1", method="phone_reveal")
    ActivityEvent.objects.filter(id=old_event.id).update(
        created_at=timezone.now() - timedelta(days=31)
    )

    metrics = AdminMetricsService().build()

    assert metrics["contacts_total"] == 0
    assert metrics["contacts_unique"] == 0
    assert metrics["top_contacted_properties"] == []


def test_contact_rate_denominator_includes_property_page_views():
    # DETAIL_EVENTS only fire on the map page; the property detail page
    # (/propiedad/<id>) fires a page_view instead. Both must count towards
    # the contact_rate denominator so a contact made from the property page
    # doesn't inflate the rate past 100%.
    prop = _create_property()
    _create_contact(prop, session_id="session-1", method="phone_reveal")
    _create_contact(prop, session_id="session-2", method="whatsapp")
    ActivityEvent.objects.create(
        property=prop,
        session_id="session-1",
        event_name="page_view",
        path="/propiedad/1",
        payload={"page_type": "property"},
    )
    ActivityEvent.objects.create(
        property=prop,
        session_id="session-2",
        event_name="page_view",
        path="/propiedad/1",
        payload={"page_type": "property"},
    )

    metrics = AdminMetricsService().build()

    assert metrics["contacts_unique"] == 2
    assert metrics["contact_rate"] == 100.0
