"""The two fields the blog's SEO rests on: the city it bridges to, and the
author it is signed by.

Both are read by the frontend to build things that cannot be wrong quietly —
a price figure quoted as fact, and an `author.url` asserted in the Article
schema. If either drifts, the page keeps rendering and only Search Console
notices, which is why they are pinned here.
"""

from datetime import timedelta
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from blog.models import Post

User = get_user_model()

pytestmark = pytest.mark.django_db


def make_post(slug="un-post", **overrides):
    fields = {
        "title": "Un post",
        "excerpt": "Resumen del post.",
        "body": "Cuerpo del post.",
        "status": Post.Status.PUBLISHED,
        "published_at": timezone.now() - timedelta(days=1),
    }
    fields.update(overrides)
    return Post.objects.create(slug=slug, **fields)


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture(autouse=True)
def silence_outbound():
    with mock.patch("blog.signals.submit_urls"), mock.patch(
        "blog.tasks.submit_urls"
    ), mock.patch("real_estate.tasks.revalidate_frontend_tags.delay"):
        yield


class TestAuthorEntity:
    def test_author_slug_is_derived_from_the_public_name(self):
        """SPEC:BLOG-008 — el slug del autor sale del nombre firmado."""
        post = make_post(author_name="María Fernanda Ríos")
        assert post.author_slug == "maria-fernanda-rios"

    def test_author_slug_falls_back_to_the_account(self):
        """SPEC:BLOG-008 — sin nombre público firma la cuenta que escribió."""
        user = User.objects.create_user(
            username="rlopez", email="rlopez@example.com", password="x"
        )
        user.first_name = "Rosa"
        user.last_name = "López"
        user.save()

        post = make_post(author=user)

        assert post.author_slug == "rosa-lopez"

    def test_renaming_the_author_moves_the_slug(self):
        """SPEC:BLOG-008 — firma y página de autor no pueden divergir."""
        post = make_post(author_name="Nombre Viejo")
        post.author_name = "Nombre Nuevo"
        post.save()

        post.refresh_from_db()
        assert post.author_slug == "nombre-nuevo"

    def test_a_post_without_author_has_no_slug(self):
        """SPEC:BLOG-008 — sin autor no se inventa una entidad."""
        assert make_post().author_slug == ""

    def test_the_api_filters_by_author(self, client):
        """SPEC:BLOG-008 — /blog/autor/<slug> se sirve de este filtro."""
        make_post(slug="de-ana", author_name="Ana Vera")
        make_post(slug="de-luis", author_name="Luis Mora")

        response = client.get("/api/blog/posts/?author=ana-vera")

        assert response.status_code == 200
        assert [item["slug"] for item in response.data["results"]] == ["de-ana"]
        assert response.data["count"] == 1

    def test_an_unknown_author_returns_nothing(self, client):
        """SPEC:BLOG-008 — un autor inexistente no cae al listado completo."""
        make_post(author_name="Ana Vera")

        response = client.get("/api/blog/posts/?author=quien-sea")

        assert response.status_code == 200
        assert response.data["count"] == 0

    def test_the_author_slug_travels_in_the_payload(self, client):
        """SPEC:BLOG-008 — el frontend no re-deriva el slug, lo recibe."""
        make_post(slug="firmado", author_name="Ana Vera")

        response = client.get("/api/blog/posts/firmado/")

        assert response.data["author_slug"] == "ana-vera"
        assert response.data["author_name"] == "Ana Vera"


class TestCityBridge:
    def test_the_city_travels_in_list_and_detail(self, client):
        """SPEC:BLOG-009 — la ciudad viaja en ambas respuestas."""
        make_post(slug="guia-quito", city="Quito")

        listed = client.get("/api/blog/posts/")
        detail = client.get("/api/blog/posts/guia-quito/")

        assert listed.data["results"][0]["city"] == "Quito"
        assert detail.data["city"] == "Quito"

    def test_a_national_post_has_no_city(self, client):
        """SPEC:BLOG-009 — sin ciudad el artículo es de alcance nacional."""
        make_post(slug="guia-nacional")

        response = client.get("/api/blog/posts/guia-nacional/")

        assert response.data["city"] == ""
