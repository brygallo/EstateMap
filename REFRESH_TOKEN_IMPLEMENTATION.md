# Sistema de Refresh Token Implementado ✅

## 📋 Resumen

Se ha implementado un sistema completo de **refresh token automático** que permite sesiones largas y seguras sin que el usuario tenga que volver a iniciar sesión constantemente.

## 🔧 Cambios Realizados

### Backend (Django)

#### 1. Configuración de JWT (`backend/estate_map/settings.py`)

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),      # Token de acceso: 1 hora
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),     # Token de refresh: 30 días
    'ROTATE_REFRESH_TOKENS': True,                    # Rota el refresh token cada vez que se usa
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_TYPE_CLAIM': 'token_type',
}
```

#### 2. Endpoint de Refresh Token (`backend/real_estate/urls.py`)

Se agregó el endpoint:
```python
path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
```

**Uso:**
```bash
POST /api/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbG..."
}

# Respuesta:
{
  "access": "nuevo_access_token...",
  "refresh": "nuevo_refresh_token..."  # Si ROTATE_REFRESH_TOKENS está habilitado
}
```

### Frontend (Next.js)

#### 1. AuthContext Mejorado (`frontend/lib/auth-context.tsx`)

**Nuevas funcionalidades:**
- ✅ Guarda tanto `access token` como `refresh token`
- ✅ Auto-renovación programada cada 55 minutos (5 min antes de expirar)
- ✅ Respeta la opción "Recordar sesión":
  - **CON checkbox**: tokens en `localStorage` (persisten 30 días)
  - **SIN checkbox**: tokens en `sessionStorage` (se borran al cerrar navegador)

**Cambios en la función `login`:**
```typescript
// Antes:
login(accessToken: string, remember: boolean)

