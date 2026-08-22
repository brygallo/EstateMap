"""Persist administrative actions where operators can search them later.

The structured logger remains the first diagnostic surface, while this service
also stores the same action in a database table that survives container
replacement. Audit persistence is best effort: it must never roll back an
administrative action that already succeeded.
"""

from __future__ import annotations

import logging

from real_estate.models import AdminAuditLog

logger = logging.getLogger(__name__)

# Headers populated by the trusted nginx edge with the original client address.
_FORWARDED_HEADERS = ("HTTP_X_FORWARDED_FOR", "HTTP_X_REAL_IP")


class AdminAuditService:
    """Write one durable audit row for an administrative action."""

    def record(
        self,
        request,
        action,
        *,
        target_type="",
        target_id="",
        target_label="",
        changes=None,
    ):
        """Persist the action and return its row, or ``None`` on failure.

        ``changes`` contains only the detail needed to explain an operation.
        Callers avoid copying complete user content into a second data store.
        """
        actor = getattr(request, "user", None)
        actor = actor if getattr(actor, "is_authenticated", False) else None
        try:
            return AdminAuditLog.objects.create(
                actor=actor,
                actor_label=self._label(actor),
                action=action,
                target_type=target_type,
                target_id=str(target_id or ""),
                target_label=(target_label or "")[:250],
                changes=changes or {},
                ip=self._client_ip(request),
            )
        except Exception:
            # The action already happened; an audit outage must not undo it.
            logger.exception("admin_audit_persist_failed action=%s target=%s", action, target_id)
            return None

    def _label(self, actor):
        if actor is None:
            return ""
        return (getattr(actor, "email", "") or getattr(actor, "username", "") or f"#{actor.pk}")[:150]

    def _client_ip(self, request):
        meta = getattr(request, "META", {}) or {}
        for header in _FORWARDED_HEADERS:
            value = (meta.get(header) or "").split(",")[0].strip()
            if value:
                return value
        return meta.get("REMOTE_ADDR") or None
