# API de Cambio de Correo Electrónico

Documentación completa de los endpoints para cambiar el correo electrónico de usuario.

## 🔐 Autenticación Requerida

Ambos endpoints requieren autenticación mediante JWT token en el header `Authorization: Bearer <token>`.

---

## 📝 Endpoints

### 1. Solicitar Cambio de Email

**Endpoint:** `POST /api/request-email-change/`
**Autenticación:** ✅ Requerida
**Descripción:** Solicita el cambio de correo electrónico. Envía un código de verificación de 6 dígitos al nuevo correo.

#### Request

```json
{
  "new_email": "nuevo@email.com"
}
```

#### Response Exitosa (200 OK)

```json
{
  "message": "Se ha enviado un código de verificación a nuevo@email.com",
  "new_email": "nuevo@email.com"
}
```

#### Errores Posibles

**400 Bad Request** - Email inválido o ya en uso
```json
{
  "new_email": ["Este correo ya está en uso por otra cuenta"]
}
```

**400 Bad Request** - Mismo email actual
```json
{
  "new_email": ["Este es tu correo actual. Usa uno diferente"]
}
```

**401 Unauthorized** - Token inválido o no proporcionado
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**500 Internal Server Error** - Error al enviar el email
```json
{
  "error": "Error al enviar el correo de verificación"
}
```

---

### 2. Verificar Cambio de Email

**Endpoint:** `POST /api/verify-email-change/`
**Autenticación:** ✅ Requerida
**Descripción:** Verifica el código enviado al nuevo email y completa el cambio de correo. Envía una notificación al correo anterior.

#### Request

```json
{
  "code": "123456"
}
```

#### Response Exitosa (200 OK)

```json
{
  "message": "Correo electrónico actualizado exitosamente",
  "new_email": "nuevo@email.com"
}
```

#### Errores Posibles

**400 Bad Request** - Código inválido
```json
{
  "error": "Código de verificación inválido"
}
```

**400 Bad Request** - Código expirado
```json
{
  "error": "El código ha expirado. Solicita uno nuevo."
}
```

**400 Bad Request** - Email ahora en uso por otro usuario
```json
{
  "error": "Este correo ya está en uso por otra cuenta"
}
```

**401 Unauthorized** - Token inválido o no proporcionado
```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

## 🔄 Flujo Completo

### Paso 1: Obtener Token de Autenticación

```bash
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "antiguo@email.com",
    "password": "MiContraseña123!"
  }'
```

**Respuesta:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "usuario",
    "email": "antiguo@email.com",
    "first_name": "Juan",
    "last_name": "Pérez"
  }
}
```

### Paso 2: Solicitar Cambio de Email

```bash
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."

curl -X POST http://localhost:8000/api/request-email-change/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "new_email": "nuevo@email.com"
  }'
```

**Respuesta:**
```json
{
  "message": "Se ha enviado un código de verificación a nuevo@email.com",
  "new_email": "nuevo@email.com"
}
```

**Email enviado a nuevo@email.com:**
- ✉️ Asunto: "Verifica tu nuevo correo - Geo Propiedades Ecuador"
- 📧 Código de 6 dígitos
- ⏰ Expira en 30 minutos (configurable)
- ⚠️ Advertencias de seguridad

### Paso 3: Obtener Código del Email

Revisa el inbox de `nuevo@email.com` y copia el código de 6 dígitos.

En desarrollo (console backend), busca en los logs:
```bash
docker-compose logs backend | grep "código de verificación"
```

### Paso 4: Verificar Código y Completar Cambio

```bash
curl -X POST http://localhost:8000/api/verify-email-change/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "123456"
  }'
```

**Respuesta:**
```json
{
  "message": "Correo electrónico actualizado exitosamente",
  "new_email": "nuevo@email.com"
}
```

**Email de notificación enviado a antiguo@email.com:**
- ✉️ Asunto: "Tu correo ha sido cambiado - Geo Propiedades Ecuador"
- ✅ Confirmación del cambio
- 📅 Fecha y hora del cambio
- ⚠️ Instrucciones si no autorizó el cambio
- 📞 Botón para contactar soporte

### Paso 5: Iniciar Sesión con Nuevo Email

A partir de este momento, el usuario debe usar el nuevo email para iniciar sesión:

```bash
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@email.com",
    "password": "MiContraseña123!"
  }'
```

---

## ⏰ Configuración de Expiración

Los códigos de verificación expiran después de un tiempo configurable:

**Archivo:** `backend/estate_map/settings.py`
```python
EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES = 30  # 30 minutos
```

**Variable de entorno:** `.env`
```bash
EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES=30
```

---

## 📧 Emails Enviados

### 1. Email de Verificación (al nuevo correo)

