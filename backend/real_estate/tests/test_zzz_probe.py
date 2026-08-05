"""Temporary probe: prints the real status code of every candidate request.

Not a spec test. Deleted as soon as the statuses are known.
"""

import pytest

from real_estate.tests.spec_support import spec_world, spec_request  # noqa: F401

pytestmark = [pytest.mark.django_db, pytest.mark.api]


def probe(spec_request, label, method, path, role, given=None, body=None):
    response = spec_request(method=method, path=path, role=role, given=given, body=body)
    print(f"PROBE {label:25s} {method:6s} {path:45s} {role:12s} -> {response.status_code}")
    print(f"      body: {response.content[:200]}")


def test_probe_admin_property_detail(spec_request):
    probe(spec_request, "PERM-055", "PATCH", "/api/admin/properties/{property_id}/", "staff",
          body={"status": "inactive"})


def test_probe_admin_property_delete(spec_request):
    probe(spec_request, "PERM-056", "DELETE", "/api/admin/properties/{property_id}/", "staff")


def test_probe_lead_create(spec_request):
    probe(spec_request, "PERM-024", "POST", "/api/leads/", "anonymous",
          body={"property": "{property_id}", "name": "Interesado de spec",
                "phone": "0991234567", "email": "interesado-spec@example.com",
                "message": "Me interesa esta propiedad.", "source": "property_page"})


def test_probe_bulk_status(spec_request):
    probe(spec_request, "PERM-057", "POST", "/api/admin/properties/bulk-status/", "staff",
          body={"ids": ["{property_id}"], "status": "inactive"})


def test_probe_login(spec_request):
    probe(spec_request, "PERM-032", "POST", "/api/login/", "anonymous",
          body={"email": "{owner_email}", "password": "{password}"})


def test_probe_change_password(spec_request):
    probe(spec_request, "PERM-043", "POST", "/api/change-password/", "authenticated",
          body={"old_password": "{password}", "new_password": "OtraClaveSegura456!"})


def test_probe_ingesta_properties(spec_request):
    probe(spec_request, "PERM-060", "GET", "/api/admin/ingesta/properties/?source=plusvalia", "staff")
