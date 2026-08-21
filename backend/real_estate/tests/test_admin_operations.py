"""Rules of the admin panel that no generated permission test can express.

The generator turns a case with a role and an endpoint into an HTTP call. The
rules covered here are about what happens *after* the call — a row that survives
a delete, a day that keeps its summary once its detail is gone, a window that
declares itself incomparable — so they are written by hand and carry their own
``SPEC:`` marker.
"""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from real_estate.models import (
    ActivityDailyRollup,
    ActivityEvent,
    AdminAuditLog,
    Property,
    PropertyImage,
)
from real_estate.services.admin_metrics import _comparability
from real_estate.services.retention import ActivityRetentionService
from real_estate.services.trash import TRASH_RETENTION_DAYS, PropertyTrashService


pytestmark = pytest.mark.django_db


@pytest.fixture
def staff():
    return get_user_model().objects.create_user(
        username="panel-staff",
        email="panel-staff@example.com",
        password="test-password",
        is_staff=True,
    )


@pytest.fixture
def staff_client(staff):
    client = APIClient()
    client.force_authenticate(user=staff)
    return client


def make_property(**overrides):
    defaults = {
        "title": "Casa de prueba",
        "status": "for_sale",
        "city": "Macas",
        "price": 50000,
        "latitude": -2.3,
        "longitude": -78.1,
    }
    defaults.update(overrides)
    return Property.objects.create(**defaults)


# --- ADM-002 -----------------------------------------------------------------

def test_a_failing_audit_write_does_not_undo_the_action(staff_client):
    """SPEC:ADM-002 — auditar nunca puede tumbar la acción auditada."""
    prop = make_property()

    with patch.object(
        AdminAuditLog.objects, "create", side_effect=RuntimeError("audit table is gone")
    ):
        response = staff_client.delete(
            reverse("admin_properties_detail", args=[prop.pk])
        )

    assert response.status_code == 204
    prop.refresh_from_db()
    assert prop.deleted_at is not None, "the delete must stand even with no audit row"
    assert AdminAuditLog.objects.count() == 0


# --- ADM-003 -----------------------------------------------------------------

def test_trashing_keeps_the_row_and_takes_it_off_the_public_catalog(staff_client):
    """SPEC:ADM-003 — el borrado del panel es una papelera, no un DELETE."""
    prop = make_property(status="for_rent")
    PropertyImage.objects.create(property=prop, status=PropertyImage.Status.READY)

    response = staff_client.delete(reverse("admin_properties_detail", args=[prop.pk]))

    assert response.status_code == 204
    prop.refresh_from_db()
    assert prop.status == "inactive"
    assert prop.deleted_previous_status == "for_rent"
    assert prop.images.count() == 1
    # Every public read is built on excluding `inactive`, so this one predicate
    # is what keeps it off the map, the sitemap and the landings.
    assert not Property.objects.exclude(status="inactive").filter(pk=prop.pk).exists()

    repeated = staff_client.delete(reverse("admin_properties_detail", args=[prop.pk]))
    assert repeated.status_code == 400


# --- ADM-004 / ADM-005 -------------------------------------------------------

def test_restore_returns_the_listing_to_the_operation_it_offered(staff_client):
    """SPEC:ADM-004 — restaurar devuelve el estado anterior, no `inactive`."""
    prop = make_property(status="for_rent")
    staff_client.delete(reverse("admin_properties_detail", args=[prop.pk]))

    response = staff_client.post(reverse("admin_properties_restore", args=[prop.pk]))

    assert response.status_code == 200
    prop.refresh_from_db()
    assert prop.status == "for_rent"
    assert prop.deleted_at is None
    assert prop.closed_reason == ""


def test_purge_only_reaches_a_listing_already_in_the_trash(staff_client):
    """SPEC:ADM-005 — el borrado definitivo solo se alcanza desde la papelera."""
    prop = make_property()

    alive = staff_client.post(reverse("admin_properties_purge", args=[prop.pk]))
    assert alive.status_code == 400
    assert Property.objects.filter(pk=prop.pk).exists()

    staff_client.delete(reverse("admin_properties_detail", args=[prop.pk]))
    purged = staff_client.post(reverse("admin_properties_purge", args=[prop.pk]))

    assert purged.status_code == 204
    assert not Property.objects.filter(pk=prop.pk).exists()


# --- ADM-006 -----------------------------------------------------------------

def test_the_trash_empties_itself_after_the_retention_window(staff):
    """SPEC:ADM-006 — la papelera se vacía sola a los 30 días."""
    expired = make_property(title="Caducada")
    recent = make_property(title="Reciente")
    trash = PropertyTrashService()
    trash.soft_delete(expired, actor=staff)
    trash.soft_delete(recent, actor=staff)

    now = timezone.now()
    Property.objects.filter(pk=expired.pk).update(
        deleted_at=now - timedelta(days=TRASH_RETENTION_DAYS + 1)
    )
    Property.objects.filter(pk=recent.pk).update(
        deleted_at=now - timedelta(days=TRASH_RETENTION_DAYS - 1)
    )

    purged = ActivityRetentionService().purge_trash(now=now)

    assert purged == 1
    assert not Property.objects.filter(pk=expired.pk).exists()
    assert Property.objects.filter(pk=recent.pk).exists()


