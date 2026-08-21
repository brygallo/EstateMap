"""Qué páginas tiene el portal, cuáles están a punto de existir y cuáles se caen.

El objetivo declarado del proyecto es posicionar. Las páginas que posicionan no
se escriben una a una: se abren solas cuando una porción del catálogo alcanza un
mínimo de anuncios (`MIN_COMBO_PROPERTIES` en el frontend), y se cierran solas
cuando baja. Eso convierte una decisión de SEO en una decisión de inventario, y
deja una pregunta operativa que hoy nadie puede contestar desde el panel:
**¿qué página se abre si consigo dos anuncios más en tal ciudad?**

Este servicio la contesta con los mismos umbrales que aplica el frontend. No
inventa métricas de posicionamiento —no hay aquí ni una impresión ni un clic de
Search Console—: mide lo único que el portal controla, que es su propio
inventario y la calidad del texto con el que compite.
"""

from __future__ import annotations

from django.db.models import Count, Q
from django.db.models.functions import Length

from real_estate.models import Property
from real_estate.services.sectors import MIN_SECTOR_LISTINGS, list_sectors

# Espejo de `frontend/lib/seo-combos.ts`. Si allí cambia el umbral, aquí también:
# un panel que promete una página con cuatro anuncios cuando el sitemap exige
# cinco es peor que no tener panel.
MIN_COMBO_PROPERTIES = 5
MIN_LOCATION_PROPERTIES = 5

# Cuánto texto necesita una ficha para aportar algo a la landing en la que se
# lista. Por debajo de esto el anuncio ocupa sitio sin decir nada.
MIN_DESCRIPTION_CHARS = 200

# Cuántos anuncios de margen se consideran «a punto». Más allá de dos, no es una
# página que estés a punto de abrir: es un mercado en el que no estás.
NEAR_MISS_MARGIN = 2

# Las cuatro rutas por tipo y operación que el frontend publica hoy.
TYPE_ROUTES = [
    {"slug": "casas-en-venta", "property_type": "house", "status": "for_sale"},
    {"slug": "departamentos-en-alquiler", "property_type": "apartment", "status": "for_rent"},
    {"slug": "terrenos-en-venta", "property_type": "land", "status": "for_sale"},
    {"slug": "locales-comerciales", "property_type": "commercial", "status": None},
]


class SeoHealthService:
    """Cobertura de páginas, huecos a un paso y calidad del texto publicado."""

    def build(self):
        catalog = self.public_catalog()
        return {
            "thresholds": {
                "combo": MIN_COMBO_PROPERTIES,
                "location": MIN_LOCATION_PROPERTIES,
                "sector": MIN_SECTOR_LISTINGS,
                "description_chars": MIN_DESCRIPTION_CHARS,
            },
            "cities": self.city_coverage(catalog),
            "combos": self.combo_coverage(catalog),
            "sectors": self.sector_coverage(),
            "content": self.content_quality(catalog),
            "blog": self.blog_state(),
        }

    def public_catalog(self):
        """Lo que el sitemap y las landings ven: activo, canónico y no borrado."""
        return Property.objects.exclude(status="inactive").filter(
            is_duplicate=False, deleted_at__isnull=True
        )

    def city_coverage(self, catalog):
        """Ciudades con página, y ciudades a las que les faltan pocos anuncios."""
        rows = (
            catalog.exclude(city="")
            .values("city", "province")
            .annotate(count=Count("id"))
            .order_by("-count", "city")
        )
        live, near = [], []
        for row in rows:
            item = {
                "city": row["city"],
                "province": row["province"],
                "count": row["count"],
                "missing": max(0, MIN_LOCATION_PROPERTIES - row["count"]),
            }
            if row["count"] >= MIN_LOCATION_PROPERTIES:
                live.append(item)
            elif item["missing"] <= NEAR_MISS_MARGIN:
                near.append(item)
        return {"live": live, "near_miss": near, "total_cities": len(rows)}

    def combo_coverage(self, catalog):
        """Cada ruta tipo+operación cruzada con cada ciudad."""
        live, near = [], []
        for route in TYPE_ROUTES:
            queryset = catalog.filter(property_type=route["property_type"])
            if route["status"]:
                queryset = queryset.filter(status=route["status"])
            rows = (
                queryset.exclude(city="")
                .values("city")
                .annotate(count=Count("id"))
                .order_by("-count", "city")
            )
            for row in rows:
                item = {
                    "route": route["slug"],
                    "city": row["city"],
                    "count": row["count"],
                    "missing": max(0, MIN_COMBO_PROPERTIES - row["count"]),
                }
                if row["count"] >= MIN_COMBO_PROPERTIES:
                    live.append(item)
                elif item["missing"] <= NEAR_MISS_MARGIN:
                    near.append(item)
        live.sort(key=lambda item: -item["count"])
        near.sort(key=lambda item: (item["missing"], -item["count"]))
        return {"live": live, "near_miss": near}

    def sector_coverage(self):
        """Zonas con página propia; `list_sectors` ya aplica absorciones."""
        sectors = list_sectors()
        return {
            "live": [
                {
                    "city": row["city"],
                    "sector_key": row["sector_key"],
                    "name": row["name"] or row["sector_key"],
                    "count": row["count"],
                }
                for row in sectors[:60]
            ],
            "total": len(sectors),
        }

    def content_quality(self, catalog):
        """Los anuncios que arrastran hacia abajo la página en la que aparecen."""
        thin = catalog.annotate(image_count=Count("images")).filter(
            Q(description="")
            | Q(title="")
            | Q(image_count=0)
        )
        return {
            "published": catalog.count(),
            "without_title": catalog.filter(title="").count(),
            "without_description": catalog.filter(description="").count(),
            "short_description": catalog.exclude(description="")
            .annotate(description_length=Length("description"))
            .filter(description_length__lt=MIN_DESCRIPTION_CHARS)
            .count(),
            "without_images": catalog.annotate(image_count=Count("images"))
            .filter(image_count=0)
            .count(),
            "thin": thin.count(),
        }

    def blog_state(self):
        from django.utils import timezone
        from datetime import timedelta
        from blog.models import Post

        now = timezone.now()
        return {
            "published": Post.objects.filter(
                status=Post.Status.PUBLISHED, published_at__lte=now
            ).count(),
            "scheduled": Post.objects.filter(
                status=Post.Status.SCHEDULED, published_at__gt=now
            ).count(),
            "published_30d": Post.objects.filter(
                status__in=(Post.Status.PUBLISHED, Post.Status.SCHEDULED),
                published_at__gte=now - timedelta(days=30),
                published_at__lte=now,
            ).count(),
            "drafts": Post.objects.filter(status=Post.Status.DRAFT).count(),
        }
