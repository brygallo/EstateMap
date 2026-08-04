import pytest

from ingesta.models import Fuente
from ingesta.pipeline.images import attach_images_from_urls
from ingesta.pipeline import upsert as upsert_module
from ingesta.pipeline.upsert import upsert_property
from real_estate.models import Property, PropertyImage


pytestmark = pytest.mark.django_db


def _fuente():
    return Fuente.objects.create(
        slug="plusvalia",
        nombre="Plusvalia",
        base_url="https://www.plusvalia.com",
    )


def _data(external_id="pv-1"):
    return {
        "title": "Casa importada",
        "property_type": "house",
        "status": "for_sale",
        "latitude": "-0.18",
        "longitude": "-78.48",
        "price": 100000,
        "source_url": f"https://www.plusvalia.com/propiedades/{external_id}.html",
        "external_id": external_id,
    }


@pytest.mark.parametrize("field", ["price", "rent_price"])
def test_zero_price_is_not_imported(field):
    """SPEC:IMP-023 — an explicit zero in either price field rejects the listing."""
    fuente = _fuente()
    data = _data()
    data[field] = 0

    result, prop = upsert_property(data, fuente)

    assert result == "skipped_zero_price"
    assert prop is None
    assert Property.objects.count() == 0


def test_zero_price_does_not_overwrite_existing_property():
    """SPEC:IMP-023 — refresh with zero leaves the existing row unchanged."""
    fuente = _fuente()
    existing = Property.objects.create(
        source=fuente,
        external_id="pv-1",
        source_url="https://www.plusvalia.com/propiedades/pv-1.html",
        is_imported=True,
        title="Título anterior",
        latitude=-0.18,
        longitude=-78.48,
        price=100000,
    )
    data = _data()
    data["title"] = "Título con precio cero"
    data["price"] = 0

    result, prop = upsert_property(data, fuente)

    assert result == "skipped_zero_price"
    assert prop is None
    existing.refresh_from_db()
    assert existing.title == "Título anterior"
    assert existing.price == 100000


def test_created_property_rolls_back_when_all_images_fail(monkeypatch):
    """SPEC:IMP-018 — a new imported property is rolled back when no image attaches."""
    fuente = _fuente()
    logs = []

    monkeypatch.setattr(upsert_module, "image_dhash_from_url", lambda _url: "")
    monkeypatch.setattr(upsert_module, "attach_images_from_urls", lambda *_args, **_kwargs: 0)

    result, prop = upsert_property(
        _data(),
        fuente,
        image_urls=["https://img.naventcdn.com/missing.jpg"],
        log=logs.append,
    )

    assert result == "skipped_no_images"
    assert prop is None
    assert Property.objects.count() == 0
    assert "no se pudo adjuntar ninguna imagen" in logs[0]


def test_created_property_rolls_back_when_images_are_required_but_missing():
    fuente = _fuente()
    logs = []

    result, prop = upsert_property(
        _data(),
        fuente,
        image_urls=[],
        log=logs.append,
        require_images=True,
    )

    assert result == "skipped_no_images"
    assert prop is None
    assert Property.objects.count() == 0
    assert "el scraper no entregó imágenes" in logs[0]


def test_attach_images_keeps_existing_images_when_downloads_fail(monkeypatch):
    fuente = _fuente()
    prop = Property.objects.create(
        source=fuente,
        external_id="pv-1",
        is_imported=True,
        title="Casa anterior",
        latitude=-0.18,
        longitude=-78.48,
    )
    old_image = PropertyImage(property=prop, image="properties/old.webp", is_main=True)
    PropertyImage.objects.bulk_create([old_image])
    old_image = PropertyImage.objects.get(property=prop)

    class FailingClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def get(self, _url):
            raise RuntimeError("blocked")

    import httpx

    monkeypatch.setattr(httpx, "Client", FailingClient)

    attached = attach_images_from_urls(prop, ["https://img.naventcdn.com/new.jpg"])

    assert attached == 1
    assert list(prop.images.values_list("id", flat=True)) == [old_image.id]
