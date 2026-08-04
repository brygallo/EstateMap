import json
import hashlib
import logging
import os
import time
import uuid

from django.db import connection
from django.db.models import F
from django.http import JsonResponse
from django.utils import timezone


logger = logging.getLogger("observability")


def record_incident(*, request, request_id, status_code=500, exception=None):
    """Persist an aggregated failure without query strings, bodies, or headers."""
    try:
        from real_estate.models import SystemIncident

        exception_name = type(exception).__name__ if exception else "HTTPError"
        path = str(getattr(request, "path", ""))[:500]
        method = str(getattr(request, "method", ""))[:10]
        raw = f"{method}|{path}|{status_code}|{exception_name}"
        fingerprint = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        incident, created = SystemIncident.objects.get_or_create(
            fingerprint=fingerprint,
            defaults={
                "kind": "unhandled_error" if exception else "http_error",
                "severity": "critical" if status_code >= 500 else "warning",
                "status_code": status_code,
                "method": method,
                "path": path,
                "message": exception_name,
                "request_id": request_id,
            },
        )
        if not created:
            SystemIncident.objects.filter(pk=incident.pk).update(
                occurrences=F("occurrences") + 1,
                last_seen_at=timezone.now(),
                request_id=request_id,
                resolved=False,
            )
    except Exception:
        # Observability must never turn the original failure into another one.
        logger.warning("Could not persist operational incident", exc_info=True)


class ObservabilityMiddleware:
    """Correlación, latencia, release y errores en logs JSON centralizables."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.slow_ms = int(os.getenv("SLOW_ENDPOINT_MS", "1000"))
        self.release = os.getenv("RELEASE_SHA", "development")

    def __call__(self, request):
        started = time.monotonic()
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))[:64]
        try:
            response = self.get_response(request)
        except Exception as exc:
            request._incident_recorded = True
            record_incident(request=request, request_id=request_id, exception=exc)
            logger.exception(json.dumps({
                "kind": "unhandled_error", "request_id": request_id,
                "method": request.method, "path": request.path,
                "release": self.release,
            }))
            raise
        duration_ms = round((time.monotonic() - started) * 1000, 1)
        if response.status_code >= 500 and not getattr(request, "_incident_recorded", False):
            record_incident(
                request=request,
                request_id=request_id,
                status_code=response.status_code,
            )
        response["X-Request-ID"] = request_id
        response["X-Response-Time-Ms"] = str(duration_ms)
        response["X-Release"] = self.release
        record = {
            "kind": "http_request", "request_id": request_id, "method": request.method,
            "path": request.path, "status": response.status_code,
            "duration_ms": duration_ms, "release": self.release,
        }
        if duration_ms >= self.slow_ms:
            record["alert"] = "slow_endpoint"
            logger.warning(json.dumps(record))
        else:
            logger.info(json.dumps(record))
        return response


def health(request):
    status = "ok"
    checks = {}
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        checks["database"] = "ok"
    except Exception as exc:
        status = "error"
        checks["database"] = f"error:{type(exc).__name__}"

    try:
        from django.core.cache import cache

        cache_key = "system:health:probe"
        cache.set(cache_key, "ok", 10)
        checks["cache"] = "ok" if cache.get(cache_key) == "ok" else "error"
        if checks["cache"] != "ok":
            status = "error"
        worker_heartbeat = cache.get("system:worker:heartbeat")
        checks["worker"] = "ok" if worker_heartbeat and time.time() - worker_heartbeat < 180 else "stale"
        if checks["worker"] != "ok":
            status = "degraded" if status == "ok" else status
    except Exception as exc:
        checks["cache"] = f"error:{type(exc).__name__}"
        checks["worker"] = "unknown"
        status = "error"

    return JsonResponse({
        "status": status,
        "release": os.getenv("RELEASE_SHA", "development"),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "checks": checks,
    }, status=200 if status in {"ok", "degraded"} else 503)
