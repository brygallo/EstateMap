"""Señales del app: notificar a IndexNow cuando cambia el inventario público."""

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .models import Property, PropertyPriceHistory
from .services.indexnow import submit_property


@receiver(post_save, sender=Property, dispatch_uid="indexnow_property_saved")
def property_saved(sender, instance, created=False, **kwargs):
    if instance.price is not None:
        latest = instance.price_history.order_by("-recorded_at").first()
        if latest is None or latest.price != instance.price:
            PropertyPriceHistory.objects.create(property=instance, price=instance.price)
    submit_property(instance.pk)


@receiver(post_delete, sender=Property, dispatch_uid="indexnow_property_deleted")
def property_deleted(sender, instance, **kwargs):
    # IndexNow también acepta URLs eliminadas: el buscador las recrawlea,
    # recibe el 404/410 y las saca del índice más rápido.
    submit_property(instance.pk)
