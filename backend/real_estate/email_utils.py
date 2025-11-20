"""Utilidades para envío de correos electrónicos"""
import random
import string
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


def generate_verification_code():
    """Genera un código de verificación de 6 dígitos"""
    return ''.join(random.choices(string.digits, k=6))


def generate_reset_token():
    """Genera un token seguro para reset de contraseña"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=64))


def send_verification_email(user, code):
    """Envía correo con código de verificación usando template HTML"""
    subject = 'Verifica tu correo electrónico - Geo Propiedades Ecuador'

    # Contexto para el template
    context = {
        'user_name': user.first_name,
        'verification_code': code,
        'expiry_minutes': settings.EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES,
    }

    # Renderizar template HTML
    html_content = render_to_string('emails/verification_email.html', context)

    # Mensaje de texto plano (fallback)
    text_content = f"""
Hola {user.first_name},

Gracias por registrarte en Geo Propiedades Ecuador.

Tu código de verificación es: {code}

Este código expirará en {settings.EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES} minutos.

Si no solicitaste este registro, por favor ignora este correo.

Saludos,
El equipo de Geo Propiedades Ecuador
    """

    # Crear email con HTML
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)


def send_password_reset_email(user, token):
    """Envía correo con link para resetear contraseña usando template HTML"""
    # En producción, esto debería ser tu dominio real
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_link = f"{frontend_url}/reset-password?token={token}"

    subject = 'Recupera tu contraseña - Geo Propiedades Ecuador'

    # Contexto para el template
    context = {
        'user_name': user.first_name,
        'reset_link': reset_link,
        'expiry_hours': settings.PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
    }

    # Renderizar template HTML
    html_content = render_to_string('emails/password_reset_email.html', context)

    # Mensaje de texto plano (fallback)
    text_content = f"""
Hola {user.first_name},

Recibimos una solicitud para restablecer tu contraseña.

Para restablecer tu contraseña, haz clic en el siguiente enlace:

{reset_link}

Este enlace expirará en {settings.PASSWORD_RESET_TOKEN_EXPIRY_HOURS} horas.

Si no solicitaste restablecer tu contraseña, por favor ignora este correo.

Saludos,
El equipo de Geo Propiedades Ecuador
    """

    # Crear email con HTML
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)


def create_verification_token(user):
    """Crea un token de verificación de email"""
    from .models import EmailVerificationToken

    # Invalidar tokens anteriores
    EmailVerificationToken.objects.filter(user=user, is_used=False).update(is_used=True)

    code = generate_verification_code()
    expires_at = timezone.now() + timedelta(minutes=settings.EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES)

    token = EmailVerificationToken.objects.create(
        user=user,
        code=code,
        expires_at=expires_at
    )

    return token


def create_password_reset_token(user):
    """Crea un token para reset de contraseña"""
    from .models import PasswordResetToken

    # Invalidar tokens anteriores
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

    token_string = generate_reset_token()
    expires_at = timezone.now() + timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRY_HOURS)

    token = PasswordResetToken.objects.create(
        user=user,
        token=token_string,
        expires_at=expires_at
    )

    return token


def send_welcome_email(user):
    """Envía correo de bienvenida después de verificar el email"""
    subject = '¡Bienvenido a Geo Propiedades Ecuador!'

    # Obtener URL del frontend
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

    # Contexto para el template
    context = {
        'user_name': user.first_name,
        'frontend_url': frontend_url,
    }

    # Renderizar template HTML
    html_content = render_to_string('emails/welcome_email.html', context)

    # Mensaje de texto plano (fallback)
    text_content = f"""
¡Hola {user.first_name}!

Bienvenido a Geo Propiedades Ecuador.

Tu cuenta ha sido verificada exitosamente. Ahora puedes:
- Explorar nuestro catálogo de propiedades
- Usar la búsqueda geolocalizada
- Publicar tus propias propiedades
- Contactar directamente con propietarios

Inicia sesión en {frontend_url}/login para comenzar.

¡Gracias por unirte a nosotros!

Saludos,
El equipo de Geo Propiedades Ecuador
    """

    # Crear email con HTML
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)


def send_email_change_verification(user, new_email, code):
    """Envía correo de verificación al nuevo email cuando se solicita cambio"""
    subject = 'Verifica tu nuevo correo - Geo Propiedades Ecuador'

    # Contexto para el template
    context = {
        'user_name': user.first_name,
        'new_email': new_email,
        'old_email': user.email,
        'verification_code': code,
        'expiry_minutes': settings.EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES,
    }

    # Renderizar template HTML
    html_content = render_to_string('emails/email_change_verification.html', context)

    # Mensaje de texto plano (fallback)
    text_content = f"""
Hola {user.first_name},

Recibimos una solicitud para cambiar tu correo electrónico.

Nuevo correo: {new_email}

Tu código de verificación es: {code}

Este código expirará en {settings.EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES} minutos.

Si no solicitaste este cambio, contacta inmediatamente con soporte.

Saludos,
El equipo de Geo Propiedades Ecuador
    """

    # Crear email con HTML
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[new_email],  # Se envía al nuevo email
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)


def send_email_changed_notification(user, old_email, new_email):
    """Envía notificación al email anterior cuando se completa el cambio"""
    subject = 'Tu correo ha sido cambiado - Geo Propiedades Ecuador'

    # Formatear fecha
    change_date = timezone.now().strftime('%d/%m/%Y a las %H:%M')

    # Contexto para el template
    context = {
        'user_name': user.first_name,
        'old_email': old_email,
        'new_email': new_email,
        'change_date': change_date,
    }

    # Renderizar template HTML
    html_content = render_to_string('emails/email_changed_notification.html', context)

    # Mensaje de texto plano (fallback)
    text_content = f"""
Hola {user.first_name},

Este es un correo de notificación para informarte que tu correo en Geo Propiedades Ecuador ha sido cambiado.

Correo anterior: {old_email}
Correo nuevo: {new_email}
Fecha del cambio: {change_date}

A partir de ahora, todas las comunicaciones se enviarán al nuevo correo.
Este es el último mensaje que recibirás en {old_email}.

Si NO autorizaste este cambio, contacta inmediatamente con soporte:
soporte@geopropiedadesecuador.com

Saludos,
El equipo de Geo Propiedades Ecuador
    """

    # Crear email con HTML - Se envía al email ANTERIOR
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[old_email],  # Se envía al email anterior como notificación de seguridad
    )
    email.attach_alternative(html_content, "text/html")
    email.send(fail_silently=False)
