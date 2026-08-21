from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
import re
import unicodedata

from django.db import models
from django.db.models.functions import Upper
from django.conf import settings
from django.utils import timezone
from pathlib import Path
from uuid import uuid4
from .geo import polygon_center_lat_lng
from .services.short_codes import unique_code
from .validators import validate_image_size, validate_image_dimensions, validate_image_format


# Ceiling for any surface a listing can claim: 10 000 ha. Above this the number
# stopped describing a property and started describing a typo.
MAX_LISTING_AREA_M2 = 100_000_000.0


def pending_publication_image_path(instance, filename):
    """Opaque object name for a temporary photo that must not reveal its original name."""
    return f"pending-publications/{uuid4().hex}{Path(filename).suffix.lower()}"


class User(AbstractUser):
    """Custom user model with a unique email field."""

    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)

    # OAuth fields
    oauth_provider = models.CharField(max_length=50, blank=True, null=True)
    oauth_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    avatar_url = models.URLField(blank=True, null=True)


class Province(models.Model):
    """Modelo para provincias/estados"""
    name = models.CharField(max_length=100, unique=True, verbose_name='Nombre')
    code = models.CharField(max_length=10, unique=True, null=True, blank=True, verbose_name='Código')
    country = models.CharField(max_length=100, default='Ecuador', verbose_name='País')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Provincia'
        verbose_name_plural = 'Provincias'
        ordering = ['name']

    def __str__(self):
        return self.name


class City(models.Model):
    """Modelo para ciudades/cantones"""
    name = models.CharField(max_length=100, verbose_name='Nombre')
    province = models.ForeignKey(
        Province,
        on_delete=models.CASCADE,
        related_name='cities',
        verbose_name='Provincia'
    )
    code = models.CharField(max_length=10, null=True, blank=True, verbose_name='Código')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Ciudad'
        verbose_name_plural = 'Ciudades'
        ordering = ['name']
        unique_together = [['name', 'province']]

    def __str__(self):
        return f"{self.name} ({self.province.name})"


# A zone name and a headline are both free text, and importers put whichever
# they have in the first segment of `address`. Left alone, «Casa en Venta»
# became a neighbourhood of Guayaquil with 19 listings and a published price per
# square metre — a market reading for a place that does not exist.
#
# The test is deliberately narrow: a property word AND an operation word, both
# as whole words. Ecuador really does have places called Villa Club, Villa
# Regina and Ventanas, and none of them carries an operation word, so they stay.
_LISTING_TYPE_WORDS = (
    "casa", "casas", "departamento", "departamentos", "depto", "deptos",
    "terreno", "terrenos", "lote", "lotes", "local", "locales", "oficina",
    "oficinas", "suite", "suites", "penthouse", "bodega", "bodegas", "galpon",
    "galpones", "finca", "quinta", "villa", "villas", "inmueble", "propiedad",
    "dpto", "dptos", "dep", "deps",
)

# A verb in the first person settles it on its own. «Vendo» is something a
# seller says, never something a place is called, so «Laguna del Sol por viaje
# vendo US$ 390.» does not need a property word to be recognised as a headline.
# The third person stays ambiguous — «venta», «renta» and «arriendo» are also
# nouns, and Ecuador has places called La Venta and Renta Alta — so those still
# need a property word beside them.
_SELLER_VOICE_WORDS = (
    "vendo", "vendemos", "alquilo", "alquilamos", "rento", "rentamos",
    "remato", "rematamos",
)
# Third person and first person both, because half the catalogue is written by
# the seller: «Casa en Venta» and «Vendo casa independiente Lomas de Monteserrín»
# are the same kind of string, and the second one had become a neighbourhood of
# Quito with a page of its own. None of these is a place name in Ecuador.
_LISTING_OPERATION_WORDS = (
    "venta", "vende", "venden", "vendo", "vendemos",
    "alquiler", "alquila", "alquilan", "alquilo", "alquilamos",
    "arriendo", "arrienda", "arriendan",
    "renta", "rentan", "rento", "rentamos",
    "remato", "rematamos",
)
_LISTING_TITLE_RE = re.compile(
    r"\b(?:{types})\b".format(types="|".join(_LISTING_TYPE_WORDS))
)
_LISTING_OPERATION_RE = re.compile(
    r"\b(?:{ops})\b".format(ops="|".join(_LISTING_OPERATION_WORDS))
)


