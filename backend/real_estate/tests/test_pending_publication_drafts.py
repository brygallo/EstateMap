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


@pytest.mark.django_db
def test_anonymous_draft_photos_get_the_same_validation(api_client):
    """SPEC:RSM-011 — a draft upload obeys the PROP-026 limits like any other upload."""
    tiny = io.BytesIO()
    Image.new("RGB", (100, 100), (10, 10, 10)).save(tiny, format="JPEG")

    response = api_client.post(reverse("pending-publication-list"), {
        "draft_key": str(uuid.uuid4()),
        "title": "Foto diminuta",
        "uploaded_images": [
            SimpleUploadedFile("tiny.jpg", tiny.getvalue(), content_type="image/jpeg")
        ],
    }, format="multipart")

    assert response.status_code == 400
    assert PendingPublication.objects.count() == 0


@pytest.mark.django_db
def test_sweep_drops_photos_of_abandoned_drafts_but_keeps_the_tray_row(db):
    """SPEC:RSM-012 — old photos go; the commercial record and live drafts stay."""
    from datetime import timedelta

    from django.utils import timezone

    from real_estate.email_utils import create_publication_resume_token
    from real_estate.models import PendingPublicationImage
    from real_estate.tasks import sweep_stale_draft_images

    abandoned = PendingPublication.objects.create(title="Abandonado")
    abandoned.temporary_images.create(image=photo("old.jpg"), original_filename="old.jpg")
    with_live_link = PendingPublication.objects.create(
        title="Con enlace vivo", contact_email="viva@example.com"
    )
    with_live_link.temporary_images.create(image=photo("kept.jpg"), original_filename="kept.jpg")
    create_publication_resume_token(with_live_link)

    PendingPublicationImage.objects.update(created_at=timezone.now() - timedelta(days=31))

    sweep_stale_draft_images()

    assert abandoned.temporary_images.count() == 0
    assert with_live_link.temporary_images.count() == 1
    assert PendingPublication.objects.filter(pk=abandoned.pk).exists()
