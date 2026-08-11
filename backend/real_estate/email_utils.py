"""Utilidades para envío de correos electrónicos"""
import secrets
import string
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


def generate_verification_code():
    """Genera un código de verificación de 6 dígitos"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))


def generate_reset_token():
    """Genera un token seguro para reset de contraseña"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(64))


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
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3010')
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
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3010')

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


def send_pending_publication_notification(pending):
    """Notifica internamente cuando alguien deja una publicación pendiente."""
    recipients = [email for _, email in getattr(settings, 'ADMINS', []) if email]
    fallback_email = getattr(settings, 'PENDING_PUBLICATION_NOTIFY_EMAIL', '')
    if fallback_email:
        recipients.append(fallback_email)

    recipients = list(dict.fromkeys(recipients))
    if not recipients:
        return

    subject = 'Nueva publicación pendiente - Geo Propiedades Ecuador'
    admin_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3010')}/admin/pending-publications"
    body = f"""
Nueva publicación pendiente:

Título: {pending.title or 'Sin título'}
Teléfono: {pending.contact_phone or 'Sin teléfono'}
Ciudad: {pending.city or 'Sin ciudad'}
Provincia: {pending.province or 'Sin provincia'}
Precio: {pending.price or 'Sin precio'}
Origen: {pending.source}

Revisar en: {admin_url}
    """

    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        recipients,
        fail_silently=True,
    )


def send_lead_notification(lead):
    """Notifica al anunciante cuando alguien deja sus datos en una propiedad."""
    prop = lead.property
    owner_email = getattr(getattr(prop, 'owner', None), 'email', '') or ''
    recipients = [email for email in [owner_email, prop.contact_email] if email]
    recipients = list(dict.fromkeys(recipients))
    if not recipients:
        return

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3010')
    property_url = f"{frontend_url}/property/{prop.id}"
    panel_url = f"{frontend_url}/mis-propiedades"
    property_title = prop.title or f"Propiedad #{prop.id}"
    subject = f"Nuevo interesado en {property_title} - Geo Propiedades Ecuador"

    body = f"""
Hola,

Alguien dejó sus datos para una de tus propiedades.

Propiedad: {property_title}
Interesado: {lead.name}
Teléfono: {lead.phone}
Correo: {lead.email or 'No indicado'}
Mensaje: {lead.message or 'Sin mensaje'}

Ver propiedad: {property_url}
Ver tus contactos: {panel_url}

Saludos,
Geo Propiedades Ecuador
    """

    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        recipients,
        fail_silently=True,
    )


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


def frontend_url():
    """Base URL of the portal, used to build every link we email or hand out."""
    return getattr(settings, 'FRONTEND_URL', 'http://localhost:3010').rstrip('/')


def generate_resume_token():
    """Token opaco e inadivinable para un enlace de continuación."""
    return secrets.token_urlsafe(48)


def build_resume_link(token_string):
    """URL absoluta que devuelve a alguien a su borrador."""
    return f"{frontend_url()}/continuar-publicacion/{token_string}"


def create_publication_resume_token(pending, created_by=None):
    """
    Issue a resume token for a pending publication.

    Any token still live for the same request is revoked first: two working
    links to the same draft would let the same person publish it twice, which is
    exactly what the single-use rule exists to prevent.
    """
    from .models import PublicationResumeToken

    PublicationResumeToken.objects.filter(
        pending=pending,
        revoked_at__isnull=True,
        redeemed_at__isnull=True,
    ).update(revoked_at=timezone.now())

    expiry_days = getattr(settings, 'PUBLICATION_RESUME_TOKEN_EXPIRY_DAYS', 14)
    return PublicationResumeToken.objects.create(
        pending=pending,
        token=generate_resume_token(),
        created_by=created_by,
        expires_at=timezone.now() + timedelta(days=expiry_days),
    )


def send_account_claim_email(user, reset_token, prop=None):
    """
    Invita a definir contraseña a una cuenta creada sin que su dueño estuviera.

    Redeeming a resume link, or receiving a property by transfer, proves the
    person had the link, not that they own the mailbox. This email is where that
    proof actually happens, so the listing is already published by the time it
    arrives: nothing is being held hostage.
    """
    claim_link = f"{frontend_url()}/reset-password?token={reset_token}"
    subject = 'Tu anuncio está publicado - Geo Propiedades Ecuador'
    listing = getattr(prop, 'title', prop) or 'tu propiedad'
    detail_link = f"{frontend_url()}/propiedad/{prop.pk}" if getattr(prop, 'pk', None) else frontend_url()

    body = f"""
Hola,

Ya publicamos {listing} en Geo Propiedades Ecuador y creamos una cuenta a tu
nombre para que puedas administrarla.

Define tu contraseña aquí para entrar:

{claim_link}

Tu anuncio ya se puede revisar aquí:

{detail_link}

Con tu cuenta podrás editar el anuncio, subir más fotos y ver quién pregunta por
tu propiedad.

Si no reconoces este mensaje, ignóralo: sin definir la contraseña nadie puede
entrar a esa cuenta.

Saludos,
El equipo de Geo Propiedades Ecuador
    """

    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def send_ownership_transfer_email(user, prop):
    """Avisa a alguien de que una propiedad pasó a estar a su nombre."""
    subject = 'Una propiedad pasó a tu cuenta - Geo Propiedades Ecuador'
    detail_link = f"{frontend_url()}/propiedad/{prop.pk}"

    body = f"""
Hola,

La propiedad «{prop.title or f'Propiedad {prop.pk}'}» pasó a estar a nombre de tu
cuenta en Geo Propiedades Ecuador.

Puedes verla aquí:

{detail_link}

Desde ahora eres quien puede editarla, publicarla o retirarla, y quien recibe las
consultas de las personas interesadas.

Si crees que esto es un error, respóndenos a este correo.

Saludos,
El equipo de Geo Propiedades Ecuador
    """

    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
