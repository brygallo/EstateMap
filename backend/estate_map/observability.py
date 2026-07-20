import json
import logging
import os
import time
import uuid
from pathlib import Path

from django.db import connection
from django.http import JsonResponse


logger = logging.getLogger("observability")


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
        except Exception:
            logger.exception(json.dumps({
                "kind": "unhandled_error", "request_id": request_id,
                "method": request.method, "path": request.path,
                "release": self.release,
            }))
            raise
        duration_ms = round((time.monotonic() - started) * 1000, 1)
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

    verification_file = os.getenv("BACKUP_VERIFICATION_FILE", "")
    if verification_file:
        path = Path(verification_file)
        checks["backup_verified"] = path.exists()
        if path.exists():
            checks["backup_verified_at"] = int(path.stat().st_mtime)
    else:
        checks["backup_verified"] = False
        checks["backup_note"] = "BACKUP_VERIFICATION_FILE no configurado"

    return JsonResponse({
        "status": status,
        "release": os.getenv("RELEASE_SHA", "development"),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "checks": checks,
    }, status=200 if status == "ok" else 503)
