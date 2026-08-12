"""
Minimum published inventory the end-to-end suite needs to have anything to walk.

Why it exists
-------------
CI brings the whole stack up against a brand new database, so until now the
Playwright catalogue tests found `/propiedades` empty: one of them failed
outright and three skipped themselves with "no published inventory in this
environment". A green run that never opened a city page or a listing is worse
than a red one, because it looks like coverage.

Advertising is seeded for the same reason. Since ADS-016 stopped treating an
empty placement as a reason to render the house sign, that sign only exists
where staff created a `promo` campaign — so a database with no campaigns has no
slot for the browser to inspect, and the two tests that check the WhatsApp
message and the position of the slot on a listing had nothing to find.

Why it refuses to run
---------------------
A seeder is a writer, and this one writes listings that look real: a title, a
price, coordinates in Ecuador. Pointed at the live portal by a mistyped host or
a stale shell it would inject fake properties into a public catalogue, push them
to the map, the sitemap and IndexNow, and there is no undo for a URL a search
engine has already crawled. So the command looks for signals that it is *not*
standing in a disposable environment and stops on the first one:

* ``DEBUG=False`` — how production is configured, and nothing else is;
* ``DJANGO_ENV`` / ``ENVIRONMENT`` naming production;
* a database whose name says ``prod``;
* an inventory it did not create. A test database is empty or holds only rows
  carrying the reserved short code prefix; a database with hundreds of other
  properties belongs to someone, whatever the other settings claim.

``--force`` skips the checks. It exists because a maintainer may legitimately
want a demo catalogue in a database this command cannot recognise as safe, and
because a guard with no escape hatch gets deleted rather than argued with. It is
deliberately not the default and never appears in CI.
"""

import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from advertising.models import Campaign
from advertising.placements import Placement
from real_estate.cache_utils import bump_props_version
from real_estate.models import City, Property, Province, User

# Reserved prefix for everything this command creates. `0` is absent from the
# short-code alphabet (see services/short_codes.py, which drops every confusable
# glyph), so no generated code can ever start with it: the prefix identifies
# seeded rows with certainty, which is what both idempotence and the
# foreign-inventory guard below are built on.
SEED_CODE_PREFIX = "E2E0"

# Marker on the title so a seeded listing is obvious in the admin and on screen.
SEED_TITLE_PREFIX = "[E2E]"

SEED_OWNER_EMAIL = "e2e-seed@example.com"

# The only placement seeded with a house sign, and it is the one the suite
# asserts on: `property_sidebar` sits under the contact card of a listing
# (ADS-004) and its WhatsApp message carries the space and the city (ADS-018).
#
# Nothing is seeded for `home_feed`, and that is not an oversight: the test for
# ADS-016 opens `/` and asserts no slot is rendered there, which is only a real
# assertion while the home page has no campaign of its own.
SEED_PLACEMENT = Placement.PROPERTY_SIDEBAR

# Above this many properties the command did not create, the database is
# somebody's real inventory and not a test fixture.
MAX_FOREIGN_PROPERTIES = 25

# Cantons the seeded listings live in, with their real coordinates. Cuenca and
# Macas both fall inside the bbox the map tests query
# (-79.5,-3.5,-77.5,-1.5), so the seeded rows exercise the map payload too and
# not only the catalogue pages.
LOCATIONS = {
    "Cuenca": {"province": "Azuay", "lat": -2.9006, "lng": -79.0045},
    "Macas": {"province": "Morona Santiago", "lat": -2.3086, "lng": -78.1197},
    "Quito": {"province": "Pichincha", "lat": -0.1807, "lng": -78.4678},
}

