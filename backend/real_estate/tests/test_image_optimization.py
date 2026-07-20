from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from real_estate.image_utils import ImageOptimizationService


def _image_bytes(image_format, size, color):
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format=image_format, quality=92)
    return output.getvalue()


def test_small_optimized_image_is_preserved_byte_for_byte():
    content = _image_bytes("WEBP", (720, 532), (80, 120, 160))
    upload = SimpleUploadedFile("listing.webp", content, content_type="image/webp")

    result = ImageOptimizationService().process(upload)

    assert result.preserved is True
    assert result.image.read() == content
    assert result.image.size == len(content)
    assert result.image.name == "listing.webp"


def test_large_image_is_resized_once_and_encoded_as_high_quality_webp():
    content = _image_bytes("JPEG", (2600, 1800), (120, 160, 200))
    upload = SimpleUploadedFile("large.jpg", content, content_type="image/jpeg")

    result = ImageOptimizationService().process(upload)

    result.image.seek(0)
    optimized = Image.open(result.image)
    assert result.preserved is False
    assert optimized.format == "WEBP"
    assert optimized.width <= 1920
    assert optimized.height <= 1920
    result.image.seek(0)
    assert result.image.size == len(result.image.read())


def test_thumbnail_is_generated_directly_at_the_configured_bound():
    content = _image_bytes("JPEG", (1600, 1200), (200, 180, 140))
    upload = SimpleUploadedFile("photo.jpg", content, content_type="image/jpeg")

    result = ImageOptimizationService(thumbnail_size=(640, 640)).process(upload)

    result.thumbnail.seek(0)
    thumbnail = Image.open(result.thumbnail)
    assert thumbnail.format == "WEBP"
    assert thumbnail.size == (640, 480)


def test_large_transparent_png_keeps_alpha_with_lossless_webp():
    output = BytesIO()
    source = Image.new("RGBA", (2200, 1200), (30, 90, 180, 100))
    source.save(output, format="PNG")
    upload = SimpleUploadedFile("floorplan.png", output.getvalue(), content_type="image/png")

    result = ImageOptimizationService().process(upload)

    result.image.seek(0)
    optimized = Image.open(result.image)
    assert optimized.format == "WEBP"
    assert optimized.mode == "RGBA"
    assert optimized.getpixel((0, 0))[3] == 100
    assert optimized.width == 1920