// Ahora:
login(accessToken: string, refreshToken: string, remember: boolean)
```

#### 2. Nuevo Cliente API (`frontend/lib/api.ts`) ⭐

Cliente inteligente con auto-renovación de tokens:

**Funcionalidades:**
- ✅ Detecta si el token está por expirar (< 5 min) y lo renueva automáticamente
- ✅ Si una petición falla con 401, intenta renovar el token y reintenta la petición
- ✅ Si el refresh token expira, cierra sesión automáticamente y redirige al login
- ✅ Decodifica JWT para verificar tiempo de expiración

**Métodos disponibles:**
```typescript
import { apiFetch, apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';

// GET
const response = await apiGet('/properties/');
const properties = await response.json();

// POST
const response = await apiPost('/properties/', { name: 'Mi propiedad' });

// PUT
const response = await apiPut('/properties/123/', { name: 'Nuevo nombre' });

// PATCH
const response = await apiPatch('/properties/123/', { price: 50000 });

// DELETE
const response = await apiDelete('/properties/123/');

// Custom con FormData
const formData = new FormData();
formData.append('file', file);
const response = await apiFetch('/upload/', {
  method: 'POST',
  body: formData,
});

// Peticiones públicas (sin autenticación)
const response = await apiFetch('/public-endpoint/', { skipAuth: true });
```

#### 3. Páginas Actualizadas

Se actualizaron las siguientes páginas para usar el nuevo cliente API:

1. **`frontend/app/page.tsx`** - Mapa principal (GET propiedades)
2. **`frontend/app/my-properties/page.tsx`** - Mis propiedades (GET y DELETE)
3. **`frontend/app/add-property/page.tsx`** - Agregar propiedad (POST con FormData)
4. **`frontend/app/(auth)/login/page.tsx`** - Login (ahora recibe refresh token)

## 🔐 Flujo de Funcionamiento

### 1. Inicio de Sesión

```
Usuario → Login
    ↓
Backend devuelve:
    - access token (expira en 1 hora)
    - refresh token (expira en 30 días)
    ↓
Frontend guarda ambos tokens en:
    - localStorage (si "recordar sesión" está marcado)
    - sessionStorage (si no está marcado)
    ↓
Se programa renovación automática en 55 minutos
```

### 2. Mientras el Usuario Usa la App

```
Cada 55 minutos:
    ↓
Frontend llama a /api/token/refresh/
    ↓
Backend devuelve nuevo access token (y posiblemente nuevo refresh token)
    ↓
Frontend guarda los nuevos tokens
    ↓
Se programa nueva renovación en 55 minutos
```

### 3. Al Hacer una Petición API

```
Frontend verifica: ¿El token expira en < 5 min?
    ↓ SÍ
Renueva el token antes de hacer la petición
    ↓
Hace la petición con el token renovado
    ↓
Si respuesta = 401:
    ↓
Intenta renovar el token
    ↓
Reintenta la petición
```

### 4. Si el Refresh Token Expira (después de 30 días)

```
Backend responde con 401 al intentar renovar
    ↓
Frontend limpia todos los tokens
    ↓
Redirige al usuario a /login
```

## 📊 Tiempos de Expiración

| Token | Duración | Uso |
|-------|----------|-----|
| **Access Token** | 1 hora | Autenticación en cada petición API |
| **Refresh Token** | 30 días | Renovar el access token |
| **Auto-renovación** | Cada 55 min | Renovación automática del access token |

## ✅ Ventajas del Sistema

1. **Sesiones largas**: El usuario puede estar hasta 30 días sin volver a iniciar sesión
2. **Seguridad**: El access token expira cada hora, limitando el riesgo si es interceptado
3. **Transparente**: El usuario no nota las renovaciones automáticas
4. **Flexible**: Respeta la opción "Recordar sesión"
5. **Automático**: No requiere intervención del usuario ni del desarrollador en peticiones normales

## 🧪 Cómo Probar

### 1. Iniciar Sesión

1. Ir a http://localhost:3000/login
2. Marcar/desmarcar "Recordar sesión"
3. Iniciar sesión

### 2. Verificar Tokens en el Navegador

```javascript
// Abrir DevTools (F12) → Console
console.log('Access Token:', localStorage.getItem('token') || sessionStorage.getItem('token'));
console.log('Refresh Token:', localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken'));
```

### 3. Verificar Auto-renovación

1. Abrir DevTools → Network
2. Esperar 55 minutos (o modificar temporalmente `refreshTime` en `auth-context.tsx` a 1 minuto para pruebas)
3. Observar petición automática a `/api/token/refresh/`

### 4. Verificar Renovación en Peticiones

1. Modificar manualmente el access token para que expire pronto
2. Hacer una petición (ej: ver propiedades)
3. En DevTools → Network, ver que se llama primero a `/token/refresh/` y luego a la petición original

## 🔍 Debugging

### Ver logs de renovación de tokens

En `frontend/lib/api.ts` ya hay logs de consola:
```javascript
console.error('Error al renovar token:', error);
```

### Verificar configuración del backend

```bash
docker-compose exec backend python manage.py shell

>>> from django.conf import settings
>>> print(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'])
>>> print(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'])
```

### Probar endpoint de refresh manualmente

```bash
# 1. Obtener tokens con login
TOKEN=$(curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tupassword"}' \
  -s | python3 -c "import sys, json; print(json.load(sys.stdin)['refresh'])")

# 2. Renovar token
curl -X POST http://localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d "{\"refresh\":\"$TOKEN\"}" \
  -s | python3 -m json.tool
```

## 📝 Notas Importantes

1. **No modificar tokens manualmente**: El sistema los gestiona automáticamente
2. **No hacer logout desde la consola**: Usar el botón de logout en la UI
3. **Tiempo de rotación de refresh tokens**: Si `ROTATE_REFRESH_TOKENS = True`, el refresh token cambia cada vez que se usa
4. **Compatibilidad**: El sistema es compatible con todos los navegadores modernos

## 🚀 Próximos Pasos (Opcional)

- [ ] Implementar blacklist de tokens (para invalidar tokens al hacer logout)
- [ ] Agregar notificación al usuario cuando la sesión está por expirar
- [ ] Implementar refresh token manual con un botón
- [ ] Agregar telemetría de renovaciones de tokens

---

**Implementado el:** 2025-01-24
**Versión:** 1.0
**Estado:** ✅ Funcionando
