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
VERSION_KEYS = {
    "properties": VERSION_KEY,
    "map": "props:map:ver",
    "summary": "props:summary:ver",
    "detail": "props:detail:ver",
    "locations": "props:locations:ver",
    "catalog": "props:catalog:ver",
    "market_stats": "props:market-stats:ver",
    "geo": "geo:ver",
    "blog": "blog:ver",
    "ads": "ads:ver",
}

# Parts longer than this are hashed instead of embedded verbatim, so a long
# querystring cannot turn into a multi-kilobyte Redis key.
MAX_PART_LENGTH = 32


def props_version(scope: str = "properties") -> int:
    """Current inventory version. Defaults to 1 when the cache is unavailable."""
    try:
        version_key = VERSION_KEYS[scope]
        version = cache.get_or_set(version_key, 1, timeout=None)
    except Exception:  # pragma: no cover - defensive, cache must never break a read
        logger.debug("Could not read cache version for %s", scope, exc_info=True)
        return 1
    # With IGNORE_EXCEPTIONS a down Redis returns None instead of raising.
    if version is None:
        return 1
    try:
        return int(version)
    except (TypeError, ValueError):
        return 1


def bump_props_version(*scopes: str) -> None:
    """Invalidate only the requested inventory-derived cache generations."""
    if not scopes:
        scopes = tuple(VERSION_KEYS)
    for scope in scopes:
        _bump_version(scope)


def _bump_version(scope: str) -> None:
    version_key = VERSION_KEYS[scope]
    try:
        cache.incr(version_key)
    except ValueError:
        # django-redis raises ValueError when the key does not exist yet (or it
        # was evicted). Seeding it is equivalent to a bump: the readers that
        # cached against the previous value can no longer hit their keys.
        try:
            cache.set(version_key, props_version(scope) + 1, timeout=None)
        except Exception:  # pragma: no cover - defensive
            logger.debug("Could not seed %s", version_key, exc_info=True)
    except Exception:  # pragma: no cover - defensive
        logger.debug("Could not bump %s", version_key, exc_info=True)


def _normalize(part) -> str:
    value = "" if part is None else str(part)
    if len(value) > MAX_PART_LENGTH:
        return hashlib.md5(value.encode("utf-8"), usedforsecurity=False).hexdigest()
    return value


def versioned_key(name: str, *parts, scope: str = "properties") -> str:
    """Build ``<name>:v<version>:<part>:<part>`` with long parts hashed."""
    return f"{name}:v{props_version(scope)}:{':'.join(_normalize(part) for part in parts)}"


# How long a recomputation may hold the lock before another worker is allowed
# to try. Longer than the slowest payload, short enough that a crashed worker
# does not freeze refreshes for the rest of the day.
REFRESH_LOCK_SECONDS = 120


def cached_or_stale(key: str, fresh_for: int, compute, grace: int = 900):
    """Serve from cache, and let exactly one worker recompute a stale entry.

    The plain pattern — read, miss, compute, write — has two costs that only
    show up under traffic. The first request after a TTL expires waits for the
    whole computation, and every request that arrives meanwhile computes it
    again: on the market stats that means several workers each pulling fourteen
    thousand rows into Python at the same time, on a box with four cores.

    Here the payload outlives its freshness by `grace`. Past `fresh_for` the
    entry is stale but still served, and the first worker to take the lock is
    the only one that recomputes. Nobody waits, and the herd cannot form.
    """
    from django.utils import timezone

    now = timezone.now().timestamp()
    entry = None
    try:
        entry = cache.get(key)
    except Exception:  # pragma: no cover - a cache read must never break a request
        logger.debug("Could not read %s", key, exc_info=True)

    if isinstance(entry, dict) and "payload" in entry:
        if entry.get("fresh_until", 0) > now:
            return entry["payload"]

        # Stale: refresh it once, and only if this worker wins the lock.
        lock_key = f"{key}:refreshing"
        try:
            acquired = cache.add(lock_key, "1", REFRESH_LOCK_SECONDS)
        except Exception:  # pragma: no cover
            acquired = False
        if not acquired:
            return entry["payload"]
        try:
            return _store(key, fresh_for, grace, compute())
        finally:
            try:
                cache.delete(lock_key)
            except Exception:  # pragma: no cover
                pass

    return _store(key, fresh_for, grace, compute())


def _store(key: str, fresh_for: int, grace: int, payload):
    from django.utils import timezone

    try:
        cache.set(
            key,
            {"payload": payload, "fresh_until": timezone.now().timestamp() + fresh_for},
            fresh_for + grace,
        )
    except Exception:  # pragma: no cover - writing the cache is best effort
        logger.debug("Could not write %s", key, exc_info=True)
    return payload
