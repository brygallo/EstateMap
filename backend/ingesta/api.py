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
from .runner import launch_subprocess, reap_zombie_runs
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
        "errores": r.errores,
        "cargadas": r.cargadas,
        "mensaje": r.mensaje,
        "log": r.log,
        "cancel_requested": r.cancel_requested,
        "lanzado_por": r.lanzado_por,
        "started_at": r.started_at,
        "heartbeat_at": r.heartbeat_at,
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
    reap_zombie_runs()
    return Response([_source_dict(f) for f in Fuente.objects.all()])


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def runs(request):
    reap_zombie_runs()
    qs = IngestaRun.objects.select_related("fuente").all()[:20]
    return Response([_run_dict(r) for r in qs])


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def cancel(request):
    """
    Solicita cancelar un run en curso. Acepta ``{run_id}`` o ``{source}`` (en
    cuyo caso cancela el run activo de esa fuente). Solo pone la marca
    ``cancel_requested``; el proceso la detecta en su próximo checkpoint y
    termina de forma ordenada dejando el estado en ``cancelled``.
    """
    run_id = request.data.get("run_id")
    source = request.data.get("source")
    run = None
    if run_id:
        run = IngestaRun.objects.filter(pk=run_id).first()
    elif source:
        run = (IngestaRun.objects.filter(fuente__slug=source,
                                         estado__in=["pending", "running"])
               .order_by("-created_at").first())
    if run is None:
        return Response({"error": "No se encontró una ejecución para cancelar."},
                        status=status.HTTP_404_NOT_FOUND)
    if run.estado not in ("pending", "running"):
        return Response({"error": f"El run #{run.id} ya está {run.get_estado_display()}."},
                        status=status.HTTP_409_CONFLICT)
    run.cancel_requested = True
    run.save(update_fields=["cancel_requested"])
    return Response(_run_dict(run))


def _prop_thumb(prop):
    """Miniatura de la imagen principal (o la primera) sin disparar más queries
    de las ya prefetchadas."""
    imgs = list(prop.images.all())
    main = next((i for i in imgs if i.is_main), imgs[0] if imgs else None)
    if main and main.thumbnail:
        try:
            return main.thumbnail.url
        except Exception:
            return None
    return None


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def properties(request):
    """
    Lista las propiedades importadas de una fuente, para revisarlas desde el
    panel. Parámetros: ``source`` (slug, obligatorio), ``estado``
    (activas/inactivas/duplicadas/todas), ``q`` (búsqueda) y ``page``.
    """
    from django.db.models import Q

    from real_estate.models import Property

    slug = request.GET.get("source")
    fuente = Fuente.objects.filter(slug=slug).first()
    if fuente is None:
        return Response({"error": "Fuente no encontrada."}, status=status.HTTP_404_NOT_FOUND)

    qs = Property.objects.filter(source=fuente, is_imported=True)
    estado = request.GET.get("estado", "activas")
    if estado == "activas":
        qs = qs.exclude(status="inactive").filter(is_duplicate=False)
    elif estado == "inactivas":
        qs = qs.filter(status="inactive")
    elif estado == "duplicadas":
        qs = qs.filter(is_duplicate=True)
    # "todas" -> sin filtro adicional

    search = (request.GET.get("q") or "").strip()
    if search:
        qs = qs.filter(
            Q(title__icontains=search)
            | Q(city__icontains=search)
            | Q(external_id__icontains=search)
            | Q(source_agency__icontains=search)
        )

    qs = qs.prefetch_related("images").order_by("-imported_at", "-id")
    total = qs.count()

    try:
        page = max(1, int(request.GET.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    page_size = 20
    start = (page - 1) * page_size
    items = list(qs[start:start + page_size])

    results = [{
        "id": p.id,
        "title": p.title,
        "price": float(p.price) if p.price is not None else None,
        "rent_price": float(p.rent_price) if p.rent_price is not None else None,
        "status": p.status,
        "property_type": p.property_type,
        "city": p.city,
        "province": p.province,
        "is_duplicate": p.is_duplicate,
        "source_agency": p.source_agency,
        "source_url": p.source_url,
        "external_id": p.external_id,
        "imported_at": p.imported_at,
        "last_seen_at": p.last_seen_at,
        "thumbnail": _prop_thumb(p),
    } for p in items]

    return Response({
        "total": total,
        "page": page,
        "page_size": page_size,
        "num_pages": (total + page_size - 1) // page_size if total else 1,
        "results": results,
    })


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

    # Recupera runs colgados de esta fuente antes de decidir si hay uno activo,
    # para que un proceso muerto no bloquee futuras ejecuciones para siempre.
    reap_zombie_runs(fuente=fuente)

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