_SELLER_VOICE_RE = re.compile(
    r"\b(?:{words})\b".format(words="|".join(_SELLER_VOICE_WORDS))
)


def _looks_like_listing_title(folded: str) -> bool:
    """True when the segment describes what is for sale, not where it is."""
    if _SELLER_VOICE_RE.search(folded):
        return True
    return bool(_LISTING_TITLE_RE.search(folded) and _LISTING_OPERATION_RE.search(folded))


def sector_key(address: str, city: str = "") -> str:
    """Stable key for the named zone a listing sits in.

    `address` is free text and the first segment before the comma is the finest
    geographic level the catalogue has — a neighbourhood («Cumbayá»), a gated
    development («Urb. Mocolí Golf Club»), sometimes an avenue. The key folds
    case and accents because the same zone arrives written every way, and comes
    back empty when the segment is just the city again: «el sector Macas de la
    ciudad de Macas» is not a place, it is a repetition (PRC-009).

    It also comes back empty when the segment is the listing's own headline
    rather than a place, so no page, sitemap entry or price average is ever
    built for one.
    """
    first = (address or "").split(",")[0].strip()
    if not first:
        return ""
    folded = _fold_place(first)
    if folded == _fold_place(city):
        return ""
    return "" if _looks_like_listing_title(folded) else folded


def _fold_place(text: str) -> str:
    normalized = unicodedata.normalize("NFD", (text or "").strip())
    stripped = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return " ".join(stripped.casefold().split())


