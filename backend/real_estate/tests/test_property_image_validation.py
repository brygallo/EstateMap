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


@pytest.mark.django_db
def test_too_many_files_is_reported_as_json_not_an_html_page(authenticated_client, settings):
    """SPEC:PROP-026 SPEC:ERR-005 — passing the parser's file ceiling still answers in JSON.

    Django raises TooManyFilesSent while parsing the body, before any serializer
    runs, and its own handler renders an HTML 400. The publication form reads the
    error body to decide which step to open, so an unparseable response leaves
    the person with a generic message and nothing to correct.
    """
    settings.DATA_UPLOAD_MAX_NUMBER_FILES = 2
    uploads = [image_upload(name=f"listing-{index}.jpg") for index in range(3)]

    response = authenticated_client.post(
        "/api/properties/",
        {"title": "Casa con muchas fotos", "uploaded_images": uploads},
        format="multipart",
    )

    assert response.status_code == 400
    assert response["Content-Type"].startswith("application/json")
    assert "uploaded_images" in response.json()
    assert "imágenes" in response.json()["uploaded_images"][0]


@pytest.mark.django_db
def test_oversized_text_body_is_json_and_does_not_blame_the_photos(authenticated_client, settings):
    """SPEC:ERR-005 — a body over DATA_UPLOAD_MAX_MEMORY_SIZE answers 413 in JSON.

    That ceiling measures the non-file part of the request — uploaded files are
    streamed and never counted against it — so a long description must not be
    reported under `uploaded_images`, which is what sends the form to the photo
    step to fix a text field.
    """
    settings.DATA_UPLOAD_MAX_MEMORY_SIZE = 1024

    response = authenticated_client.post(
        "/api/properties/",
        {"title": "x" * 5000, "description": "y" * 5000},
        format="multipart",
    )

    assert response.status_code == 413
    assert response["Content-Type"].startswith("application/json")
    assert "uploaded_images" not in response.json()
    assert "detail" in response.json()
