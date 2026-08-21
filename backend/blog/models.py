"""
Blog content: editorial posts written from the Django admin and served to the
public Next.js site.

Two things shape this model beyond "a post has a title and a body":

1. **Scheduling is a date, not a job.** A post becomes public the moment
   ``published_at`` is in the past, regardless of whether the Celery beat task
   that flips ``status`` ever ran. The task exists only for the side effects
   (IndexNow ping, Next.js revalidation); if the worker is down the post still
   appears on time, just with a colder cache. Making the queue authoritative
   would mean a broker outage silently freezes the editorial calendar.

2. **The body is Markdown, rendered by the frontend.** Storing HTML would put
   an injection surface in a text field that staff paste into. The frontend
   builds React nodes from a small Markdown subset instead, so nothing the
   editor writes can become live markup.
"""

import re

from django.conf import settings
from django.db import models

from advertising.models import Advertiser, Campaign  # noqa: F401
from django.utils import timezone
from django.utils.text import slugify

# Average adult reading speed in Spanish prose. Only used for the "5 min de
# lectura" label, so it does not need to be precise.
WORDS_PER_MINUTE = 200


class Category(models.Model):
    """Editorial section of the blog (guides, market data, legal…)."""

    name = models.CharField(max_length=80, unique=True, verbose_name="Nombre")
    slug = models.SlugField(max_length=90, unique=True)
    description = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Aparece bajo el título en la página de la categoría y en su meta description.",
    )
    order = models.PositiveSmallIntegerField(
        default=100,
        verbose_name="Orden",
        help_text="Menor número aparece antes en el menú del blog.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:90]
        super().save(*args, **kwargs)


class PostQuerySet(models.QuerySet):
    def public(self):
        """Posts a visitor may read right now.

        Deliberately does not require ``status == PUBLISHED``: a scheduled post
        whose date has passed is public even if the beat task has not flipped it
        yet. See the module docstring.
        """
        return self.filter(
            status__in=(Post.Status.SCHEDULED, Post.Status.PUBLISHED),
            published_at__isnull=False,
            published_at__lte=timezone.now(),
        )

    def due(self):
        """Scheduled posts whose publication date has arrived."""
        return self.filter(
            status=Post.Status.SCHEDULED,
            published_at__isnull=False,
            published_at__lte=timezone.now(),
        )

    def sponsored(self):
        """Articles that serve an advertiser rather than the reader."""
        return self.filter(sponsor__isnull=False)

    def editorial(self):
        """Everything else, which is almost everything."""
        return self.filter(sponsor__isnull=True)


# Reuses the campaign vocabulary rather than inventing a parallel one: the same
# three words already describe who a banner serves (ADS-016). `PROMO` is left
# out on purpose — an article cannot be "space available".
SponsorKind = Campaign.Kind


class Post(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        SCHEDULED = "scheduled", "Programado"
        PUBLISHED = "published", "Publicado"
        ARCHIVED = "archived", "Archivado"

    title = models.CharField(max_length=200, verbose_name="Título")
    slug = models.SlugField(
        max_length=220,
        unique=True,
        help_text="Parte final de la URL: /blog/<slug>. No la cambies una vez indexada.",
    )
    excerpt = models.TextField(
        max_length=400,
        verbose_name="Resumen",
        help_text="Entradilla del listado y meta description por defecto (150-160 caracteres ideal).",
    )
    body = models.TextField(
        verbose_name="Cuerpo (Markdown)",
        help_text=(
            "Markdown: ## y ### para títulos, - para listas, 1. para listas numeradas, "
            "**negrita**, [texto](/enlace), > para citas."
        ),
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
        verbose_name="Categoría",
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Etiquetas",
        help_text='Lista JSON de textos cortos, p. ej. ["Quito", "Hipotecas"].',
    )
    # The city an article is about, and the reason the blog earns its keep: a
    # post that answers "cuánto cuesta la alcabala en Quito" is only worth
    # writing if it hands the reader the Quito inventory and the Quito price
    # index. Empty means the article is national in scope.
    city = models.CharField(
        max_length=80,
        blank=True,
        db_index=True,
        verbose_name="Ciudad del artículo",
        help_text=(
            "Ciudad sobre la que trata el artículo, p. ej. «Quito». Escrita igual "
            "que en los anuncios. Vacío = alcance nacional."
        ),
    )

    faqs = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Preguntas frecuentes",
        help_text=(
            'Lista JSON [{"q": "pregunta", "a": "respuesta"}]. Se publican como '
            "FAQPage en JSON-LD: es lo que Google y los buscadores de IA citan."
        ),
    )
    related_links = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Enlaces relacionados",
        help_text='Lista JSON [{"label": "texto", "href": "/ruta"}].',
    )

    cover_image = models.ImageField(
        upload_to="blog/covers/",
        blank=True,
        null=True,
        verbose_name="Imagen de portada",
    )
    cover_image_alt = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Texto alternativo de la portada",
    )

    # E-E-A-T: Google and the AI crawlers weigh a named, credentialed author.
    # `author` links the account that wrote it; the two text fields are what the
    # page and the Article schema actually show, so a post survives the account
    # being deleted or renamed.
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="blog_posts",
        verbose_name="Autor (cuenta)",
    )
    author_name = models.CharField(
        max_length=120,
        blank=True,
        verbose_name="Autor (nombre público)",
        help_text="Si se deja vacío se firma con el nombre del sitio.",
    )
    author_role = models.CharField(
        max_length=160,
        blank=True,
        verbose_name="Cargo o credencial del autor",
    )
    # Derived from the public author name on save. A name in a byline is a
    # string; a name with a URL of its own is an entity Google and the AI
    # crawlers can attach a track record to, which is what E-E-A-T rewards.
    author_slug = models.SlugField(
        max_length=140,
        blank=True,
        db_index=True,
        editable=False,
        verbose_name="Slug del autor",
    )

    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
        verbose_name="Estado",
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Fecha de publicación",
        help_text=(
            "En el futuro = programado: el post aparece solo cuando llega la fecha. "
            "Hora en UTC (Ecuador = UTC-5, así que las 13:00 UTC son las 08:00 locales)."
        ),
    )
    is_featured = models.BooleanField(
        default=False,
        verbose_name="Destacado",
        help_text="Se muestra en grande en la portada del blog.",
    )

    # An article that is advertising is still an article: it is written, edited
    # and read like the rest. What separates it is who it serves, and that has to
    # be visible to the reader and knowable by the system — Google's own rule is
    # that paid placement must be disclosed and its links marked, and a portal
    # that publishes market figures cannot afford to blur the line between what
    # it found and what somebody paid it to say.
    #
    # The advertiser and the kind live in `advertising`, so a sponsored article
    # and a sponsored banner describe the same relationship with the same words
    # (ADS-016). Empty means editorial, which is what almost every post is.
    sponsor = models.ForeignKey(
        "advertising.Advertiser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sponsored_posts",
        verbose_name="Anunciante",
        help_text="Vacío = contenido editorial. Con anunciante = contenido publicitario.",
    )
    sponsor_kind = models.CharField(
        max_length=10,
        blank=True,
        default="",
        choices=SponsorKind.choices,
        verbose_name="Tipo de publicidad",
        help_text="Pagada por un tercero, o del grupo (Aents) sin coste.",
    )

    meta_title = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Meta title",
        help_text="Solo si debe diferir del título. Vacío = se usa el título.",
    )
    meta_description = models.CharField(
        max_length=320,
        blank=True,
        verbose_name="Meta description",
        help_text="Vacío = se usa el resumen.",
    )

    reading_minutes = models.PositiveSmallIntegerField(default=1, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = PostQuerySet.as_manager()

    @property
    def is_sponsored(self) -> bool:
        """Whether this article has to be labelled as advertising."""
        return self.sponsor_id is not None

    class Meta:
        verbose_name = "Post"
        verbose_name_plural = "Posts"
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "published_at"]),
        ]

    def __str__(self):
        return self.title

    @property
    def is_public(self) -> bool:
        return (
            self.status in (self.Status.SCHEDULED, self.Status.PUBLISHED)
            and self.published_at is not None
            and self.published_at <= timezone.now()
        )

    @property
    def absolute_path(self) -> str:
        return f"/blog/{self.slug}"

    @property
    def public_author_name(self) -> str:
        """What the byline shows: the override, then the account, then nothing."""
        if self.author_name:
            return self.author_name
        if self.author_id and self.author:
            return self.author.get_full_name() or self.author.username
        return ""

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)[:220]
        self.reading_minutes = estimate_reading_minutes(self.body)
        self.author_slug = slugify(self.public_author_name)[:140]
        super().save(*args, **kwargs)


