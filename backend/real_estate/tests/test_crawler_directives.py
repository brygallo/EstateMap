"""The API host tells crawlers to stay out.

The portal lives on another hostname and never passes through Django, so
everything answered here is either the portal's own content in another shape or
a staff endpoint returning 401 — nothing that belongs in a search index.
"""

import pytest
from rest_framework.test import APIClient


@pytest.mark.api
def test_robots_txt_disallows_everything():
    """SPEC:SEO-005 — the API host serves a robots.txt that blocks the crawl."""
    response = APIClient().get("/robots.txt")

    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/plain")
    body = response.content.decode()
    assert "User-agent: *" in body
    assert "Disallow: /" in body


@pytest.mark.api
@pytest.mark.django_db
def test_api_responses_carry_noindex():
    """SPEC:SEO-005 — and every response repeats it in a header.

    robots.txt stops the fetch; the header is what removes a URL somebody
    linked to and got indexed without ever being crawled.
    """
    response = APIClient().get("/api/properties/summary/")

    assert response["X-Robots-Tag"] == "noindex, nofollow"


@pytest.mark.api
@pytest.mark.django_db
def test_a_view_that_sets_its_own_directive_keeps_it():
    """SPEC:SEO-005 — the middleware fills a gap, it does not overwrite."""
    response = APIClient().get("/api/ads/999999/go/")

    assert response["X-Robots-Tag"] == "noindex, nofollow"
