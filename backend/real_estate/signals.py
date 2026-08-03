"""Señales del app: notificar a IndexNow cuando cambia el inventario público."""

import logging

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .cache_utils import bump_props_version
from .models import Property, PropertyImage, PropertyPriceHistory
from .services.indexnow import submit_property

logger = logging.getLogger(__name__)


def _invalidate(property_id):
    """
    Drop every cached read that could still describe the old inventory.

    Two layers, one trigger: the Redis payloads go stale immediately by moving
    the version counter, and Next.js is asked to rebuild the pages tagged with
    this property. The frontend ping goes through Celery and `on_commit` — it
    reads the API back, so firing it inside the transaction would let the worker
    rebuild a page from the pre-commit state.
    """
    bump_props_version()

    def dispatch():
        from .tasks import revalidate_frontend_tags

        try:
            revalidate_frontend_tags.delay(["properties", f"property-{property_id}"])
        except Exception:
            # Deliberately broad: kombu wraps every transport failure
            # differently, and a broker outage must not fail the save that
            # triggered it. The page just stays cached until its own TTL.
            logger.warning(
                "Could not queue frontend revalidation for property %s",
                property_id,
                exc_info=True,
            )

    transaction.on_commit(dispatch)


@receiver(post_save, sender=Property, dispatch_uid="indexnow_property_saved")
def property_saved(sender, instance, created=False, **kwargs):
    if instance.price is not None:
        latest = instance.price_history.order_by("-recorded_at").first()
        if latest is None or latest.price != instance.price:
            PropertyPriceHistory.objects.create(property=instance, price=instance.price)
    submit_property(instance.pk, city=instance.city)


@receiver(post_delete, sender=Property, dispatch_uid="indexnow_property_deleted")
def property_deleted(sender, instance, **kwargs):
    # IndexNow también acepta URLs eliminadas: el buscador las recrawlea,
    # recibe el 404/410 y las saca del índice más rápido.
    submit_property(instance.pk, city=instance.city)


@receiver(post_save, sender=Property, dispatch_uid="cache_property_saved")
def property_cache_saved(sender, instance, created=False, **kwargs):
    _invalidate(instance.pk)


@receiver(post_delete, sender=Property, dispatch_uid="cache_property_deleted")
def property_cache_deleted(sender, instance, **kwargs):
    _invalidate(instance.pk)


@receiver(post_save, sender=PropertyImage, dispatch_uid="cache_property_image_saved")
@receiver(post_delete, sender=PropertyImage, dispatch_uid="cache_property_image_deleted")
def property_image_changed(sender, instance, **kwargs):
    # Listing payloads embed the image URLs, so a photo appearing, being
    # replaced or finishing optimization changes what the cached lists return.
    # Only the Redis layer is bumped here: the worker touches every image row of
    # an upload one by one, and each of those would otherwise become its own
    # frontend revalidation request.
    bump_props_version()
