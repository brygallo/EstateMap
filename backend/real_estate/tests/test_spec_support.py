"""Tests for the harness the generated spec tests run on.

Every rule in specs/ that asks for API coverage is checked by a test that this
module's code executes, so a silent bug here does not fail one test — it turns a
whole layer of the suite green while it proves nothing. That is not a
hypothetical: `given` used to be passed as the request payload, which meant a
precondition on a GET was dropped on the floor and the case ran against the
default world. Three cases of PROP-034 were "covered" that way.

These tests guard the two properties that keep the harness honest: a declared
precondition is really built, and one the harness cannot build stops the test
instead of being ignored.
"""

import pytest

from real_estate.models import ActivityEvent
from real_estate.tests.spec_support import SpecWorld

pytestmark = pytest.mark.django_db


def test_a_declared_state_reaches_the_database():
    world = SpecWorld()
    world.apply({"status": "inactive"})

    world.property.refresh_from_db()
    assert world.property.status == "inactive"


def test_closing_a_listing_goes_through_the_model_normalisation():
    """Applying state must produce the row the application would, not a shortcut."""
    world = SpecWorld()
    world.apply({"closed_reason": "sold"})

    world.property.refresh_from_db()
    assert world.property.closed_reason == "sold"
    # PROP-033: the reason is what takes it off the market, and save() is where
    # that happens. Writing the column directly would skip it.
    assert world.property.status == "inactive"
    assert world.property.closed_at is not None


def test_a_state_the_harness_cannot_build_fails_the_test():
    """The whole point: an unbuildable precondition must never pass silently."""
    world = SpecWorld()

    with pytest.raises(AssertionError, match="cannot build"):
        world.apply({"title": "Esto era el cuerpo de la petición"})


def test_kit_visits_are_recorded_against_the_listing():
    world = SpecWorld()
    world.apply({"utm_source": "instagram"})

    events = ActivityEvent.objects.filter(property=world.property)
    assert events.count() == 3
    assert events.values("session_id").distinct().count() == 2
    assert events.first().payload["attribution"]["source"] == "instagram"


def test_a_body_on_a_bodyless_method_is_refused(spec_request):
    with pytest.raises(AssertionError, match="carries none"):
        spec_request(
            method="GET",
            path="/api/properties/{property_id}/",
            role="anonymous",
            body={"title": "no cabe en un GET"},
        )
