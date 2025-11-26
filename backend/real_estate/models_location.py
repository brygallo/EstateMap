"""
Modelos para la gestión de ubicaciones (Provincias y Ciudades)
"""
from django.db import models


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
