"""Authentication domain services.

Views should translate HTTP requests and responses; account linking, user
creation and token creation belong here so the same rules can be reused by
other entry points.
"""

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework_simplejwt.tokens import RefreshToken


class GoogleIdentityError(ValueError):
    """Raised when Google did not provide a trustworthy identity."""


@dataclass(frozen=True)
class GoogleIdentity:
    subject: str
    email: str
    first_name: str = ""
    last_name: str = ""
    avatar_url: str = ""

    @classmethod
    def from_claims(cls, claims):
        email = str(claims.get("email") or "").strip().lower()
        subject = str(claims.get("sub") or "").strip()
        if not email or not subject or claims.get("email_verified") is not True:
            raise GoogleIdentityError("Google no confirmó una identidad de correo válida.")
        return cls(
            subject=subject,
            email=email,
            first_name=str(claims.get("given_name") or "").strip(),
            last_name=str(claims.get("family_name") or "").strip(),
            avatar_url=str(claims.get("picture") or "").strip(),
        )


class GoogleAuthenticationService:
    """Link a verified Google identity and issue the application's tokens."""

    def authenticate(self, claims):
        identity = GoogleIdentity.from_claims(claims)
        user = self._find_or_create_user(identity)
        return user, self._tokens_for(user)

    @transaction.atomic
    def _find_or_create_user(self, identity):
        User = get_user_model()
        user = User.objects.select_for_update().filter(oauth_id=identity.subject).first()
        if user is None:
            user = User.objects.select_for_update().filter(email__iexact=identity.email).first()
        if user is None:
            user = self._create_user(identity)
        else:
            user.oauth_provider = "google"
            user.oauth_id = identity.subject
            user.avatar_url = identity.avatar_url
            user.is_email_verified = True
            user.is_active = True
            user.save(update_fields=[
                "oauth_provider", "oauth_id", "avatar_url",
                "is_email_verified", "is_active",
            ])
        return user

    def _create_user(self, identity):
        User = get_user_model()
        base = identity.email.split("@", 1)[0][:140] or "usuario"
        for suffix in range(1000):
            username = base if suffix == 0 else f"{base[:145 - len(str(suffix))]}{suffix}"
            try:
                with transaction.atomic():
                    user = User.objects.create(
                        username=username,
                        email=identity.email,
                        first_name=identity.first_name,
                        last_name=identity.last_name,
                        oauth_provider="google",
                        oauth_id=identity.subject,
                        avatar_url=identity.avatar_url,
                        is_email_verified=True,
                        is_active=True,
                    )
                    user.set_unusable_password()
                    user.save(update_fields=["password"])
                    return user
            except IntegrityError:
                # A concurrent request may have created this same Google
                # identity after our first lookup. Return it instead of
                # retrying usernames until the artificial limit is reached.
                existing = User.objects.filter(
                    oauth_id=identity.subject, email__iexact=identity.email
                ).first()
                if existing is not None:
                    return existing
                continue
        raise RuntimeError("No se pudo reservar un nombre de usuario.")

    @staticmethod
    def _tokens_for(user):
        refresh = RefreshToken.for_user(user)
        refresh["username"] = user.username
        refresh["email"] = user.email
        refresh["is_staff"] = user.is_staff
        return {"access": str(refresh.access_token), "refresh": str(refresh)}