class Property(models.Model):
    # --- General Information ---
    PROPERTY_TYPE_CHOICES = [
        ("house", "House"),
        ("land", "Land"),
        ("apartment", "Apartment"),
        ("commercial", "Commercial Property"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("for_sale", "For Sale"),
        ("for_rent", "For Rent"),
        ("inactive", "Inactive"),
    ]

    # Why this is not a fourth and fifth `status` value:
    #
    # `status` is the operation the listing offers, and every public read in the
    # project is built on `exclude(status='inactive')` — the map, the SEO
    # landings, the market stats, the sitemap and the import pipeline. Adding
    # `sold` and `rented` there would leave a sold listing on the map until each
    # of those filters was found and changed, and `0005_alter_property_status`
    # already removed those two values once on purpose.
    #
    # A closure is a different fact anyway: it says *why* a listing left the
    # catalogue, not what it was offering. Keeping it in its own column means
    # nothing that filters by status has to learn a new word, and the question
    # "how many properties did the portal actually sell" becomes answerable.
    CLOSED_REASON_CHOICES = [
        ("sold", "Sold"),
        ("rented", "Rented"),
        ("withdrawn", "Withdrawn"),
    ]

    # A closure that means success, as opposed to giving up on the listing. Only
    # these deserve the congratulation image of SOC-102.
    SUCCESSFUL_CLOSURES = ("sold", "rented")

    title = models.CharField(max_length=150, blank=True, default="")
    description = models.TextField(blank=True, default="")
    property_type = models.CharField(max_length=30, choices=PROPERTY_TYPE_CHOICES, default="land")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="for_sale")
    short_code = models.CharField(
        max_length=12, unique=True, null=True, blank=True, db_index=True,
        help_text="Código corto imprimible del anuncio; se asigna al crearlo y no cambia nunca",
    )

    # --- Location ---
    address = models.CharField(max_length=255, blank=True, default="")
    # Derived from `address` on every save so the zone can be filtered and
    # paginated in SQL. Recomputing it in Python per request was fine for a
    # table of averages and is not enough for a page that lists a zone.
    sector_key = models.CharField(max_length=120, blank=True, default="", db_index=True)
    sector_label = models.CharField(max_length=120, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="Macas")
    province = models.CharField(max_length=100, blank=True, default="Morona Santiago")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    polygon = models.JSONField(null=True, blank=True, help_text="GeoJSON polygon for land boundaries")
    show_measurements = models.BooleanField(default=True, help_text="Show exact measurements on map or just reference figure")

    # --- Characteristics ---
    # A surface can be unknown (imports often are) but never negative, and never
    # larger than any parcel that exists: the form asks for this number by hand
    # instead of deriving it, so a slip typing it lands straight in the price per
    # m² of the city. The ceiling is 10 000 ha, far above the largest listing and
    # far below the 100 000 km² a stray keypress produces.
    area = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(MAX_LISTING_AREA_M2)],
        help_text="Total area in square meters (opcional en anuncios importados)",
    )
    built_area = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(MAX_LISTING_AREA_M2)],
        help_text="Built area in square meters (for houses)",
    )
    rooms = models.PositiveIntegerField(default=0)
    bathrooms = models.PositiveIntegerField(default=0)
    parking_spaces = models.PositiveIntegerField(default=0)
    floors = models.PositiveIntegerField(null=True, blank=True, help_text="Number of floors (for houses)")
    furnished = models.BooleanField(default=False)
    year_built = models.PositiveIntegerField(null=True, blank=True)

    # --- Financial Information ---
    # ``price`` es el precio PRINCIPAL (el de venta cuando el anuncio es de
    # venta). ``rent_price`` se usa cuando un mismo anuncio es venta Y alquiler
    # a la vez: guarda el precio de alquiler; ``price`` queda con el de venta
    # (operación prioritaria). Si es solo alquiler, el precio va en ``price`` y
    # ``rent_price`` queda ``None``.
    # "No price" is spelled NULL and reads as "a consultar". A negative price is
    # not a cheaper listing, it is a typo, and the public card hides it behind
    # that same "a consultar" — so nobody would ever find out.
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True,
                                validators=[MinValueValidator(0)],
                                help_text="Opcional: los anuncios importados pueden no traer precio ('a consultar')")
    rent_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True,
                                     validators=[MinValueValidator(0)],
                                     help_text="Precio de alquiler cuando el anuncio es venta Y alquiler a la vez")
    is_negotiable = models.BooleanField(default=True)

    # --- Closure ---
    closed_reason = models.CharField(
        max_length=20, choices=CLOSED_REASON_CHOICES, blank=True, default="", db_index=True,
        help_text="Por qué se cerró el anuncio: vendido, alquilado o retirado. Vacío = sigue abierto",
    )
    closed_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Cuándo se cerró el anuncio; se rellena solo al marcar el motivo",
    )

    # --- Ownership & Contact ---
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="properties",
    )
    contact_phone = models.CharField(max_length=20, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")

    # --- Origen / agregador (ingesta) ---
    # Propiedades recopiladas de otros portales. owner queda NULL; el contacto
    # cae en cascada: teléfono -> email -> enlace al anuncio original (source_url).
    source = models.ForeignKey(
        "ingesta.Fuente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="properties",
        help_text="Portal de origen si la propiedad fue importada",
    )
    source_agency = models.CharField(max_length=150, blank=True, default="",
                                      help_text="Inmobiliaria/publicador del anuncio en el portal de origen")
    source_url = models.URLField(max_length=500, blank=True, default="",
                                 help_text="Enlace al anuncio original (contacto fallback)")
    external_id = models.CharField(max_length=120, blank=True, default="", db_index=True,
                                   help_text="ID del anuncio en el portal de origen")
    is_imported = models.BooleanField(default=False, db_index=True,
                                      help_text="True si fue recopilada por el agregador")
    image_hash = models.CharField(max_length=32, blank=True, default="", db_index=True,
                                  help_text="Huella perceptual (dHash) de la imagen principal, para detectar la misma propiedad entre portales")
    is_duplicate = models.BooleanField(default=False, db_index=True,
                                       help_text="Oculto del mapa: es duplicado de otra fuente (perdió la preferencia)")
    imported_at = models.DateTimeField(null=True, blank=True)
    source_published_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Fecha original de publicación declarada por el portal externo",
    )
    source_updated_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Última actualización declarada por el portal externo",
    )
    last_seen_at = models.DateTimeField(null=True, blank=True,
                                        help_text="Última vez visto en la fuente (para caducar)")

    # --- Metrics ---
    views_count = models.PositiveIntegerField(default=0, help_text="Número de veces que se ha visto el detalle")

    # --- Trash ---
    #
    # An administrative delete stops being a DELETE and becomes a date. The row
    # survives 30 days so a mistake can be undone, and it leaves the catalogue
    # the only way the whole project already understands: `status='inactive'`,
    # which every public read excludes. Nothing that filters by status has to
    # learn a new word for this to disappear from the map, the sitemap and the
    # SEO landings — the same argument that kept `sold` out of `status`.
    deleted_at = models.DateTimeField(
        null=True, blank=True, db_index=True,
        help_text="Momento en que se envió a la papelera; nulo si está viva",
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True, on_delete=models.SET_NULL, related_name="+",
    )
    # What it was offering before the delete, so restoring puts it back on the
    # market instead of leaving it silently inactive.
    deleted_previous_status = models.CharField(max_length=30, blank=True, default="")

    # --- Media ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "is_duplicate", "latitude", "longitude"], name="prop_map_bbox_idx"),
            models.Index(fields=["status", "property_type", "price"], name="prop_filter_price_idx"),
            models.Index(fields=["province", "city", "status"], name="prop_location_idx"),
            models.Index(fields=["owner", "status"], name="prop_owner_status_idx"),
            models.Index(fields=["source", "is_imported", "status"], name="prop_source_status_idx"),
            models.Index(fields=["-views_count"], name="prop_views_desc_idx"),
            # The public filters use city__iexact / province__iexact, which
            # Postgres runs as UPPER(col) = UPPER(value): only a functional
            # index over the same expression can serve them.
            models.Index(Upper("city"), name="prop_city_upper_idx"),
            models.Index(Upper("province"), name="prop_province_upper_idx"),
            # Import dedup scans lat/lng ranges over the imported canon only.
            # prop_map_bbox_idx cannot serve that filter (its leading column is
            # `status`, absent there), so without this every new listing costs
            # a sequential scan during ingestion.
            models.Index(
                fields=["latitude", "longitude"],
                condition=models.Q(is_imported=True, is_duplicate=False),
                name="prop_dedup_bbox_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "external_id"],
                condition=models.Q(is_imported=True),
                name="uniq_source_external_when_imported",
            ),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}" if self.title else f"Property {self.pk}"

    def save(self, *args, **kwargs):
        """
        A listing that has a shape always has a position.

        Drawing a polygon is how most owners publish, and that path never sets
        latitude/longitude — the API serializer used to be the only thing
        filling them in, so anything writing through the admin, a shell or an
        import left the columns null. A property without coordinates is invisible
        to every geographic query: it drops out of "nearby", and the bbox filter
        has to wave through *all* such rows on every viewport request because it
        cannot place any of them.

        The short code is assigned here for the same reason: every write path
        goes through save() — the API, the admin, the import pipeline — and a
        listing without a code cannot be promoted. It is only ever assigned when
        empty, because the code gets printed onto images that outlive the row.

        Closing a listing is normalized here too: a sold flat that stayed
        `for_sale` would keep being offered on the map, and the only mechanism
        this model has for leaving the public catalogue is `status='inactive'`
        (PROP-002). Reopening therefore means clearing `closed_reason`, not
        changing `status` — otherwise the next save would send it straight back.
        """
        if self.closed_reason:
            self.status = "inactive"
            if self.closed_at is None:
                self.closed_at = timezone.now()
            update_fields = kwargs.get('update_fields')
            if update_fields is not None:
                kwargs['update_fields'] = set(update_fields) | {'status', 'closed_at'}
        elif self.closed_at is not None:
            self.closed_at = None
            update_fields = kwargs.get('update_fields')
            if update_fields is not None:
                kwargs['update_fields'] = set(update_fields) | {'closed_at'}

        computed_key = sector_key(self.address, self.city)
        computed_label = (self.address or "").split(",")[0].strip() if computed_key else ""
        if (self.sector_key, self.sector_label) != (computed_key, computed_label):
            self.sector_key = computed_key
            self.sector_label = computed_label
            update_fields = kwargs.get('update_fields')
            if update_fields is not None:
                kwargs['update_fields'] = set(update_fields) | {'sector_key', 'sector_label'}

        if not self.short_code:
            self.short_code = unique_code(type(self))
            update_fields = kwargs.get('update_fields')
            if update_fields is not None:
                kwargs['update_fields'] = set(update_fields) | {'short_code'}

        if self.polygon and (self.latitude is None or self.longitude is None):
            center = polygon_center_lat_lng(self.polygon)
            if center:
                if self.latitude is None:
                    self.latitude = center[0]
                if self.longitude is None:
                    self.longitude = center[1]
                # A caller saving only `polygon` would otherwise compute the
                # centre and then not persist it.
                update_fields = kwargs.get('update_fields')
                if update_fields is not None:
                    kwargs['update_fields'] = set(update_fields) | {'latitude', 'longitude'}
        super().save(*args, **kwargs)

    @property
    def is_for_sale(self):
        return self.status == "for_sale"

    @property
    def is_for_rent(self):
        return self.status == "for_rent"

    @property
    def is_closed_successfully(self):
        """True when the listing left the catalogue because it sold or rented."""
        return self.closed_reason in self.SUCCESSFUL_CLOSURES


