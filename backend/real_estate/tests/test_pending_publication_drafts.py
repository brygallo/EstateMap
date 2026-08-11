"""Server-side persistence for an unfinished publication."""

import io
import uuid

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image

from real_estate.models import PendingPublication


def photo(name="draft.jpg"):
    output = io.BytesIO()
    Image.new("RGB", (300, 300), (100, 140, 180)).save(output, format="JPEG")
    return SimpleUploadedFile(name, output.getvalue(), content_type="image/jpeg")


@pytest.mark.django_db
def test_repeated_saves_update_one_pending_publication(api_client):
    """SPEC:LEAD-019 — one browser draft must occupy one tray row."""
    draft_key = str(uuid.uuid4())
    endpoint = reverse("pending-publication-list")

    first = api_client.post(endpoint, {
        "draft_key": draft_key,
        "title": "Primer título",
        "draft": '{"title":"Primer título"}',
        "uploaded_images": [photo()],
    }, format="multipart")
    second = api_client.post(endpoint, {
        "draft_key": draft_key,
        "title": "Título corregido",
        "draft": '{"title":"Título corregido"}',
    }, format="multipart")

    assert first.status_code == 201
    assert second.status_code == 201
    assert PendingPublication.objects.count() == 1
    pending = PendingPublication.objects.get()
    assert pending.title == "Título corregido"
    assert pending.temporary_images.count() == 1


@pytest.mark.django_db
def test_resume_payload_contains_temporary_photos(api_client):
    """SPEC:RSM-006 — resuming restores the photos, not only their count."""
    pending = PendingPublication.objects.create(
        title="Borrador con foto",
        contact_email="owner@example.com",
        draft={"title": "Borrador con foto"},
    )
    pending.temporary_images.create(image=photo(), original_filename="draft.jpg")
    from real_estate.email_utils import create_publication_resume_token

    token = create_publication_resume_token(pending)
    response = api_client.get(reverse("publication_draft", kwargs={"token": token.token}))

    assert response.status_code == 200
    assert response.data["temporary_images"][0]["name"] == "draft.jpg"
    assert response.data["temporary_images"][0]["url"]
