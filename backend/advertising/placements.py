"""
The catalogue of sellable spaces.

This is a closed set in code and not a table, and that is deliberate: a
placement exists only if somebody wrote the component that paints it, so its
list belongs next to that component. Turning it into a table would only make
sense to hang a price off it, and prices are not in this system — they are
negotiated one conversation at a time (see ADS-002, ADS-040).

Two surfaces are missing on purpose. The map canvas takes no advertising in any
form, because the map is the product and a sponsored marker would falsify the
one thing this project does not falsify. And the contact block of a listing is
not for sale either: that click is what the portal owes to whoever published the
property.
"""

from django.db import models


class Placement(models.TextChoices):
    """Where a creative may appear. Adding one means adding a slot in the UI."""

    # Blog — these five already existed and keep their codes so the payloads
    # cached under them stay addressable.
    INDEX_TOP = "index_top", "Blog — bajo la cabecera"
    INDEX_FEED = "index_feed", "Blog — dentro de la rejilla de artículos"
    POST_INLINE = "post_inline", "Artículo — a mitad del texto"
    POST_FOOTER = "post_footer", "Artículo — bajo el contenido"
    CATEGORY_TOP = "category_top", "Categoría — bajo la cabecera"

    # The rest of the portal.
    HOME_FEED = "home_feed", "Inicio — dentro de la lista de resultados"
    CITY_HERO = "city_hero", "Ciudad o provincia — bajo la cabecera"
    LISTING_FEED = "listing_feed", "Listados — dentro de la rejilla"
    PROPERTY_SIDEBAR = "property_sidebar", "Ficha — bajo el bloque de contacto"
    PROPERTY_FOOTER = "property_footer", "Ficha — antes de las similares"
    STATS_INLINE = "stats_inline", "Estadísticas — entre secciones"
    SITE_FOOTER = "site_footer", "Pie de página — aliados"


# Which placements can be sold city by city. The rest run site-wide.
#
# This is the only inventory that is worth much: what this portal sells is not
# reach, it is context. Someone looking at houses in Macas is precisely the
# audience of a hardware store in Macas.
GEO_TARGETABLE = frozenset(
    {
        Placement.HOME_FEED,
        Placement.CITY_HERO,
        Placement.LISTING_FEED,
        Placement.PROPERTY_SIDEBAR,
        Placement.PROPERTY_FOOTER,
        Placement.STATS_INLINE,
        Placement.INDEX_TOP,
        Placement.INDEX_FEED,
        Placement.POST_INLINE,
        Placement.POST_FOOTER,
        Placement.CATEGORY_TOP,
    }
)


# How many creatives a placement may hand out per request. The client picks one,
# so sending a few lets it rotate without a request per impression, which would
# defeat the cache.
#
# The number is also a trap, and ADS-019 exists because of it: campaigns come
# back ordered by weight, so selling more than this many in one placement leaves
# the lightest ones never showing at all — silently. `overbooked_placements`
# below is what turns that into something the panel can warn about.
MAX_PER_PLACEMENT = 4
