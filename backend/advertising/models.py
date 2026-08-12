"""
Advertising: two tables, and the commercial record is one column.

The selling happens on WhatsApp — the space, the term and the price are all
agreed there. What reaches the database is the outcome: the creative, how long
it runs and how much was charged. There is no rate card, no order, no quote, no
payment state machine and no invoice (ADS-001, ADS-040 to ADS-043).

The system keeps the part a conversation does badly: switching a campaign off on
the day it ends, spreading impressions across several advertisers, and never
leaving a hole empty.

Three things carried over from the blog version and are not up for negotiation:

1. **A paid link must not pass authority.** Every outbound link carries
   ``rel="sponsored nofollow noopener"``. Selling a dofollow link is the fastest
   way to get a young domain manually penalised.

2. **The reader has to be told.** Each slot renders a visible "Publicidad"
   label. That is a disclosure requirement, not a design choice.

3. **A campaign is a date range, not a switch someone remembers to flip.**

Click counting excludes bots. The lesson from the activity metrics is on record:
78% of the sessions counted before filtering were crawlers, and an advertiser
reading a five-times-inflated number is being misinformed, not flattered.
"""

import unicodedata

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .placements import GEO_TARGETABLE, MAX_PER_PLACEMENT, Placement


def canonical_city(value) -> str:
    """Lowercase, unaccented city key, so «Macas» and «macas» target the same."""
    text = (value or "").strip().lower()
    text = unicodedata.normalize("NFD", text)
    return "".join(char for char in text if unicodedata.category(char) != "Mn")


class Advertiser(models.Model):
    """Who is being advertised. Kept apart so one can run several campaigns."""

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
        upload_to="advertising/advertisers/",
        blank=True,
        null=True,
        verbose_name="Logotipo",
    )
    logo_alt = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Texto alternativo del logotipo",
    )

    # Who to write to when a campaign is about to expire. Renewing costs far
    # less than selling, and without an order system this is the only thread
    # back to the customer.
    contact_name = models.CharField(max_length=120, blank=True, verbose_name="Contacto")
    contact_phone = models.CharField(
        max_length=40,
        blank=True,
        verbose_name="Teléfono de contacto",
        help_text="A quién se le escribe para renovar.",
    )

    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Anunciante"
        verbose_name_plural = "Anunciantes"
        ordering = ["name"]

    def __str__(self):
        return self.name


class CampaignQuerySet(models.QuerySet):
    def live(self, placement=None, city=None, province=None):
        """Creatives a visitor may see right now.

        A campaign is live when it is switched on, its advertiser is (or it has
        none, which is the case for the house ones), and the clock is inside its
        window. An empty ``starts_at`` means "from always" and an empty
        ``ends_at`` means "until further notice", so an evergreen house ad needs
        no dates at all.
        """
        now = timezone.now()
        queryset = (
            self.filter(is_active=True)
            .filter(
                models.Q(advertiser__isnull=True) | models.Q(advertiser__is_active=True)
            )
            .filter(models.Q(starts_at__isnull=True) | models.Q(starts_at__lte=now))
            .filter(models.Q(ends_at__isnull=True) | models.Q(ends_at__gt=now))
        )
        if placement:
            queryset = queryset.filter(placement=placement)
        city_key = canonical_city(city)
        province_key = canonical_city(province)
        if city_key or province_key:
            audience = models.Q(target_cities=[], target_provinces=[])
            if city_key:
                audience |= models.Q(target_cities__contains=[city_key])
            if province_key:
                audience |= models.Q(target_provinces__contains=[province_key])
            queryset = queryset.filter(audience)
        return queryset.select_related("advertiser")


