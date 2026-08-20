"""How anonymous rate limiting identifies its clients behind the proxy."""

from rest_framework.test import APIRequestFactory

from real_estate.throttling import AntiScraperScopedThrottle, _is_internal_client


def test_rotating_forwarded_for_shares_one_bucket():
    """SPEC:PERM-072 — the client-controlled XFF prefix must not open new buckets.

    nginx appends the address it observed as the LAST hop; everything before it
    is client input. With NUM_PROXIES=1 both requests below must resolve to the
    trusted hop, or rotating a fake prefix would defeat every anonymous quota.
    """
    factory = APIRequestFactory()
    throttle = AntiScraperScopedThrottle()

    first = factory.get(
        '/', REMOTE_ADDR='172.18.0.5',
        HTTP_X_FORWARDED_FOR='1.2.3.4, 203.0.113.9',
    )
    second = factory.get(
        '/', REMOTE_ADDR='172.18.0.5',
        HTTP_X_FORWARDED_FOR='5.6.7.8, 203.0.113.9',
    )

    assert throttle.get_ident(first) == '203.0.113.9'
    assert throttle.get_ident(first) == throttle.get_ident(second)


def test_internal_ssr_clients_keep_their_exemption():
    """SPEC:PERM-072 — no XFF header plus a private address still reads as internal."""
    factory = APIRequestFactory()

    internal = factory.get('/', REMOTE_ADDR='172.18.0.5')
    proxied = factory.get(
        '/', REMOTE_ADDR='172.18.0.5',
        HTTP_X_FORWARDED_FOR='203.0.113.9',
    )

    assert _is_internal_client(internal)
    assert not _is_internal_client(proxied)


def test_a_cdn_edge_must_not_become_everybody_s_bucket():
    """SPEC:PERM-072 — the identity is the visitor, never the proxy in front.

    With a CDN proxying the site, the chain that reaches nginx already carries
    the visitor, and nginx appends the edge it saw. Taking the last hop would
    then key hundreds of visitors from one region onto the handful of edge
    addresses that serve it, and legitimate traffic would start collecting 429s.

    The fix is in nginx, not here: `real_ip_header CF-Connecting-IP` restricted
    to the CDN ranges makes the address nginx observes — and therefore appends —
    the visitor again. This pins the shape that must reach Django once that is
    configured: two visitors behind the same edge, two buckets.
    """
    factory = APIRequestFactory()
    throttle = AntiScraperScopedThrottle()

    first = factory.get(
        '/', REMOTE_ADDR='172.18.0.5',
        HTTP_X_FORWARDED_FOR='1.2.3.4',
        HTTP_CF_CONNECTING_IP='1.2.3.4',
    )
    second = factory.get(
        '/', REMOTE_ADDR='172.18.0.5',
        HTTP_X_FORWARDED_FOR='5.6.7.8',
        HTTP_CF_CONNECTING_IP='5.6.7.8',
    )

    assert throttle.get_ident(first) == '1.2.3.4'
    assert throttle.get_ident(second) == '5.6.7.8'
    assert throttle.get_ident(first) != throttle.get_ident(second)


def test_a_request_through_the_cdn_is_still_a_visitor():
    """SPEC:PERM-072 — the exemption is for the internal network, not the CDN."""
    factory = APIRequestFactory()

    through_cdn = factory.get(
        '/', REMOTE_ADDR='172.18.0.5',
        HTTP_X_FORWARDED_FOR='1.2.3.4',
        HTTP_CF_CONNECTING_IP='1.2.3.4',
    )

    assert _is_internal_client(through_cdn) is False
