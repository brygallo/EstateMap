"""Contract tests for the blog: what is public, when, and who can write it."""

from datetime import timedelta
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from blog.models import Category, Post

User = get_user_model()

pytestmark = pytest.mark.django_db


def make_post(slug="un-post", **overrides):
    fields = {
        "title": "Un post",
        "excerpt": "Resumen del post.",
        "body": "Cuerpo del post.\n\n## Sección\n\nTexto.",
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
    """Keep the tests off the network and off the broker.

    Saving a public post pings IndexNow and queues a Celery task on commit;
    neither is under test here and both would either hit the wire or warn.
    """
    with mock.patch("blog.signals.submit_urls"), mock.patch(
        "blog.tasks.submit_urls"
    ), mock.patch("real_estate.tasks.revalidate_frontend_tags.delay"):
        yield


class TestPublicationDate:
    def test_post_dated_in_the_past_is_public(self, client):
        """SPEC:BLOG-001 — la fecha decide, no el estado ni la cola."""
        make_post(slug="ayer", published_at=timezone.now() - timedelta(days=1))

        response = client.get("/api/blog/posts/")

        assert response.status_code == 200
        assert [post["slug"] for post in response.data["results"]] == ["ayer"]

    def test_scheduled_post_is_public_even_if_the_task_never_ran(self, client):
        """SPEC:BLOG-001 — un post `scheduled` con fecha pasada ya se lee.

        Es la garantía que separa el calendario editorial de la salud del worker.
        """
        make_post(
            slug="programado-ayer",
            status=Post.Status.SCHEDULED,
            published_at=timezone.now() - timedelta(hours=2),
        )

        response = client.get("/api/blog/posts/programado-ayer/")

        assert response.status_code == 200
        assert response.data["slug"] == "programado-ayer"

    def test_future_post_is_not_public_yet(self, client):
        """SPEC:BLOG-001 — programado para mañana no se ve hoy."""
        make_post(
            slug="manana",
            status=Post.Status.SCHEDULED,
            published_at=timezone.now() + timedelta(days=1),
        )

        assert client.get("/api/blog/posts/").data["count"] == 0
        assert client.get("/api/blog/posts/manana/").status_code == 404

    def test_post_without_date_is_never_public(self, client):
        """SPEC:BLOG-001 — sin fecha no hay publicación posible."""
        make_post(slug="sin-fecha", status=Post.Status.PUBLISHED, published_at=None)

        assert client.get("/api/blog/posts/").data["count"] == 0


class TestHiddenStates:
    def test_draft_with_past_date_stays_hidden(self, client):
        """SPEC:BLOG-002 — el borrador no sale aunque la fecha haya pasado."""
        make_post(
            slug="borrador",
            status=Post.Status.DRAFT,
            published_at=timezone.now() - timedelta(days=5),
        )

        assert client.get("/api/blog/posts/").data["count"] == 0

    def test_draft_detail_returns_404(self, client):
        """SPEC:BLOG-002 — el detalle de un borrador no existe para el público."""
        make_post(slug="borrador", status=Post.Status.DRAFT)

        assert client.get("/api/blog/posts/borrador/").status_code == 404

    def test_archived_post_is_withdrawn(self, client):
        """SPEC:BLOG-002 — archivar retira del sitio sin borrar ni falsear fechas."""
        make_post(slug="archivado", status=Post.Status.ARCHIVED)

        assert client.get("/api/blog/posts/").data["count"] == 0
        assert client.get("/api/blog/posts/archivado/").status_code == 404


class TestReadOnlyApi:
    def test_anonymous_cannot_create_a_post(self, client):
        """SPEC:BLOG-003 — la API pública no enruta escritura."""
        response = client.post("/api/blog/posts/", {"title": "Intruso"}, format="json")

        assert response.status_code == 405

    def test_authenticated_user_cannot_create_a_post_either(self, client):
        """SPEC:BLOG-003 — ni siquiera con sesión: se escribe en el admin."""
        client.force_authenticate(user=User.objects.create_user(username="alguien"))

        response = client.post("/api/blog/posts/", {"title": "Intruso"}, format="json")

        assert response.status_code == 405

    def test_existing_post_cannot_be_edited_or_deleted(self, client):
        """SPEC:BLOG-003 — tampoco PATCH ni DELETE sobre un post ya publicado."""
        make_post(slug="publico")
        client.force_authenticate(user=User.objects.create_user(username="alguien"))

        assert client.patch("/api/blog/posts/publico/", {"title": "x"}).status_code == 405
        assert client.delete("/api/blog/posts/publico/").status_code == 405


class TestListLimits:
    def test_limit_is_capped(self, client):
        """SPEC:BLOG-004 — un limit desmedido se recorta en silencio."""
        for index in range(3):
            make_post(slug=f"post-{index}")

        response = client.get("/api/blog/posts/?limit=100000")

        assert response.status_code == 200
        assert len(response.data["results"]) <= 60

    def test_non_numeric_limit_falls_back(self, client):
        """SPEC:BLOG-004 — un limit no numérico devuelve la página por defecto."""
        make_post(slug="post-0")

        response = client.get("/api/blog/posts/?limit=muchos")

        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_count_reports_the_whole_archive_not_the_page(self, client):
        """SPEC:BLOG-004 — `count` es el total; `results`, la página pedida."""
        for index in range(5):
            make_post(slug=f"post-{index}")

        response = client.get("/api/blog/posts/?limit=2")

        assert response.data["count"] == 5
        assert len(response.data["results"]) == 2


class TestFilters:
    def test_posts_can_be_filtered_by_category(self, client):
        category = Category.objects.create(name="Comprar", slug="comprar")
        make_post(slug="con-categoria", category=category)
        make_post(slug="sin-categoria")

        response = client.get("/api/blog/posts/?category=comprar")

        assert [post["slug"] for post in response.data["results"]] == ["con-categoria"]

    def test_empty_categories_are_not_listed(self, client):
        """Una categoría sin posts públicos no merece una URL indexable."""
        Category.objects.create(name="Vacía", slug="vacia")
        with_posts = Category.objects.create(name="Comprar", slug="comprar")
        make_post(slug="con-categoria", category=with_posts)

        response = client.get("/api/blog/categories/")

        assert [row["slug"] for row in response.data] == ["comprar"]

    def test_category_count_ignores_scheduled_posts(self, client):
        """El contador de la categoría cuenta lo que se puede leer hoy."""
        category = Category.objects.create(name="Comprar", slug="comprar")
        make_post(slug="visible", category=category)
        make_post(
            slug="futuro",
            category=category,
            status=Post.Status.SCHEDULED,
            published_at=timezone.now() + timedelta(days=10),
        )

        response = client.get("/api/blog/categories/")

        assert response.data[0]["post_count"] == 1