# --- ADM-007 -----------------------------------------------------------------

def _event_on(day, event_name="page_view", session="s1", is_bot=False):
    event = ActivityEvent.objects.create(
        event_name=event_name, session_id=session, is_bot=is_bot
    )
    ActivityEvent.objects.filter(pk=event.pk).update(created_at=day)
    return event


def test_activity_is_summarised_before_its_detail_is_pruned():
    """SPEC:ADM-007 — primero se condensa el día, después se borra su detalle."""
    now = timezone.now()
    old = now - timedelta(days=400)
    fresh = now - timedelta(days=2)
    _event_on(old, session="old-a")
    _event_on(old, session="old-b")
    _event_on(fresh, session="fresh-a")

    service = ActivityRetentionService()
    # The roll-up only closes finished days near today, so the ancient day is
    # summarised explicitly — exactly what the nightly task chain does over time.
    ActivityDailyRollup.objects.create(
        day=timezone.localdate(old), event_name="page_view", is_bot=False,
        events=2, sessions=2,
    )
    service.roll_up(now=now)

    deleted = service.prune_activity(now=now, retention_days=180)

    assert deleted == 2
    assert not ActivityEvent.objects.filter(created_at__lt=now - timedelta(days=180)).exists()
    # The series outlives the rows it was built from: that is the whole point.
    summary = ActivityDailyRollup.objects.get(day=timezone.localdate(old))
    assert summary.events == 2
    assert ActivityEvent.objects.count() == 1, "a day inside the window keeps its detail"


def test_a_day_without_a_summary_is_never_pruned():
    """SPEC:ADM-007 — un día caducado sin resumen se queda."""
    now = timezone.now()
    _event_on(now - timedelta(days=400), session="orphan")

    deleted = ActivityRetentionService().prune_activity(now=now, retention_days=180)

    assert deleted == 0
    assert ActivityEvent.objects.count() == 1


# --- ADM-009 -----------------------------------------------------------------

def test_windows_that_cross_the_bot_cutoff_are_flagged(settings):
    """SPEC:ADM-009 — una ventana anterior al corte se declara no comparable."""
    settings.ACTIVITY_BOT_FILTER_SINCE = "2026-08-03"
    now = timezone.now().replace(year=2026, month=8, day=21)

    result = _comparability(
        now,
        {
            "month": now - timedelta(days=30),
            "period": now - timedelta(days=7),
        },
    )

    assert result["bot_filter_since"] == "2026-08-03"
    assert result["windows"]["month"]["crosses_bot_cutoff"] is True
    assert result["windows"]["period"]["crosses_bot_cutoff"] is False


# --- ADM-011 -----------------------------------------------------------------

def test_an_export_token_in_the_querystring_is_rejected(staff):
    """SPEC:ADM-011 — el token de una exportación no viaja por la URL."""
    token = str(RefreshToken.for_user(staff).access_token)
    client = Client()

    from_query = client.get(f"/api/admin/export/users/?token={token}")
    from_header = client.get(
        "/api/admin/export/users/", HTTP_AUTHORIZATION=f"Bearer {token}"
    )

    assert from_query.status_code == 401
    assert from_header.status_code == 200


# --- ADM-010 -----------------------------------------------------------------

def test_exporting_writes_who_downloaded_what(staff):
    """SPEC:ADM-010 — una copia de datos personales saliendo del sistema se audita."""
    token = str(RefreshToken.for_user(staff).access_token)

    response = Client().get(
        "/api/admin/export/users/", HTTP_AUTHORIZATION=f"Bearer {token}"
    )
    body = b"".join(response.streaming_content).decode("utf-8")

    assert response.status_code == 200
    assert response["Cache-Control"] == "no-store, private"
    assert body.startswith("﻿"), "Excel on Windows needs the BOM to read UTF-8"
    entry = AdminAuditLog.objects.get(action="export.download")
    assert entry.target_label == "users"
    assert entry.actor_id == staff.pk


# --- ADM-008 -----------------------------------------------------------------

def test_the_dashboard_serves_a_cached_payload_and_refresh_bypasses_it(staff_client):
    """SPEC:ADM-008 — el dashboard se sirve de caché versionada."""
    from django.core.cache import cache

    cache.clear()
    first = staff_client.get(reverse("admin_dashboard"))
    second = staff_client.get(reverse("admin_dashboard"))
    refreshed = staff_client.get(reverse("admin_dashboard") + "?refresh=1")

    assert first.data["cached"] is False
    assert second.data["cached"] is True
    assert refreshed.data["cached"] is False


def test_publishing_a_property_invalidates_the_cached_dashboard(staff_client):
    """SPEC:ADM-008 — la clave lleva la versión del inventario."""
    from django.core.cache import cache

    cache.clear()
    staff_client.get(reverse("admin_dashboard"))
    before = staff_client.get(reverse("admin_dashboard"))
    assert before.data["cached"] is True

    make_property(title="Anuncio nuevo")

    after = staff_client.get(reverse("admin_dashboard"))
    assert after.data["cached"] is False
