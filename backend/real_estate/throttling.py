"""Throttling helpers for the public read endpoints.

The public catalogue is meant to be crawled and read; these limits exist only
to stop bulk scraping loops, never to gate content. Two clients must never be
throttled, because they are not "a visitor":

* The Next.js server rendering our own pages. Its requests reach the backend
  over the internal network with no ``X-Forwarded-For`` header, so every SSR
  page view would otherwise share a single bucket and the whole site would
  start returning 429 under normal traffic.
* Staff, who legitimately hit the admin views in bursts.

Real visitors always arrive through the reverse proxy, which appends
``X-Forwarded-For``, so requests carrying that header are always throttled
normally.
"""

import ipaddress

from django.conf import settings
from rest_framework.throttling import ScopedRateThrottle


def _is_internal_client(request) -> bool:
    """True for service-to-service calls arriving off the private network."""
    meta = getattr(request, "META", None) or {}
    if meta.get("HTTP_X_FORWARDED_FOR"):
        # Came through the public reverse proxy: treat as a normal visitor.
        return False
    remote_addr = (meta.get("REMOTE_ADDR") or "").strip()
    if not remote_addr:
        return False
    if remote_addr in getattr(settings, "THROTTLE_EXEMPT_IPS", ()):
        return True
    try:
        address = ipaddress.ip_address(remote_addr)
    except ValueError:
        return False
    return address.is_private or address.is_loopback


class AntiScraperScopedThrottle(ScopedRateThrottle):
    """Scoped throttle that skips internal callers and staff."""

    def allow_request(self, request, view):
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_staff", False):
            return True
        if _is_internal_client(request):
            return True
        return super().allow_request(request, view)