**Destinatario:** `new_email`
**Template:** `backend/real_estate/templates/emails/email_change_verification.html`
**Contenido:**
- Código de verificación de 6 dígitos
- Información del email antiguo y nuevo
- Advertencia de expiración
- Aviso de seguridad si no solicitó el cambio

### 2. Email de Notificación (al correo antiguo)

**Destinatario:** `old_email`
**Template:** `backend/real_estate/templates/emails/email_changed_notification.html`
**Contenido:**
- Confirmación del cambio exitoso
- Comparación email antiguo vs nuevo
- Fecha y hora del cambio
- Advertencia de seguridad
- Botón para contactar soporte

---

## 🔒 Seguridad

### Validaciones Implementadas

1. ✅ **Autenticación requerida** - Solo usuarios autenticados pueden cambiar su email
2. ✅ **Email único** - Verifica que el nuevo email no esté en uso
3. ✅ **Email diferente** - No permite cambiar al mismo email actual
4. ✅ **Código de 6 dígitos** - Fácil de ingresar pero seguro
5. ✅ **Expiración de códigos** - Los códigos expiran después de 30 minutos
6. ✅ **Invalidación de códigos anteriores** - Al solicitar un nuevo código, los anteriores se invalidan
7. ✅ **Código de un solo uso** - Los códigos no pueden reutilizarse después de verificar
8. ✅ **Notificación al email antiguo** - Alerta de seguridad si alguien cambió el email sin autorización
9. ✅ **Verificación final** - Verifica nuevamente que el email no esté en uso antes de completar el cambio

### Medidas de Seguridad Adicionales

- **Rate Limiting** (recomendado): Limitar intentos de verificación por IP/usuario
- **2FA** (futuro): Requerir verificación adicional para cambios de email
- **Logs de auditoría** (recomendado): Registrar todos los cambios de email
- **Notificaciones SMS** (futuro): Enviar SMS adicional al cambiar email

---

## 🧪 Pruebas

### Desarrollo (Console Backend)

Los emails se imprimen en la consola del backend:

```bash
# Ver logs en tiempo real
docker-compose logs -f backend

# Buscar códigos de verificación
docker-compose logs backend | grep "código de verificación"

# Ver últimos 200 logs
docker-compose logs backend 2>&1 | tail -200
```

### Producción (SMTP Real)

Configura las variables de entorno en `.env`:

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-usuario
EMAIL_HOST_PASSWORD=tu-contraseña
DEFAULT_FROM_EMAIL=notificaciones@geopropiedadesecuador.com
FRONTEND_URL=https://tudominio.com
```

---

## 🐛 Troubleshooting

### Problema: "Error al enviar el correo de verificación"

**Causas posibles:**
- Configuración SMTP incorrecta
- Credenciales de email inválidas
- Firewall bloqueando puerto SMTP
- Servicio de email caído

**Solución:**
1. Verificar logs del backend: `docker-compose logs backend`
2. Verificar variables de entorno en `.env`
3. Probar conexión SMTP manualmente
4. Usar email backend de consola para desarrollo

### Problema: "El código ha expirado"

**Causa:** El código tiene más de 30 minutos

**Solución:**
1. Solicitar un nuevo código con `POST /api/request-email-change/`
2. Verificar inmediatamente después de recibir el código

### Problema: "Este correo ya está en uso por otra cuenta"

**Causa:** Otro usuario ya tiene ese email registrado

**Solución:**
1. Usar un email diferente
2. Si crees que el email debería estar disponible, contactar soporte

### Problema: "Authentication credentials were not provided"

**Causa:** Token JWT no incluido o inválido

**Solución:**
1. Incluir header: `Authorization: Bearer <tu-token>`
2. Obtener nuevo token con `POST /api/login/`
3. Verificar que el token no haya expirado

---

## 🔗 Endpoints Relacionados

- `POST /api/register/` - Registro de usuario
- `POST /api/login/` - Inicio de sesión (obtener token)
- `POST /api/verify-email/` - Verificar email al registrarse
- `POST /api/resend-verification/` - Reenviar código de verificación
- `POST /api/request-password-reset/` - Solicitar reset de contraseña
- `POST /api/reset-password/` - Resetear contraseña

---

## 📊 Modelo de Base de Datos

### EmailChangeToken

```python
class EmailChangeToken(models.Model):
    user = ForeignKey(User)              # Usuario que solicita el cambio
    new_email = EmailField()             # Nuevo email a verificar
    code = CharField(max_length=6)       # Código de 6 dígitos
    created_at = DateTimeField()         # Fecha de creación
    expires_at = DateTimeField()         # Fecha de expiración
    is_used = BooleanField()             # Si ya fue usado
```

**Migración:** `real_estate/migrations/0008_emailchangetoken.py`

---

**Última actualización:** 2025-11-20
**Versión:** 1.0.0
**Mantenido por:** Equipo de Desarrollo Geo Propiedades Ecuador