class PropertyPriceHistory(models.Model):
    """Store the auditable timeline of published property prices."""

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="price_history")
    price = models.DecimalField(max_digits=12, decimal_places=2)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["recorded_at"]
        indexes = [models.Index(fields=["property", "recorded_at"], name="property_price_date_idx")]


class PropertyImage(models.Model):
    """Images for properties stored in MinIO with optimization"""

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente de optimizar"
        READY = "ready", "Optimizada"
        FAILED = "failed", "Falló la optimización"

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="images"
    )
    image = models.ImageField(
        upload_to="properties/",
        blank=True,
        validators=[validate_image_size, validate_image_dimensions, validate_image_format]
    )
    thumbnail = models.ImageField(
        upload_to="properties/thumbnails/",
        blank=True,
        null=True,
        help_text="Thumbnail optimizado para previsualizaciones"
    )
    is_main = models.BooleanField(default=False)
    original_filename = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(default=0, help_text="Tamaño del archivo en bytes")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Optimization is done by a Celery worker, not by the request that uploaded
    # the file, so a row exists before `image` points at anything in MinIO.
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.READY,
        db_index=True,
        help_text="Estado del pipeline de optimización",
    )
    pending_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Ruta del original en disco mientras espera al worker",
    )
    optimization_error = models.TextField(blank=True)

    class Meta:
        ordering = ["-is_main", "-uploaded_at"]

    def __str__(self):
        return f"Image for {self.property.title or f'Property {self.property.pk}'}"

    # Not a @property: the FK above is named `property` and shadows the builtin
    # inside this class body.
    def is_ready(self):
        return self.status == self.Status.READY and bool(self.image)


