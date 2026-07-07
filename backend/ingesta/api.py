"""
API de administración de la ingesta para el panel del frontend.
Todos los endpoints requieren usuario staff (``IsAdminUser``).

Rutas (montadas bajo /api/admin/ingesta/ en real_estate/urls.py):
  GET  sources/         -> fuentes + estadísticas
  GET  runs/            -> últimas ejecuciones (para seguir el progreso)
  POST launch/          -> lanza una ejecución {source, limit, only_new}
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from real_estate.permissions import IsAdminUser

from .models import Fuente, IngestaRun
from .runner import launch_subprocess
from .scrapers import available_scrapers, get_scraper


def _source_dict(f):
    from real_estate.models import Property

    qs = Property.objects.filter(source=f, is_imported=True)
    return {
        "slug": f.slug,
        "nombre": f.nombre,
        "base_url": f.base_url,
        "activa": f.activa,
        "total": qs.count(),
        "activas": qs.exclude(status="inactive").exclude(is_duplicate=True).count(),
        "duplicados": qs.filter(is_duplicate=True).count(),
        "disponibles": f.disponibles,
        "disponibles_at": f.disponibles_at,
        "last_import_at": f.last_import_at,
    }


def _run_dict(r):
    return {
        "id": r.id,
        "fuente": r.fuente.slug,
        "estado": r.estado,
        "estado_label": r.get_estado_display(),
        "modo": r.modo,
        "modo_label": r.get_modo_display(),
        "limit": r.limit,
        "solo_nuevas": r.solo_nuevas,
        "vistos": r.vistos,
        "creadas": r.creadas,
        "actualizadas": r.actualizadas,
        "duplicadas": r.duplicadas,
        "caducadas": r.caducadas,
        "sin_ubicacion": r.sin_ubicacion,
        "cargadas": r.cargadas,
        "mensaje": r.mensaje,
        "lanzado_por": r.lanzado_por,
        "started_at": r.started_at,
        "finished_at": r.finished_at,
        "created_at": r.created_at,
    }


def _ensure_sources():
    """Crea/actualiza las Fuentes a partir de los scrapers registrados."""
    for key in available_scrapers():
        scraper = get_scraper(key)
        Fuente.objects.update_or_create(slug=scraper.key, defaults=scraper.fuente_defaults())


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def sources(request):
    _ensure_sources()
    return Response([_source_dict(f) for f in Fuente.objects.all()])


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def runs(request):
    qs = IngestaRun.objects.select_related("fuente").all()[:20]
    return Response([_run_dict(r) for r in qs])


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def launch(request):
    source = request.data.get("source", "properati")
    scraper = get_scraper(source)
    if scraper is None:
        return Response(
            {"error": f"Fuente '{source}' no disponible."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    fuente, _ = Fuente.objects.update_or_create(
        slug=scraper.key, defaults=scraper.fuente_defaults()
    )

    # No permitir dos corridas simultáneas de la misma fuente.
    activa = fuente.runs.filter(estado__in=["pending", "running"]).first()
    if activa:
        return Response(
            {"error": f"Ya hay una ejecución en curso (#{activa.id}).", "run": _run_dict(activa)},
            status=status.HTTP_409_CONFLICT,
        )

    limit = request.data.get("limit")
    try:
        limit = int(limit) if limit not in (None, "", "0", 0) else None
    except (TypeError, ValueError):
        limit = None

    modo = "refresh" if request.data.get("modo") == "refresh" else "load"
    # En 'refresh' no re-descargamos imágenes por defecto (más rápido); en 'load' sí.
    con_imagenes = modo == "load"

    run = IngestaRun.objects.create(
        fuente=fuente,
        limit=limit,
        modo=modo,
        con_imagenes=con_imagenes,
        solo_nuevas=bool(request.data.get("only_new")),
        lanzado_por=request.user.get_username(),
    )
    launch_subprocess(run)
    return Response(_run_dict(run), status=status.HTTP_201_CREATED)
