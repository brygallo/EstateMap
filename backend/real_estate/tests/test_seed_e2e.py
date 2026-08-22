"""The fixture the browser suite stands on.

`seed_e2e` exists so Playwright can sign in and reach screens that only exist
behind a session. When what it seeds drifts from what those tests need, the
failure surfaces in the browser suite as a broken feature — which is how the
claim flow spent a day looking broken while the only thing missing was a
verified phone on the seeded account.

These tests pin the contract instead: the account can sign in, it can claim,
and there is a second one for the tests that change a number.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from real_estate.management.commands.seed_e2e import (
    SEED_ADVERTISER_EMAIL,
    SEED_CLAIMABLE_COUNT,
    SEED_SPARE_EMAIL,
)
from real_estate.services.claims import PropertyClaimService

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def seeded():
    # `--force` because pytest runs with DEBUG off, which the command reads as a
    # production signal. The database here is created and dropped by the test
    # run, which is exactly the disposable case the flag exists for.
    call_command("seed_e2e", force=True)


def test_the_seeded_advertiser_can_actually_claim(seeded):
    """SPEC:CLM-003 — a phone that is not verified reaches no claim at all."""
    advertiser = User.objects.get(email=SEED_ADVERTISER_EMAIL)

    assert advertiser.is_email_verified is True
    assert advertiser.phone
    assert advertiser.phone_verified_at is not None
    assert PropertyClaimService(advertiser).may_claim() is True


def test_the_seeded_advertiser_has_something_to_claim(seeded):
    """SPEC:CLM-002 — the browser suite needs at least two listings to work with."""
    advertiser = User.objects.get(email=SEED_ADVERTISER_EMAIL)

    claimable = PropertyClaimService(advertiser).claimable()

    assert claimable.count() == SEED_CLAIMABLE_COUNT
    assert SEED_CLAIMABLE_COUNT >= 2


def test_there_is_a_spare_account_for_the_tests_that_change_a_phone(seeded):
    """A phone rewrite drops verification, so it must not land on the advertiser."""
    spare = User.objects.get(email=SEED_SPARE_EMAIL)

    assert spare.is_email_verified is True
    assert spare.phone
    assert spare.email != SEED_ADVERTISER_EMAIL
    # Its number matches no seeded listing: the point is to have nothing to claim.
    assert PropertyClaimService(spare).claimable().count() == 0


def test_a_real_account_can_never_reach_the_claim_today():
    """SPEC:CLM-008 — the gate is built and nothing in the product opens it.

    Written as a test rather than left as a comment because the day somebody
    builds the verification path (CLM-009) this is what will fail, which is the
    signal to promote that rule instead of discovering the change by accident.
    """
    advertiser = User.objects.create_user(
        username="anunciante_real",
        email="anunciante@example.test",
        password="test-pass-123",
        phone="0999000123",
    )

    assert advertiser.phone_verified_at is None
    assert PropertyClaimService(advertiser).may_claim() is False
