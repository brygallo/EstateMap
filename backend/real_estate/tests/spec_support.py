"""Runtime support for the tests generated from specs/.

The generated files contain no logic of their own: they say which endpoint to
call, as which role, what the world already looks like, and what the spec
expects. Everything about *how* a role or a precondition is built lives here, so
adding a role or changing how a fixture property is created is a single edit
instead of a regeneration of every test.

The distinction that matters is between `given` and `body`. `given` is the state
of the world before the call — "given a listing already sold" — and `SpecWorld.apply`
materialises it. `body` is the request itself. They were one field once, which
meant a `given` on a GET was thrown away and the case silently tested the
default world instead of the one it described.

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
from real_estate.models import ActivityEvent, PendingPublication, Property

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

# Methods that carry no request body. A case that declares one for these is a
# spec bug: the body would be dropped and the case would prove nothing.
BODYLESS_METHODS = {"GET", "DELETE", "HEAD", "OPTIONS"}

# Columns of the fixture property that a case may set through `given`. This is
# an allowlist and not "any model field" on purpose: `given` and `body` look
# alike, and silently accepting `given: {title: ...}` as a precondition would
# reintroduce exactly the confusion the split exists to remove. Adding a column
# here is a deliberate act — it means the state is real and worth building.
PROPERTY_STATE_COLUMNS = {"status", "closed_reason"}

# The campaign the promotion kit stamps on every link it hands out. Visits
# arriving without it are not the kit's traffic and SOC-101 ignores them.
KIT_CAMPAIGN = "owner_kit"

# The password every fixture user is created with. A case that needs to send a
# real credential — logging in, changing a password — asks for it as the
# `{password}` placeholder instead of repeating the literal in the YAML.
SPEC_PASSWORD = "SpecPass123!"

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
        user.set_password(SPEC_PASSWORD)
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
            if name == "owner_email":
                return self.user("owner").email
            if name == "password":
                return SPEC_PASSWORD
            if name == "description_over_limit":
                # A ceiling can only be exercised by a value that breaks it, and
                # eight thousand characters cannot be written into a YAML case.
                from django.conf import settings

                limit = getattr(settings, "MAX_DESCRIPTION_LENGTH", 8000)
                return "x" * (limit + 1)
            raise AssertionError(
                f"The spec endpoint uses the placeholder '{{{name}}}', which spec_support "
                "cannot resolve. Add it to SpecWorld.resolve."
            )

        return PLACEHOLDER_RE.sub(replace, path)

    def resolve_body(self, body: Any) -> Any:
        """Same substitution, applied inside the request payload.

        A body is often only valid when it points at something that already
        exists: a lead needs the id of the listing it is about, a login needs an
        address someone actually registered with. Without this the case could
        not send a valid request at all, and `expected_http_status` would have
        nothing to assert but the 400 that the missing reference produces.
        """

        if isinstance(body, dict):
            return {key: self.resolve_body(value) for key, value in body.items()}
        if isinstance(body, list):
            return [self.resolve_body(item) for item in body]
        if isinstance(body, str):
            return self.resolve(body)
        return body

    def apply(self, given: dict[str, Any] | None) -> None:
        """Build the world the case says it starts from.

        `given` is a precondition, never a payload: `{status: inactive}` reads
        "given a listing that is already inactive", so the fixture row is moved
        into that state before the request goes out.

        Anything this method cannot build raises instead of being ignored. A
        precondition nobody sets up is worse than no case at all: the request
        runs against the default world, the assertion passes, and the case looks
        covered while proving nothing. That is the failure mode this whole split
        exists to remove, so it fails loudly by design.
        """

        if not given:
            return

        columns: dict[str, Any] = {}
        for key, value in given.items():
            if key in PROPERTY_STATE_COLUMNS:
                columns[key] = value
            elif key == "utm_source":
                self.record_kit_visits(str(value))
            else:
                raise AssertionError(
                    f"The case declares the precondition '{key}', which SpecWorld.apply "
                    "cannot build. Either teach it how (spec_support.PROPERTY_STATE_COLUMNS "
                    "or a dedicated applier) or, if it was meant as the request payload, "
                    "move it to the case's 'body:' — 'given:' is the state of the world, "
                    "not the request."
                )

        if columns:
            prop = self.property
            for key, value in columns.items():
                setattr(prop, key, value)
            # Saved through save(), not update(): closing a listing is
            # normalized there (PROP-033), so "given a sold listing" means the
            # row the application itself would have produced.
            prop.save()
            prop.refresh_from_db()

    def record_kit_visits(self, source: str) -> None:
        """Visits that arrived from the promotion kit link of one network.

        Two sessions and three events on purpose: SOC-101 counts distinct
        visitors, not rows, so a single-event fixture could not tell a working
        aggregation from a broken one.
        """

        prop = self.property
        path = f"/propiedad/{prop.pk}?utm_source={source}&utm_medium=social&utm_campaign={KIT_CAMPAIGN}"
        attribution = {
            "attribution": {
                "source": source,
                "medium": "social",
                "campaign": KIT_CAMPAIGN,
                "channel": "social",
            }
        }
        for session, repeats in (("spec-visitor-1", 2), ("spec-visitor-2", 1)):
            for _ in range(repeats):
                ActivityEvent.objects.create(
                    property=prop,
                    session_id=session,
                    event_name="page_view",
                    path=path,
                    payload=attribution,
                    is_bot=False,
                )

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

    def _request(
        method: str,
        path: str,
        role: str,
        given: dict | None = None,
        body: dict | None = None,
    ):
        assert role in KNOWN_ROLES, (
            f"Unknown role '{role}'. Valid roles: {sorted(KNOWN_ROLES)}. "
            "Fix the case in specs/ (the enum lives in specs/schemas/rule.schema.json)."
        )
        bodyless = method.upper() in BODYLESS_METHODS
        assert not (bodyless and body), (
            f"The case sends a body with {method.upper()}, which carries none. "
            "Move it to 'given:' if it describes the state before the call, or drop it."
        )
        # The world first, the request second. Everything the case declares as
        # already true has to be true before the endpoint is asked anything.
        spec_world.apply(given)
        client = spec_world.client(role)
        url = spec_world.resolve(path)
        verb = getattr(client, method.lower())
        if bodyless:
            return verb(url)
        return verb(url, data=spec_world.resolve_body(body) or {}, format="json")

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
