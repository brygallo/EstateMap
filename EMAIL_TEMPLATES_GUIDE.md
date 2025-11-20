# Guía de Templates de Email - Geo Propiedades Ecuador

Templates HTML profesionales y responsivos para emails del sistema de autenticación y gestión de usuarios.

## 📧 Templates Implementados

### 1. Email de Verificación de Registro
**Archivo:** `backend/real_estate/templates/emails/verification_email.html`

**Características:**
- ✅ Diseño moderno con gradientes morados (#667eea → #764ba2)
- ✅ Código de 6 dígitos destacado en formato grande
- ✅ Advertencia de expiración con icono de reloj
- ✅ Responsive (se adapta a móviles)
- ✅ Incluye versión de texto plano como fallback
- ✅ Logo de Geo Propiedades Ecuador
- ✅ Footer con información de contacto

**Variables del Template:**
```python
{
    'user_name': 'Nombre del usuario',
    'verification_code': '123456',  # Código de 6 dígitos
    'expiry_minutes': 30,  # Tiempo de expiración
}
```

**Asunto:** "Verifica tu correo electrónico - Geo Propiedades Ecuador"

**Cuándo se envía:** Al registrarse un nuevo usuario

---

### 2. Email de Bienvenida
**Archivo:** `backend/real_estate/templates/emails/welcome_email.html`

**Características:**
- ✅ Diseño celebratorio con badge de verificación exitosa
- ✅ Lista de características principales de la plataforma con iconos
- ✅ Botón CTA para iniciar sesión
- ✅ Tips útiles para aprovechar la cuenta
- ✅ Diseño responsive y atractivo
- ✅ Incluye versión de texto plano como fallback

**Variables del Template:**
```python
{
    'user_name': 'Nombre del usuario',
    'frontend_url': 'https://tudominio.com',  # URL del frontend
}
```

**Asunto:** "¡Bienvenido a Geo Propiedades Ecuador!"

**Cuándo se envía:** Después de verificar exitosamente el correo electrónico (automático tras verificación)

---

### 3. Email de Recuperación de Contraseña
**Archivo:** `backend/real_estate/templates/emails/password_reset_email.html`

**Características:**
- ✅ Botón grande y llamativo para resetear contraseña
- ✅ Link alternativo por si el botón no funciona
- ✅ Advertencia de expiración (24 horas)
- ✅ Consejos de seguridad para crear contraseñas
- ✅ Mensaje de seguridad si no solicitó el cambio
- ✅ Diseño responsive
- ✅ Incluye versión de texto plano como fallback

**Variables del Template:**
```python
{
    'user_name': 'Nombre del usuario',
    'reset_link': 'http://localhost:5173/reset-password?token=...',
    'expiry_hours': 24,  # Tiempo de expiración
}
```

**Asunto:** "Recupera tu contraseña - Geo Propiedades Ecuador"

**Cuándo se envía:** Cuando el usuario solicita restablecer su contraseña

---

### 4. Email de Verificación de Cambio de Correo
**Archivo:** `backend/real_estate/templates/emails/email_change_verification.html`

**Características:**
- ✅ Muestra claramente el nuevo correo a verificar
- ✅ Código de verificación de 6 dígitos
- ✅ Advertencia de seguridad prominente
- ✅ Muestra tanto el email antiguo como el nuevo
- ✅ Diseño responsive
- ✅ Incluye versión de texto plano como fallback

**Variables del Template:**
```python
{
    'user_name': 'Nombre del usuario',
    'new_email': 'nuevo@email.com',  # Nuevo correo a verificar
    'old_email': 'antiguo@email.com',  # Correo actual
    'verification_code': '123456',  # Código de 6 dígitos
    'expiry_minutes': 30,  # Tiempo de expiración
}
```

**Asunto:** "Verifica tu nuevo correo - Geo Propiedades Ecuador"

**Cuándo se envía:** Al **nuevo correo** cuando el usuario solicita cambiar su email

---

### 5. Email de Notificación de Cambio Completado
**Archivo:** `backend/real_estate/templates/emails/email_changed_notification.html`

**Características:**
- ✅ Badge de éxito verde
- ✅ Tabla comparativa mostrando email antiguo (tachado) vs nuevo
- ✅ Fecha y hora del cambio
- ✅ Advertencia de seguridad prominente
- ✅ Botón para contactar soporte
- ✅ Diseño profesional y responsive
- ✅ Incluye versión de texto plano como fallback

**Variables del Template:**
```python
{
    'user_name': 'Nombre del usuario',
    'old_email': 'antiguo@email.com',  # Correo anterior
    'new_email': 'nuevo@email.com',  # Correo nuevo
    'change_date': '20/11/2025 a las 14:30',  # Fecha formateada del cambio
}
```

**Asunto:** "Tu correo ha sido cambiado - Geo Propiedades Ecuador"

**Cuándo se envía:** Al **correo antiguo** como notificación de seguridad después de completar el cambio de email

---

## 🎨 Diseño y Branding

### Paleta de Colores
```css
/* Colores Principales */
--primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--primary-color: #667eea;
--secondary-color: #764ba2;

/* Colores de Fondo */
--background-main: #f4f7fa;
--background-white: #ffffff;
--background-light: #f8f9fa;

/* Colores de Texto */
--text-dark: #333333;
--text-gray: #666666;
--text-muted: #6c757d;

/* Colores de Alerta */
--warning-bg: #fff3cd;
--warning-border: #ffc107;
--warning-text: #856404;

--info-bg: #e7f3ff;
--info-border: #2196F3;
--info-text: #1565C0;

--danger-text: #dc3545;
```

### Tipografía
- **Familia:** 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Código:** 'Courier New', monospace
- **Tamaños:**
  - Título H1: 28px (móvil: 24px)
  - Saludo: 18px
  - Mensaje: 16px
  - Código de verificación: 42px (móvil: 36px)
  - Footer: 14px

### Elementos Visuales
- **Logo:** 60x60px, fondo blanco, border-radius 12px
- **Botones:** Border-radius 8px, padding 16px 40px
- **Containers:** Max-width 600px, border-radius 12px
- **Sombras:** box-shadow con rgba(102, 126, 234, 0.3)

---

## 📱 Responsive Design

Los templates incluyen media queries para dispositivos móviles:

```css
@media only screen and (max-width: 600px) {
    .content {
        padding: 30px 20px;  /* Menos padding en móviles */
    }
    .code {
        font-size: 36px;  /* Código más pequeño */
        letter-spacing: 6px;
    }
    .header h1 {
        font-size: 24px;  /* Título más pequeño */
    }
}
```

---

## 🔧 Configuración y Uso

### Configuración en settings.py

```python
# En desarrollo (imprime en consola)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# En producción (SMTP real)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'tu-email@gmail.com'
EMAIL_HOST_PASSWORD = 'tu-contraseña-de-aplicación'
DEFAULT_FROM_EMAIL = 'noreply@geopropiedadesecuador.com'

# URL del frontend para links
FRONTEND_URL = 'https://tudominio.com'
```

### Uso en el Código

```python
from .email_utils import (
    send_verification_email,
    send_welcome_email,
    send_password_reset_email,
    send_email_change_verification,
    send_email_changed_notification,
    create_verification_token,
    create_password_reset_token,
)

# 1. Enviar email de verificación al registrarse
user = User.objects.get(email='user@example.com')
token = create_verification_token(user)
send_verification_email(user, token.code)

# 2. Enviar email de bienvenida (automático tras verificación)
# Este email se envía automáticamente en views.py después de verificar
# Pero también puedes enviarlo manualmente:
send_welcome_email(user)

# 3. Enviar email de reset de contraseña
token = create_password_reset_token(user)
send_password_reset_email(user, token.token)

# 4. Cambio de email - Enviar verificación al nuevo correo
new_email = 'nuevo@email.com'
token = create_verification_token(user)  # Crear token
send_email_change_verification(user, new_email, token.code)

# 5. Cambio de email - Notificar al correo antiguo
old_email = user.email
user.email = new_email
user.save()
send_email_changed_notification(user, old_email, new_email)
```

---

## 🧪 Pruebas

### Ver Emails en Desarrollo

Los emails se imprimen en la consola del backend:

```bash
# Ver logs en tiempo real
docker-compose logs -f backend

# Ver últimos 200 logs
docker-compose logs backend 2>&1 | tail -200
```

### Probar Email de Verificación

```bash
# 1. Registrar usuario
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "password": "TestPass123!"
  }'

# 2. Ver código en logs
docker-compose logs backend | grep "código de verificación"
```

### Probar Email de Reset

```bash
# 1. Solicitar reset
curl -X POST http://localhost:8000/api/request-password-reset/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# 2. Ver link en logs
docker-compose logs backend 2>&1 | tail -200 | grep "reset-password"
```

### Probar Email de Bienvenida

```bash
# El email de bienvenida se envía automáticamente al verificar el correo
# 1. Registrar usuario
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "password": "TestPass123!"
  }'

# 2. Obtener código de verificación de los logs
docker-compose logs backend | grep "código de verificación"

# 3. Verificar email (esto enviará automáticamente el email de bienvenida)
curl -X POST http://localhost:8000/api/verify-email/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'

# 4. Ver email de bienvenida en logs
docker-compose logs backend 2>&1 | tail -200 | grep "Bienvenido"
```

### Probar Emails de Cambio de Correo

```bash
# Nota: Primero necesitas implementar los endpoints de cambio de email
# Estos son ejemplos de cómo usarlos una vez implementados:

# 1. Solicitar cambio de email (requiere autenticación)
curl -X POST http://localhost:8000/api/change-email/request/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "new_email": "nuevo@example.com"
  }'

# 2. Ver código de verificación en logs (enviado al nuevo email)
docker-compose logs backend | grep "Verifica tu nuevo correo"

# 3. Confirmar cambio de email con código
curl -X POST http://localhost:8000/api/change-email/verify/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "code": "123456"
  }'

# 4. Ver notificación enviada al email antiguo
docker-compose logs backend 2>&1 | tail -200 | grep "Tu correo ha sido cambiado"
```

---

## ✉️ Compatibilidad con Clientes de Email

Los templates están optimizados para:

### ✅ Totalmente Compatible
- Gmail (web, iOS, Android)
- Apple Mail (macOS, iOS)
- Outlook.com / Outlook 365
- Yahoo Mail
- ProtonMail
- Thunderbird

### ⚠️ Compatible con Limitaciones
- **Outlook Desktop 2016-2021:** No soporta CSS avanzado, se muestra versión básica
- **Lotus Notes:** Soporte limitado de CSS

### Características Técnicas
- ✅ Tablas HTML en lugar de div/flexbox
- ✅ Estilos inline y en `<style>`
- ✅ Fallback de texto plano
- ✅ Imágenes con alt text
- ✅ Media queries para responsive

---

## 🎯 Mejores Prácticas

### 1. Testing
- Probar en múltiples clientes de email
- Verificar versión móvil
- Comprobar enlaces (deben ser absolutos)
- Verificar que el texto plano sea legible

### 2. Rendimiento
- Mantener HTML por debajo de 100KB
- Optimizar SVG en lugar de imágenes pesadas
- No usar JavaScript (no funciona en emails)

### 3. Accesibilidad
- Usar texto alt en imágenes/iconos
- Suficiente contraste de colores
- Tamaños de fuente legibles (mínimo 14px)
- Enlaces descriptivos

### 4. Deliverability
- Evitar palabras spam ("gratis", "ganaste", etc.)
- Ratio apropiado de texto vs imágenes
- Incluir versión de texto plano
- Link de unsubscribe visible (si aplica)

---

## 🔄 Personalización

### Cambiar Colores

Editar las variables CSS en cada template:

```css
/* En verification_email.html y password_reset_email.html */
background: linear-gradient(135deg, #TU_COLOR_1 0%, #TU_COLOR_2 100%);
```

### Cambiar Logo

Reemplazar el SVG en ambos templates:

```html
<div class="logo">
    <svg viewBox="0 0 24 24">
        <!-- Tu logo SVG aquí -->
    </svg>
</div>
```

O usar una imagen:

```html
<div class="logo">
    <img src="https://tudominio.com/logo.png" alt="Logo" width="40" height="40">
</div>
```

### Agregar Redes Sociales

Los templates ya incluyen placeholders para redes sociales:

```html
<div class="social-links">
    <a href="https://facebook.com/tupagina" class="social-link">f</a>
    <a href="https://instagram.com/tupagina" class="social-link">📷</a>
    <a href="https://linkedin.com/company/tuempresa" class="social-link">in</a>
</div>
```

---

## 📊 Métricas Recomendadas

### Tracking de Emails
Para implementar tracking (opcional):

```python
# Agregar parámetros UTM a los links
reset_link = f"{frontend_url}/reset-password?token={token}&utm_source=email&utm_medium=password_reset"
```

### Métricas a Monitorear
- Tasa de apertura (open rate)
- Tasa de clicks (CTR)
- Tasa de conversión (verificación/reset exitoso)
- Tiempo de respuesta del usuario
- Tasa de rebote (bounce rate)

---

## 🆘 Troubleshooting

### El email no se ve bien en Outlook Desktop
- **Solución:** Outlook Desktop usa Word para renderizar HTML. Los gradientes y CSS avanzado no funcionan. El template ya incluye fallbacks seguros.

### Los iconos SVG no se muestran
- **Solución:** Algunos clientes bloquean SVG. Considera usar imágenes PNG/JPG como alternativa.

### El botón no es clickeable
- **Solución:** Verifica que el `href` en el `<a>` tag sea una URL absoluta completa.

### El email va a spam
- **Solución:**
  - Verificar configuración SPF/DKIM del dominio
  - Evitar palabras spam
  - No usar acortadores de URL
  - Mantener ratio texto/imagen balanceado

---

## 📝 Archivos del Sistema

```
backend/
├── real_estate/
│   ├── templates/
│   │   └── emails/
│   │       ├── verification_email.html              # Verificación al registrarse
│   │       ├── welcome_email.html                   # Bienvenida tras verificación
│   │       ├── password_reset_email.html            # Reset de contraseña
│   │       ├── email_change_verification.html       # Verificar nuevo email
│   │       └── email_changed_notification.html      # Notificación al email antiguo
│   ├── email_utils.py                              # Funciones de envío de emails
│   └── views.py                                    # Vistas con integración de emails
└── estate_map/
    └── settings.py                                 # Configuración de email
```

### Funciones Disponibles en email_utils.py

```python
# Generadores de códigos/tokens
generate_verification_code()      # Genera código de 6 dígitos
generate_reset_token()           # Genera token seguro de 64 caracteres

# Funciones de envío de emails
send_verification_email(user, code)                          # Email 1: Verificación
send_welcome_email(user)                                     # Email 2: Bienvenida
send_password_reset_email(user, token)                       # Email 3: Reset password
send_email_change_verification(user, new_email, code)        # Email 4: Verificar cambio
send_email_changed_notification(user, old_email, new_email)  # Email 5: Notificación

# Creadores de tokens
create_verification_token(user)      # Crea EmailVerificationToken
create_password_reset_token(user)    # Crea PasswordResetToken
```

---

## 🔐 Seguridad

### No Incluir en los Emails
- ❌ Contraseñas en texto plano
- ❌ Información sensible sin cifrar
- ❌ Links a páginas de terceros no verificadas

### Sí Incluir
- ✅ Links solo a tu dominio
- ✅ Advertencias de expiración
- ✅ Mensaje si no solicitó la acción
- ✅ Información de contacto legítima

---

## 📊 Resumen del Sistema de Emails

El sistema cuenta con **5 templates de email** completamente funcionales:

1. ✅ **Verificación de Registro** - Código de 6 dígitos al registrarse
2. ✅ **Bienvenida** - Email celebratorio tras verificación exitosa (automático)
3. ✅ **Recuperación de Contraseña** - Link seguro para reset
4. ✅ **Verificación de Cambio de Email** - Código al nuevo correo
5. ✅ **Notificación de Cambio Completado** - Alerta de seguridad al email antiguo

Todos los templates incluyen:
- ✅ Diseño responsive (móvil y desktop)
- ✅ Versión HTML y texto plano
- ✅ Branding consistente con Geo Propiedades Ecuador
- ✅ Advertencias de seguridad apropiadas
- ✅ Expiración de códigos/tokens
- ✅ Compatibilidad con clientes de email principales

---

**Última actualización:** 2025-11-20
**Versión:** 2.0.0
**Mantenido por:** Equipo de Desarrollo Geo Propiedades Ecuador
