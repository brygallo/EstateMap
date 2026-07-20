from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from .validators import validate_image_size, validate_image_dimensions, validate_image_format


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

    title = models.CharField(max_length=150, blank=True, default="")
    description = models.TextField(blank=True, default="")
    property_type = models.CharField(max_length=30, choices=PROPERTY_TYPE_CHOICES, default="land")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="for_sale")

    # --- Location ---
    address = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="Macas")
    province = models.CharField(max_length=100, blank=True, default="Morona Santiago")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    polygon = models.JSONField(null=True, blank=True, help_text="GeoJSON polygon for land boundaries")
    show_measurements = models.BooleanField(default=True, help_text="Show exact measurements on map or just reference figure")

    # --- Characteristics ---
    area = models.FloatField(null=True, blank=True, help_text="Total area in square meters (opcional en anuncios importados)")
    built_area = models.FloatField(null=True, blank=True, help_text="Built area in square meters (for houses)")
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
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True,
                                help_text="Opcional: los anuncios importados pueden no traer precio ('a consultar')")
    rent_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True,
                                     help_text="Precio de alquiler cuando el anuncio es venta Y alquiler a la vez")
    is_negotiable = models.BooleanField(default=True)

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
    dedup_key = models.CharField(max_length=64, blank=True, default="", db_index=True,
                                 help_text="Huella de rejilla geográfica para deduplicar")
    image_hash = models.CharField(max_length=32, blank=True, default="", db_index=True,
                                  help_text="Huella perceptual (dHash) de la imagen principal, para detectar la misma propiedad entre portales")
    is_duplicate = models.BooleanField(default=False, db_index=True,
                                       help_text="Oculto del mapa: es duplicado de otra fuente (perdió la preferencia)")
    duplicate_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duplicates",
        help_text="Propiedad canónica (la que sí se muestra) de la que este anuncio es duplicado",
    )
    imported_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True,
                                        help_text="Última vez visto en la fuente (para caducar)")

    # --- Metrics ---
    views_count = models.PositiveIntegerField(default=0, help_text="Número de veces que se ha visto el detalle")

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

    @property
    def is_for_sale(self):
        return self.status == "for_sale"

    @property
    def is_for_rent(self):
        return self.status == "for_rent"


class PropertyImage(models.Model):
    """Images for properties stored in MinIO with optimization"""
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="images"
    )
    image = models.ImageField(
        upload_to="properties/",
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

    class Meta:
        ordering = ["-is_main", "-uploaded_at"]

    def __str__(self):
        return f"Image for {self.property.title or f'Property {self.property.pk}'}"

    def save(self, *args, **kwargs):
        """Override save to optimize image on upload"""
        from .image_utils import optimize_image, create_thumbnail

        if self.image and not self.pk:  # Solo optimizar en la primera carga
            # Guardar nombre original
            self.original_filename = self.image.name

            # Guardar tamaño original para logging
            original_size = self.image.size

            # Optimizar imagen principal
            self.image = optimize_image(
                self.image,
                max_width=1920,
                max_height=1920,
                quality=85,
                format='WEBP'
            )

            # Crear thumbnail
            self.thumbnail = create_thumbnail(
                self.image,
                size=(400, 400),
                quality=80
            )

            # Actualizar tamaño del archivo
            self.file_size = self.image.size

            # Log del ahorro de espacio
            if original_size > 0:
                savings = ((original_size - self.image.size) / original_size) * 100
                print(f"Imagen optimizada: {self.original_filename}")
                print(f"  Tamaño original: {round(original_size / 1024, 2)} KB")
                print(f"  Tamaño optimizado: {round(self.image.size / 1024, 2)} KB")
                print(f"  Ahorro: {round(savings, 2)}%")

        super().save(*args, **kwargs)


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
    draft = models.JSONField(default=dict, blank=True)
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default="account_required")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_name", "created_at"], name="activity_event_date_idx"),
            models.Index(fields=["user", "created_at"], name="activity_user_date_idx"),
            models.Index(fields=["property", "created_at"], name="activity_property_date_idx"),
        ]

    def __str__(self):
        return f"{self.event_name} ({self.user_id or self.session_id or 'anónimo'})"