# The catalogue needs more than one city and both operations to be interesting:
# `/propiedades` lists cities from the summary aggregate, and the SEO combo
# links are built from the type x operation x city cross-tab.
#
# No wording here may read as a view counter ("N vistas"): one of the tests
# scans the whole rendered body for that pattern, and a listing described as
# having "vistas panorámicas" would fail it for the wrong reason.
PROPERTIES = [
    {
        "code": "01",
        "city": "Cuenca",
        "title": "Casa familiar en El Vergel",
        "property_type": "house",
        "status": "for_sale",
        "price": 145000,
        "area": 180,
        "built_area": 140,
        "rooms": 3,
        "bathrooms": 2,
        "parking_spaces": 1,
        "offset": (0.0032, 0.0041),
        "address": "El Vergel",
        "description": (
            "Casa de dos plantas en un sector residencial tranquilo de Cuenca, "
            "cerca de servicios, transporte publico y areas verdes."
        ),
    },
    {
        "code": "02",
        "city": "Cuenca",
        "title": "Departamento amoblado cerca del centro",
        "property_type": "apartment",
        "status": "for_rent",
        "price": 650,
        "area": 95,
        "built_area": 95,
        "rooms": 2,
        "bathrooms": 2,
        "parking_spaces": 1,
        "furnished": True,
        "offset": (-0.0028, 0.0019),
        "address": "Av. Solano",
        "description": (
            "Departamento amoblado listo para habitar, a pocas cuadras del centro "
            "historico de Cuenca. Incluye garaje cubierto."
        ),
    },
    {
        "code": "03",
        "city": "Cuenca",
        "title": "Terreno plano con acceso asfaltado",
        "property_type": "land",
        "status": "for_sale",
        "price": 68000,
        "area": 500,
        "rooms": 0,
        "bathrooms": 0,
        "offset": (0.0055, -0.0037),
        "address": "Ricaurte",
        "description": (
            "Terreno plano y esquinero con todos los servicios basicos en la via, "
            "ideal para construir vivienda unifamiliar."
        ),
    },
    {
        "code": "04",
        "city": "Macas",
        "title": "Casa amplia con patio",
        "property_type": "house",
        "status": "for_sale",
        "price": 98000,
        "area": 210,
        "built_area": 150,
        "rooms": 4,
        "bathrooms": 3,
        "parking_spaces": 2,
        "offset": (0.0021, 0.0033),
        "address": "Barrio La Union",
        "description": (
            "Casa de una planta con patio posterior y cuarto de bodega, en un "
            "barrio consolidado de Macas."
        ),
    },
    {
        "code": "05",
        "city": "Macas",
        "title": "Local comercial en planta baja",
        "property_type": "commercial",
        "status": "for_rent",
        "price": 900,
        "area": 120,
        "built_area": 120,
        "rooms": 0,
        "bathrooms": 1,
        "offset": (-0.0018, -0.0026),
        "address": "Av. Amazonas",
        "description": (
            "Local comercial en planta baja sobre avenida principal, con bano "
            "propio y vitrina hacia la calle."
        ),
    },
    {
        "code": "06",
        "city": "Macas",
        "title": "Terreno agricola con quebrada",
        "property_type": "land",
        "status": "for_sale",
        "price": 32000,
        "area": 800,
        "rooms": 0,
        "bathrooms": 0,
        "offset": (0.0064, -0.0052),
        "address": "Via a Sucua",
        "description": (
            "Terreno agricola con frente a la via y quebrada en el lindero "
            "posterior, apto para cultivo o proyecto de vivienda."
        ),
    },
    {
        "code": "07",
        "city": "Quito",
        "title": "Departamento en La Carolina",
        "property_type": "apartment",
        "status": "for_sale",
        "price": 132000,
        "area": 88,
        "built_area": 88,
        "rooms": 2,
        "bathrooms": 2,
        "parking_spaces": 1,
        "offset": (0.0027, 0.0022),
        "address": "Sector La Carolina",
        "description": (
            "Departamento en piso alto junto al parque La Carolina, con sala "
            "comedor integrada y garaje asignado."
        ),
    },
    {
        "code": "08",
        "city": "Quito",
        "title": "Casa en conjunto cerrado",
        "property_type": "house",
        "status": "for_rent",
        "price": 1200,
        "area": 240,
        "built_area": 190,
        "rooms": 4,
        "bathrooms": 3,
        "parking_spaces": 2,
        "offset": (-0.0043, 0.0048),
        "address": "Cumbaya",
        "description": (
            "Casa dentro de conjunto cerrado con guardiania, jardin propio y "
            "espacio para dos vehiculos."
        ),
    },
]


