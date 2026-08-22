"""Stream administrative datasets as spreadsheet-compatible CSV files.

Rows are yielded incrementally to keep the full catalogue out of worker memory.
A UTF-8 BOM preserves accented text in Excel. Cells that spreadsheet programs
could interpret as formulas are neutralized at the export boundary.
"""

from __future__ import annotations

import csv


from django.db.models import Count

from real_estate.models import AdminAuditLog, Lead, Property

# Keep database round trips efficient without materializing the full dataset.
CHUNK_SIZE = 500

UTF8_BOM = "﻿"


class _Echo:
    """File-like adapter that returns each value written by ``csv.writer``."""

    def write(self, value):
        return value


class CsvExportService:
    """Generate admin CSV files without loading a complete table into memory."""

    DATASETS = ("properties", "users", "leads", "audit")

    def rows(self, dataset, queryset=None):
        """Return ``(filename, line_iterator)`` for the requested dataset."""
        builder = {
            "properties": self._properties,
            "users": self._users,
            "leads": self._leads,
            "audit": self._audit,
        }[dataset]
        header, iterator = builder(queryset)
        return f"{dataset}.csv", self._stream(header, iterator)

    def _stream(self, header, iterator):
        writer = csv.writer(_Echo())
        yield UTF8_BOM + writer.writerow(header)
        for row in iterator:
            yield writer.writerow(self._safe_cell(value) for value in row)

    @staticmethod
    def _safe_cell(value):
        """Prevent user-controlled values from becoming spreadsheet formulas."""
        if not isinstance(value, str):
            return value
        if value.lstrip(" ").startswith(("=", "+", "-", "@", "\t", "\r")):
            return "'" + value
        return value

    # --- Datasets ---

    def _properties(self, queryset):
        base = queryset if queryset is not None else Property.objects.all()
        base = (
            base.select_related("owner", "source")
            .annotate(image_count=Count("images", distinct=True))
            .order_by("-created_at")
        )
        header = [
            "id", "codigo", "titulo", "tipo", "estado", "precio", "area_m2",
            "ciudad", "provincia", "sector", "latitud", "longitud",
            "propietario", "importada", "fuente", "duplicada", "fotos",
            "visitas", "en_papelera", "creada", "actualizada",
        ]

        def generate():
            for prop in base.iterator(chunk_size=CHUNK_SIZE):
                yield [
                    prop.pk,
                    prop.short_code or "",
                    prop.title,
                    prop.property_type,
                    prop.status,
                    prop.price if prop.price is not None else "",
                    prop.area if prop.area is not None else "",
                    prop.city,
                    prop.province,
                    prop.sector_label or prop.sector_key,
                    prop.latitude if prop.latitude is not None else "",
                    prop.longitude if prop.longitude is not None else "",
                    getattr(prop.owner, "email", "") or "",
                    "si" if prop.is_imported else "no",
                    prop.source.slug if prop.source_id else "",
                    "si" if prop.is_duplicate else "no",
                    prop.image_count,
                    prop.views_count,
                    "si" if prop.deleted_at else "no",
                    prop.created_at.isoformat(),
                    prop.updated_at.isoformat(),
                ]

        return header, generate()

    def _users(self, queryset):
        from django.contrib.auth import get_user_model

        base = queryset if queryset is not None else get_user_model().objects.all()
        base = base.annotate(properties_total=Count("properties", distinct=True)).order_by("-date_joined")
        header = [
            "id", "email", "usuario", "nombre", "apellido", "activo", "staff",
            "correo_verificado", "proveedor", "propiedades", "alta", "ultimo_acceso",
        ]

        def generate():
            for user in base.iterator(chunk_size=CHUNK_SIZE):
                yield [
                    user.pk,
                    user.email,
                    user.username,
                    user.first_name,
                    user.last_name,
                    "si" if user.is_active else "no",
                    "si" if user.is_staff else "no",
                    "si" if user.is_email_verified else "no",
                    user.oauth_provider or "",
                    user.properties_total,
                    user.date_joined.isoformat() if user.date_joined else "",
                    user.last_login.isoformat() if user.last_login else "",
                ]

        return header, generate()

    def _leads(self, queryset):
        base = queryset if queryset is not None else Lead.objects.all()
        base = base.select_related("property").order_by("-created_at")
        header = [
            "id", "propiedad_id", "propiedad", "nombre", "telefono", "email",
            "mensaje", "estado", "origen", "creado",
        ]

        def generate():
            for lead in base.iterator(chunk_size=CHUNK_SIZE):
                yield [
                    lead.pk,
                    lead.property_id or "",
                    getattr(lead.property, "title", "") or "",
                    lead.name,
                    lead.phone,
                    lead.email,
                    (lead.message or "").replace("\n", " ").strip(),
                    lead.status,
                    lead.source,
                    lead.created_at.isoformat(),
                ]

        return header, generate()

    def _audit(self, queryset):
        base = queryset if queryset is not None else AdminAuditLog.objects.all()
        base = base.order_by("-created_at")
        header = [
            "id", "fecha", "actor", "accion", "tipo_objetivo", "objetivo_id",
            "objetivo", "cambios", "ip",
        ]

        def generate():
            for row in base.iterator(chunk_size=CHUNK_SIZE):
                yield [
                    row.pk,
                    row.created_at.isoformat(),
                    row.actor_label,
                    row.action,
                    row.target_type,
                    row.target_id,
                    row.target_label,
                    "; ".join(f"{key}={value}" for key, value in (row.changes or {}).items()),
                    row.ip or "",
                ]

        return header, generate()
