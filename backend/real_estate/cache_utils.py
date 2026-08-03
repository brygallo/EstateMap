"""
Version-keyed caching helpers for the public read endpoints.

Every cached payload derived from the inventory carries a version number in its
key. Invalidating is then a single ``INCR`` on ``props:ver`` (see
``signals.py``) instead of enumerating and deleting keys: the old entries stop
being addressable and Redis evicts them when their TTL expires. That matters
here because most of these payloads are keyed by filter combinations we cannot
enumerate (bbox, price ranges, free text), so a delete-by-pattern sweep would
either miss keys or block Redis with a ``KEYS``/``SCAN`` walk on every save.

Cache failures must never surface to a request. ``IGNORE_EXCEPTIONS`` already
turns most django-redis errors into ``None``, but ``incr`` still raises
``ValueError`` when the key is missing, so the helpers below stay defensive.
"""

import hashlib
import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

VERSION_KEY = "props:ver"

# Parts longer than this are hashed instead of embedded verbatim, so a long
# querystring cannot turn into a multi-kilobyte Redis key.
MAX_PART_LENGTH = 32


def props_version() -> int:
    """Current inventory version. Defaults to 1 when the cache is unavailable."""
    try:
        version = cache.get_or_set(VERSION_KEY, 1, timeout=None)
    except Exception:  # pragma: no cover - defensive, cache must never break a read
        logger.debug("Could not read %s from cache", VERSION_KEY, exc_info=True)
        return 1
    # With IGNORE_EXCEPTIONS a down Redis returns None instead of raising.
    if version is None:
        return 1
    try:
        return int(version)
    except (TypeError, ValueError):
        return 1


def bump_props_version() -> None:
    """Invalidate every inventory-derived payload by moving the version forward."""
    try:
        cache.incr(VERSION_KEY)
    except ValueError:
        # django-redis raises ValueError when the key does not exist yet (or it
        # was evicted). Seeding it is equivalent to a bump: the readers that
        # cached against the previous value can no longer hit their keys.
        try:
            cache.set(VERSION_KEY, props_version() + 1, timeout=None)
        except Exception:  # pragma: no cover - defensive
            logger.debug("Could not seed %s", VERSION_KEY, exc_info=True)
    except Exception:  # pragma: no cover - defensive
        logger.debug("Could not bump %s", VERSION_KEY, exc_info=True)


def _normalize(part) -> str:
    value = "" if part is None else str(part)
    if len(value) > MAX_PART_LENGTH:
        return hashlib.md5(value.encode("utf-8"), usedforsecurity=False).hexdigest()
    return value


def versioned_key(name: str, *parts) -> str:
    """Build ``<name>:v<version>:<part>:<part>`` with long parts hashed."""
    return f"{name}:v{props_version()}:{':'.join(_normalize(part) for part in parts)}"
