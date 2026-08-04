"""Provisioning for accounts created before their owner ever signed up.

Two flows hand somebody a property they did not publish themselves: redeeming a
resume link, and an administrative ownership transfer. Both may land on an email
address with no account behind it, and in both cases making the person register
first would put back the exact wall that made them leave. So the account is
created for them, without a usable password: whoever holds the link can trigger
the creation, but only whoever reads the mailbox can get into it.
"""

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction


class InactiveAccountError(ValueError):
    """The address already belongs to an account that cannot receive anything."""


class InvitedAccountService:
    """Find the account behind an email address, or create an invited one."""

    def get_or_create_by_email(self, email):
        """Return ``(user, created)``. New accounts have no usable password."""
        address = (email or "").strip().lower()
        if not address:
            raise ValueError("Se necesita un correo para crear la cuenta.")

        User = get_user_model()
        existing = User.objects.filter(email__iexact=address).first()
        if existing is not None:
            if not existing.is_active:
                raise InactiveAccountError(
                    "Esa cuenta está desactivada; actívala antes de asignarle una propiedad."
                )
            return existing, False

        return self._create(address), True

    def _create(self, address):
        User = get_user_model()
        base = address.split("@", 1)[0][:140] or "usuario"
        for suffix in range(1000):
            username = base if suffix == 0 else f"{base[:145 - len(str(suffix))]}{suffix}"
            try:
                with transaction.atomic():
                    user = User.objects.create(
                        username=username,
                        email=address,
                        # Active so the account works the moment its owner sets a
                        # password from the emailed link. Until then the unusable
                        # password is what keeps anybody out, including whoever
                        # forwarded the link that created it.
                        is_active=True,
                    )
                    user.set_unusable_password()
                    user.save(update_fields=["password"])
                    return user
            except IntegrityError:
                # Either the username was taken between the check and the insert,
                # or a concurrent request created this same address first.
                existing = User.objects.filter(email__iexact=address).first()
                if existing is not None:
                    return existing
                continue
        raise RuntimeError("No se pudo reservar un nombre de usuario.")
