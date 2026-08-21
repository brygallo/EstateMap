"""The panel's analysis controls: a selectable window and a date-ranged log."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from real_estate.models import ActivityEvent
from real_estate.services.admin_metrics import DEFAULT_WINDOW_DAYS, resolve_window


pytestmark = pytest.mark.django_db


def staff_client():
    user = get_user_model().objects.create_user(
        username="analyst",
        email="analyst@example.com",
        password="test-password",
        is_staff=True,
    )
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_dashboard_declares_the_window_it_was_asked_for():
    """SPEC:ADM-015 — the chosen period travels back with the figures."""
    response = staff_client().get(reverse("admin_dashboard"), {"days": 7})

    assert response.status_code == 200
    window = response.data["owner"]["window"]
    assert window["days"] == 7
    assert window["choices"] == [7, 14, 30, 90]
    # The previous period is the same length immediately before the current one,
    # which is the only comparison that survives moving the window.
    starts_on = timezone.now().date() - timedelta(days=7)
    assert window["starts_on"] == starts_on.isoformat()
    assert window["previous_starts_on"] == (starts_on - timedelta(days=7)).isoformat()


@pytest.mark.parametrize("requested", ["5", "365", "", "abc", None])
def test_a_window_outside_the_list_falls_back_to_the_default(requested):
    """SPEC:ADM-015 — an unsupported window never becomes an unbounded query."""
    assert resolve_window(requested) == DEFAULT_WINDOW_DAYS

    params = {} if requested is None else {"days": requested}
    response = staff_client().get(reverse("admin_dashboard"), params)

    assert response.status_code == 200
    assert response.data["owner"]["window"]["days"] == DEFAULT_WINDOW_DAYS


def test_anonymous_cannot_read_the_dashboard():
    """SPEC:ADM-015 — the window parameter does not open the endpoint."""
    response = APIClient().get(reverse("admin_dashboard"), {"days": 7})

    assert response.status_code == 401


def make_events():
    """Three days of events, one of them a crawler."""
    now = timezone.localtime()
    today = now.date()
    ActivityEvent.objects.create(event_name="page_view", session_id="s-1")
    old = ActivityEvent.objects.create(event_name="page_view", session_id="s-2")
    ActivityEvent.objects.filter(pk=old.pk).update(
        created_at=now - timedelta(days=10)
    )
    bot = ActivityEvent.objects.create(
        event_name="page_view", session_id="s-3", is_bot=True
    )
    return today, bot


def test_summary_totals_describe_exactly_the_filtered_range():
    """SPEC:ADM-016 — the same filters build the listing and its totals."""
    today, _ = make_events()
    client = staff_client()

    response = client.get(
        reverse("activity-event-summary"),
        {"created_after": today.isoformat(), "created_before": today.isoformat()},
    )

    assert response.status_code == 200
    # Asking for a single date returns that whole day, not nothing: the upper
    # bound is pushed to the start of the following one.
    assert response.data["total"] == 2
    assert response.data["sessions"] == 2
    assert [row["date"] for row in response.data["by_day"]] == [today.isoformat()]
    assert response.data["by_event"] == [{"event_name": "page_view", "count": 2}]


def test_an_unreadable_date_narrows_nothing_instead_of_failing():
    """SPEC:ADM-016 — a typo on an admin screen must not raise."""
    make_events()

    response = staff_client().get(
        reverse("activity-event-summary"), {"created_after": "no-es-una-fecha"}
    )

    assert response.status_code == 200
    assert response.data["total"] == 3


def test_the_bot_split_ignores_the_listings_traffic_filter():
    """SPEC:ADM-016 — "how much of this was crawlers" cannot answer zero."""
    make_events()

    response = staff_client().get(
        reverse("activity-event-summary"), {"is_bot": "false"}
    )

    assert response.status_code == 200
    assert response.data["total"] == 2
    assert response.data["traffic_split"] == {"human": 2, "bot": 1}


def test_the_listing_honours_the_same_date_range():
    """SPEC:ADM-016 — the range narrows the rows, not only the summary."""
    today, _ = make_events()

    response = staff_client().get(
        reverse("activity-event-list"), {"created_after": today.isoformat()}
    )

    assert response.status_code == 200
    assert response.data["count"] == 2


def test_anonymous_cannot_read_the_summary():
    """SPEC:ADM-016 — the summary is as reserved as the log it describes."""
    response = APIClient().get(reverse("activity-event-summary"))

    assert response.status_code == 401
