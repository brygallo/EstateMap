"""Sacar los datos del navegador y meterlos en una hoja de cálculo.

El panel enseña los números que alguien pensó de antemano. La pregunta que
todavía no se le ha ocurrido a nadie se contesta en una hoja de cálculo, y hasta
ahora no había forma de llegar hasta ella: los datos entraban al navegador y se
quedaban ahí.

Dos decisiones que no son de comodidad:

- Se transmite fila a fila (`StreamingHttpResponse` sobre un generador con
  `iterator()`). Un `list(queryset)` de catorce mil propiedades dentro de un
  worker de 512 MB compartido con la ingesta es la forma conocida de tumbar el
  contenedor a la hora de mayor tráfico.
- Se escribe siempre con BOM UTF-8. Excel en Windows —que es donde acaba este
  archivo— abre un CSV sin BOM interpretando latin-1, y «Cumbayá» llega roto.

Quién exporta queda en la auditoría: un CSV de usuarios o de leads es una copia
de datos personales saliendo del sistema, y eso es exactamente lo que un
registro de acceso existe para contar.
"""

from __future__ import annotations

import csv


from django.db.models import Count

from real_estate.models import AdminAuditLog, Lead, Property

# Cuántas filas se materializan de golpe al recorrer el queryset. Suficiente
# para que el viaje a Postgres valga la pena, bastante por debajo de lo que
# ocupa el catálogo entero en memoria.
CHUNK_SIZE = 500

UTF8_BOM = "﻿"


class _Echo:
    """Un «archivo» que devuelve lo que le escriben, para el generador de csv."""

    def write(self, value):
        return value


class CsvExportService:
    """Genera los CSV del panel sin cargar la tabla entera en memoria."""

    DATASETS = ("properties", "users", "leads", "audit")

    def rows(self, dataset, queryset=None):
        """Devuelve `(nombre_de_archivo, generador_de_líneas)`."""
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
            yield writer.writerow(row)

    # --- Conjuntos ---

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
