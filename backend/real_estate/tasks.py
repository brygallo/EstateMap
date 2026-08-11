"""
Background image processing and frontend cache invalidation.

The upload request only writes the original to local disk and returns; the two
WebP encodes and the two MinIO PUTs happen here. Keeping them out of the request
is the whole point — with ten images they used to run inside the atomic block,
before the response.
"""

import logging
import os
import time
from pathlib import Path

import requests
from celery import shared_task
from django.conf import settings
from django.core.files import File
from django.db import transaction
from django.core.cache import cache

logger = logging.getLogger(__name__)


@shared_task
def system_worker_heartbeat():
    """Publish a cheap liveness signal used by health checks and the admin."""
    timestamp = time.time()
    cache.set("system:worker:heartbeat", timestamp, 5 * 60)
    return {"timestamp": timestamp}


class PendingImageMissing(Exception):
    """The temp file is gone — nothing to optimize, and retrying cannot help."""


@shared_task(
    bind=True,
    autoretry_for=(OSError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    acks_late=True,
)
def optimize_property_image(self, image_id):
    """Optimize one PropertyImage from its temp file and publish it to storage."""
    from .image_utils import ImageOptimizationService
    from .models import PropertyImage

    try:
        instance = PropertyImage.objects.get(pk=image_id)
    except PropertyImage.DoesNotExist:
        # The property was deleted between upload and processing. Not an error.
        logger.info("PropertyImage %s vanished before optimization", image_id)
        return {"id": image_id, "status": "gone"}

    if instance.status == PropertyImage.Status.READY:
        return {"id": image_id, "status": "already-ready"}

    source = Path(instance.pending_path) if instance.pending_path else None
    if not source or not source.exists():
        instance.status = PropertyImage.Status.FAILED
        instance.optimization_error = "El archivo temporal ya no existe."
        instance.save(update_fields=["status", "optimization_error"])
        raise PendingImageMissing(f"Temp file missing for PropertyImage {image_id}")

    started = time.monotonic()
    try:
        with source.open("rb") as handle:
            django_file = File(handle, name=instance.original_filename or source.name)
            result = ImageOptimizationService().process(django_file)

            # Both saves push to MinIO. save=False so the row is written once,
            # with every field, instead of three times.
            instance.image.save(result.image.name, result.image, save=False)
            instance.thumbnail.save(result.thumbnail.name, result.thumbnail, save=False)

        instance.file_size = instance.image.size
        instance.status = PropertyImage.Status.READY
        instance.optimization_error = ""
        instance.pending_path = ""
        instance.save(
            update_fields=[
                "image",
                "thumbnail",
                "file_size",
                "status",
                "optimization_error",
                "pending_path",
            ]
        )
    except ValueError as exc:
        # Unreadable or oversized image: a retry would fail identically.
        instance.status = PropertyImage.Status.FAILED
        instance.optimization_error = str(exc)
        instance.save(update_fields=["status", "optimization_error"])
        logger.warning("PropertyImage %s could not be optimized: %s", image_id, exc)
        _discard(source)
        return {"id": image_id, "status": "failed", "error": str(exc)}

    _discard(source)
    elapsed = time.monotonic() - started
    logger.info(
        "PropertyImage %s optimized in %.2fs (%s bytes, preserved=%s)",
        image_id,
        elapsed,
        instance.file_size,
        result.preserved,
    )
    return {"id": image_id, "status": "ready", "bytes": instance.file_size}


@shared_task
def sweep_pending_images():
    """
    Re-queue rows whose task never ran, and drop temp files nobody claims.

    Covers the window where the web process wrote a temp file and enqueued a task
    but the worker was down long enough for the message to be lost.
    """
    from .models import PropertyImage

    max_age = getattr(settings, "IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS", 48)
    requeued = 0
    for image in PropertyImage.objects.filter(status=PropertyImage.Status.PENDING):
        if image.pending_path and Path(image.pending_path).exists():
            optimize_property_image.delay(image.pk)
            requeued += 1

    removed = 0
    temp_dir = Path(getattr(settings, "IMAGE_UPLOAD_TEMP_DIR", ""))
    if temp_dir.exists():
        claimed = set(
            PropertyImage.objects.filter(status=PropertyImage.Status.PENDING)
            .exclude(pending_path="")
            .values_list("pending_path", flat=True)
        )
        cutoff = time.time() - max_age * 3600
        for path in temp_dir.iterdir():
            if str(path) in claimed or not path.is_file():
                continue
            if path.stat().st_mtime < cutoff:
                _discard(path)
                removed += 1

    logger.info("sweep_pending_images: %s re-queued, %s orphans removed", requeued, removed)
    return {"requeued": requeued, "removed": removed}


@shared_task
def sweep_stale_draft_images():
    """
    Drop the stored photos of abandoned publication drafts.

    The tray rows stay — they are the commercial follow-up record — but their
    photos are anonymous uploads parked in the object store, and without this
    sweep a draft nobody ever redeems keeps them forever. A draft is abandoned
    once its images are old enough and no resume token that could still publish
    it remains valid.
    """
    from datetime import timedelta

    from django.utils import timezone

    from .models import PendingPublicationImage

    max_age_days = getattr(settings, "PENDING_DRAFT_IMAGE_MAX_AGE_DAYS", 30)
    now = timezone.now()
    stale = PendingPublicationImage.objects.filter(
        created_at__lt=now - timedelta(days=max_age_days)
    ).exclude(
        # One JOIN condition: keep any image whose draft still has a live link.
        pending__resume_tokens__redeemed_at__isnull=True,
        pending__resume_tokens__revoked_at__isnull=True,
        pending__resume_tokens__expires_at__gt=now,
    )

    removed = 0
    for image in stale.iterator():
        storage, name = image.image.storage, image.image.name
        image.delete()
        if name:
            try:
                storage.delete(name)
            except Exception:
                # The row is already gone; a dangling object is retried by the
                # next sweep only if it still has a row, so log it loudly.
                logger.warning("Could not delete draft image object %s", name, exc_info=True)
        removed += 1

    logger.info("sweep_stale_draft_images: %s stored photos removed", removed)
    return {"removed": removed}


@shared_task(
    bind=True,
    autoretry_for=(requests.RequestException,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 2},
)
def revalidate_frontend_tags(self, tags):
    """
    Tell Next.js to drop the cache entries tagged with `tags`.

    Bounded on purpose: two retries with backoff and a 5s timeout. A bulk import
    fires one of these per listing, so a frontend that is down or slow must cost
    a handful of quick failures, not a queue full of tasks hammering it. Serving
    a slightly stale page is a far cheaper outcome than a retry storm.
    """
    url = getattr(settings, "NEXT_REVALIDATE_URL", "")
    secret = getattr(settings, "REVALIDATE_SECRET", "")
    if not url or not secret:
        logger.debug("Revalidation skipped (NEXT_REVALIDATE_URL/REVALIDATE_SECRET unset)")
        return {"status": "disabled"}

    try:
        response = requests.post(
            url,
            json={"tags": list(tags)},
            headers={"x-revalidate-secret": secret},
            timeout=5,
        )
    except requests.RequestException as exc:
        # Let autoretry handle the first couple of failures; once retries are
        # exhausted the exception must not bubble up as a task error.
        if (self.request.retries or 0) >= self.max_retries:
            logger.warning("Revalidation gave up for %s: %s", tags, exc)
            return {"status": "failed", "error": str(exc)}
        raise

    if response.status_code >= 400:
        # A 401/404 means the route or the secret is misconfigured; retrying
        # would fail identically, so log it and stop.
        logger.warning(
            "Revalidation rejected for %s: HTTP %s %s",
            tags, response.status_code, response.text[:200],
        )
        return {"status": "rejected", "code": response.status_code}

    logger.debug("Revalidated %s", tags)
    return {"status": "ok", "tags": list(tags)}


def _discard(path):
    try:
        os.unlink(path)
    except OSError:
        logger.debug("Could not remove temp file %s", path, exc_info=True)


def enqueue_optimization(image_id):
    """
    Queue the task once the surrounding transaction commits, and fall back to
    doing the work inline if the broker cannot take it.

    Two things are going on here.

    The on_commit: before the commit the worker could pick the id up and find no
    row, because it reads from its own connection.

    The fallback: a broker outage must not cost the user their upload. Publishing
    is the only new way this request can fail, and it would fail *after* the
    photo was already accepted. Degrading to a synchronous encode is exactly the
    behaviour this change replaced — slower, but correct and complete — so the
    worst case is the old latency instead of a 500.
    """

    def dispatch():
        try:
            optimize_property_image.delay(image_id)
        except Exception:
            # Deliberately broad: kombu wraps every transport failure
            # differently (OperationalError, ConnectionError, socket errors),
            # and no failure to reach the queue justifies losing the image.
            logger.warning(
                "Broker unavailable, optimizing PropertyImage %s inline", image_id,
                exc_info=True,
            )
            try:
                optimize_property_image(image_id)
            except Exception:
                # The row stays pending with its file on disk, so the hourly
                # sweep retries it once the broker is back.
                logger.exception("Inline fallback failed for PropertyImage %s", image_id)

    transaction.on_commit(dispatch)
