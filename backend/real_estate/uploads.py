"""
Staging area for uploaded images.

The request writes the original here and returns; the Celery worker reads it,
optimizes it and pushes the result to MinIO. Local disk is deliberate: staging
to MinIO would upload the *original* (up to 10 MB) instead of the ~300 KB WebP,
which is slower than what it replaces.

Web process and worker must therefore see the same path — the same container, or
a shared volume when they are separate ones.
"""

import uuid
from pathlib import Path

from django.conf import settings

CHUNK_SIZE = 1024 * 1024


def temp_dir():
    path = Path(settings.IMAGE_UPLOAD_TEMP_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def publish_optimized(image, source_file):
    """
    Optimize and publish straight to storage, without going through the queue.

    For the ingest pipeline, which already runs detached from any HTTP request:
    there is no user waiting, so paying the encode inline is simpler than
    staging a file the worker would have to pick up. The upload path does the
    opposite — see stash_upload below.

    Leaves the row unsaved so the caller controls the write.
    """
    from .image_utils import ImageOptimizationService
    from .models import PropertyImage

    result = ImageOptimizationService().process(source_file)
    image.image.save(result.image.name, result.image, save=False)
    image.thumbnail.save(result.thumbnail.name, result.thumbnail, save=False)
    image.file_size = image.image.size
    image.status = PropertyImage.Status.READY
    image.pending_path = ""
    return result


def stash_upload(uploaded_file):
    """Write an uploaded file to the staging dir and return (path, size)."""
    # The name is opaque on purpose: the original filename is attacker-controlled
    # and is kept on the row, not used to build a path.
    suffix = Path(uploaded_file.name or "").suffix[:10]
    destination = temp_dir() / f"{uuid.uuid4().hex}{suffix}"

    size = 0
    uploaded_file.seek(0)
    with destination.open("wb") as handle:
        for chunk in uploaded_file.chunks(CHUNK_SIZE):
            handle.write(chunk)
            size += len(chunk)
    uploaded_file.seek(0)

    return str(destination), size
