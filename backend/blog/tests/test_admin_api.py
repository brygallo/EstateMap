"""Integrated editorial desk API."""

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from blog.models import Post

pytestmark = pytest.mark.django_db
User = get_user_model()


def post_payload(**overrides):
    payload = {
        "title": "Cómo comprar una casa",
        "slug": "como-comprar-una-casa",
        "excerpt": "Una guía clara para preparar la compra.",
        "body": "## Primer paso\n\nCompara las alternativas.",
        "status": Post.Status.DRAFT,
    }
    payload.update(overrides)
    return payload


def test_regular_user_cannot_create_blog_post():
    """SPEC:BLOG-010 — writing is protected by the backend."""
    user = User.objects.create_user(username="reader", password="secret")
    client = APIClient()
    client.force_authenticate(user)

    response = client.post("/api/admin/blog/posts/", post_payload(), format="json")

    assert response.status_code == 403
    assert Post.objects.count() == 0


def test_staff_user_can_create_and_publish_blog_post():
    """SPEC:BLOG-010 — staff can create a draft from the integrated desk."""
    user = User.objects.create_user(username="editor", password="secret", is_staff=True)
    client = APIClient()
    client.force_authenticate(user)

    created = client.post("/api/admin/blog/posts/", post_payload(), format="json")
    assert created.status_code == 201
    assert created.data["status"] == Post.Status.DRAFT

    published = client.post(f"/api/admin/blog/posts/{created.data['id']}/publish/")

    assert published.status_code == 200
    post = Post.objects.get(pk=created.data["id"])
    assert post.status == Post.Status.PUBLISHED
    assert post.published_at <= timezone.now()


def test_staff_can_withdraw_a_published_post():
    """SPEC:BLOG-011 — moving to draft withdraws a public article."""
    user = User.objects.create_user(username="editor", password="secret", is_staff=True)
    post = Post.objects.create(**post_payload(status=Post.Status.PUBLISHED, published_at=timezone.now()))
    client = APIClient()
    client.force_authenticate(user)

    response = client.post(f"/api/admin/blog/posts/{post.pk}/draft/")

    assert response.status_code == 200
    post.refresh_from_db()
    assert post.status == Post.Status.DRAFT
    assert not post.is_public
