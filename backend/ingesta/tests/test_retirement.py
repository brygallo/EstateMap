import pytest

from ingesta.models import Fuente, ListingRetirada
from ingesta.pipeline.retirement import retire_listing, retire_property
from real_estate.models import Property


pytestmark = pytest.mark.django_db


def make_source():
    return Fuente.objects.create(
        slug="plusvalia-retirement-test",
        nombre="Plusvalía test",
        base_url="https://www.plusvalia.com",
    )


def test_retirement_keeps_audit_but_deletes_imported_property(monkeypatch):
    source = make_source()
    prop = Property.objects.create(
        title="Listing retirado",
        source=source,
        external_id="gone-123",
        source_url="https://www.plusvalia.com/propiedades/gone-123.html",
        is_imported=True,
    )
    property_id = prop.pk
    deleted_media_for = []
    monkeypatch.setattr(
        "ingesta.pipeline.retirement.delete_property_images",
        lambda instance: deleted_media_for.append(instance.pk),
    )

    deleted_id = retire_property(prop, http_status=410)

    assert deleted_id == property_id
    assert deleted_media_for == [property_id]
    assert not Property.objects.filter(pk=property_id).exists()
    retired = ListingRetirada.objects.get(fuente=source, external_id="gone-123")
    assert retired.http_status == 410
    assert retired.source_url == prop.source_url


def test_never_imported_retirement_only_keeps_small_audit_record():
    source = make_source()

    deleted_id = retire_listing(
        fuente=source,
        external_id="never-imported",
        source_url="https://www.plusvalia.com/propiedades/never-imported.html",
        http_status=404,
    )

    assert deleted_id is None
    assert ListingRetirada.objects.filter(fuente=source, external_id="never-imported").exists()


def test_user_published_property_is_never_deleted(monkeypatch):
    prop = Property.objects.create(title="Publicación de usuario", is_imported=False)
    monkeypatch.setattr(
        "ingesta.pipeline.retirement.delete_property_images",
        lambda instance: pytest.fail("No debe borrar imágenes de publicaciones de usuarios"),
    )

    deleted_id = retire_property(prop)

    assert deleted_id is None
    assert Property.objects.filter(pk=prop.pk).exists()
