from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from .validators import validate_image_size, validate_image_dimensions, validate_image_format


class User(AbstractUser):
    """Custom user model with a unique email field."""

    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)


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
    area = models.FloatField(help_text="Total area in square meters")
    built_area = models.FloatField(null=True, blank=True, help_text="Built area in square meters (for houses)")
    rooms = models.PositiveIntegerField(default=0)
    bathrooms = models.PositiveIntegerField(default=0)
    parking_spaces = models.PositiveIntegerField(default=0)
    floors = models.PositiveIntegerField(null=True, blank=True, help_text="Number of floors (for houses)")
    furnished = models.BooleanField(default=False)
    year_built = models.PositiveIntegerField(null=True, blank=True)

    # --- Financial Information ---
    price = models.DecimalField(max_digits=12, decimal_places=2)
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

    # --- Media ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

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
