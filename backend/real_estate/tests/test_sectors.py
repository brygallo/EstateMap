"""Named zones: the finest geography the catalogue has.

The zone is derived from free text, so everything here is about the same
question: when do two strings name the same place, and when does a place hold
enough to deserve a page.
"""

import pytest
from rest_framework.test import APIClient

from real_estate.models import Property, sector_key
from real_estate.services.sectors import (
    MIN_SECTOR_LISTINGS,
    find_sector,
    list_sectors,
    sector_display,
    titlecase_place,
)


pytestmark = pytest.mark.django_db


def listing(address, *, city="Quito", price=200_000, area=100, title=None):
    return Property.objects.create(
        title=title or f"Propiedad en {address}",
        city=city,
        province="Pichincha",
        address=address,
        property_type="house",
        status="for_sale",
        price=price,
        area=area,
    )


def test_the_zone_is_derived_on_save():
    """SPEC:SEC-001 — the key is a column, not a computation per request."""
    prop = listing("Cumbayá, Quito")

    assert prop.sector_key == "cumbaya"
    assert prop.sector_label == "Cumbayá"


def test_accents_and_case_do_not_split_a_zone():
    """SPEC:SEC-001 — «CUMBAYA» and «Cumbayá» are one place."""
    assert sector_key("Cumbayá, Quito") == sector_key("CUMBAYA, Quito") == "cumbaya"


def test_a_zone_that_repeats_its_own_city_is_not_a_zone():
    """SPEC:SEC-001 — «el sector Macas de la ciudad de Macas» is a repetition."""
    assert sector_key("Macas, Morona Santiago", "Macas") == ""
    prop = listing("Macas, Morona Santiago", city="Macas")
    assert prop.sector_key == ""


def test_the_published_name_prefers_the_accented_spelling():
    """SPEC:SEC-001 — people drop accents when typing, not when naming."""
    assert sector_display(["Cumbaya", "Cumbaya", "Cumbayá"]) == "Cumbayá"
    # But a spelling nobody else uses does not get to rename the zone.
    assert sector_display(["Cumbaya"] * 10 + ["Cumbayá"]) == "Cumbaya"


def test_a_zone_needs_inventory_to_be_listed():
    """SPEC:SEC-002 — the same bar a local landing needs (SEO-001)."""
    for index in range(MIN_SECTOR_LISTINGS - 1):
        listing("Tumbaco, Quito", title=f"Casa {index}")

    assert list_sectors(city="Quito") == []

    listing("Tumbaco, Quito", title="La que completa el umbral")
    zones = list_sectors(city="Quito")
    assert [zone["name"] for zone in zones] == ["Tumbaco"]
    assert zones[0]["count"] == MIN_SECTOR_LISTINGS


def test_the_price_per_metre_needs_a_sample_of_its_own():
    """SPEC:SEC-002 — an average over two listings is not a market reading."""
    for index in range(MIN_SECTOR_LISTINGS):
        # Only two of them carry a usable price and area.
        usable = index < 2
        listing(
            "Puembo, Quito",
            title=f"Casa {index}",
            price=200_000 if usable else None,
            area=100 if usable else None,
        )

    zone = list_sectors(city="Quito")[0]
    assert zone["count"] == MIN_SECTOR_LISTINGS
    assert zone["avg_price_m2"] is None


@pytest.mark.api
def test_the_listing_endpoint_filters_by_zone():
    """SPEC:SEC-003 — the zone page paginates in SQL, not in Python."""
    for index in range(3):
        listing("Cumbayá, Quito", title=f"En la zona {index}")
    listing("Conocoto, Quito", title="Fuera de la zona")

    response = APIClient().get("/api/properties/", {"city": "Quito", "sector": "CUMBAYA"})

    assert response.status_code == 200
    titles = [row["title"] for row in response.data["results"]]
    assert len(titles) == 3
    assert "Fuera de la zona" not in titles


@pytest.mark.api
def test_the_zones_endpoint_answers_with_names_and_counts():
    """SPEC:SEC-002 — one request answers for every zone of a city."""
    for index in range(MIN_SECTOR_LISTINGS):
        listing("Kennedy Norte, Guayaquil", city="Guayaquil", title=f"Casa {index}")

    response = APIClient().get("/api/properties/sectors/", {"city": "Guayaquil"})

    assert response.status_code == 200
    assert response.data["sectors"][0]["name"] == "Kennedy Norte"
    assert response.data["sectors"][0]["sector_key"] == "kennedy norte"


