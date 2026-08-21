"""El rastro de lo que hace un administrador, guardado donde se pueda leer.

Cada escritura del panel ya dejaba una línea ``admin_audit action=…`` en el
logger. Se conservan: el log sigue siendo lo primero que se mira cuando algo
falla en producción. Lo que añade este servicio es que la misma línea quede
también en una tabla, porque el log de un contenedor se pierde en cada
despliegue y no se puede filtrar por «qué le pasó a la propiedad 412».

Regla de oro: **auditar nunca puede tumbar la operación auditada**. Una
transferencia consumada con la fila de auditoría perdida es un problema; una
transferencia que revienta porque la auditoría falló es peor. Por eso todo el
cuerpo va envuelto y el fallo solo se registra.
"""

from __future__ import annotations

import logging

from real_estate.models import AdminAuditLog

logger = logging.getLogger(__name__)

# Cabeceras que el borde (nginx) rellena con la IP real del cliente. El resto de
# la aplicación no las lee, así que se resuelven aquí y no en un middleware.
_FORWARDED_HEADERS = ("HTTP_X_FORWARDED_FOR", "HTTP_X_REAL_IP")


class AdminAuditService:
    """Escribe una línea de auditoría por cada acción administrativa."""

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
        """Persiste la acción y devuelve la fila, o ``None`` si no se pudo.

        `changes` describe qué cambió. Quien llama decide cuánto detalle cabe:
        para un cambio de estado, el valor nuevo es la información; para un
        cambio de texto, basta la lista de campos, porque copiar aquí la
        descripción entera convertiría la auditoría en una segunda copia del
        catálogo que nadie purga.
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
            # Sin `raise`: la acción ya ocurrió y deshacerla por no poder
            # anotarla sería el peor de los dos resultados posibles.
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
