"""The portal's own headers survive the preflight.

The portal and the API are different origins, so every header the publishing
form adds has to be in the CORS allowlist. When one is missing the browser
drops the request before sending it: nothing reaches Django, no log line is
written, and the form can only report a generic network failure. These tests
exercise the preflight the browser actually performs rather than reading the
setting back, because the setting is only half the contract — the middleware
has to answer with it.
"""

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

PORTAL_ORIGIN = "https://geopropiedadesecuador.com"


def preflight(headers, origin=PORTAL_ORIGIN, path="/api/properties/"):
    """The OPTIONS a browser sends before a cross-origin POST."""
    return APIClient().options(
        path,
        HTTP_ORIGIN=origin,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS=headers,
    )


def allowed_headers(response):
    raw = response.get("Access-Control-Allow-Headers", "")
    return {value.strip().lower() for value in raw.split(",") if value.strip()}


@pytest.mark.api
@pytest.mark.django_db
@override_settings(CORS_ALLOWED_ORIGINS=[PORTAL_ORIGIN], CORS_ALLOW_ALL_ORIGINS=False)
def test_preflight_allows_the_idempotency_key_header():
    """SPEC:WFP-022 — without it the browser never sends the create."""
    response = preflight("idempotency-key")

    assert response.status_code == 200
    assert response["Access-Control-Allow-Origin"] == PORTAL_ORIGIN
    assert "idempotency-key" in allowed_headers(response)


@pytest.mark.api
@pytest.mark.django_db
@override_settings(CORS_ALLOWED_ORIGINS=[PORTAL_ORIGIN], CORS_ALLOW_ALL_ORIGINS=False)
def test_preflight_still_allows_the_session_header():
    """SPEC:WFP-022 — adding one header must not replace the defaults.

    `CORS_ALLOW_HEADERS` is an assignment, not an append: writing the new
    header alone would silently unauthorise `Authorization` and log everyone
    out of every write in the portal.
    """
    response = preflight("authorization,content-type,idempotency-key")

    allowed = allowed_headers(response)
    assert {"authorization", "content-type", "idempotency-key"} <= allowed


@pytest.mark.api
@pytest.mark.django_db
@override_settings(CORS_ALLOWED_ORIGINS=[PORTAL_ORIGIN], CORS_ALLOW_ALL_ORIGINS=False)
def test_preflight_ignores_an_origin_outside_the_allowlist():
    """SPEC:WFP-022 — the allowlist widens headers, never origins."""
    response = preflight("idempotency-key", origin="https://ejemplo-ajeno.com")

    assert "Access-Control-Allow-Origin" not in response
