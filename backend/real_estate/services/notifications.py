"""Best-effort notification services with consistent observability."""

import logging

from real_estate.email_utils import (
    send_account_claim_email,
    send_lead_notification,
    send_ownership_transfer_email,
    send_pending_publication_notification,
)

logger = logging.getLogger(__name__)


class LeadNotificationService:
    """Deliver notifications created by the lead workflow."""

    def notify_created(self, lead):
        try:
            send_lead_notification(lead)
            return True
        except Exception:
            logger.exception("lead_notification_failed lead_id=%s", lead.pk)
            return False


class PendingPublicationNotificationService:
    """Deliver notifications created by the assisted-publication workflow."""

    def notify_created(self, publication):
        try:
            send_pending_publication_notification(publication)
            return True
        except Exception:
            logger.exception(
                "pending_publication_notification_failed publication_id=%s",
                publication.pk,
            )
            return False


class AccountClaimNotificationService:
    """Invite someone to take over an account created on their behalf."""

    def notify_claim(self, user, reset_token, prop=None):
        try:
            send_account_claim_email(user, reset_token, prop)
            return True
        except Exception:
            logger.exception("account_claim_notification_failed user_id=%s", user.pk)
            return False


class OwnershipTransferNotificationService:
    """Tell someone a property is now theirs.

    Best effort like the rest: a dead SMTP must not roll back a transfer that
    already moved the row, or the audit line would describe something that did
    not happen.
    """

    def notify_transferred(self, user, prop):
        try:
            send_ownership_transfer_email(user, prop)
            return True
        except Exception:
            logger.exception(
                "ownership_transfer_notification_failed user_id=%s property_id=%s",
                user.pk,
                prop.pk,
            )
            return False
