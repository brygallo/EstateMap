import pytest
from django.contrib.auth import get_user_model
from django.core.cache import caches
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient, APIRequestFactory

from real_estate.bot_detection import is_bot_user_agent
from real_estate.models import ActivityEvent
from real_estate.services.admin_metrics import AdminMetricsService
from real_estate.throttling import AntiScraperScopedThrottle


HUMAN_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "user_agent",
    [
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
        "GPTBot/1.2 (+https://openai.com/gptbot)",
        "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing)",
        "python-requests/2.31.0",
        "curl/8.4.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/120.0.0.0",
        "",
        None,
    ],
)
def test_non_human_user_agents_are_detected(user_agent):
    assert is_bot_user_agent(user_agent) is True


@pytest.mark.parametrize(
    "user_agent",
    [
        HUMAN_UA,
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
        "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
        # "About" must not trip the generic "bot" token.
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/124.0 Safari/537.36 About",
        # YandexBrowser is a person, YandexBot is not.
        "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 YaBrowser/24.4.1 Yowser/2.5 Safari/537.36",
    ],
)
def test_browser_user_agents_are_not_flagged(user_agent):
    assert is_bot_user_agent(user_agent) is False


def test_ingestion_flags_crawlers_and_ignores_client_supplied_value():
    """SPEC:LEAD-014 — is_bot is decided server-side from the User-Agent, client value ignored."""
    client = APIClient()
    url = reverse("activity-event-list")
    body = {"event_name": "property_pin_clicked", "session_id": "s-1", "is_bot": False}

    bot_response = client.post(
        url,
        body,
        format="json",
        HTTP_USER_AGENT="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    )
    human_response = client.post(
        url,
        {"event_name": "property_pin_clicked", "session_id": "s-2", "is_bot": True},
        format="json",
        HTTP_USER_AGENT=HUMAN_UA,
    )

    assert bot_response.status_code == 201
    assert human_response.status_code == 201
    assert ActivityEvent.objects.get(session_id="s-1").is_bot is True
    assert ActivityEvent.objects.get(session_id="s-2").is_bot is False


def test_owner_metrics_count_humans_only_and_report_bot_volume():
    ActivityEvent.objects.create(event_name="property_pin_clicked", session_id="human-1")
    ActivityEvent.objects.create(event_name="property_contact_clicked", session_id="human-1")
    for index in range(4):
        ActivityEvent.objects.create(
            event_name="property_pin_clicked", session_id=f"bot-{index}", is_bot=True
        )

    metrics = AdminMetricsService().build()

    assert metrics["period"]["sessions"]["value"] == 1
    assert metrics["period"]["contacts"]["value"] == 1
    assert metrics["audience"]["active_window"] == 1
    assert metrics["audience"]["bot_events_window"] == 4
    assert metrics["audience"]["bot_sessions_window"] == 4
    assert metrics["funnel"][0]["value"] == 1


def test_staff_can_filter_all_publication_errors_as_one_group():
    staff = get_user_model().objects.create_user(
        username="activity-admin",
        email="activity-admin@example.com",
        password="test-password",
        is_staff=True,
    )
    ActivityEvent.objects.create(event_name="publication_create_failed", session_id="failed-api")
    ActivityEvent.objects.create(event_name="publication_validation_failed", session_id="failed-form")
    ActivityEvent.objects.create(event_name="publication_created", session_id="success")
    ActivityEvent.objects.create(event_name="property_contact_clicked", session_id="contact")
    client = APIClient()
    client.force_authenticate(user=staff)

    response = client.get(reverse("activity-event-list"), {"event_group": "publication_errors"})

    assert response.status_code == 200
    assert response.data["count"] == 2
    assert {item["event_name"] for item in response.data["results"]} == {
        "publication_create_failed",
        "publication_validation_failed",
    }


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
)
def test_map_points_throttle_stops_scrapers_but_never_our_own_renderer():
    class FakeView:
        throttle_scope = "map_points"

    factory = APIRequestFactory()
    view = FakeView()

    def allow(**meta):
        throttle = AntiScraperScopedThrottle()
        throttle.cache = caches["default"]
        request = factory.get("/api/properties/map_points/", **meta)
        request.user = None
        return throttle.allow_request(request, view)

    # A public client (arrives through the proxy, so it carries X-Forwarded-For)
    # is cut off once it passes the anti-scraper ceiling of 120/min.
    public = [allow(HTTP_X_FORWARDED_FOR="198.51.100.31") for _ in range(126)]
    # The Next.js server renders our own pages over the internal network and
    # must never be limited: all its requests share a single source address.
    internal = [allow(REMOTE_ADDR="172.18.0.5") for _ in range(126)]

    assert public.count(True) == 120
    assert public.count(False) == 6
    assert internal.count(False) == 0
