from io import BytesIO
from unittest.mock import Mock

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import serializers

from real_estate.serializers import PropertySerializer


def image_upload(name="listing.jpg", image_format="JPEG", size=(800, 600), content_type="image/jpeg"):
    output = BytesIO()
    Image.new("RGB", size, (100, 140, 180)).save(output, format=image_format)
    return SimpleUploadedFile(name, output.getvalue(), content_type=content_type)


def test_rejects_image_below_minimum_dimensions():
    upload = image_upload(size=(120, 120))

    with pytest.raises(serializers.ValidationError, match="200x200"):
        PropertySerializer().validate_uploaded_images([upload])


def test_rejects_disallowed_image_format():
    upload = image_upload(name="listing.gif", image_format="GIF", content_type="image/gif")

    with pytest.raises(serializers.ValidationError, match="Formato"):
        PropertySerializer().validate_uploaded_images([upload])


def test_accepts_supported_image_and_rewinds_stream():
    upload = image_upload()

    result = PropertySerializer().validate_uploaded_images([upload])

    assert result == [upload]
    assert upload.tell() == 0


def test_rejects_combined_upload_over_50mb(settings):
    settings.MAX_PROPERTY_UPLOAD_MB = 1
    uploads = [image_upload(name=f"listing-{index}.png", image_format="PNG", content_type="image/png") for index in range(3)]
    # PNGs of a flat color compress heavily, so simulate camera-sized files
    # without allocating a large test payload.
    for upload in uploads:
        upload.size = 400 * 1024

    with pytest.raises(serializers.ValidationError, match="supera 1MB"):
        PropertySerializer().validate_uploaded_images(uploads)


def test_rejects_more_than_ten_images_already_on_property():
    instance = Mock()
    instance.images.count.return_value = 10
    serializer = PropertySerializer(instance=instance, data={})
    upload = image_upload()

    with pytest.raises(serializers.ValidationError, match="más de 10"):
        serializer.validate_uploaded_images([upload])