class SystemIncident(models.Model):
    """Aggregated operational failure without request bodies or credentials."""

    SEVERITY_CHOICES = [
        ("critical", "Critical"),
        ("error", "Error"),
        ("warning", "Warning"),
    ]

    fingerprint = models.CharField(max_length=64, unique=True)
    kind = models.CharField(max_length=80, default="http_error")
    severity = models.CharField(max_length=12, choices=SEVERITY_CHOICES, default="error")
    status_code = models.PositiveSmallIntegerField(default=500)
    method = models.CharField(max_length=10, blank=True, default="")
    path = models.CharField(max_length=500, blank=True, default="")
    message = models.CharField(max_length=500, blank=True, default="")
    request_id = models.CharField(max_length=64, blank=True, default="")
    occurrences = models.PositiveIntegerField(default=1)
    resolved = models.BooleanField(default=False, db_index=True)
    first_seen_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["resolved", "-last_seen_at"]
        indexes = [
            models.Index(fields=["resolved", "severity", "-last_seen_at"], name="incident_status_seen_idx"),
        ]

    def __str__(self):
        return f"{self.status_code} {self.method} {self.path} ({self.occurrences})"


class EmailVerificationToken(models.Model):
    """Token for email verification"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_verification_tokens'
    )
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Verification code for {self.user.email}"

    def is_valid(self):
        """Check if token is still valid"""
        from django.utils import timezone
        return not self.is_used and timezone.now() < self.expires_at


class PasswordResetToken(models.Model):
    """Token for password reset"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens'
    )
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Password reset token for {self.user.email}"

    def is_valid(self):
        """Check if token is still valid"""
        from django.utils import timezone
        return not self.is_used and timezone.now() < self.expires_at


