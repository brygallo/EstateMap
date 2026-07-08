"""
Lógica de ejecución de la carga en un solo paso, compartida por el comando
``ingesta_load`` y el botón del admin. Actualiza un ``IngestaRun`` para poder
seguir el progreso desde el panel.

Robustez (Fase 0):
- ``RunLogger`` persiste las últimas líneas de log en el propio ``IngestaRun``
  y mantiene vivo el ``heartbeat_at`` (antes los logs iban a /dev/null y se
  perdían por completo en producción).
- Cada anuncio se procesa dentro de su propio ``try/except``: un registro
  corrupto ya no aborta el run entero, solo suma a ``errores``.
- ``reap_zombie_runs`` marca como caídos los runs cuyo proceso murió sin dejar
  rastro (heartbeat viejo), para que no queden colgados en ``running`` ni
  bloqueen futuras ejecuciones de la fuente.
- La cancelación solicitada desde el panel (``cancel_requested``) detiene el
  bucle de forma ordenada.
"""
import subprocess
import sys
import time as _time
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import IngestaRun
from .pipeline.location import validate_location
from .pipeline.upsert import upsert_property
from .scrapers import get_scraper
from .scrapers.base import ScraperBlocked

# Un run sin señal de vida durante este tiempo se considera muerto.
STALE_AFTER = timedelta(minutes=10)


class RunLogger:
    """
    Callable de log que, además de reenviar el mensaje (``echo``, p. ej. a la
    consola del comando), acumula las últimas ``max_lines`` líneas en
    ``run.log`` y refresca ``run.heartbeat_at`` de forma throttled (cada
    ``flush_every`` segundos) para no golpear la base en cada mensaje.
    """

    def __init__(self, run, echo=None, max_lines=300, flush_every=10.0):
        self.run = run
        self.echo = echo
        self.max_lines = max_lines
        self.flush_every = flush_every
        self.lines = (run.log or "").splitlines()
        self._last_flush = 0.0

    def __call__(self, msg):
        line = str(msg)
        self.lines.append(line)
        if len(self.lines) > self.max_lines:
            del self.lines[: -self.max_lines]
        if self.echo:
            self.echo(line)
        now = _time.monotonic()
        if now - self._last_flush >= self.flush_every:
            self._last_flush = now
            self.flush(save=True)

    def flush(self, save=False):
        self.run.log = "\n".join(self.lines[-self.max_lines:])
        if save:
            self.run.heartbeat_at = timezone.now()
            self.run.save(update_fields=["log", "heartbeat_at"])


def reap_zombie_runs(fuente=None):
    """
    Marca como ``error`` los runs que quedaron en ``pending``/``running`` pero
    cuyo proceso murió sin actualizar el estado (heartbeat más viejo que
    ``STALE_AFTER``). Devuelve cuántos se recuperaron. Se llama de forma
    perezosa al listar/lanzar, así no hace falta un cron.
    """
    cutoff = timezone.now() - STALE_AFTER
    qs = IngestaRun.objects.filter(estado__in=["pending", "running"])
    if fuente is not None:
        qs = qs.filter(fuente=fuente)
    reaped = 0
    for run in qs:
        last = run.heartbeat_at or run.started_at or run.created_at
        if last and last < cutoff:
            run.estado = "error"
            sep = " " if run.mensaje else ""
            run.mensaje = (run.mensaje + sep +
                           "[watchdog] Sin señal de vida; el proceso se considera caído.")[:2000]
            run.finished_at = timezone.now()
            run.save(update_fields=["estado", "mensaje", "finished_at"])
            reaped += 1
    return reaped


