from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.utils import perform_login
from allauth.exceptions import ImmediateHttpResponse
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Adaptador personalizado para manejar el registro/login con Google OAuth.
    """

    def pre_social_login(self, request, sociallogin):
        """
        Conecta cuentas OAuth con cuentas existentes basadas en email.
        Si un usuario ya existe con el mismo email, conecta la cuenta social.
        """
        if sociallogin.is_existing:
            return

        try:
            email = sociallogin.account.extra_data.get('email', '').lower()
            if not email:
                return

            # Buscar usuario existente con el mismo email
            try:
                user = User.objects.get(email=email)
                # Conectar la cuenta social al usuario existente
                sociallogin.connect(request, user)
                # Marcar email como verificado si viene de Google
                if not user.is_email_verified:
                    user.is_email_verified = True
                    user.save()
            except User.DoesNotExist:
                pass

        except Exception:
            pass

    def save_user(self, request, sociallogin, form=None):
        """
        Guarda el usuario después del registro con OAuth.
        """
        user = super().save_user(request, sociallogin, form)

        # Obtener datos adicionales de Google
        extra_data = sociallogin.account.extra_data

        # Guardar información OAuth
        user.oauth_provider = sociallogin.account.provider
        user.oauth_id = sociallogin.account.uid
        user.avatar_url = extra_data.get('picture', '')

        # Marcar email como verificado (Google ya lo verificó)
        user.is_email_verified = True

        # Si no hay nombre, usar el de Google
        if not user.first_name:
            user.first_name = extra_data.get('given_name', '')
        if not user.last_name:
            user.last_name = extra_data.get('family_name', '')

        # Si no hay username, generar uno desde el email
        if not user.username:
            user.username = user.email.split('@')[0]
            # Asegurar que el username sea único
            counter = 1
            original_username = user.username
            while User.objects.filter(username=user.username).exists():
                user.username = f"{original_username}{counter}"
                counter += 1

        user.save()
        return user

    def populate_user(self, request, sociallogin, data):
        """
        Puebla los campos del usuario con datos de Google.
        """
        user = super().populate_user(request, sociallogin, data)

        extra_data = sociallogin.account.extra_data

        if not user.first_name:
            user.first_name = extra_data.get('given_name', '')
        if not user.last_name:
            user.last_name = extra_data.get('family_name', '')

        return user
