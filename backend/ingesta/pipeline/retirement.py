from django.db import transaction

from ingesta.models import ListingRetirada
from real_estate.models import Property

from .images import delete_property_images


@transaction.atomic
def retire_listing(*, fuente, external_id, source_url="", http_status=410):
    """Persist a small audit record and remove imported data and media."""
    external_id = str(external_id or "").strip()
    if not external_id:
        return None

    ListingRetirada.objects.update_or_create(
        fuente=fuente,
        external_id=external_id,
        defaults={"source_url": source_url or "", "http_status": http_status},
    )
    prop = Property.objects.filter(
        source=fuente,
        is_imported=True,
        external_id=external_id,
    ).first()
    if prop is None:
        return None

    property_id = prop.pk
    delete_property_images(prop)
    prop.delete()
    return property_id


def retire_property(prop, *, http_status=410):
    if not prop.is_imported:
        return None
    if not prop.source_id or not str(prop.external_id or "").strip():
        property_id = prop.pk
        delete_property_images(prop)
        prop.delete()
        return property_id
    return retire_listing(
        fuente=prop.source,
        external_id=prop.external_id,
        source_url=prop.source_url,
        http_status=http_status,
    )