def _cancel_requested(run):
    """Relee de la base si se pidió cancelar (la marca la pone la API/admin)."""
    return IngestaRun.objects.filter(pk=run.pk, cancel_requested=True).exists()


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
    echo = log or (lambda *_: None)
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
    run.heartbeat_at = timezone.now()
    run.save(update_fields=["estado", "started_at", "heartbeat_at"])
    _refresh_disponibles(fuente, scraper)

    logger = RunLogger(run, echo=echo)
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

    cancelled = False
    try:
        for data in scraper.scrape(limit=run.limit, log=logger, searches=searches,
                                   skip_url=skip_url):
            run.vistos += 1
            try:
                ok, lat, lng, _motivo = validate_location(
                    data.get("latitude"), data.get("longitude")
                )
                if not ok:
                    run.sin_ubicacion += 1
                else:
                    image_urls = data.pop("image_urls", []) if do_images else []
                    result, _prop = upsert_property(
                        data, fuente, image_urls=image_urls, log=logger
                    )
                    if result == "created":
                        run.creadas += 1
                    elif result == "updated":
                        run.actualizadas += 1
                    elif result == "skipped_duplicate":
                        run.duplicadas += 1
            except ScraperBlocked:
                raise  # bloqueo del portal: aborta el run (mensaje claro abajo)
            except Exception as exc:  # noqa: BLE001 - un anuncio no debe tumbar el run
                run.errores += 1
                ref = data.get("source_url") or data.get("external_id") or "?"
                logger(f"[item] error en {ref}: {type(exc).__name__}: {exc}")

            if run.vistos % 10 == 0:
                run.heartbeat_at = timezone.now()
                run.save(update_fields=[
                    "vistos", "creadas", "actualizadas", "duplicadas",
                    "sin_ubicacion", "errores", "heartbeat_at",
                ])
                if _cancel_requested(run):
                    cancelled = True
                    logger("[cancel] Cancelación solicitada desde el panel. Deteniendo…")
                    break

        if cancelled:
            run.estado = "cancelled"
            run.mensaje = f"Cancelado por el usuario tras {run.vistos} anuncios vistos."
        else:
            run.estado = "done"
            run.mensaje = f"Completado. {run.errores} anuncios con error individual." \
                if run.errores else "Completado."
    except ScraperBlocked as exc:
        run.estado = "error"
        run.mensaje = f"Bloqueado por el portal: {exc}"[:2000]
        logger(f"[bloqueo] {exc}")
    except Exception as exc:  # noqa: BLE001 - queremos registrar cualquier fallo
        run.estado = "error"
        run.mensaje = f"{type(exc).__name__}: {exc}"[:2000]
        logger(f"[fatal] {type(exc).__name__}: {exc}")
    finally:
        logger.flush()
        run.finished_at = timezone.now()
        run.heartbeat_at = timezone.now()
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
    echo = log or (lambda *_: None)
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
    run.heartbeat_at = timezone.now()
    run.save(update_fields=["estado", "started_at", "heartbeat_at"])
    _refresh_disponibles(fuente, scraper)

    logger = RunLogger(run, echo=echo)
    do_images = run.con_imagenes
    cancelled = False
    try:
        props = Property.objects.filter(source=fuente, is_imported=True).exclude(source_url="")
        for prop in props.iterator():
            run.vistos += 1
            try:
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
                    ok, _lat, _lng, _m = validate_location(
                        res.get("latitude"), res.get("longitude"))
                    if ok:
                        image_urls = res.pop("image_urls", []) if do_images else []
                        result, _p = upsert_property(
                            res, fuente, image_urls=image_urls, log=logger)
                        if result in ("created", "updated"):
                            run.actualizadas += 1
            except Exception as exc:  # noqa: BLE001 - una propiedad no tumba el run
                run.errores += 1
                logger(f"[item] error refrescando {prop.source_url}: "
                       f"{type(exc).__name__}: {exc}")

            if run.vistos % 10 == 0:
                run.heartbeat_at = timezone.now()
                run.save(update_fields=["vistos", "actualizadas", "caducadas",
                                        "errores", "heartbeat_at"])
                if _cancel_requested(run):
                    cancelled = True
                    logger("[cancel] Cancelación solicitada desde el panel. Deteniendo…")
                    break

        if cancelled:
            run.estado = "cancelled"
            run.mensaje = f"Cancelado por el usuario tras {run.vistos} propiedades revisadas."
        else:
            run.estado = "done"
            run.mensaje = "Actualización y verificación de vigencia completada."
    except Exception as exc:  # noqa: BLE001
        run.estado = "error"
        run.mensaje = f"{type(exc).__name__}: {exc}"[:2000]
        logger(f"[fatal] {type(exc).__name__}: {exc}")
    finally:
        logger.flush()
        run.finished_at = timezone.now()
        run.heartbeat_at = timezone.now()
        run.save()
        if run.estado == "done":
            fuente.last_import_at = timezone.now()
            fuente.save(update_fields=["last_import_at"])

    return run