class Campaign(models.Model):
    """One creative in one placement, for one stretch of time."""

    class Kind(models.TextChoices):
        """Three things that look alike on screen and are not the same.

        The order they are declared in is the order they are served in: if
        somebody paid, the paid one wins; failing that a house brand takes the
        space; failing that an explicitly configured promo campaign may offer
        it for sale (ADS-016, ADS-017).
        """

        PAID = "paid", "Pagada"
        PARTNER = "partner", "Del grupo (sin coste)"
        PROMO = "promo", "Espacio disponible"

    advertiser = models.ForeignKey(
        Advertiser,
        on_delete=models.CASCADE,
        related_name="campaigns",
        null=True,
        blank=True,
        verbose_name="Anunciante",
        help_text="Vacío solo para el reclamo de «espacio disponible».",
    )
    placement = models.CharField(
        max_length=20,
        choices=Placement.choices,
        db_index=True,
        verbose_name="Ubicación",
    )
    kind = models.CharField(
        max_length=10,
        choices=Kind.choices,
        default=Kind.PAID,
        db_index=True,
        verbose_name="Clase",
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
        blank=True,
        verbose_name="URL de destino",
        help_text='El enlace sale siempre con rel="sponsored nofollow". Vacío en el reclamo propio.',
    )
    image = models.ImageField(
        upload_to="advertising/campaigns/",
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

    target_cities = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Ciudades",
        help_text="Vacío = todo el país. Se guardan normalizadas (sin tildes, en minúscula).",
    )
    target_provinces = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Provincias",
        help_text="Vacío junto con ciudades = todo Ecuador.",
    )

    weight = models.PositiveSmallIntegerField(
        default=10,
        verbose_name="Peso",
        help_text=(
            "A mayor peso, más veces se muestra frente a otras campañas de la "
            "misma ubicación. Peso 30 sale tres veces más que peso 10."
        ),
    )
    is_active = models.BooleanField(default=True, verbose_name="Activa")

    # The whole commercial record. Not a charge — an annotation of one that
    # already happened, somewhere else (ADS-043).
    amount_charged_usd = models.DecimalField(
        max_digits=9,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Importe cobrado (USD)",
        help_text="Lo que se cobró por esta campaña. Vacío en las que no se cobran.",
    )

    # Counted server-side and never shown in public, like every other metric in
    # this project. Bots are excluded at the redirect (see `views.go`).
    click_count = models.PositiveIntegerField(default=0, editable=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CampaignQuerySet.as_manager()

    class Meta:
        verbose_name = "Campaña"
        verbose_name_plural = "Campañas"
        ordering = ["placement", "-weight", "-created_at"]
        indexes = [
            models.Index(fields=["placement", "is_active"]),
            models.Index(fields=["placement", "kind", "is_active"]),
        ]

    def __str__(self):
        who = self.advertiser.name if self.advertiser else self.get_kind_display()
        return f"{who} — {self.get_placement_display()}"

    def clean(self):
        errors = {}

        if self.kind == self.Kind.PAID:
            if self.advertiser_id is None:
                errors["advertiser"] = "Una campaña pagada necesita anunciante."
            if self.amount_charged_usd is None:
                errors["amount_charged_usd"] = (
                    "Si se cobró, se anota. Es el único dato comercial que "
                    "guarda el sistema."
                )
        elif self.amount_charged_usd is not None:
            # Otherwise the panel's monthly total would include sponsorships
            # nobody paid for.
            errors["amount_charged_usd"] = (
                "Solo las campañas pagadas llevan importe."
            )

        if self.kind == self.Kind.PARTNER and self.advertiser_id is None:
            errors["advertiser"] = "Una campaña del grupo necesita anunciante."

        if self.kind == self.Kind.PROMO:
            if self.advertiser_id is not None:
                errors["advertiser"] = "El reclamo de espacio disponible no lleva anunciante."
            if self.target_url:
                errors["target_url"] = "El reclamo construye su enlace de WhatsApp en la página."

        if self.kind != self.Kind.PROMO and not self.target_url:
            errors["target_url"] = "Hace falta una URL de destino."

        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            errors["ends_at"] = "La campaña termina antes de empezar."

        if (self.target_cities or self.target_provinces) and self.placement not in GEO_TARGETABLE:
            errors["target_cities"] = "Esta ubicación no admite segmentación por ciudad."

        if self.target_cities and self.target_provinces:
            errors["target_cities"] = "Elige provincias o ciudades, no las dos a la vez."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.target_cities = list(dict.fromkeys(
            key
            for key in (canonical_city(city) for city in (self.target_cities or []))
            if key
        ))
        self.target_provinces = list(dict.fromkeys(
            key
            for key in (canonical_city(province) for province in (self.target_provinces or []))
            if key
        ))
        super().save(*args, **kwargs)

    @property
    def is_live(self) -> bool:
        now = timezone.now()
        return (
            self.is_active
            and (self.advertiser is None or self.advertiser.is_active)
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
        return f"/api/ads/{self.pk}/go/"


def overbooked_placements():
    """Placements holding more live campaigns than a response can carry.

    The lightest ones are never served, and nothing about that is visible from
    the outside — the response looks perfectly normal. Without capacity control
    (ADS-042), surfacing this in the panel is the only thing standing between
    "I oversold" and "I charged somebody for nothing" (ADS-019).
    """
    counted = (
        Campaign.objects.live()
        .values("placement")
        .annotate(total=models.Count("id"))
        .filter(total__gt=MAX_PER_PLACEMENT)
    )
    return {row["placement"]: row["total"] for row in counted}
