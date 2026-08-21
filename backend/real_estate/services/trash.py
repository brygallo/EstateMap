"""La papelera: un borrado administrativo que se puede deshacer.

Hasta ahora `DELETE /api/admin/properties/{id}/` llamaba a `prop.delete()` y con
la fila se iban las imágenes del almacén de objetos, el historial de precios y
los leads recibidos. Un clic mal dado no tenía vuelta atrás, y en un catálogo
donde la mayoría de los anuncios los publicó otra persona, el borrado por error
es de los pocos fallos que no se pueden explicar con un «lo restauro».

La papelera no inventa un estado nuevo. Un anuncio en la papelera es un anuncio
`inactive` con fecha de defunción: desaparece del mapa, del sitemap, de las
landings y de las estadísticas porque todas ellas ya excluyen `inactive`, sin
tocar ni una consulta. `deleted_at` solo decide si el panel lo enseña en el
listado o en la papelera, y cuándo la purga puede llevárselo de verdad.
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

# Días que un anuncio sobrevive en la papelera antes de que la purga nocturna lo
# borre de verdad. Un mes es lo que tarda alguien en darse cuenta de que su
# anuncio no está y escribir para preguntarlo.
TRASH_RETENTION_DAYS = 30


class PropertyTrashService:
    """Envía a la papelera, restaura y purga anuncios."""

    def soft_delete(self, prop, actor=None):
        """Saca la propiedad del catálogo conservando la fila.

        Guarda el estado anterior porque restaurar tiene que devolverla al
        mercado: dejarla `inactive` sería restaurar una fila, no un anuncio.
        """
        if prop.deleted_at is not None:
            return prop
        prop.deleted_previous_status = prop.status
        prop.deleted_at = timezone.now()
        prop.deleted_by = actor if getattr(actor, "pk", None) else None
        prop.status = "inactive"
        prop.save(update_fields=[
            "deleted_previous_status", "deleted_at", "deleted_by", "status", "updated_at",
        ])
        return prop

    def restore(self, prop):
        """Devuelve el anuncio al estado que ofrecía antes del borrado."""
        if prop.deleted_at is None:
            return prop
        previous = prop.deleted_previous_status or "for_sale"
        if previous not in dict(prop.STATUS_CHOICES):
            previous = "for_sale"
        prop.status = previous
        if previous != "inactive":
            # Igual que en el cambio de estado en lote: reabrir un anuncio con
            # `closed_reason` puesto lo arrastraría de vuelta a `inactive` en el
            # siguiente guardado ordinario.
            prop.closed_reason = ""
            prop.closed_at = None
        prop.deleted_at = None
        prop.deleted_by = None
        prop.deleted_previous_status = ""
        prop.save(update_fields=[
            "status", "closed_reason", "closed_at",
            "deleted_at", "deleted_by", "deleted_previous_status", "updated_at",
        ])
        return prop

    def purge(self, prop):
        """Borrado definitivo. Solo desde la papelera, nunca desde el listado."""
        prop.delete()

    def expired(self, queryset=None, now=None):
        """Lo que la purga nocturna puede llevarse ya."""
        from real_estate.models import Property

        now = now or timezone.now()
        base = queryset if queryset is not None else Property.objects.all()
        return base.filter(deleted_at__lt=now - timedelta(days=TRASH_RETENTION_DAYS))