class EmailChangeToken(models.Model):
    """Token for email change verification"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_change_tokens'
    )
    new_email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Email change token for {self.user.email} -> {self.new_email}"

    def is_valid(self):
        """Check if token is still valid"""
        from django.utils import timezone
        return not self.is_used and timezone.now() < self.expires_at


class Lead(models.Model):
    """
    Contacto/interesado sobre una propiedad. Permite medir qué propiedades
    generan interés y da a la inmobiliaria una bandeja de leads que gestionar.
    """
    SOURCE_CHOICES = [
        ("property_modal", "Modal del mapa"),
        ("property_page", "Página de propiedad"),
        ("whatsapp", "WhatsApp"),
        ("phone", "Teléfono"),
        ("other", "Otro"),
    ]

    STATUS_CHOICES = [
        ("new", "Nuevo"),
        ("contacted", "Contactado"),
        ("closed", "Cerrado"),
    ]

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="leads",
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30)
    email = models.EmailField(blank=True, default="")
    message = models.TextField(blank=True, default="")
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default="property_modal")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["property", "status"], name="lead_property_status_idx"),
            models.Index(fields=["status", "created_at"], name="lead_status_created_idx"),
            models.Index(fields=["source", "created_at"], name="lead_source_created_idx"),
        ]

    def __str__(self):
        return f"Lead de {self.name} sobre {self.property_id}"


class PendingPublication(models.Model):
    """
    Solicitud de publicación capturada antes de que el usuario cree o verifique
    su cuenta. No se muestra en el mapa; sirve para seguimiento comercial.
    """
    STATUS_CHOICES = [
        ("new", "Nuevo"),
        ("contacted", "Contactado"),
        ("converted", "Convertido"),
        ("discarded", "Descartado"),
    ]

    SOURCE_CHOICES = [
        ("account_required", "Intento de publicar sin cuenta"),
        ("whatsapp_help", "Ayuda por WhatsApp"),
        ("exit_prompt", "Abandono del formulario"),
        ("other", "Otro"),
    ]

    title = models.CharField(max_length=150, blank=True, default="")
    contact_phone = models.CharField(max_length=30, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    province = models.CharField(max_length=100, blank=True, default="")
    property_type = models.CharField(max_length=30, blank=True, default="")
    operation = models.CharField(max_length=30, blank=True, default="")
    price = models.CharField(max_length=50, blank=True, default="")
    draft_key = models.UUIDField(unique=True, null=True, blank=True, editable=False)
    draft = models.JSONField(default=dict, blank=True)
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default="account_required")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    # Set when a resume link is redeemed. Without it, ``converted`` is a claim
    # nobody can check: the tray could not say which requests became listings.
    property = models.ForeignKey(
        Property,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pending_publications",
        help_text="Propiedad creada al canjear el enlace de continuación",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="pending_status_created_idx"),
            models.Index(fields=["source", "created_at"], name="pending_source_created_idx"),
        ]

    def __str__(self):
        return self.title or f"Solicitud pendiente {self.pk}"


class PendingPublicationImage(models.Model):
    """Temporary image attached to one resumable publication draft."""

    pending = models.ForeignKey(
        PendingPublication,
        on_delete=models.CASCADE,
        related_name="temporary_images",
    )
    image = models.ImageField(upload_to=pending_publication_image_path)
    position = models.PositiveSmallIntegerField(default=0)
    original_filename = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]


class PublicationResumeToken(models.Model):
    """
    Enlace de un solo uso que devuelve un borrador abandonado a quien lo escribió.

    The draft itself already lives on the server, but the browser only restores
    it from ``localStorage``, so it dies with the device. This token is what lets
    staff hand it back over WhatsApp. It is a bearer credential that travels
    through a chat and gets forwarded, so its scope is deliberately narrow: it
    opens one draft, expires, and burns on redemption.
    """

    pending = models.ForeignKey(
        PendingPublication,
        on_delete=models.CASCADE,
        related_name="resume_tokens",
    )
    token = models.CharField(max_length=100, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_resume_tokens",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    redeemed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["pending", "-created_at"], name="resume_pending_created_idx"),
        ]

    def __str__(self):
        return f"Resume token for pending publication {self.pending_id}"

    def is_valid(self):
        """Usable right now: not revoked, not already redeemed, not expired."""
        from django.utils import timezone

        return (
            self.revoked_at is None
            and self.redeemed_at is None
            and timezone.now() < self.expires_at
        )


class ActivityEvent(models.Model):
    """Evento funcional para auditoría, embudos y detección de errores."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_events",
    )
    property = models.ForeignKey(
        Property,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_events",
    )
    session_id = models.CharField(max_length=64, blank=True, default="")
    event_name = models.CharField(max_length=100)
    path = models.CharField(max_length=300, blank=True, default="")
    payload = models.JSONField(default=dict, blank=True)
    # Set server-side from the User-Agent (see real_estate.bot_detection). Bot
    # events are stored, never rejected: crawlers keep full access and their
    # traffic stays graphable, they are just excluded from human metrics.
    is_bot = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_name", "created_at"], name="activity_event_date_idx"),
            models.Index(fields=["user", "created_at"], name="activity_user_date_idx"),
            models.Index(fields=["property", "created_at"], name="activity_property_date_idx"),
            # Per-listing, human-only, time-bounded reads: the promotion report
            # of SOC-101. Deliberately a plain B-tree and not a GIN index on
            # `payload`: (property, is_bot, created_at) already cuts the table
            # down to the few hundred events of one listing inside the window,
            # and the JSON campaign/source test then runs on that handful. A GIN
            # index would pay for itself on every single write instead.
            models.Index(
                fields=["property", "is_bot", "created_at"],
                name="activity_prop_human_idx",
            ),
        ]

    def __str__(self):
        return f"{self.event_name} ({self.user_id or self.session_id or 'anónimo'})"