class PostImage(models.Model):
    """An image uploaded for the blog, ready to be dropped into a body.

    Exists because the alternative does not work: nobody types a MinIO URL from
    memory. The editor uploads here, copies the Markdown snippet the admin shows
    back, and pastes it into the article. The alt text travels with the file, so
    an image cannot end up in a post without one — which is an accessibility
    requirement before it is an SEO one.
    """

    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="images",
        null=True,
        blank=True,
        verbose_name="Artículo",
        help_text="Vacío = imagen de la biblioteca, reutilizable en cualquier artículo.",
    )
    image = models.ImageField(upload_to="blog/body/", verbose_name="Imagen")
    alt = models.CharField(
        max_length=200,
        verbose_name="Texto alternativo",
        help_text="Qué se ve en la imagen. Lo lee un lector de pantalla y lo indexa Google.",
    )
    caption = models.CharField(
        max_length=240,
        blank=True,
        verbose_name="Pie de foto",
        help_text="Opcional. Se muestra bajo la imagen, en gris pequeño.",
    )
    credit = models.CharField(
        max_length=160,
        blank=True,
        verbose_name="Crédito",
        help_text="Autor o fuente, si la imagen no es propia.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Imagen del blog"
        verbose_name_plural = "Imágenes del blog"
        ordering = ["-created_at"]

    def __str__(self):
        return self.alt or (self.image.name if self.image else "imagen")

    @property
    def markdown(self) -> str:
        """The exact line to paste into a body."""
        if not self.image:
            return ""
        caption = self.caption
        if self.credit:
            caption = f"{caption} ({self.credit})" if caption else self.credit
        alt = self.alt.replace("]", "")
        return f'![{alt}]({self.image.url} "{caption}")' if caption else f"![{alt}]({self.image.url})"


def estimate_reading_minutes(body: str) -> int:
    words = len(re.findall(r"\S+", body or ""))
    return max(1, round(words / WORDS_PER_MINUTE) or 1)


# Sponsorships live in their own module so the editorial model stays readable,
# but they must be imported here for Django to register them with this app.
from .ads import Advertiser, Placement, SponsorSlot  # noqa: E402,F401
