from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with a unique email field."""

    email = models.EmailField(unique=True)


class Property(models.Model):
    title = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, default="")
    polygon = models.JSONField()
    area = models.FloatField()
    price = models.FloatField()

    def __str__(self):
        return self.title or f"Property {self.pk}"