class MarketSnapshot(models.Model):
    """One slice of the market, as it stood on one day.

    Written once a night and never edited. The value is not in any single row —
    a page can compute today's figures on demand — but in the series they form:
    «is the square metre in Cumbayá rising» cannot be answered by a portal that
    only knows today, and cannot be back-filled once the day has passed.

    A row exists only when the slice held enough listings to support the
    figures (`MIN_SNAPSHOT_LISTINGS`), so a gap in the series is a real gap in
    the inventory rather than a number nobody should have published.
    """

    class Scope(models.TextChoices):
        COUNTRY = 'country', 'País'
        CITY = 'city', 'Ciudad'
        SECTOR = 'sector', 'Zona'

    captured_on = models.DateField(db_index=True)
    scope = models.CharField(max_length=10, choices=Scope.choices)
    # Empty means "every one of them": `city=''` is the whole country, and
    # `property_type=''` is every type pooled together.
    city = models.CharField(max_length=120, blank=True, default='')
    sector_key = models.CharField(max_length=120, blank=True, default='')
    property_type = models.CharField(max_length=30, blank=True, default='')
    status = models.CharField(max_length=20)

    active_count = models.PositiveIntegerField()
    median_price = models.FloatField(null=True, blank=True)
    avg_price = models.FloatField(null=True, blank=True)
    # Null for rentals on purpose: a monthly rent divided by an area is not a
    # price per square metre, and publishing it beside sale figures produced
    # readings of $6,89/m² next to $1.200/m².
    median_price_m2 = models.FloatField(null=True, blank=True)
    avg_price_m2 = models.FloatField(null=True, blank=True)
    median_area = models.FloatField(null=True, blank=True)

    class Meta:
        verbose_name = 'Corte de mercado'
        verbose_name_plural = 'Cortes de mercado'
        ordering = ['-captured_on', 'scope', 'city', 'sector_key']
        constraints = [
            models.UniqueConstraint(
                fields=[
                    'captured_on', 'scope', 'city', 'sector_key',
                    'property_type', 'status',
                ],
                name='unique_market_snapshot_slice',
            )
        ]
        indexes = [
            # The series query: one slice, ordered in time.
            models.Index(
                fields=['scope', 'city', 'sector_key', 'property_type', 'status', 'captured_on'],
                name='snapshot_series_idx',
            ),
        ]

    def __str__(self):
        where = self.sector_key or self.city or 'Ecuador'
        what = self.property_type or 'todo'
        return f'{where} · {what} · {self.status} · {self.captured_on}'


