"""Runtime support for the tests generated from specs/.

The generated files contain no logic of their own: they say which endpoint to
call, as which role, and what the spec expects. Everything about *how* a role is
built lives here, so adding a role or changing how a fixture property is created
is a single edit instead of a regeneration of every test.

Kept out of `conftest.py` deliberately — hand-written tests import from here too,
and a plain module is easier to read than a wall of fixtures.
"""

from __future__ import annotations

import re
from typing import Any, Callable

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from real_estate.email_utils import create_publication_resume_token
from real_estate.models import PendingPublication, Property

User = get_user_model()

# Roles a spec case may ask for. Anything else is a spec bug, not a test bug.
KNOWN_ROLES = {
    "anonymous",
    "authenticated",
    "unverified",
    "owner",
    "not_owner",
    "staff",
    "superuser",
    "internal",
}

# Placeholders a spec endpoint may use, resolved against the fixture data below.
PLACEHOLDER_RE = re.compile(r"\{([a-z_]+)\}")

ALLOWED = "allowed"
DENIED = "denied"

# Statuses that mean "the request was refused because of who you are", as
# opposed to a validation error, which is a different rule entirely.
REFUSAL_STATUSES = {401, 403}

# SpecWorld exposes an accessor literally called `property`, which shadows the
# builtin for the rest of that class body. Every accessor declared after it
# needs the name kept aside beforehand.
_property = property


class SpecWorld:
    """The minimal world a permission case needs: some users and a property."""

    def __init__(self) -> None:
        self._users: dict[str, Any] = {}
        self._property: Property | None = None
        self._pending: PendingPublication | None = None
        self._resume_token: Any = None

    def user(self, role: str):
        if role in self._users:
            return self._users[role]

        base = {
            "authenticated": dict(username="spec_auth", email="spec_auth@example.com", is_email_verified=True),
            "unverified": dict(username="spec_unverified", email="spec_unverified@example.com", is_email_verified=False),
            "owner": dict(username="spec_owner", email="spec_owner@example.com", is_email_verified=True),
            "not_owner": dict(username="spec_other", email="spec_other@example.com", is_email_verified=True),
            "staff": dict(username="spec_staff", email="spec_staff@example.com", is_email_verified=True, is_staff=True),
            "superuser": dict(
                username="spec_root",
                email="spec_root@example.com",
                is_email_verified=True,
                is_staff=True,
                is_superuser=True,
            ),
        }[role]

        user = User.objects.create_user(**base)
        user.set_password("SpecPass123!")
        user.save()
        self._users[role] = user
        return user

    @property
    def property(self) -> Property:
        """A published property owned by the `owner` role."""
        if self._property is None:
            self._property = Property.objects.create(
                title="Propiedad de spec",
                description="Creada por spec_support para los tests generados.",
                property_type="land",
                status="for_sale",
                city="Macas",
                province="Morona Santiago",
                latitude=-2.3080,
                longitude=-78.1180,
                area=500.0,
                price=25000,
                owner=self.user("owner"),
            )
        return self._property

    @_property
    def pending(self) -> PendingPublication:
        """An abandoned draft, the kind a resume link is issued for."""
        if self._pending is None:
            self._pending = PendingPublication.objects.create(
                title="Solicitud de spec",
                contact_phone="0991234567",
                contact_email="spec_pending@example.com",
                city="Macas",
                province="Morona Santiago",
                property_type="land",
                operation="for_sale",
                price="32000",
                draft={"title": "Solicitud de spec", "city": "Macas", "images_count": 2},
                source="account_required",
            )
        return self._pending

    @_property
    def resume_token(self) -> str:
        """A live resume token for that draft."""
        if self._resume_token is None:
            self._resume_token = create_publication_resume_token(self.pending)
        return self._resume_token.token

    def resolve(self, path: str) -> str:
        """Substitute {property_id} and friends with real primary keys."""

        def replace(match: re.Match[str]) -> str:
            name = match.group(1)
            if name in {"property_id", "id", "pk"}:
                return str(self.property.pk)
            if name == "owner_id":
                return str(self.user("owner").pk)
            if name == "pending_id":
                return str(self.pending.pk)
            if name == "token":
                return self.resume_token
            if name in {"code", "short_code"}:
                return self.property.short_code
            raise AssertionError(
                f"The spec endpoint uses the placeholder '{{{name}}}', which spec_support "
                "cannot resolve. Add it to SpecWorld.resolve."
            )

        return PLACEHOLDER_RE.sub(replace, path)

    def client(self, role: str) -> APIClient:
        client = APIClient()
        if role == "anonymous":
            return client
        if role == "internal":
            # The Next.js server calling us from inside the network: no user, but
            # exempt from the anti-scraper throttles by IP.
            client.defaults["REMOTE_ADDR"] = "127.0.0.1"
            return client
        client.force_authenticate(user=self.user(role))
        return client


@pytest.fixture
def spec_world(db) -> SpecWorld:
    return SpecWorld()


@pytest.fixture
def spec_request(spec_world: SpecWorld) -> Callable[..., Any]:
    """Perform the call a generated test describes."""

    def _request(method: str, path: str, role: str, payload: dict | None = None):
        assert role in KNOWN_ROLES, (
            f"Unknown role '{role}'. Valid roles: {sorted(KNOWN_ROLES)}. "
            "Fix the case in specs/ (the enum lives in specs/schemas/rule.schema.json)."
        )
        client = spec_world.client(role)
        url = spec_world.resolve(path)
        verb = getattr(client, method.lower())
        if method.upper() in {"GET", "DELETE", "HEAD", "OPTIONS"}:
            return verb(url)
        return verb(url, data=payload or {}, format="json")

    return _request


def assert_outcome(
    response,
    expected: str,
    denied_status: int | None,
    rule_id: str,
    case_name: str,
    expected_status: int | None = None,
) -> None:
    """Compare a real response against what the spec promised.

    `expected_status` is what turns an `allowed` case into a real assertion.
    Without it, `allowed` only proves the request was not refused on permission
    grounds: a 400 from a missing body or a 404 from a wrong path both pass, and
    the test stays green while the endpoint is broken.
    """

    context = (
        f"\nRule {rule_id}, case '{case_name}'."
        f"\nActual response: HTTP {response.status_code}."
        f"\nBody: {_body_excerpt(response)}"
        f"\nIf the code is right and the spec is wrong, update specs/ and regenerate."
    )

    if expected == ALLOWED:
        assert response.status_code not in REFUSAL_STATUSES, (
            f"The spec says this role is allowed, but the server refused it.{context}"
        )
        assert response.status_code < 500, f"Server error on an allowed case.{context}"
        if expected_status is not None:
            assert response.status_code == expected_status, (
                f"The spec expects exactly HTTP {expected_status}.{context}"
            )
        return

    if expected == DENIED:
        if denied_status is not None:
            assert response.status_code == denied_status, (
                f"The spec expects HTTP {denied_status} when denying.{context}"
            )
        else:
            assert response.status_code in REFUSAL_STATUSES, (
                f"The spec says this role is denied, but the request went through.{context}"
            )
        return

    raise AssertionError(
        f"'expected: {expected}' is not executable by the generator; use 'allowed' or 'denied', "
        f"or drop tests.api from rule {rule_id}."
    )


def _body_excerpt(response, limit: int = 400) -> str:
    try:
        content = response.content.decode("utf-8", errors="replace")
    except Exception:  # pragma: no cover - defensive
        return "<no readable body>"
    return content[:limit] + ("…" if len(content) > limit else "")
