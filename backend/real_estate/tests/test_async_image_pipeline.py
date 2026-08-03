"""
The upload request must not optimize anything: it stages the original on local
disk, leaves a pending row and returns. The worker does the rest.
"""

from io import BytesIO
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from PIL import Image

from real_estate.models import Property, PropertyImage
from real_estate.serializers import stage_property_image
from real_estate.tasks import optimize_property_image, sweep_pending_images

pytestmark = pytest.mark.django_db


def photo(width=2400, height=1600, name="foto.jpg"):
    from django.core.files.uploadedfile import SimpleUploadedFile

    buffer = BytesIO()
    Image.new("RGB", (width, height), (120, 160, 90)).save(buffer, format="JPEG", quality=95)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


@pytest.fixture
def owned_property(db):
    user = get_user_model().objects.create_user(username="dueno", password="x")
    return Property.objects.create(title="Casa", owner=user, price=1000)


def test_staging_returns_before_any_optimization(owned_property, settings, tmp_path):
    settings.IMAGE_UPLOAD_TEMP_DIR = str(tmp_path)

    image = stage_property_image(owned_property, photo(), 0, is_main=True)

    assert image.status == PropertyImage.Status.PENDING
    # Nothing has been published to storage yet.
    assert not image.image
    assert not image.thumbnail
    # The original is on local disk, where the worker will find it.
    assert Path(image.pending_path).is_file()
    assert Path(image.pending_path).parent == tmp_path


def test_worker_publishes_and_clears_the_staged_file(owned_property, settings, tmp_path):
    settings.IMAGE_UPLOAD_TEMP_DIR = str(tmp_path)
    image = stage_property_image(owned_property, photo(), 0, is_main=True)
    staged = Path(image.pending_path)

    optimize_property_image(image.pk)

    image.refresh_from_db()
    assert image.status == PropertyImage.Status.READY
    assert image.image.name.endswith(".webp")
    # django-storages appends a random suffix (AWS_S3_FILE_OVERWRITE is off), so
    # the marker is in the middle rather than at the end.
    assert "_thumb" in image.thumbnail.name and image.thumbnail.name.endswith(".webp")
    assert image.is_ready()
    # The oversized source is downscaled, and the staging copy is gone: neither
    # the original nor a duplicate keeps occupying space.
    with image.image.open() as handle:
        assert max(Image.open(handle).size) <= 1920
    assert not staged.exists()
    assert image.pending_path == ""


def test_unreadable_file_fails_the_row_without_retrying_forever(owned_property, settings, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile

    settings.IMAGE_UPLOAD_TEMP_DIR = str(tmp_path)
    broken = SimpleUploadedFile("roto.jpg", b"not an image at all", content_type="image/jpeg")
    image = stage_property_image(owned_property, broken, 0, is_main=True)

    result = optimize_property_image(image.pk)

    image.refresh_from_db()
    assert result["status"] == "failed"
    assert image.status == PropertyImage.Status.FAILED
    assert image.optimization_error


def test_sweep_removes_orphan_files_but_keeps_claimed_ones(owned_property, settings, tmp_path):
    settings.IMAGE_UPLOAD_TEMP_DIR = str(tmp_path)
    settings.IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS = 0

    # Built by hand rather than through stage_property_image, so nothing is
    # queued: this is a row stranded by a worker that was down when it arrived.
    staged = tmp_path / "waiting-for-the-worker.jpg"
    staged.write_bytes(photo().read())
    stranded = PropertyImage.objects.create(
        property=owned_property,
        is_main=True,
        status=PropertyImage.Status.PENDING,
        pending_path=str(staged),
    )

    orphan = tmp_path / "nobody-claims-this.webp"
    orphan.write_bytes(b"x")

    sweep_pending_images()

    # The stranded row was picked back up and finished (tests run Celery inline,
    # so the re-queued task completes here), while the file nobody claimed went.
    stranded.refresh_from_db()
    assert stranded.status == PropertyImage.Status.READY
    assert not orphan.exists()


def test_serializer_serves_pending_images_from_staging(owned_property, settings, tmp_path):
    from real_estate.serializers import PropertyImageSerializer

    settings.IMAGE_UPLOAD_TEMP_DIR = str(tmp_path)
    image = stage_property_image(owned_property, photo(), 0, is_main=True)

    data = PropertyImageSerializer(image).data

    # A pending row still hands the client a usable URL, so the photo shows up
    # immediately instead of rendering broken until the worker catches up.
    assert data["status"] == "pending"
    assert data["image"] == f"/api/pending-image/{image.pk}/"