class AdminAuditLog(models.Model):
    """Quién hizo qué en el panel, en una tabla y no en el log del contenedor.

    Las líneas ``admin_audit action=…`` ya existían, pero vivían en la salida
    de un contenedor que se recrea en cada despliegue: la única pregunta que la
    auditoría tiene que poder responder — «¿quién borró esto?» — se contestaba
    solo si alguien había guardado el log antes. Aquí la respuesta sobrevive al
    despliegue y se puede leer desde el propio panel.

    El actor se guarda dos veces a propósito: la clave ajena para poder navegar
    a la cuenta mientras exista, y ``actor_label`` como texto congelado para que
    borrar al administrador no convierta su rastro en «alguien». Lo mismo con
    el objetivo, que a menudo ya no existe cuando se lee la línea.
    """

    ACTION_CHOICES = [
        ("user.update", "Usuario editado"),
        ("user.delete", "Usuario eliminado"),
        ("property.update", "Propiedad editada"),
        ("property.delete", "Propiedad enviada a la papelera"),
        ("property.restore", "Propiedad restaurada"),
        ("property.purge", "Propiedad borrada definitivamente"),
        ("property.bulk_status", "Cambio de estado en lote"),
        ("property.transfer_owner", "Propiedad transferida"),
        ("incident.resolve", "Incidencia resuelta"),
        ("pending.resume_link_issued", "Enlace de retomar emitido"),
        ("pending.resume_link_revoked", "Enlace de retomar revocado"),
        ("imported.cleanup", "Limpieza de importados"),
        ("export.download", "Exportación descargada"),
    ]

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True, on_delete=models.SET_NULL, related_name="admin_actions",
    )
    actor_label = models.CharField(max_length=150, blank=True, default="")
    action = models.CharField(max_length=60, db_index=True)
    target_type = models.CharField(max_length=40, blank=True, default="", db_index=True)
    target_id = models.CharField(max_length=40, blank=True, default="")
    target_label = models.CharField(max_length=250, blank=True, default="")
    # Qué cambió, no con qué valores nuevos cuando el valor es dato personal:
    # el registro sirve para reconstruir una decisión, no para duplicar la
    # base de datos en una tabla que nadie purga.
    changes = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "-created_at"], name="audit_action_date_idx"),
            models.Index(fields=["target_type", "target_id"], name="audit_target_idx"),
            models.Index(fields=["actor", "-created_at"], name="audit_actor_date_idx"),
        ]

    def __str__(self):
        return f"{self.action} · {self.actor_label or 'sistema'} · {self.created_at:%Y-%m-%d %H:%M}"


class ActivityDailyRollup(models.Model):
    """El resumen diario que sobrevive al borrado de los eventos que lo produjeron.

    ``ActivityEvent`` es la tabla que crece sin techo en un host de 8 GB
    compartido, y la que hay que poder podar. Podarla sin más borraría el único
    registro de lo que pasó el mes pasado, así que primero se condensa cada día
    en una fila por evento: el detalle caduca, la serie no.

    ``sessions`` se cuenta por día y no se puede sumar entre días sin inflarla
    (la misma persona vuelve mañana). Quien lea varias filas debe sumar
    ``events`` y tratar ``sessions`` como un máximo, no como un total.
    """

    day = models.DateField(db_index=True)
    event_name = models.CharField(max_length=100)
    is_bot = models.BooleanField(default=False)
    events = models.PositiveIntegerField(default=0)
    sessions = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-day", "event_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["day", "event_name", "is_bot"],
                name="unique_activity_rollup_slice",
            )
        ]
        indexes = [
            models.Index(fields=["day", "is_bot"], name="rollup_day_bot_idx"),
        ]

    def __str__(self):
        return f"{self.day} · {self.event_name} · {'bot' if self.is_bot else 'humano'} · {self.events}"
