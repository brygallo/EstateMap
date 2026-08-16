"""Side effects of redeeming a publication resume link, kept off the request."""

import logging

from django.db import transaction

logger = logging.getLogger(__name__)


class PublicationRedeemSideEffectsService:
    """
    Queue everything the redeem response does not need to wait for.

    Redeeming used to answer only after an SMTP round trip to an external relay
    and one HTTPS delete per stored photo. The caller reads neither result, and
    the portal answers on a handful of workers, so that wait was capacity spent
    on work nobody was waiting for — a redeem measured 26 s in production.

    Both jobs are scheduled on commit: the worker reads from its own connection
    and would find no rows before it.
    """

    def schedule(self, *, pending_id, owner_id, property_id, account_created):
        """Queue the cleanup and the notification for one redeemed draft."""
        self.schedule_image_cleanup(pending_id)
        self.schedule_notification(
            owner_id=owner_id,
            property_id=property_id,
            account_created=account_created,
        )

    def schedule_image_cleanup(self, pending_id):
        """Drop the draft's temporary photos; the periodic sweep is the fallback."""
        from real_estate.tasks import discard_redeemed_draft_images

        def dispatch():
            try:
                discard_redeemed_draft_images.delay(pending_id)
            except Exception:
                # No inline fallback: the photos are already copied into the
                # listing, so leaving them for the sweep costs disk, not data.
                logger.warning(
                    "Broker unavailable, leaving draft %s images for the sweep",
                    pending_id,
                    exc_info=True,
                )

        transaction.on_commit(dispatch)

    def schedule_notification(self, *, owner_id, property_id, account_created):
        """
        Send the claim or transfer email, inline if the broker is unreachable.

        Same trade as the image pipeline makes: a broker outage must not cost
        the person the only message that carries their password link. The
        fallback is the old latency, which beats silence.
        """
        from real_estate.tasks import notify_publication_redeemed

        def dispatch():
            try:
                notify_publication_redeemed.delay(owner_id, property_id, account_created)
            except Exception:
                logger.warning(
                    "Broker unavailable, sending redeem notification for property %s inline",
                    property_id,
                    exc_info=True,
                )
                try:
                    notify_publication_redeemed(owner_id, property_id, account_created)
                except Exception:
                    logger.exception(
                        "Inline fallback failed for redeem notification of property %s",
                        property_id,
                    )

        transaction.on_commit(dispatch)
