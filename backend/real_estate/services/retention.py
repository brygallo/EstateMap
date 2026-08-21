"""Qué se guarda para siempre y qué caduca, y en qué orden.

`ActivityEvent` es la tabla que crece sin techo en un host de 8 GB compartido
con Aents y el correo: una fila por clic, por apertura de ficha y por crawler
que ejecuta JavaScript. El panel la consulta entera cada vez que alguien abre el
dashboard. Nadie la ha podado nunca.

Podarla sin más borraría el único registro de lo que pasó hace tres meses, así
que el orden importa y no es negociable: **primero se condensa el día, después
se borra el detalle de ese día**. Un día sin resumen no se poda, aunque le toque
por fecha; es la garantía de que una tarea a medias no se lleve la serie por
delante.

Lo que caduca y por qué:

- El detalle de actividad, a los 180 días. La serie diaria sobrevive.
- Las incidencias resueltas, a los 90. Una incidencia cerrada hace tres meses ya
  no es diagnóstico, es ruido en la lista.
- La auditoría, a los dos años. Es la más barata en filas y la más cara de no
  tener, así que es la que más dura.
- La papelera, a los 30 días (ver `PropertyTrashService`).
"""

from __future__ import annotations

import logging
from datetime import datetime, time, timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from real_estate.models import ActivityDailyRollup, ActivityEvent, AdminAuditLog, SystemIncident

logger = logging.getLogger(__name__)

ACTIVITY_RETENTION_DAYS = 180
INCIDENT_RETENTION_DAYS = 90
AUDIT_RETENTION_DAYS = 730

# Cuántos días recientes se vuelven a resumir en cada pasada. Uno solo dejaría
# huecos si la tarea no corre una noche; una semana los rellena sin recorrer la
# tabla entera, y como la fila es única por (día, evento, bot) reescribir es
# idempotente.
REROLL_DAYS = 7

# Se borra a bocados. Un DELETE de un millón de filas en una transacción bloquea
# la tabla el tiempo suficiente para que las escrituras del portal esperen.
DELETE_BATCH = 5000


def _day_start(day):
    """Instante en que empieza ese día, para filtrar por rango y usar el índice."""
    return timezone.make_aware(
        datetime.combine(day, time.min), timezone.get_current_timezone()
    )


class ActivityRetentionService:
    """Condensa el día, después poda el detalle. Nunca al revés."""

    def roll_up(self, now=None):
        """Escribe una fila por (día, evento, bot) para los días ya cerrados."""
        now = now or timezone.now()
        today = timezone.localdate(now)
        start = today - timedelta(days=REROLL_DAYS)

        rows = (
            # Por rango de instantes y no por `created_at__date`: la segunda
            # forma envuelve la columna en una función y deja fuera de juego a
            # `activity_event_date_idx`.
            ActivityEvent.objects.filter(
                created_at__gte=_day_start(start), created_at__lt=_day_start(today)
            )
            .annotate(day=TruncDate("created_at"))
            .values("day", "event_name", "is_bot")
            .annotate(
                events=Count("id"),
                # Distinto por día. No se pueden sumar entre días sin inflarlo:
                # la misma persona que vuelve mañana es una sesión nueva allí y
                # la misma aquí. Se excluye la cadena vacía porque «sin sesión»
                # no es una sesión, y si no todas las visitas anónimas sin
                # cookie contarían como una sola.
                sessions=Count(
                    "session_id", distinct=True, filter=~Q(session_id="")
                ),
            )
        )

        written = 0
        for row in rows:
            ActivityDailyRollup.objects.update_or_create(
                day=row["day"],
                event_name=row["event_name"],
                is_bot=row["is_bot"],
                defaults={"events": row["events"], "sessions": row["sessions"]},
            )
            written += 1
        return written

    def prune_activity(self, now=None, retention_days=ACTIVITY_RETENTION_DAYS):
        """Borra el detalle caducado, día a día y solo si ese día ya está resumido."""
        now = now or timezone.now()
        cutoff = timezone.localdate(now) - timedelta(days=retention_days)
        oldest = (
            ActivityEvent.objects.order_by("created_at")
            .values_list("created_at", flat=True)
            .first()
        )
        if oldest is None:
            return 0

        deleted = 0
        day = timezone.localdate(oldest)
        while day < cutoff:
            if ActivityDailyRollup.objects.filter(day=day).exists():
                deleted += self._delete_day(day)
            else:
                # Un día sin resumen se queda. Borrarlo perdería la serie, que
                # es justo lo que la poda existe para conservar.
                logger.warning("activity_prune_skipped day=%s reason=no_rollup", day)
            day += timedelta(days=1)
        return deleted

    def _delete_day(self, day):
        start, end = _day_start(day), _day_start(day + timedelta(days=1))
        deleted = 0
        while True:
            batch = list(
                ActivityEvent.objects.filter(
                    created_at__gte=start, created_at__lt=end
                ).values_list("id", flat=True)[:DELETE_BATCH]
            )
            if not batch:
                break
            removed, _ = ActivityEvent.objects.filter(id__in=batch).delete()
            deleted += removed
            if len(batch) < DELETE_BATCH:
                break
        return deleted

    def prune_incidents(self, now=None):
        now = now or timezone.now()
        cutoff = now - timedelta(days=INCIDENT_RETENTION_DAYS)
        removed, _ = SystemIncident.objects.filter(resolved=True, last_seen_at__lt=cutoff).delete()
        return removed

    def prune_audit(self, now=None):
        now = now or timezone.now()
        cutoff = now - timedelta(days=AUDIT_RETENTION_DAYS)
        removed, _ = AdminAuditLog.objects.filter(created_at__lt=cutoff).delete()
        return removed

    def purge_trash(self, now=None):
        """Borra de verdad lo que lleva más de un mes en la papelera."""
        from real_estate.services.trash import PropertyTrashService

        expired = PropertyTrashService().expired(now=now)
        count = expired.count()
        for prop in expired.iterator(chunk_size=100):
            # Una a una y no con `.delete()` del queryset: el borrado en bloque
            # se salta `Property.delete()` y las señales que limpian las fotos
            # del almacén de objetos, y dejaría los archivos huérfanos en MinIO.
            prop.delete()
        return count
