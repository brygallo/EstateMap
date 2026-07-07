"""
Lógica de ejecución de la carga en un solo paso, compartida por el comando
``ingesta_load`` y el botón del admin. Actualiza un ``IngestaRun`` para poder
seguir el progreso desde el panel.
"""
import subprocess
import sys

from django.conf import settings
from django.utils import timezone

from .models import IngestaRun
from .pipeline.location import validate_location
from .pipeline.upsert import upsert_property
from .scrapers import get_scraper


def launch_subprocess(run: IngestaRun):
    """Lanza ``ingesta_load --run-id`` como proceso independiente (no bloquea)."""
    subprocess.Popen(
        [sys.executable, "manage.py", "ingesta_load", "--run-id", str(run.id)],
        cwd=str(settings.BASE_DIR),
        start_new_session=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _refresh_disponibles(fuente, scraper):
    """Actualiza el total que ofrece el portal (best-effort)."""
    try:
        n = scraper.count_available()
        if n:
            fuente.disponibles = n
            fuente.disponibles_at = timezone.now()
            fuente.save(update_fields=["disponibles", "disponibles_at"])
    except Exception:
        pass


def execute(run_obj: IngestaRun, log=None):
    """Despacha según el modo del run: cargar/actualizar del portal, o refrescar
    las existentes y verificar vigencia."""
    if run_obj.modo == "refresh":
        return run_refresh(run_obj, log=log)
    return run_load(run_obj, log=log)


def run_load(run: IngestaRun, log=None):
    """Ejecuta la ingesta de ``run.fuente`` actualizando el propio ``run``."""
    log = log or (lambda *_: None)
    fuente = run.fuente
    scraper = get_scraper(fuente.scraper_key)
    if scraper is None:
        run.estado = "error"
        run.mensaje = f"Scraper '{fuente.scraper_key}' no registrado."
        run.finished_at = timezone.now()
        run.save()
        return run

    run.estado = "running"
    run.started_at = timezone.now()
    run.save(update_fields=["estado", "started_at"])
    _refresh_disponibles(fuente, scraper)

    searches = (fuente.config or {}).get("searches")
    do_images = run.con_imagenes

    # Modo "por tandas": saltar los anuncios ya importados para avanzar a los
    # que faltan. Cargamos las URLs ya guardadas de esta fuente en un set.
    skip_url = None
    if run.solo_nuevas:
        from real_estate.models import Property

        conocidas = set(
            Property.objects.filter(source=fuente, is_imported=True)
            .exclude(source_url="")
            .values_list("source_url", flat=True)
        )
        skip_url = conocidas.__contains__

    try:
        for data in scraper.scrape(limit=run.limit, log=log, searches=searches,
                                   skip_url=skip_url):
            run.vistos += 1
            ok, lat, lng, _motivo = validate_location(
                data.get("latitude"), data.get("longitude")
            )
            if not ok:
                run.sin_ubicacion += 1
                continue

            image_urls = data.pop("image_urls", []) if do_images else []
            result, _prop = upsert_property(data, fuente, image_urls=image_urls)
            if result == "created":
                run.creadas += 1
            elif result == "updated":
                run.actualizadas += 1
            elif result == "skipped_duplicate":
                run.duplicadas += 1

            if run.vistos % 10 == 0:
                run.save(update_fields=[
                    "vistos", "creadas", "actualizadas", "duplicadas", "sin_ubicacion",
                ])

        run.estado = "done"
        run.mensaje = "Completado."
    except Exception as exc:  # noqa: BLE001 - queremos registrar cualquier fallo
        run.estado = "error"
        run.mensaje = f"{type(exc).__name__}: {exc}"[:2000]
    finally:
        run.finished_at = timezone.now()
        run.save()
        if run.estado == "done":
            fuente.last_scrape_at = timezone.now()
            fuente.last_import_at = timezone.now()
            fuente.save(update_fields=["last_scrape_at", "last_import_at"])

    return run


def run_refresh(run: IngestaRun, log=None):
    """
    Re-visita cada propiedad ya importada de la fuente:
    - si el anuncio sigue vigente -> actualiza sus datos (precio, descripción...);
    - si ya no existe en el portal (404/redirige) -> la marca inactiva y borra
      sus imágenes (verificación de vigencia).
    """
    log = log or (lambda *_: None)
    fuente = run.fuente
    scraper = get_scraper(fuente.scraper_key)
    if scraper is None:
        run.estado = "error"
        run.mensaje = f"Scraper '{fuente.scraper_key}' no registrado."
        run.finished_at = timezone.now()
        run.save()
        return run

    from real_estate.models import Property
    from .pipeline.images import delete_property_images

    run.estado = "running"
    run.started_at = timezone.now()
    run.save(update_fields=["estado", "started_at"])
    _refresh_disponibles(fuente, scraper)

    do_images = run.con_imagenes
    try:
        props = Property.objects.filter(source=fuente, is_imported=True).exclude(source_url="")
        for prop in props.iterator():
            run.vistos += 1
            res = scraper.scrape_one(prop.source_url)

            if res == "GONE":
                if prop.status != "inactive":
                    delete_property_images(prop)
                    prop.status = "inactive"
                    prop.save(update_fields=["status"])
                run.caducadas += 1
            elif res is None:
                pass  # error transitorio: no tocamos la propiedad
            else:
                ok, _lat, _lng, _m = validate_location(res.get("latitude"), res.get("longitude"))
                if ok:
                    image_urls = res.pop("image_urls", []) if do_images else []
                    result, _p = upsert_property(res, fuente, image_urls=image_urls)
                    if result in ("created", "updated"):
                        run.actualizadas += 1

            if run.vistos % 10 == 0:
                run.save(update_fields=["vistos", "actualizadas", "caducadas"])

        run.estado = "done"
        run.mensaje = "Actualización y verificación de vigencia completada."
    except Exception as exc:  # noqa: BLE001
        run.estado = "error"
        run.mensaje = f"{type(exc).__name__}: {exc}"[:2000]
    finally:
        run.finished_at = timezone.now()
        run.save()
        if run.estado == "done":
            fuente.last_import_at = timezone.now()
            fuente.save(update_fields=["last_import_at"])

    return run
