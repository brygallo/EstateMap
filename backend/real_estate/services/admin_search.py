"""Search every administrative dataset from one query."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q

from real_estate.models import Lead, PendingPublication, Property
from real_estate.services.phones import normalize_ec_phone

# Limit each group independently so one dataset cannot hide all the others.
RESULTS_PER_GROUP = 8
MIN_QUERY_LENGTH = 2


class AdminSearchService:
    """Resolve one query across all admin result types."""

    def search(self, query):
        term = (query or "").strip()
        if len(term) < MIN_QUERY_LENGTH:
            return {"query": term, "groups": [], "total": 0}

        groups = [
            {"type": "property", "label": "Propiedades", "results": self._properties(term)},
            {"type": "user", "label": "Usuarios", "results": self._users(term)},
            {"type": "lead", "label": "Contactos", "results": self._leads(term)},
            {"type": "pending", "label": "Publicaciones pendientes", "results": self._pending(term)},
        ]
        groups = [group for group in groups if group["results"]]
        return {
            "query": term,
            "groups": groups,
            "total": sum(len(group["results"]) for group in groups),
        }

    def _properties(self, term):
        phone = normalize_ec_phone(term)
        filters = (
            Q(title__icontains=term)
            | Q(address__icontains=term)
            | Q(city__icontains=term)
            | Q(short_code__iexact=term)
            | Q(external_id__iexact=term)
        )
        if phone:
            filters |= Q(contact_phone_normalized=phone)
        # A standalone number is commonly an id copied from a URL.
        if term.isdigit():
            filters |= Q(pk=int(term))

        rows = (
            Property.objects.filter(filters)
            .select_related("owner")
            .order_by("-created_at")[:RESULTS_PER_GROUP]
        )
        return [
            {
                "id": prop.pk,
                "title": prop.title or f"Propiedad #{prop.pk}",
                "subtitle": " · ".join(
                    part for part in [prop.short_code, prop.city, prop.status] if part
                ),
                "badge": "papelera" if prop.deleted_at else prop.status,
                "href": f"/admin/properties?focus={prop.pk}",
            }
            for prop in rows
        ]

    def _users(self, term):
        User = get_user_model()
        phone = normalize_ec_phone(term)
        filters = (
            Q(email__icontains=term)
            | Q(username__icontains=term)
            | Q(first_name__icontains=term)
            | Q(last_name__icontains=term)
        )
        if phone:
            filters |= Q(phone=phone)
        if term.isdigit():
            filters |= Q(pk=int(term))

        rows = User.objects.filter(filters).order_by("-date_joined")[:RESULTS_PER_GROUP]
        return [
            {
                "id": user.pk,
                "title": user.email or user.username,
                "subtitle": " ".join(part for part in [user.first_name, user.last_name] if part),
                "badge": "staff" if user.is_staff else ("activo" if user.is_active else "inactivo"),
                "href": f"/admin/users?focus={user.pk}",
            }
            for user in rows
        ]

    def _leads(self, term):
        rows = (
            Lead.objects.filter(
                Q(name__icontains=term) | Q(phone__icontains=term) | Q(email__icontains=term)
            )
            .select_related("property")
            .order_by("-created_at")[:RESULTS_PER_GROUP]
        )
        return [
            {
                "id": lead.pk,
                "title": lead.name or lead.phone,
                "subtitle": f"{lead.phone} · {getattr(lead.property, 'title', '') or 'sin propiedad'}",
                "badge": lead.status,
                "href": f"/admin/properties?focus={lead.property_id}",
            }
            for lead in rows
        ]

    def _pending(self, term):
        rows = (
            PendingPublication.objects.filter(
                Q(title__icontains=term)
                | Q(contact_phone__icontains=term)
                | Q(contact_email__icontains=term)
                | Q(city__icontains=term)
            )
            .order_by("-created_at")[:RESULTS_PER_GROUP]
        )
        return [
            {
                "id": row.pk,
                "title": row.title or row.contact_email or row.contact_phone or f"Solicitud #{row.pk}",
                "subtitle": " · ".join(
                    part for part in [row.contact_phone, row.city or "sin ciudad"] if part
                ),
                "badge": row.status,
                "href": f"/admin/pending-publications?focus={row.pk}",
            }
            for row in rows
        ]
