"""«¿Por qué no se ve esta propiedad?», contestado sin entrar al servidor.

La respuesta siempre ha existido, repartida: el estado está en la fila, el
estado de las fotos en `PropertyImage`, la absorción de la zona en un servicio,
la versión de la caché en Redis y el umbral de la landing en el frontend. Juntar
esas piezas costaba una sesión de SSH por pregunta.

Aquí se juntan, y se dicen en el orden en que importan: primero lo que impide
que se vea (`blockers`), después lo que la degrada sin ocultarla (`warnings`),
y al final los datos crudos por si la causa es otra. Cada bloqueo lleva escrito
qué hay que hacer para levantarlo, porque un diagnóstico que no dice el remedio
solo mueve la pregunta de sitio.
"""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from real_estate.cache_utils import VERSION_KEYS, props_version
from real_estate.models import ActivityEvent, Lead, Property, PropertyImage
from real_estate.services.seo_health import MIN_COMBO_PROPERTIES, MIN_DESCRIPTION_CHARS
from real_estate.services.trash import TRASH_RETENTION_DAYS


class PropertyDiagnosticsService:
    """Todo lo que decide si un anuncio se ve, y por qué, en una respuesta."""

    def build(self, prop):
        blockers = self._blockers(prop)
        return {
            "property": {
                "id": prop.pk,
                "title": prop.title,
                "short_code": prop.short_code,
                "status": prop.status,
                "property_type": prop.property_type,
                "city": prop.city,
                "province": prop.province,
                "price": float(prop.price) if prop.price else None,
                "created_at": prop.created_at,
                "updated_at": prop.updated_at,
                "owner": self._owner(prop),
            },
            "visible": not blockers,
            "blockers": blockers,
            "warnings": self._warnings(prop),
            "images": self._images(prop),
            "location": self._location(prop),
            "seo": self._seo(prop),
            "origin": self._origin(prop),
            "activity": self._activity(prop),
            "trash": self._trash(prop),
            "cache": {
                "versions": {scope: props_version(scope) for scope in VERSION_KEYS},
            },
        }

    # --- Por qué no se ve ---

    def _blockers(self, prop):
        """Lo que deja el anuncio fuera del mapa o del catálogo público."""
        blockers = []
        if prop.deleted_at is not None:
            blockers.append({
                "code": "trashed",
                "label": "Está en la papelera",
                "detail": f"Enviado a la papelera el {prop.deleted_at:%d/%m/%Y}.",
                "fix": "Restáuralo desde la papelera del panel.",
            })
        elif prop.status == "inactive":
            blockers.append({
                "code": "inactive",
                "label": "Está inactiva",
                "detail": f"Cierre declarado: {prop.closed_reason or 'sin motivo'}.",
                "fix": "Cambia el estado a «En venta» o «En alquiler».",
            })
        if prop.is_duplicate:
            blockers.append({
                "code": "duplicate",
                "label": "Marcada como duplicada",
                "detail": "La ingesta decidió que otra fuente publica el mismo inmueble y esta perdió la preferencia.",
                "fix": "Si la decisión es incorrecta, desmarca el duplicado en la ficha de importación.",
            })
        if prop.latitude is None or prop.longitude is None:
            if not prop.polygon:
                blockers.append({
                    "code": "no_coordinates",
                    "label": "No aparece en el mapa",
                    "detail": "Sin latitud/longitud y sin polígono no entra en ninguna consulta por área visible.",
                    "fix": "Edita la ubicación de la propiedad y sitúala en el mapa.",
                })
        return blockers

    def _warnings(self, prop):
        """Lo que la deja peor colocada sin llegar a ocultarla."""
        warnings = []
        image_count = prop.images.count()
        if image_count == 0:
            warnings.append({
                "code": "no_images",
                "label": "Sin fotos",
                "detail": "Un anuncio sin fotos se lista, pero prácticamente no se abre.",
                "fix": "Sube al menos una foto.",
            })
        if not prop.title:
            warnings.append({
                "code": "no_title",
                "label": "Sin título",
                "detail": "El título es el enlace en la landing y el <title> de la ficha.",
                "fix": "Escribe un título con tipo, operación y zona.",
            })
        description_length = len(prop.description or "")
        if description_length < MIN_DESCRIPTION_CHARS:
            warnings.append({
                "code": "thin_description",
                "label": "Descripción corta",
                "detail": f"{description_length} caracteres; por debajo de {MIN_DESCRIPTION_CHARS} la ficha aporta poco a la página en la que se lista.",
                "fix": "Amplía la descripción con lo que no se ve en las fotos.",
            })
        if not prop.price or prop.price <= 0:
            warnings.append({
                "code": "no_price",
                "label": "Sin precio",
                "detail": "Queda fuera de los filtros de precio y de las estadísticas de mercado.",
                "fix": "Asigna un precio, aunque sea referencial.",
            })
        if not prop.city:
            warnings.append({
                "code": "no_city",
                "label": "Sin ciudad",
                "detail": "No entra en ninguna landing de ciudad ni en el combo de su tipo, y su zona no se puede resolver.",
                "fix": "Asigna la ciudad; es lo que decide en qué páginas aparece.",
            })
        if not prop.area or prop.area <= 0:
            warnings.append({
                "code": "no_area",
                "label": "Sin área",
                "detail": "Sin área no entra en el precio por m² de su zona.",
                "fix": "Registra el área en metros cuadrados.",
            })
        return warnings

    # --- Datos crudos ---

    def _images(self, prop):
        rows = list(prop.images.values("id", "status", "optimization_error", "uploaded_at"))
        by_status = {}
        for row in rows:
            by_status[row["status"]] = by_status.get(row["status"], 0) + 1
        return {
            "total": len(rows),
            "by_status": by_status,
            "failed": [
                {
                    "id": row["id"],
                    "status": row["status"],
                    "error": row["optimization_error"],
                    "uploaded_at": row["uploaded_at"],
                }
                for row in rows
                if row["status"] == PropertyImage.Status.FAILED or row["optimization_error"]
            ][:10],
        }

    def _location(self, prop):
        sector = self._sector(prop)
        return {
            "latitude": prop.latitude,
            "longitude": prop.longitude,
            "has_polygon": bool(prop.polygon),
            "address": prop.address,
            "sector_key": prop.sector_key,
            "sector_label": prop.sector_label,
            "sector": sector,
        }

    def _sector(self, prop):
        """En qué zona publicada cae el anuncio, y si esa zona fue absorbida.

        Deliberadamente no se llama a `find_sector` ni a `absorptions`. Esas
        resuelven la absorción de **todas** las zonas de una ciudad a la vez,
        comparando cada clave con todas las demás: en Quito son casi dos mil
        claves y 1,2 s por diálogo. Aquí solo interesa una clave, y para una
        clave la pregunta se contesta en un recorrido: de los que podrían
        absorberla —los que son prefijo suyo—, gana el primero en orden de
        tamaño que además la domine. Es la misma regla y el mismo umbral que
        aplica el sitemap, mirada desde el otro lado.
        """
        from real_estate.services.sectors import MIN_SECTOR_LISTINGS

        if not prop.sector_key or not prop.city:
            return None

        rows = list(
            Property.objects.filter(city__iexact=prop.city, is_duplicate=False)
            .exclude(status="inactive")
            .exclude(sector_key="")
            .values("sector_key")
            .annotate(count=Count("id"))
        )
        own = next((row for row in rows if row["sector_key"] == prop.sector_key), None)
        if own is None:
            return None

        ranked = sorted(rows, key=lambda row: -row["count"])
        parent = self._absorbing_parent(own, ranked)
        target = parent or own

        # El recuento de la zona resuelta incluye las esquinas que ella absorbe.
        # Solo pueden serlo las claves que empiezan por la suya, así que el
        # barrido se queda en un puñado de filas y no en la ciudad entera.
        total = target["count"] + sum(
            row["count"]
            for row in rows
            if row["sector_key"].startswith(target["sector_key"] + " ")
            and self._absorbing_parent(row, ranked) is target
        )
        return {
            "key": target["sector_key"],
            "name": prop.sector_label or target["sector_key"],
            "count": total,
            "threshold": MIN_SECTOR_LISTINGS,
            "has_page": total >= MIN_SECTOR_LISTINGS,
            # Cuando la clave del anuncio no es la de la zona resuelta, esta zona
            # fue absorbida por otra mayor y su página vive en la URL de aquella.
            "absorbed_into": target["sector_key"] if parent else None,
        }

    @staticmethod
    def _absorbing_parent(child, ranked):
        """La zona que se traga a `child`, o None si publica página propia."""
        from real_estate.services.sectors import PARENT_DOMINANCE

        for parent in ranked:
            if parent["sector_key"] == child["sector_key"]:
                continue
            if not child["sector_key"].startswith(parent["sector_key"] + " "):
                continue
            if parent["count"] < child["count"] * PARENT_DOMINANCE:
                continue
            return parent
        return None

    def _seo(self, prop):
        """Si la ficha entra al sitemap y si su combo de ciudad tiene página."""
        public = (
            Property.objects.exclude(status="inactive")
            .filter(is_duplicate=False, deleted_at__isnull=True)
        )
        combo_count = public.filter(
            city__iexact=prop.city, property_type=prop.property_type, status=prop.status
        ).count()
        return {
            "in_sitemap": public.filter(pk=prop.pk).exists(),
            "combo": {
                "city": prop.city,
                "property_type": prop.property_type,
                "status": prop.status,
                "count": combo_count,
                "threshold": MIN_COMBO_PROPERTIES,
                "has_page": combo_count >= MIN_COMBO_PROPERTIES,
                "missing": max(0, MIN_COMBO_PROPERTIES - combo_count),
            },
        }

    def _origin(self, prop):
        return {
            "is_imported": prop.is_imported,
            "source": prop.source.slug if prop.source_id else None,
            "external_id": prop.external_id,
            "source_url": prop.source_url,
            "source_agency": prop.source_agency,
            "imported_at": prop.imported_at,
            "last_seen_at": prop.last_seen_at,
            "is_duplicate": prop.is_duplicate,
            "image_hash": prop.image_hash,
        }

    def _activity(self, prop):
        since = timezone.now() - timedelta(days=30)
        events = ActivityEvent.objects.filter(property=prop, created_at__gte=since)
        human = events.filter(is_bot=False)
        return {
            "views_count": prop.views_count,
            "human_events_30d": human.count(),
            "bot_events_30d": events.filter(is_bot=True).count(),
            "detail_opens_30d": human.filter(
                event_name__in=["property_card_details_opened", "property_pin_clicked"]
            ).count(),
            "contacts_30d": human.filter(event_name="property_contact_clicked").count(),
            "leads_total": Lead.objects.filter(property=prop).count(),
        }

    def _trash(self, prop):
        if prop.deleted_at is None:
            return {"deleted": False}
        return {
            "deleted": True,
            "deleted_at": prop.deleted_at,
            "deleted_by": getattr(prop.deleted_by, "email", None),
            "previous_status": prop.deleted_previous_status,
            "purge_at": prop.deleted_at + timedelta(days=TRASH_RETENTION_DAYS),
        }

    def _owner(self, prop):
        if not prop.owner_id:
            return None
        return {
            "id": prop.owner_id,
            "email": prop.owner.email,
            "username": prop.owner.username,
            "is_active": prop.owner.is_active,
        }
