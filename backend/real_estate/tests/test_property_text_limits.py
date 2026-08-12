import pytest

from real_estate.serializers import PropertySerializer


def test_description_within_the_limit_is_accepted(settings):
    """SPEC:PROP-037 — a normal description passes untouched."""
    settings.MAX_DESCRIPTION_LENGTH = 8000
    description = "Casa amplia con patio. " * 20

    assert PropertySerializer().validate_description(description) == description


def test_description_over_the_limit_is_rejected_with_its_length(settings):
    """SPEC:PROP-037 — the ceiling is enforced on the server, not only in the form.

    The message carries the actual length because the person cannot count
    characters in a textarea, and a bare "too long" leaves them trimming blind.
    """
    from rest_framework import serializers

    settings.MAX_DESCRIPTION_LENGTH = 100
    with pytest.raises(serializers.ValidationError, match="101"):
        PropertySerializer().validate_description("x" * 101)


def test_the_longest_description_in_the_catalogue_still_fits(settings):
    """SPEC:PROP-037 — the bound was picked so no existing listing breaks.

    The longest description in production is ~6.400 characters and belongs to an
    imported listing. A limit under that would make those listings impossible to
    edit, turning a guard against abuse into a trap for the owner.
    """
    settings.MAX_DESCRIPTION_LENGTH = 8000

    assert PropertySerializer().validate_description("y" * 6401)


def test_an_empty_description_is_left_alone(settings):
    """SPEC:PROP-037 — the field stays optional."""
    settings.MAX_DESCRIPTION_LENGTH = 8000

    assert PropertySerializer().validate_description("") == ""
