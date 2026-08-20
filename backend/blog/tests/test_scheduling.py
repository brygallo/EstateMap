"""The editorial calendar: what the hourly task does, and how a batch is spread."""

from datetime import timedelta
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.utils import timezone

from blog.admin import PUBLISH_HOUR_UTC, PostAdmin
from blog.models import Post
from blog.tasks import publish_scheduled_posts

User = get_user_model()

pytestmark = pytest.mark.django_db


def make_post(slug, **overrides):
    fields = {
        "title": f"Post {slug}",
        "excerpt": "Resumen.",
        "body": "Cuerpo.",
        "status": Post.Status.DRAFT,
    }
    fields.update(overrides)
    return Post.objects.create(slug=slug, **fields)


class TestPublishTask:
    def test_due_posts_are_flipped_and_announced(self):
        """SPEC:BLOG-005 — publicar avisa a IndexNow y revalida `blog`."""
        make_post(
            "listo",
            status=Post.Status.SCHEDULED,
            published_at=timezone.now() - timedelta(minutes=5),
        )

        with mock.patch("blog.tasks.submit_urls") as submit, mock.patch(
            "real_estate.tasks.revalidate_frontend_tags.delay"
        ) as revalidate, mock.patch("blog.signals.submit_urls"):
            result = publish_scheduled_posts()

        assert result["published"] == 1
        assert Post.objects.get(slug="listo").status == Post.Status.PUBLISHED
        assert "/blog/listo" in submit.call_args.args[0]
        assert revalidate.call_args.args[0] == ["blog", "blog-listo"]

    def test_future_posts_are_left_alone(self):
        """SPEC:BLOG-005 — programar a futuro no avisa a ningún buscador."""
        make_post(
            "manana",
            status=Post.Status.SCHEDULED,
            published_at=timezone.now() + timedelta(days=30),
        )

        with mock.patch("blog.tasks.submit_urls") as submit, mock.patch(
            "blog.signals.submit_urls"
        ) as signal_submit, mock.patch("real_estate.tasks.revalidate_frontend_tags.delay"):
            result = publish_scheduled_posts()

        assert result["published"] == 0
        assert Post.objects.get(slug="manana").status == Post.Status.SCHEDULED
        submit.assert_not_called()
        signal_submit.assert_not_called()

    def test_task_is_a_no_op_when_nothing_is_due(self):
        """SPEC:BLOG-005 — sin nada que publicar no se toca ni el caché."""
        with mock.patch("blog.tasks.bump_props_version") as bump:
            assert publish_scheduled_posts() == {"published": 0}

        bump.assert_not_called()


class TestScheduleDailyAction:
    @pytest.fixture(autouse=True)
    def silence_outbound(self):
        with mock.patch("blog.signals.submit_urls"), mock.patch(
            "real_estate.tasks.revalidate_frontend_tags.delay"
        ):
            yield

    @pytest.fixture
    def run_action(self):
        from django.contrib.admin.sites import AdminSite

        admin = PostAdmin(Post, AdminSite())
        request = RequestFactory().post("/admin/blog/post/")
        request.user = User.objects.create_superuser(
            username="editor", email="editor@example.com", password="x"
        )
        # The action reports through the message framework, which needs storage
        # a bare RequestFactory request does not carry.
        request._messages = mock.MagicMock()

        def run(queryset):
            admin.schedule_daily(request, queryset)

        return run

    def test_batch_is_spread_one_post_per_day(self, run_action):
        """SPEC:BLOG-007 — los posts del lote quedan a un día de distancia."""
        for index in range(3):
            make_post(f"post-{index}")

        run_action(Post.objects.order_by("slug"))

        dates = list(
            Post.objects.order_by("published_at").values_list("published_at", flat=True)
        )
        assert all(row.hour == PUBLISH_HOUR_UTC for row in dates)
        assert dates[1] - dates[0] == timedelta(days=1)
        assert dates[2] - dates[1] == timedelta(days=1)
        assert all(
            post.status == Post.Status.SCHEDULED for post in Post.objects.all()
        )

    def test_first_post_goes_out_tomorrow_not_today(self, run_action):
        """SPEC:BLOG-007 — nada del lote sale el mismo día en que se programa."""
        make_post("post-0")

        run_action(Post.objects.all())

        assert Post.objects.get(slug="post-0").published_at > timezone.now()

    def test_second_batch_queues_after_the_first(self, run_action):
        """SPEC:BLOG-007 — un segundo lote continúa donde terminó el primero.

        Sin esto, escribir por tandas sacaría dos artículos el mismo día, que es
        justo el patrón que la programación existe para evitar.
        """
        for index in range(3):
            make_post(f"lote1-{index}")
        run_action(Post.objects.filter(slug__startswith="lote1"))
        first_batch_end = Post.objects.order_by("-published_at").first().published_at

        for index in range(2):
            make_post(f"lote2-{index}")
        run_action(Post.objects.filter(slug__startswith="lote2"))

        second_batch_start = (
            Post.objects.filter(slug__startswith="lote2")
            .order_by("published_at")
            .first()
            .published_at
        )
        assert second_batch_start == first_batch_end + timedelta(days=1)

        dates = list(Post.objects.values_list("published_at", flat=True))
        assert len(set(dates)) == len(dates), "dos posts programados a la misma hora"


@pytest.mark.django_db
def test_an_old_article_with_typed_figures_is_flagged():
    """SPEC:BLOG-013 — a number typed into a paragraph does not recalculate.

    The blocks the page renders refresh themselves; a figure inside the text
    does not, and until now nothing knew which articles carried one.
    """
    from datetime import timedelta

    from blog.tasks import STALE_AFTER_DAYS, flag_stale_figures

    old = Post.objects.create(
        title="Con cifras escritas", slug="con-cifras-escritas",
        body="El metro cuadrado en Quito promedia $776 según el inventario.",
        status=Post.Status.PUBLISHED, published_at=timezone.now() - timedelta(days=200),
    )
    fresh_text = Post.objects.create(
        title="Sin cifras", slug="sin-cifras",
        body="Una guía sobre cómo elegir barrio, sin ninguna cifra en el texto.",
        status=Post.Status.PUBLISHED, published_at=timezone.now() - timedelta(days=200),
    )
    # `updated_at` is auto_now, so the age has to be written past the model.
    Post.objects.filter(id__in=[old.id, fresh_text.id]).update(
        updated_at=timezone.now() - timedelta(days=STALE_AFTER_DAYS + 10)
    )

    result = flag_stale_figures()

    assert result["stale"] == 1


@pytest.mark.django_db
def test_a_recent_article_is_not_flagged():
    """SPEC:BLOG-013 — the list is for what nobody has looked at in a quarter."""
    from blog.tasks import flag_stale_figures

    Post.objects.create(
        title="Recién revisada", slug="recien-revisada",
        body="El metro cuadrado en Quito promedia $776.",
        status=Post.Status.PUBLISHED, published_at=timezone.now(),
    )

    assert flag_stale_figures()["stale"] == 0
