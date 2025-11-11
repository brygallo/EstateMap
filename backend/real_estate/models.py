from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class User(AbstractUser):
    """Custom user model with a unique email field."""

    email = models.EmailField(unique=True)


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
        ("sold", "Sold"),
        ("rented", "Rented"),
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
    """Images for properties stored in MinIO"""
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="images"
    )
    image = models.ImageField(upload_to="properties/")
    is_main = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_main", "-uploaded_at"]

    def __str__(self):
        return f"Image for {self.property.title or f'Property {self.property.pk}'}"