class Command(BaseCommand):
    help = (
        "Siembra el inventario minimo publicado que necesitan las pruebas "
        "extremo a extremo. Se niega a correr si la base no parece de pruebas."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help=(
                "Salta las comprobaciones de seguridad y siembra igual. Solo "
                "para bases desechables: nunca en produccion."
            ),
        )

    def handle(self, *args, **options):
        if not options["force"]:
            refusals = self._production_signals()
            if refusals:
                raise CommandError(
                    "Refusing to seed: this does not look like a test database.\n"
                    + "\n".join(f"  - {reason}" for reason in refusals)
                    + "\nRun with --force only if you are certain the database "
                    "is disposable."
                )

        owner = self._seed_owner()
        self._seed_locations()
        created, updated = self._seed_properties(owner)
        self._seed_house_sign()

        # Every public read is cached under a version key, and `summary` is what
        # `/propiedades` renders its city list from. The post_save signals bump
        # those versions already, but doing it once more here covers the scopes
        # a plain save does not touch (`geo`) and the case where nothing was
        # written because the rows were already there and Redis was flushed
        # since.
        bump_props_version()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created + updated} properties "
                f"({created} created, {updated} updated) "
                f"across {len(LOCATIONS)} cities, "
                f"plus one house sign on {SEED_PLACEMENT}."
            )
        )

    def _production_signals(self):
        """Reasons to believe this database is not disposable. Empty means go."""
        signals = []

        if not settings.DEBUG:
            signals.append(
                "DEBUG is False, which is how a production deployment is configured"
            )

        env_name = (
            os.getenv("DJANGO_ENV") or os.getenv("ENVIRONMENT") or ""
        ).strip().lower()
        if env_name in {"prod", "production", "live"}:
            signals.append(f"the environment is named {env_name!r}")

        db_name = str(settings.DATABASES["default"].get("NAME", ""))
        if "prod" in db_name.lower():
            signals.append(f"the database is named {db_name!r}")

        foreign = Property.objects.exclude(
            short_code__startswith=SEED_CODE_PREFIX
        ).count()
        if foreign > MAX_FOREIGN_PROPERTIES:
            signals.append(
                f"the database already holds {foreign} properties this command "
                "did not create"
            )

        return signals

    def _seed_owner(self):
        """
        The account the seeded listings belong to.

        It gets an unusable password on purpose: the suite never signs in as
        this user, and a seeder that leaves a known password behind is a
        different kind of accident from the one the guard above prevents.
        """
        owner, created = User.objects.get_or_create(
            email=SEED_OWNER_EMAIL,
            defaults={
                "username": "e2e_seed",
                "first_name": "Inventario",
                "last_name": "E2E",
                "is_email_verified": True,
            },
        )
        if created:
            owner.set_unusable_password()
            owner.save(update_fields=["password"])
        return owner

    def _seed_locations(self):
        """
        Province and canton rows for the seeded cities.

        The `catalog` endpoint reads these instead of the inventory, so a city
        page keeps answering 200 with an empty state when its listings are gone.
        Seeding them means that fallback is exercised too, not just the happy
        path where the city is derived from a live listing.
        """
        for city_name, place in LOCATIONS.items():
            province, _ = Province.objects.get_or_create(name=place["province"])
            City.objects.get_or_create(name=city_name, province=province)

    def _seed_house_sign(self):
        """
        The «espacio disponible» campaign the advertising tests walk into.

        A `promo` campaign carries no advertiser, no destination URL and no
        amount: the button builds its WhatsApp link on the page from the
        placement and the city, which is the whole point of ADS-018. Evergreen
        on purpose — with both dates empty it is live from the moment it is
        written, so the suite never races the clock.

        Keyed by placement and kind, the pair that identifies it: a second run
        rewrites the same row instead of overbooking the placement.
        """
        Campaign.objects.update_or_create(
            placement=SEED_PLACEMENT,
            kind=Campaign.Kind.PROMO,
            defaults={
                "advertiser": None,
                "headline": "¿Quieres aparecer en este espacio?",
                "body": (
                    "Lo ven quienes están buscando propiedades ahora mismo. "
                    "Escríbenos y lo hablamos."
                ),
                "cta_label": "Escribir por WhatsApp",
                "target_url": "",
                "starts_at": None,
                "ends_at": None,
                "target_cities": [],
                "target_provinces": [],
                "amount_charged_usd": None,
                "is_active": True,
            },
        )

    def _seed_properties(self, owner):
        """
        Write the listings, keyed by their reserved short code.

        `update_or_create` on `short_code` is what makes a second run a no-op:
        the code is the stable identity, so the same eight rows are rewritten
        with the same values instead of eight more appearing.
        """
        created_count = 0
        updated_count = 0

        for spec in PROPERTIES:
            place = LOCATIONS[spec["city"]]
            lat_offset, lng_offset = spec["offset"]
            defaults = {
                "title": f"{SEED_TITLE_PREFIX} {spec['title']}",
                "description": spec["description"],
                "property_type": spec["property_type"],
                # A published listing, in the only sense the public queryset
                # understands: not inactive, not a duplicate, not closed.
                "status": spec["status"],
                "is_duplicate": False,
                "closed_reason": "",
                "closed_at": None,
                "address": spec["address"],
                "city": spec["city"],
                "province": place["province"],
                "latitude": place["lat"] + lat_offset,
                "longitude": place["lng"] + lng_offset,
                "area": spec["area"],
                "built_area": spec.get("built_area"),
                "rooms": spec["rooms"],
                "bathrooms": spec["bathrooms"],
                "parking_spaces": spec.get("parking_spaces", 0),
                "furnished": spec.get("furnished", False),
                "price": spec["price"],
                "is_negotiable": True,
                "owner": owner,
                "contact_phone": "0999999999",
                # No images: uploading one would drag MinIO and the Celery
                # optimisation pipeline into the seeding path, and nothing the
                # suite asserts needs a photo.
            }
            _, created = Property.objects.update_or_create(
                short_code=f"{SEED_CODE_PREFIX}{spec['code']}",
                defaults=defaults,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        return created_count, updated_count
