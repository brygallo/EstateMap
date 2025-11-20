# Guía de Autenticación - EstateMap

Sistema completo de autenticación con verificación de email y recuperación de contraseña.

## 🚀 Funcionalidades Implementadas

### 1. Registro con Verificación de Email
- Al registrarse, el usuario recibe un código de 6 dígitos por correo
- El usuario permanece **inactivo** hasta verificar su email
- No puede iniciar sesión sin verificar el correo
- Los códigos expiran en **30 minutos**

### 2. Verificación de Email
- Pantalla dedicada para ingresar el código de 6 dígitos
- Opción para reenviar el código si expira o se pierde
- Validación en tiempo real del formato del código
- Redirección automática al login una vez verificado

### 3. Recuperación de Contraseña
- Solicitud de recuperación mediante email
- Envío de link con token único por correo
- Los tokens expiran en **24 horas**
- Validación de la nueva contraseña según reglas de Django

### 4. Reset de Contraseña
- Pantalla dedicada con token en URL
- Validación de que las contraseñas coincidan
- Requisitos de seguridad mostrados claramente
- Redirección automática al login una vez actualizada

## 📱 Flujos de Usuario

### Flujo de Registro
```
1. Usuario completa formulario de registro
2. Sistema crea cuenta inactiva
3. Sistema envía código de 6 dígitos por email
4. Usuario es redirigido a pantalla de verificación
5. Usuario ingresa código
6. Sistema activa la cuenta
7. Usuario puede iniciar sesión
```

### Flujo de Recuperación de Contraseña
```
1. Usuario hace clic en "¿Olvidaste tu contraseña?" en login
2. Ingresa su email
3. Sistema envía link con token por correo
4. Usuario hace clic en el link
5. Ingresa nueva contraseña
6. Sistema actualiza la contraseña
7. Usuario puede iniciar sesión con la nueva contraseña
```

## 🔧 Endpoints del API

### Autenticación
- `POST /api/register/` - Registro de nuevo usuario
- `POST /api/login/` - Inicio de sesión

### Verificación de Email
- `POST /api/verify-email/` - Verificar código
- `POST /api/resend-verification/` - Reenviar código

### Recuperación de Contraseña
- `POST /api/request-password-reset/` - Solicitar reset
- `POST /api/reset-password/` - Resetear contraseña

## 🌐 Rutas del Frontend

### Páginas Públicas
- `/login` - Inicio de sesión
- `/register` - Registro
- `/verify-email` - Verificación de email
- `/forgot-password` - Solicitar recuperación
- `/reset-password` - Resetear contraseña

### Páginas Protegidas
- `/add-property` - Agregar propiedad
- `/my-properties` - Mis propiedades
- `/edit-property/:id` - Editar propiedad

## 🎨 Componentes del Frontend

### Nuevos Componentes
1. **VerifyEmail.jsx** - Verificación de código de email
   - Acepta email desde URL query param
   - Input especial para código de 6 dígitos
   - Botón para reenviar código

2. **ForgotPassword.jsx** - Solicitud de recuperación
   - Formulario simple con email
   - Mensaje de confirmación al enviar
   - Redirección a login

3. **ResetPassword.jsx** - Reset de contraseña
   - Obtiene token desde URL query param
   - Validación de token
   - Dos campos de contraseña (nueva y confirmación)
   - Muestra requisitos de seguridad

### Componentes Modificados
1. **Register.jsx** - Actualizado para redirigir a verificación
2. **Login.jsx** - Agregado enlace a recuperación de contraseña
3. **App.jsx** - Agregadas nuevas rutas

## 💾 Modelos del Backend

### User (actualizado)
```python
- email: EmailField (único)
- is_email_verified: BooleanField (nuevo)
- is_active: BooleanField (False por defecto hasta verificar)
```

### EmailVerificationToken (nuevo)
```python
- user: ForeignKey
- code: CharField (6 dígitos)
- created_at: DateTimeField
- expires_at: DateTimeField
- is_used: BooleanField
```

### PasswordResetToken (nuevo)
```python
- user: ForeignKey
- token: CharField (64 caracteres)
- created_at: DateTimeField
- expires_at: DateTimeField
- is_used: BooleanField
```