def test_a_listing_headline_is_not_a_zone():
    """SPEC:SEC-004 — «Casa en Venta» was a neighbourhood of Guayaquil.

    It reached 19 listings and published a price per square metre, because the
    importer had put the headline where the address goes.
    """
    for headline in (
        "Casa en Venta, Guayaquil",
        "Departamento en Venta, Quito",
        "Terreno de Venta en Tumbaco, Quito",
        "Oficina en Venta en Manta, Manta",
        "Venta Terreno, Quito",
        "Se Vende Casa, Guayaquil",
        # First person, which is how the seller writes it. «Vendo casa
        # independiente Lomas de Monteserrín» had a page of its own in Quito.
        "Vendo casa independiente Lomas de Monteserrín, Quito",
        "Rento terreno sector Clínica Pichincha, Quito",
        "Alquilo departamento en Cumbayá, Quito",
        "La Puntilla vendo departamento moderno 3 dormitorios, Guayaquil",
        # The seller's voice settles it even with no property word in sight.
        "LAGUNA DEL SOL POR VIAJE VENDO US$ 390., Samborondón",
        "Vendo Dpto 2 Dormitorios MAS Estudios Aquarela Cumbaya, Cumbayá",
    ):
        assert sector_key(headline) == "", headline


def test_a_place_that_merely_sounds_like_one_survives():
    """SPEC:SEC-004 — the test needs a type word AND an operation word."""
    assert sector_key("Villa Club, Daule") == "villa club"
    assert sector_key("Villa Regina, Quito") == "villa regina"
    assert sector_key("Ventanas, Los Ríos") == "ventanas"
    assert sector_key("La Venta, Quito") == "la venta"
    assert sector_key("Quinta Guadalupe, Quito") == "quinta guadalupe"
    assert sector_key("Renta Alta, Quito") == "renta alta"
    assert sector_key("Iñaquito Alto, Quito") == "inaquito alto"
    # Third person stays ambiguous on purpose: these are nouns as well as verbs.
    assert sector_key("Laguna del Sol, Guayaquil") == "laguna del sol"
    assert sector_key("El Arriendo, Loja") == "el arriendo"


def test_a_shouted_name_is_published_in_title_case():
    """SPEC:SEC-006 — the seller's caps lock is not part of the place name."""
    assert titlecase_place("PUERTO AZUL") == "Puerto Azul"
    assert titlecase_place("URBANIZACION EL CONDADO") == "Urbanizacion el Condado"
    # A name written deliberately in mixed case is left exactly as it is.
    assert titlecase_place("Kennedy Norte") == "Kennedy Norte"


def test_a_corner_of_a_zone_counts_towards_the_zone():
    """SPEC:SEC-005 — «Cumbayá Sector La Viña» is Cumbayá, not a rival."""
    for _ in range(15):
        listing("Cumbayá, Quito")
    for _ in range(3):
        listing("Cumbayá Sector La Viña, Quito")

    sectors = {row["sector_key"]: row for row in list_sectors(city="Quito")}

    assert "cumbaya sector la vina" not in sectors
    assert sectors["cumbaya"]["count"] == 18
    assert sectors["cumbaya"]["name"] == "Cumbayá"
    assert sectors["cumbaya"]["aliases"] == ["cumbaya sector la vina"]


def test_a_neighbour_of_similar_size_is_not_absorbed():
    """SPEC:SEC-005 — two avenues of the same name are still two avenues."""
    for _ in range(6):
        listing("Av. República, Quito")
    for _ in range(6):
        listing("Av. República de El Salvador, Quito")

    keys = {row["sector_key"] for row in list_sectors(city="Quito")}

    assert "av. republica" in keys
    assert "av. republica de el salvador" in keys


def test_an_absorbed_url_still_resolves():
    """SPEC:SEC-005 — the corner's URL is indexed; it must lead somewhere."""
    for _ in range(15):
        listing("Cumbayá, Quito")
    for _ in range(3):
        listing("Cumbayá Sector La Viña, Quito")

    found = find_sector("Quito", "cumbaya sector la vina")

    assert found is not None
    assert found["sector_key"] == "cumbaya"
