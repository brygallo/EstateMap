"""
Upsert idempotente de una propiedad importada (se usa en ``ingesta_import``).

Reglas:
- Clave primaria lógica: ``(source, external_id)``. Re-importar no duplica.
- Si no existe por esa clave, se busca un duplicado por cercanía de otra fuente;
  si lo hay, se omite (no creamos dos veces la misma ubicación física).
- ``owner`` queda ``NULL`` y ``is_imported=True``.
- Precio/área pueden ser ``None`` (anuncios incompletos son válidos).
"""
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.utils import timezone

from .dedup import find_duplicate
from .images import attach_images_from_urls, image_dhash_from_url, sync_property_images
from .location import validate_location
from .normalize import build_dedup_key


# Campos de Property que actualizamos desde el paquete.
def _apply_fields(prop, data, fuente, lat, lng):
    prop.title = (data.get("title") or "")[:150]
    prop.description = data.get("description") or ""
    prop.property_type = data.get("property_type") or "land"
    prop.status = data.get("status") or "for_sale"
    prop.address = (data.get("address") or "")[:255]
    prop.city = (data.get("city") or "")[:100]
    prop.province = (data.get("province") or "")[:100]
    prop.latitude = lat
    prop.longitude = lng
    prop.area = data.get("area")
    prop.built_area = data.get("built_area")
    prop.rooms = data.get("rooms") or 0
    prop.bathrooms = data.get("bathrooms") or 0
    prop.price = _to_decimal(data.get("price"))
    prop.rent_price = _to_decimal(data.get("rent_price"))
    prop.contact_phone = (data.get("contact_phone") or "")[:20]
    prop.contact_email = (data.get("contact_email") or "")[:254]
    prop.source = fuente
    prop.source_agency = (data.get("source_agency") or "")[:150]
    prop.source_url = (data.get("source_url") or "")[:500]
    prop.external_id = (data.get("external_id") or "")[:120]
    prop.is_imported = True
    prop.dedup_key = build_dedup_key(lat, lng)
    if data.get("image_hash"):
        prop.image_hash = data["image_hash"][:32]
    prop.last_seen_at = timezone.now()


def upsert_property(data, fuente, reader=None, image_urls=None):
    """
    Crea o actualiza una ``Property`` a partir del dict canónico ``data``.

    Imágenes (según el flujo):
    - ``reader`` (flujo paquete/import): las lee del paquete en disco.
    - ``image_urls`` (flujo directo/un solo paso): las descarga a un temporal en
      memoria y las sube a MinIO.

    Devuelve ``(resultado, prop)`` donde resultado ∈
    {'created', 'updated', 'skipped_no_location', 'skipped_duplicate'}.
    """
    from real_estate.models import Property

    ok, lat, lng, _motivo = validate_location(data.get("latitude"), data.get("longitude"))
    if not ok:
        return "skipped_no_location", None

    external_id = (data.get("external_id") or "").strip()

    # Huella de imagen (dHash) de la foto principal, para deduplicar entre
    # portales por las FOTOS (la señal más confiable). Solo en el flujo directo.
    if image_urls and not data.get("image_hash"):
        data["image_hash"] = image_dhash_from_url(image_urls[0])

    prop = None
    if external_id:
        prop = Property.objects.filter(source=fuente, external_id=external_id).first()

    created = False
    demote = None
    if prop is None:
        # ¿Ya existe la misma propiedad desde OTRA fuente? Señales: misma imagen,
        # proximidad, área+precio. (La ubicación entre portales no siempre coincide;
        # el teléfono NO se usa: un anunciante tiene muchas propiedades con el mismo.)
        dup = find_duplicate(
            lat, lng,
            area=data.get("area"),
            price=data.get("price"),
            image_hash=data.get("image_hash"),
            exclude_source_id=fuente.id,
        )
        if dup is not None:
            new_phone = bool((data.get("contact_phone") or "").strip())
            existing_phone = bool((dup.contact_phone or "").strip())
            if new_phone and not existing_phone:
                # Preferencia: el anuncio CON WhatsApp gana. Creamos el nuevo y
                # ocultamos el anterior (queda enlazado como duplicado).
                demote = dup
            else:
                # Empate o el existente ya tiene contacto -> gana el existente.
                return "skipped_duplicate", dup
        prop = Property()
        created = True

    _apply_fields(prop, data, fuente, lat, lng)
    if created:
        prop.imported_at = timezone.now()

    try:
        # Savepoint: si el INSERT choca con la constraint (source, external_id)
        # por una carrera (otra ejecución creó la misma fila entremedio), el
        # error no envenena la transacción exterior.
        with transaction.atomic():
            prop.save()
    except IntegrityError:
        # Ya existe esa (source, external_id): recuperamos la fila y la
        # actualizamos en vez de duplicar. La creación se convierte en update
        # y anulamos el demote (el próximo ciclo lo resolverá si aplica).
        if not external_id:
            raise
        existing = Property.objects.filter(source=fuente, external_id=external_id).first()
        if existing is None:
            raise
        prop = existing
        created = False
        demote = None
        _apply_fields(prop, data, fuente, lat, lng)
        prop.save()

    if demote is not None:
        demote.is_duplicate = True
        demote.duplicate_of = prop
        demote.save(update_fields=["is_duplicate", "duplicate_of"])

    # Imágenes: flujo paquete (reader) o flujo directo (image_urls -> MinIO).
    if reader is not None and external_id:
        image_paths = reader.image_paths(external_id)
        if image_paths:
            sync_property_images(prop, image_paths)
    elif image_urls:
        attach_images_from_urls(prop, image_urls)

    return ("created" if created else "updated"), prop


def _to_decimal(value):
    if value is None:
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None
