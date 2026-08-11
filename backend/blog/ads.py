"""
Sponsorships shown inside the blog.

Three constraints shaped this, and they are the reason it is a model instead of
a banner pasted into a template:

1. **A paid link must not pass authority.** Every outbound sponsor link carries
   ``rel="sponsored nofollow noopener"``. Selling a dofollow link is the fastest
   way to get a young domain manually penalised, and the blog exists to build
   exactly the authority such a penalty would erase.

2. **The reader has to be told.** Each slot renders a visible "Publicidad" label.
   That is a disclosure requirement, not a design choice, and it also keeps the
   sponsor from being mistaken for editorial — which is what makes the editorial
   worth citing in the first place.

3. **A campaign is a date range, not a switch someone remembers to flip.** Ads
   start and stop on their own, for the same reason posts publish on their own.

Click counting lives here too, and it excludes bots. The lesson from the
activity metrics is on record: 78% of the sessions counted before filtering were
crawlers, and an advertiser reading a five-times-inflated number is being
misinformed, not flattered.
"""

from django.db import models
from django.utils import timezone


class Placement(models.TextChoices):
    """Where a creative may appear. Adding one means adding a slot in the UI."""

    INDEX_TOP = "index_top", "Blog — bajo la cabecera"
    INDEX_FEED = "index_feed", "Blog — dentro de la rejilla de artículos"
    POST_INLINE = "post_inline", "Artículo — a mitad del texto"
    POST_FOOTER = "post_footer", "Artículo — bajo el contenido"
    CATEGORY_TOP = "category_top", "Categoría — bajo la cabecera"


class Advertiser(models.Model):
    """Who is paying. Kept apart from the creative so a sponsor can run several."""

    name = models.CharField(max_length=120, unique=True, verbose_name="Nombre")
    slug = models.SlugField(max_length=140, unique=True)
    website = models.URLField(verbose_name="Sitio web")
    tagline = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Descriptor",
        help_text="Una línea sobre qué hace. Aparece bajo el nombre.",
    )
    logo = models.ImageField(
        upload_to="blog/advertisers/",
        blank=True,
        null=True,
        verbose_name="Logotipo",
    )
    logo_alt = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Texto alternativo del logotipo",
    )
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Anunciante"
        verbose_name_plural = "Anunciantes"
        ordering = ["name"]

    def __str__(self):
        return self.name


class SponsorSlotQuerySet(models.QuerySet):
    def live(self, placement=None):
        """Creatives a visitor may see right now.

        A slot is live when it is switched on, its advertiser is, and the clock
        is inside its window. An empty ``starts_at`` means "from always" and an
        empty ``ends_at`` means "until further notice", so an evergreen
        house ad needs no dates at all.
        """
        now = timezone.now()
        queryset = self.filter(
            is_active=True,
            advertiser__is_active=True,
        ).filter(
            models.Q(starts_at__isnull=True) | models.Q(starts_at__lte=now)
        ).filter(
            models.Q(ends_at__isnull=True) | models.Q(ends_at__gt=now)
        )
        if placement:
            queryset = queryset.filter(placement=placement)
        return queryset.select_related("advertiser")


class SponsorSlot(models.Model):
    """One creative in one placement."""

    advertiser = models.ForeignKey(
        Advertiser,
        on_delete=models.CASCADE,
        related_name="slots",
        verbose_name="Anunciante",
    )
    placement = models.CharField(
        max_length=20,
        choices=Placement.choices,
        db_index=True,
        verbose_name="Ubicación",
    )

    headline = models.CharField(max_length=120, verbose_name="Titular")
    body = models.TextField(
        max_length=400,
        verbose_name="Texto",
        help_text="Dos o tres líneas. Texto plano, sin Markdown.",
    )
    cta_label = models.CharField(
        max_length=60,
        default="Saber más",
        verbose_name="Texto del botón",
    )
    target_url = models.URLField(
        verbose_name="URL de destino",
        help_text="El enlace sale siempre con rel=\"sponsored nofollow\".",
    )
    image = models.ImageField(
        upload_to="blog/sponsors/",
        blank=True,
        null=True,
        verbose_name="Imagen",
    )
    image_alt = models.CharField(
        max_length=200, blank=True, verbose_name="Texto alternativo de la imagen"
    )

    starts_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Inicio de campaña",
        help_text="Vacío = activa desde ya. Hora en UTC (Ecuador = UTC-5).",
    )
    ends_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fin de campaña",
        help_text="Vacío = sin fecha de fin.",
    )
    weight = models.PositiveSmallIntegerField(
        default=10,
        verbose_name="Peso",
        help_text="A mayor peso, más veces se muestra frente a otras campañas de la misma ubicación.",
    )
    is_active = models.BooleanField(default=True, verbose_name="Activa")

    # Counted server-side and never shown in public, like every other metric in
    # this project. Bots are excluded at the redirect (see `views_ads`).
    click_count = models.PositiveIntegerField(default=0, editable=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = SponsorSlotQuerySet.as_manager()

    class Meta:
        verbose_name = "Espacio patrocinado"
        verbose_name_plural = "Espacios patrocinados"
        ordering = ["placement", "-weight", "-created_at"]
        indexes = [
            models.Index(fields=["placement", "is_active"]),
        ]

    def __str__(self):
        return f"{self.advertiser.name} — {self.get_placement_display()}"

    @property
    def is_live(self) -> bool:
        now = timezone.now()
        return (
            self.is_active
            and self.advertiser.is_active
            and (self.starts_at is None or self.starts_at <= now)
            and (self.ends_at is None or self.ends_at > now)
        )

    @property
    def click_path(self) -> str:
        """Where the creative points. Never the advertiser's URL directly.

        Routing the click through the API is what makes the count possible at
        all, and it keeps the referrer policy and the bot filter in one place
        instead of trusting whatever the destination does.
        """
        return f"/api/blog/sponsors/{self.pk}/go/"
