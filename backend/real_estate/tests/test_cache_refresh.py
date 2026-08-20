"""Serving a stale payload while one worker recomputes it.

The plain read-miss-compute-write pattern costs twice under traffic: the
request that finds the expired entry waits for the whole computation, and every
request arriving during that window repeats it. On the market stats that means
several workers each pulling the active catalogue into Python at the same time.
"""

import pytest
from django.core.cache import cache

from real_estate.cache_utils import cached_or_stale


@pytest.fixture(autouse=True)
def clean_cache():
    cache.clear()
    yield
    cache.clear()


def test_the_first_call_computes_and_the_second_does_not():
    calls = []

    def compute():
        calls.append(1)
        return {"value": len(calls)}

    assert cached_or_stale("k", 60, compute) == {"value": 1}
    assert cached_or_stale("k", 60, compute) == {"value": 1}
    assert len(calls) == 1


def test_a_stale_entry_is_served_while_it_is_recomputed():
    """SPEC:MPERF-005 — nobody waits for a recomputation they did not trigger."""
    calls = []

    def compute():
        calls.append(1)
        return {"value": len(calls)}

    # Fresh for zero seconds: the entry is stale the moment it is written.
    assert cached_or_stale("k", 0, compute) == {"value": 1}

    # The worker that takes the lock recomputes...
    assert cached_or_stale("k", 0, compute) == {"value": 2}
    assert len(calls) == 2


def test_only_one_worker_recomputes_a_stale_entry():
    """SPEC:MPERF-005 — the herd cannot form: the rest are served the stale copy."""
    calls = []

    def compute():
        calls.append(1)
        return {"value": len(calls)}

    cached_or_stale("k", 0, compute)
    assert len(calls) == 1

    # Somebody else is already refreshing it.
    cache.add("k:refreshing", "1", 120)

    for _ in range(5):
        assert cached_or_stale("k", 0, compute) == {"value": 1}
    assert len(calls) == 1, "a locked refresh must not be repeated by every request"


def test_a_payload_outlives_its_freshness():
    """SPEC:MPERF-005 — the grace window is what makes the stale copy exist."""
    cached_or_stale("k", 1, lambda: {"value": "primero"}, grace=600)

    entry = cache.get("k")
    assert entry["payload"] == {"value": "primero"}
    assert entry["fresh_until"] > 0