## 📧 Configuración de Email

### Desarrollo (actual)
Los emails se imprimen en la consola del backend:
```bash
docker-compose logs backend
```

### Producción
Configurar variables de entorno en `.env`:

```bash
# Backend de email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

# Configuración SMTP (ejemplo con Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-contraseña-de-aplicación
DEFAULT_FROM_EMAIL=noreply@tudominio.com

# URL del frontend (para links de reset)
FRONTEND_URL=https://tudominio.com
```

### Gmail - Configuración
1. Activa verificación en 2 pasos en tu cuenta de Google
2. Ve a: https://myaccount.google.com/apppasswords
3. Genera una "Contraseña de aplicación"
4. Usa esa contraseña en `EMAIL_HOST_PASSWORD`

### Otros Proveedores SMTP
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **Amazon SES**: `email-smtp.region.amazonaws.com:587`
- **Office 365**: `smtp.office365.com:587`

## 🧪 Pruebas

### Prueba de Registro y Verificación
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

# 3. Verificar email
curl -X POST http://localhost:8000/api/verify-email/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'

# 4. Login
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### Prueba de Recuperación de Contraseña
```bash
# 1. Solicitar reset
curl -X POST http://localhost:8000/api/request-password-reset/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# 2. Ver token en logs
docker-compose logs backend | grep "reset-password?token"

# 3. Resetear contraseña
curl -X POST http://localhost:8000/api/reset-password/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": "el-token-del-email",
    "new_password": "NewPass123!"
  }'

# 4. Login con nueva contraseña
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "NewPass123!"
  }'
```

## 🔒 Seguridad

### Medidas Implementadas
- ✅ Tokens de verificación de un solo uso
- ✅ Expiración automática de tokens
- ✅ Códigos aleatorios de 6 dígitos
- ✅ Tokens de reset largos y seguros (64 caracteres)
- ✅ Invalidación de tokens previos al crear nuevos
- ✅ Usuarios inactivos hasta verificar email
- ✅ No revelar si el email existe o no (en reset)
- ✅ Validación de contraseñas según estándares Django

### Configuraciones de Seguridad
```python
# En settings.py
EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES = 30
PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 24

# Validadores de contraseña
AUTH_PASSWORD_VALIDATORS = [
    'UserAttributeSimilarityValidator',
    'MinimumLengthValidator',
    'CommonPasswordValidator',
    'NumericPasswordValidator',
]
```

## 📝 Notas Importantes

1. **Desarrollo vs Producción**
   - Desarrollo: Emails en consola
   - Producción: Configurar SMTP real

2. **Limpieza de Tokens**
   - Crear un cron job para limpiar tokens expirados
   - Ejemplo: Ejecutar semanalmente
   ```bash
   docker-compose exec backend python manage.py shell -c "
   from real_estate.models import EmailVerificationToken, PasswordResetToken
   from django.utils import timezone
   EmailVerificationToken.objects.filter(expires_at__lt=timezone.now()).delete()
   PasswordResetToken.objects.filter(expires_at__lt=timezone.now()).delete()
   "
   ```

3. **Migraciones**
   - Las migraciones ya están aplicadas
   - Si hay problemas: `docker-compose exec backend python manage.py migrate`

4. **Frontend**
   - El frontend se actualiza automáticamente con HMR
   - Si hay problemas: `docker-compose restart frontend`

## 🐛 Troubleshooting

### El email no llega
- **Desarrollo**: Verificar logs con `docker-compose logs backend`
- **Producción**: Verificar configuración SMTP y credenciales

### Error "Usuario no activo"
- El usuario debe verificar su email primero
- Reenviar código de verificación desde `/verify-email`

### Token expirado
- Solicitar un nuevo código/token
- Verificar configuración de expiración en settings.py

### Error de CORS
- Verificar `CORS_ALLOW_ALL_ORIGINS = True` en settings.py
- O configurar `CORS_ALLOWED_ORIGINS` específicamente

## 📞 Soporte

Para problemas o preguntas:
1. Revisar esta guía completa
2. Verificar logs: `docker-compose logs`
3. Verificar migraciones: `docker-compose exec backend python manage.py showmigrations`

---

**Última actualización**: 2025-11-20
**Versión**: 1.0.0
