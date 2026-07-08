"""
Modelos del proyecto de ingesta (agregador tipo buscador).

- ``Fuente``: cada portal del que recopilamos propiedades (Properati, etc.).
- ``ListingCruda``: auditoría del payload crudo tal como salió del scraper,
  útil para reprocesar sin volver a visitar el portal. Se llena en LOCAL
  durante el scraping; en producción normalmente no se usa.

El scraping y toda la validación ocurren en LOCAL y producen un *paquete* de
datos; producción solo importa ese paquete. Ver ``PLAN.md``.
"""
from django.db import models


class Fuente(models.Model):
    """Un portal del que recopilamos anuncios."""

    slug = models.SlugField(max_length=60, unique=True, help_text="Identificador corto, ej. 'properati'")
    nombre = models.CharField(max_length=120, help_text="Nombre visible, ej. 'Properati Ecuador'")
    base_url = models.URLField(help_text="URL base del portal")
    activa = models.BooleanField(default=True, help_text="Si se incluye al correr --all")
    # Clave del scraper registrado (por defecto == slug).
    scraper = models.CharField(max_length=120, blank=True, default="")
    config = models.JSONField(default=dict, blank=True, help_text="Parámetros por fuente (categorías, límites, etc.)")

    disponibles = models.PositiveIntegerField(default=0, help_text="Total de anuncios que muestra el portal (aprox.)")
    disponibles_at = models.DateTimeField(null=True, blank=True, help_text="Cuándo se contó 'disponibles'")
    last_scrape_at = models.DateTimeField(null=True, blank=True, help_text="Último scraping en local")
    last_import_at = models.DateTimeField(null=True, blank=True, help_text="Última importación en este entorno")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Fuente"
        verbose_name_plural = "Fuentes"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

    @property
    def scraper_key(self):
        return self.scraper or self.slug


class IngestaRun(models.Model):
    """
    Una ejecución de la ingesta (lanzada desde el admin o por CLI). Guarda el
    estado y los contadores para poder seguir el progreso en vivo desde el panel.
    """

    ESTADOS = [
        ("pending", "Pendiente"),
        ("running", "En ejecución"),
        ("done", "Terminado"),
        ("error", "Error"),
        ("cancelled", "Cancelado"),
    ]

    MODOS = [
        ("load", "Cargar/actualizar desde el portal"),
        ("refresh", "Actualizar existentes y verificar vigencia"),
    ]

    fuente = models.ForeignKey(Fuente, on_delete=models.CASCADE, related_name="runs")
    estado = models.CharField(max_length=12, choices=ESTADOS, default="pending")
    modo = models.CharField(max_length=12, choices=MODOS, default="load")
    limit = models.PositiveIntegerField(null=True, blank=True,
                                        help_text="Tope de anuncios (vacío = todo el país)")
    con_imagenes = models.BooleanField(default=True)
    solo_nuevas = models.BooleanField(
        default=False,
        help_text="Salta los anuncios ya importados y avanza a los que faltan (modo por tandas)",
    )

    vistos = models.PositiveIntegerField(default=0)
    creadas = models.PositiveIntegerField(default=0)
    actualizadas = models.PositiveIntegerField(default=0)
    duplicadas = models.PositiveIntegerField(default=0)
    caducadas = models.PositiveIntegerField(default=0, help_text="Ya no vigentes en el portal")
    sin_ubicacion = models.PositiveIntegerField(default=0)
    errores = models.PositiveIntegerField(
        default=0, help_text="Anuncios que fallaron individualmente (no abortan el run)")

    mensaje = models.TextField(blank=True, default="")
    log = models.TextField(blank=True, default="", help_text="Últimas líneas de log de la ejecución")
    cancel_requested = models.BooleanField(
        default=False, help_text="Marca puesta desde el panel para detener el run de forma ordenada")
    lanzado_por = models.CharField(max_length=150, blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    heartbeat_at = models.DateTimeField(
        null=True, blank=True, help_text="Última señal de vida; sirve para detectar runs caídos")
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ejecución de ingesta"
        verbose_name_plural = "Ejecuciones de ingesta"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.fuente.slug} · {self.get_estado_display()} · {self.creadas} nuevas"

    @property
    def cargadas(self):
        return self.creadas + self.actualizadas


class ListingCruda(models.Model):
    """
    Payload crudo de un anuncio tal como lo devolvió el scraper (auditoría).
    Permite reprocesar/normalizar sin volver a golpear el portal.
    """

    fuente = models.ForeignKey(Fuente, on_delete=models.CASCADE, related_name="crudos")
    external_id = models.CharField(max_length=120, db_index=True)
    source_url = models.URLField(max_length=500, blank=True, default="")
    payload = models.JSONField(default=dict)
    scraped_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Anuncio crudo"
        verbose_name_plural = "Anuncios crudos"
        ordering = ["-scraped_at"]
        unique_together = [["fuente", "external_id"]]

    def __str__(self):
        return f"{self.fuente.slug}:{self.external_id}"
