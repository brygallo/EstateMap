# 🔐 Google OAuth - Configuración Completa

## 🚀 Pasos Rápidos (5 minutos)

### 1. Obtener Credenciales de Google

1. Ve a https://console.cloud.google.com/apis/credentials
2. Crea un proyecto nuevo (si no tienes)
3. APIs & Services → **Library** → Busca "Google+ API" → **Enable**
4. APIs & Services → **OAuth consent screen**:
   - Type: **External**
   - App name: **Geo Propiedades Ecuador**
   - Scopes: `userinfo.email`, `userinfo.profile`, `openid`
5. APIs & Services → **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**:
   - Type: **Web application**
   - Authorized JavaScript origins:
     - Desarrollo: `http://localhost:3010`
     - Producción: `https://tu-dominio.com`
   - Authorized redirect URIs:
     - Desarrollo: `http://localhost:3010`
     - Producción: `https://tu-dominio.com`
6. Copia **Client ID** y **Client Secret**

---

### 2. Configurar Variables

#### Desarrollo - Edita `.env`:
```bash
GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
```

#### Producción - Edita `.env.prod`:
```bash
GOOGLE_CLIENT_ID=1234567890-xyz789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz789def456
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-xyz789.apps.googleusercontent.com
```

**⚠️ IMPORTANTE**: `GOOGLE_CLIENT_ID` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID` deben ser **iguales**

---

### 3. Aplicar Cambios

#### Desarrollo:
```bash
docker-compose down
docker-compose build backend
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

#### Producción:
```bash
./scripts/deploy.sh
```

---

### 4. Probar

- Desarrollo: http://localhost:3010/login
- Producción: https://tu-dominio.com/login
- Debe aparecer el botón **"Continuar con Google"**

---

## 📋 Las 3 Variables Necesarias

| Variable | Dónde | Valor |
|----------|-------|-------|
| `GOOGLE_CLIENT_ID` | Backend | Client ID de Google Console |
| `GOOGLE_CLIENT_SECRET` | Backend | Client Secret de Google Console |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Frontend | **Mismo** Client ID |

---

## 🔍 Cómo Obtener Client Secret

Si solo tienes el Client ID:

1. Ve a https://console.cloud.google.com/apis/credentials
2. Haz clic en tu credencial OAuth (ej: "Web client 1")
3. Verás:
   ```
   Client ID: 1234567890-abc.apps.googleusercontent.com
   Client secret: GOCSPX-abc123 [Copy] [Show]
   ```
4. Si no lo ves, haz clic en **"Reset Secret"**

---

## ✅ Características Implementadas

- ✅ Login con Google
- ✅ Registro con Google
- ✅ Vinculación automática de cuentas por email
- ✅ Email verificado automáticamente
- ✅ Avatar desde Google
- ✅ JWT tokens unificados

---

## 🐛 Solución de Problemas

### Botón no aparece:
```bash
# Verificar variable en contenedor
docker-compose exec frontend env | grep NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Si no aparece, reconstruir:
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### Error "Token inválido":
- Verifica que `GOOGLE_CLIENT_ID` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID` sean iguales
- Verifica que el Client ID sea el correcto de Google Console

### Error 400: redirect_uri_mismatch:
- Agrega tu URL exacta a "Authorized redirect URIs" en Google Console
- Para desarrollo: `http://localhost:3010`
- Para producción: `https://tu-dominio.com` (requiere HTTPS)

---

## 📁 Archivos Modificados

### Backend:
- ✅ `requirements.txt` - Dependencias agregadas
- ✅ `estate_map/settings.py` - Configuración OAuth
- ✅ `real_estate/models.py` - Campos OAuth en User
- ✅ `real_estate/adapters.py` - Adaptador OAuth (nuevo)
- ✅ `real_estate/views.py` - Vista GoogleLoginView (nueva)
- ✅ `real_estate/urls.py` - Ruta `/api/auth/google/`
- ✅ `real_estate/migrations/0010_user_oauth_fields.py` - Migración (nueva)

### Frontend:
- ✅ `app/layout.tsx` - Script de Google SDK
- ✅ `components/GoogleSignInButton.tsx` - Componente botón (nuevo)
- ✅ `app/(auth)/login/page.tsx` - Botón agregado
- ✅ `app/(auth)/register/page.tsx` - Botón agregado

### Docker:
- ✅ `docker-compose.prod.yml` - Variables agregadas
- ✅ `frontend/Dockerfile.prod` - ARGs agregados

### Config:
- ✅ `.env.example` - Plantilla actualizada
- ✅ `.env.prod.example` - Plantilla actualizada
- ✅ `scripts/deploy.sh` - Verificación agregada

---

## 🔄 Flujo de Variables

### Backend:
```
.env.prod → docker-compose.prod.yml (env_file) → settings.py → views.py
```

### Frontend:
```
.env.prod → docker-compose.prod.yml (build args) → Dockerfile.prod → GoogleSignInButton.tsx
```

---

## 📞 API Endpoint

**POST /api/auth/google/**

Request:
```json
{
  "token": "google-id-token"
}
```

Response:
```json
{
  "access": "jwt-access-token",
  "refresh": "jwt-refresh-token",
  "user": {
    "id": 123,
    "username": "usuario",
    "email": "usuario@gmail.com",
    "first_name": "Juan",
    "last_name": "Pérez",
    "avatar_url": "https://lh3.googleusercontent.com/..."
  }
}
```

---

## ✅ Checklist Final

**Antes de desplegar:**
- [ ] Client ID obtenido de Google Console
- [ ] Client Secret obtenido de Google Console
- [ ] Variables agregadas a `.env` o `.env.prod`
- [ ] URLs configuradas en Google Console
- [ ] HTTPS configurado (solo producción)

**Después de desplegar:**
- [ ] Botón de Google aparece en /login
- [ ] Login con Google funciona
- [ ] Registro con Google funciona
- [ ] Usuarios se crean correctamente
- [ ] Avatar de Google se muestra

---

**¡Listo!** Ahora tienes Google OAuth completamente integrado.
