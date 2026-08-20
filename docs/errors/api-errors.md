# Catálogo de errores de la API

Verificado contra el código el 2026-08-04.

Este documento describe **qué devuelve el backend cuando algo falla**, con la forma
exacta del cuerpo, y cómo se diagnostica una incidencia en producción. Todo lo que
aparece aquí está tomado de código presente en el repositorio; cuando un mensaje lo
genera una librería externa (DRF, SimpleJWT, Django, nginx) se indica explícitamente,
porque esas cadenas no viven en este repo y pueden cambiar al actualizar la dependencia.

---

## 1. Cómo se construye una respuesta de error

### 1.1 Cadena de middleware

`backend/estate_map/settings.py:49-61` declara, en orden:

```
django.middleware.security.SecurityMiddleware
estate_map.upload_errors.UploadErrorMiddleware
estate_map.observability.ObservabilityMiddleware
django.contrib.sessions.middleware.SessionMiddleware
corsheaders.middleware.CorsMiddleware
django.middleware.common.CommonMiddleware
django.middleware.csrf.CsrfViewMiddleware
django.contrib.auth.middleware.AuthenticationMiddleware
django.contrib.messages.middleware.MessageMiddleware
django.middleware.clickjacking.XFrameOptionsMiddleware
allauth.account.middleware.AccountMiddleware
```

No hay `EXCEPTION_HANDLER` personalizado: el bloque `REST_FRAMEWORK`
(`backend/estate_map/settings.py:162-184`) solo define autenticación y tasas de
throttling, así que **todos los errores de DRF los formatea el manejador por defecto
del framework**, que devuelve el `detail` de la excepción (o el diccionario/lista de
errores de validación) como cuerpo JSON.

### 1.2 Cabeceras de correlación

`ObservabilityMiddleware` (`backend/estate_map/observability.py:51-93`) añade tres
cabeceras a **toda** respuesta que pase por él:

| Cabecera | Origen | Detalle |
|---|---|---|
| `X-Request-ID` | `observability.py:61`, `observability.py:80` | `request.headers.get("X-Request-ID", str(uuid.uuid4()))[:64]`. **Se propaga el valor del cliente si viene en la petición**; si no, se genera un UUID4. Se recorta a 64 caracteres. Como el valor entrante se acepta tal cual, no es una fuente de confianza: sirve para correlacionar, no para autenticar. |
| `X-Response-Time-Ms` | `observability.py:73`, `observability.py:81` | `round((time.monotonic() - started) * 1000, 1)`, como string. |
| `X-Release` | `observability.py:57`, `observability.py:82` | `os.getenv("RELEASE_SHA", "development")`. |

Las tres se exponen al navegador a propósito mediante
`CORS_EXPOSE_HEADERS = ['X-Request-ID', 'X-Response-Time-Ms', 'X-Release']`
(`backend/estate_map/settings.py:229`), precisamente para que el frontend pueda mostrar
la referencia de soporte (ver §8).

### 1.3 Qué se loguea y con qué nivel

El logger es `observability`, con nivel configurable vía `OBSERVABILITY_LOG_LEVEL`
(por defecto `INFO`) y salida a consola con formato `plain`
(`backend/estate_map/settings.py:66-75`). El middleware emite una línea JSON por petición
(`observability.py:83-92`):

```json
{"kind": "http_request", "request_id": "...", "method": "GET", "path": "/api/properties/", "status": 200, "duration_ms": 12.4, "release": "..."}
```

- `logger.info(...)` en el caso normal (`observability.py:92`).
- `logger.warning(...)` con el campo extra `"alert": "slow_endpoint"` cuando
  `duration_ms >= SLOW_ENDPOINT_MS` (variable de entorno, por defecto `1000`;
  `observability.py:56`, `observability.py:88-90`).
- `logger.exception(...)` con `{"kind": "unhandled_error", ...}` si la excepción llega
  hasta el middleware (`observability.py:67-71`), tras lo cual **se vuelve a lanzar**
  (`observability.py:72`).

Además, `django.request` está fijado a nivel `WARNING`
(`backend/estate_map/settings.py:73`).

### 1.4 Agregación de incidencias: `SystemIncident`

`record_incident` (`backend/estate_map/observability.py:17-48`) persiste el fallo. Se
invoca en dos puntos:

1. Excepción que llega al middleware: `observability.py:64-66`, con `exception=exc`.
2. Respuesta con `status_code >= 500` que no venía de una excepción ya registrada:
   `observability.py:74-79` (usa `request._incident_recorded` como guarda para no
   duplicar).

La huella se calcula así (`observability.py:22-26`):

```python
exception_name = type(exception).__name__ if exception else "HTTPError"
path = str(getattr(request, "path", ""))[:500]
method = str(getattr(request, "method", ""))[:10]
raw = f"{method}|{path}|{status_code}|{exception_name}"
fingerprint = hashlib.sha256(raw.encode("utf-8")).hexdigest()
```

Es decir: **una fila por combinación de método + ruta + código + tipo de excepción**.
Si ya existe, no se crea otra: se incrementa `occurrences`, se refresca `last_seen_at`,
se sobrescribe `request_id` con el de la última ocurrencia y se vuelve a poner
`resolved=False` (`observability.py:39-45`). Por eso el `request_id` guardado siempre
apunta a la **última** vez que se vio el error, no a la primera.

El modelo (`backend/real_estate/models.py:273-302`) guarda exclusivamente:
`fingerprint`, `kind` (`"unhandled_error"` si hubo excepción, `"http_error"` si no —
`observability.py:30`), `severity` (`"critical"` si `status_code >= 500`, si no
`"warning"` — `observability.py:31`), `status_code`, `method`, `path`, `message`
(que es solo el **nombre** de la clase de excepción), `request_id`, `occurrences`,
`resolved`, `first_seen_at`, `last_seen_at`.

**Decisión de privacidad deliberada:** el docstring del modelo lo dice literalmente —
`"""Aggregated operational failure without request bodies or credentials."""`
(`models.py:274`) — y el de la función también:
`"""Persist an aggregated failure without query strings, bodies, or headers."""`
(`observability.py:18`). No se almacenan cuerpos de petición, ni cabeceras, ni querystring,
ni cookies, ni tokens, ni el traceback. `path` es `request.path`, que **no incluye la
query string**. La consecuencia práctica es que la tabla de incidencias nunca sirve por sí
sola para reproducir el fallo: hay que cruzarla con los logs por `request_id` (ver §10).

Toda la función está envuelta en `try/except` (`observability.py:46-48`) con el comentario
`# Observability must never turn the original failure into another one.`: si la escritura
falla, se registra `logger.warning("Could not persist operational incident", exc_info=True)`
y el error original sigue su curso.

**Quién lo ve:** `AdminSystemStatusView` (`backend/real_estate/views.py:1706-1806`), con
`permission_classes = [IsAuthenticated, IsAdminUser]` (`views.py:1709`). El `GET` devuelve
como máximo 50 incidencias no resueltas (`views.py:1774-1778`) junto al estado de
componentes; el `POST` marca una como resuelta (`views.py:1808-1819`) y deja rastro de
auditoría `admin_audit action=incident.resolve`. En el frontend lo pinta
`frontend/app/admin/system/page.tsx:162`, que muestra el `request_id` del incidente
(o `sin ID`).

---

## 2. Tabla maestra de errores

| Código | Cuándo ocurre | Cuerpo de respuesta | Origen (`archivo:línea`) | Qué hacer |
|---|---|---|---|---|
| **400** | Validación de serializador (cualquier `is_valid(raise_exception=True)` o `create`/`update` de DRF) | `{"<campo>": ["<mensaje>"], ...}` o `{"detail": "..."}` | Manejador por defecto de DRF (sin `EXCEPTION_HANDLER` propio, `settings.py:162-184`) | Corregir los datos; el frontend muestra el primer mensaje (§8) |
| **400** | Se envían más de `DATA_UPLOAD_MAX_NUMBER_FILES` archivos | `{"detail": "No se pueden enviar más de 10 archivos por solicitud."}` | `estate_map/upload_errors.py:19-23` | Ver la advertencia de §6.2 |
| **400** | Petición multipart malformada (`SuspiciousOperation`) | `{"detail": "La solicitud contiene datos o archivos no válidos."}` | `estate_map/upload_errors.py:24-28` | Ver la advertencia de §6.2 |
| **400** | `delete_image` sin `image_id` | `{"error": "image_id is required"}` | `real_estate/views.py:824-828` | Enviar `image_id` en el cuerpo |
| **400** | Login con Google sin token | `{"error": "Token de Google requerido"}` | `real_estate/views.py:997-1001` | Reintentar el flujo OAuth |
| **400** | Token de Google inválido o correo sin verificar | `{"error": "Token de Google inválido o correo no verificado."}` | `real_estate/views.py:1027-1031` | Reintentar; verificar `GOOGLE_CLIENT_ID` |
| **400** | Código de verificación caducado / inválido | `{"error": "El código ha expirado. Solicita uno nuevo."}` / `{"error": "Código de verificación inválido"}` | `views.py:1151-1155`, `views.py:1181-1185` | Pedir un código nuevo |
| **400** | Reset de contraseña con enlace caducado / token inexistente | `{"error": "El enlace ha expirado. Solicita uno nuevo."}` / `{"error": "Token inválido o expirado"}` | `views.py:1279-1282`, `views.py:1298-1302` | Solicitar otro enlace |
| **400** | Cambio de correo: código caducado / correo ya en uso / código inválido | `{"error": "..."}` (tres textos distintos) | `views.py:1380-1384`, `views.py:1387-1391`, `views.py:1421-1425` | Reintentar el flujo |
| **400** | PATCH admin de usuario con campos no permitidos, o autodesactivación | `{"error": "Solo se permite modificar is_active e is_staff"}`, `{"error": "No puedes removerte el rol de administrador a ti mismo"}`, `{"error": "No puedes desactivar tu propia cuenta"}` | `views.py:1879-1895` | Corregir el cuerpo del PATCH |
| **400** | DELETE admin sobre la propia cuenta | `{"error": "No puedes eliminar tu propia cuenta"}` | `views.py:1911-1915` | Usar otra cuenta de staff |
| **400** | PATCH admin de propiedad con campos no permitidos | `{"error": "Solo se permite modificar: status, title, price, city, description"}` | `views.py:1983-1987` | Limitar el PATCH a esos campos |
| **400** | `bulk-status` sin ids, con más de 200, estado inválido o ids no enteros | `{"error": "..."}` (cuatro textos) | `views.py:2017-2039` | Ajustar la selección |
| **401** | Falta el `Authorization: Bearer` en un endpoint autenticado | `{"detail": "..."}` (`NotAuthenticated` de DRF) + cabecera `WWW-Authenticate` | `settings.py:163-165` (autenticación JWT global) + permisos por vista | Iniciar sesión |
| **401** | Token de acceso caducado o inválido | `{"detail": "...", "code": "token_not_valid", "messages": [...]}` — lo genera `rest_framework_simplejwt`, no este repo | `settings.py:192-212`, `requirements.txt:3` | **Renovar** con `POST /api/token/refresh/` (§5) |
| **403** | Autenticado pero sin permiso (no es dueño, no es staff) | `{"detail": "..."}` (`PermissionDenied` de DRF) | `real_estate/permissions.py:4-24`; uso en `views.py:274`, `views.py:891-894`, `views.py:943-946`, `views.py:1600`, `views.py:1709`, `views.py:1824`, `views.py:1927` | No reintentar; pedir permisos |
| **404** | Objeto inexistente en cualquier `get_object()` / `get_object_or_404` | `{"detail": "..."}` (`NotFound` de DRF) | `views.py:1095` y detalle estándar de los viewsets | Verificar el id |
| **404** | Imagen inexistente al borrarla de una propiedad | `{"error": "Image not found"}` | `views.py:837-841` | Refrescar el detalle |
| **404** | Usuario no encontrado al verificar o reenviar código | `{"error": "Usuario no encontrado"}` | `views.py:1131-1134`, `views.py:1204-1207` | Revisar el correo |
| **404** | Incidencia inexistente al resolverla | `{"error": "Incidencia no encontrada."}` | `views.py:1810-1812` | Recargar el panel |
| **404** | Imagen no disponible en el proxy MinIO o en staging | HTML de Django (`Http404`, **no JSON**) | `views.py:1072`, `views.py:1079`, `views.py:1101`, `views.py:1105` | Ver §7.3 |
| **405** | Método no declarado en `http_method_names` | `{"detail": "..."}` (`MethodNotAllowed` de DRF) | `views.py:855` (leads), `views.py:888` (pending), `views.py:936` (activity), `views.py:1934` (admin properties) | Usar un verbo permitido |
| **409** | Segunda petición simultánea con la misma `Idempotency-Key` | `{"detail": "Esta publicación ya se está procesando. Espera un momento."}` | `views.py:460-465` | Esperar y consultar el resultado |
| **409** | Ingesta: ya hay un run activo de la fuente | `{"error": "Ya hay una ejecución en curso (#<id>).", "run": {...}}` | `ingesta/api.py:456-460` | Esperar o cancelar el run |
| **409** | Ingesta: cancelar un run ya terminado | `{"error": "El run #<id> ya está <estado>."}` | `ingesta/api.py:170-172` | Nada que cancelar |
| **413** | La carga supera el máximo de Django | `{"detail": "La carga completa supera el tamaño máximo permitido de 50MB."}` | `estate_map/upload_errors.py:14-18` | **Leer §6.2 y §6.3**: en producción es probable que el 413 lo emita nginx, en HTML |
| **429** | Se supera una tasa de `DEFAULT_THROTTLE_RATES` | `{"detail": "..."}` (`Throttled` de DRF) + cabecera `Retry-After` en segundos | `settings.py:172-183`; scopes en `views.py:285-299`, `views.py:896-901`, `views.py:948-953` | Esperar lo que indique `Retry-After` (§5.3) |
| **429** | nginx corta antes que Django (10 r/s en la API, 5 r/s en `map_points`) | `{"detail": "Se realizaron demasiados intentos. Espera un momento y vuelve a intentar."}` + `Retry-After: 60`. Misma forma que DRF, pero **sin** `X-Request-ID` ni `X-Release`: nunca llega a Django | `deploy/nginx-ratelimit-zones.conf`, `deploy/nginx-ratelimit-api.conf`, aplicados por `deploy/install-edge-config.sh` | Ver §5.3 |
| **500** | Excepción no controlada en cualquier vista | Página HTML de error 500 de Django (**no JSON**), con `X-Request-ID` | Convertida por Django antes de llegar al middleware; el incidente lo registra `observability.py:74-79` | Buscar por `X-Request-ID` (§10) |
| **500** | Login con Google falla por causa no prevista | `{"error": "No se pudo procesar el inicio de sesión."}` (JSON) | `views.py:1032-1037` (con `logger.exception('google_login_failed')`) | Revisar logs por `google_login_failed` |
| **500** | No se puede enviar el correo de verificación de cambio de email | `{"error": "Error al enviar el correo de verificación"}` (JSON) | `views.py:1339-1346` | Revisar SMTP (§7.4) |
| **502** | Ingesta: el portal de origen no responde o no entrega imágenes | `{"error": "No se pudo leer el anuncio en el portal (error transitorio). Inténtalo de nuevo en unos minutos."}` / `{"error": "El portal no entregó ninguna imagen descargable."}` | `ingesta/api.py:407-411`, `ingesta/api.py:429-431` | Reintentar más tarde |
| **503** | `/api/health/` con base de datos o caché caídas | `{"status": "error", "release": "...", "environment": "...", "checks": {...}}` | `observability.py:96-130` | Ver §7 |

---

## 3. Ejemplos de payload reales

### 3.1 Errores de validación de DRF (400)

Con el manejador por defecto, los errores de campo salen como diccionario
`campo -> lista de mensajes`. Ejemplos construidos con los mensajes literales del código:

```json
{
  "uploaded_images": [
    "La imagen 2 es demasiado grande (14.3MB). El tamaño máximo permitido es 10MB"
  ]
}
```
(`backend/real_estate/serializers.py:256-262`)

```json
{
  "polygon": [
    "El polígono debe tener al menos 3 vértices distintos."
  ]
}
```
(`backend/real_estate/serializers.py:303-306` reenvía el texto de
`backend/real_estate/geo.py:195-197`)

```json
{
  "images_to_delete": [
    "La lista de imágenes a eliminar no es válida."
  ]
}
```
(`backend/real_estate/serializers.py:334-338`)

```json
{
  "email": [
    "Ya existe un usuario con este correo"
  ]
}
```
(`backend/real_estate/serializers.py:615-623`)

### 3.2 Login (400)

`CustomTokenObtainPairSerializer.validate` (`backend/real_estate/serializers.py:566-600`)
produce cuatro formas distintas, todas con estado 400:

```json
{"email": "Este campo es requerido"}
```
```json
{"password": "Este campo es requerido"}
```
```json
{"detail": "Correo electrónico o contraseña incorrectos"}
```
```json
{
  "detail": "Tu cuenta no ha sido verificada. Por favor verifica tu correo electrónico.",
  "code": "email_not_verified",
  "email": "persona@example.com"
}
```

La última (`serializers.py:583-587`) es la única que trae `code`, y el frontend la usa
para redirigir a la pantalla de verificación (`frontend/app/(auth)/login/page.tsx:68-80`).
Nótese que la traducción de los errores de credenciales de SimpleJWT al español ocurre en
`serializers.py:595-600`: cualquier fallo del `super().validate()` se reescribe como
`"Correo electrónico o contraseña incorrectos"`, de modo que la API nunca revela si el
correo existe.

### 3.3 Publicación duplicada (409)

```json
{"detail": "Esta publicación ya se está procesando. Espera un momento."}
```
(`backend/real_estate/views.py:462-465`)

El camino feliz de la idempotencia no es un error pero conviene documentarlo: si la clave
ya produjo una propiedad, se responde **200** (no 201) con el objeto serializado y la
cabecera `X-Idempotent-Replay: true` (`views.py:456-458`).

### 3.4 Subida demasiado grande (413)

```json
{"detail": "La carga completa supera el tamaño máximo permitido de 50MB."}
```
(`backend/estate_map/upload_errors.py:14-18`)

### 3.5 Estado del sistema (`GET /api/health/`)

```json
{
  "status": "degraded",
  "release": "development",
  "environment": "development",
  "checks": {"database": "ok", "cache": "ok", "worker": "stale"}
}
```

Claves y valores exactos en `backend/estate_map/observability.py:96-130`. `status` puede
ser `"ok"`, `"degraded"` o `"error"`; `checks.database` y `checks.cache` valen `"ok"` o
`"error:<NombreDeExcepcion>"`; `checks.worker` vale `"ok"`, `"stale"` o `"unknown"`. El
código HTTP es **200 para `ok` y `degraded`**, y **503 solo para `error`**
(`observability.py:130`): un worker parado no tumba el healthcheck del contenedor.

---

## 4. 401 frente a 403

La distinción no la decide el código de la aplicación sino DRF, a partir de si la petición
llegó autenticada:

| Situación | Código | Motivo |
|---|---|---|
| No se envía `Authorization` | **401** | `JWTAuthentication` es la única clase de autenticación (`settings.py:163-165`) y aporta cabecera `WWW-Authenticate`, así que DRF traduce el permiso denegado a `NotAuthenticated` |
| Token caducado (más de 1 h) o con firma inválida | **401** | `ACCESS_TOKEN_LIFETIME = timedelta(hours=1)` (`settings.py:193`). El cuerpo lo genera `rest_framework_simplejwt` e incluye `"code": "token_not_valid"` |
| Token válido, pero no es dueño del recurso | **403** | `IsOwnerOrReadOnly.has_object_permission` devuelve `obj.owner == request.user` (`permissions.py:9-15`), aplicado en `PropertyViewSet` (`views.py:274`) |
| Token válido, pero no es staff | **403** | `IsAdminUser.has_permission` exige `request.user.is_staff` (`permissions.py:18-24`), aplicado en pending publications (`views.py:891-894`), activity events (`views.py:943-946`), dashboard (`views.py:1600`), estado del sistema (`views.py:1709`), usuarios (`views.py:1824`), propiedades admin (`views.py:1927`) y toda la API de ingesta (`ingesta/api.py:113`, `:121`, `:140`, `:150`, `:192`, `:314`, `:327`, `:373`, `:437`) |

**Regla operativa:** un 403 nunca se arregla renovando el token. El error que sí significa
"renueva el token" es el 401 con `"code": "token_not_valid"`.

### 4.1 Flujo de refresh

Configuración (`backend/estate_map/settings.py:192-212`):

- `ACCESS_TOKEN_LIFETIME`: 1 hora (`:193`).
- `REFRESH_TOKEN_LIFETIME`: 30 días (`:194`).
- `ROTATE_REFRESH_TOKENS = True` (`:195`) y `BLACKLIST_AFTER_ROTATION = True` (`:196`):
  cada refresh devuelve un refresh nuevo y **invalida el anterior**. Reusar un refresh ya
  rotado devuelve 401.
- `UPDATE_LAST_LOGIN = True` (`:197`).

La ruta es `POST /api/token/refresh/`, servida por el `TokenRefreshView` estándar de
SimpleJWT (`backend/real_estate/urls.py`, entrada `path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh')`).

En el cliente hay dos implementaciones independientes del mismo flujo:

- `frontend/lib/api.ts:50-105` — `refreshAccessToken()`: hace `POST ${API_URL}/token/refresh/`
  con `{ refresh }`, guarda el nuevo `access` (y el `refresh` rotado) en el mismo
  almacenamiento del que salió (`frontend/lib/api.ts:72`), y si el refresh falla limpia las
  claves y redirige con `window.location.href = '/iniciar-sesion'`
  (`frontend/lib/api.ts:88-99`).
- `frontend/lib/api.ts:110-160` — `apiFetch()`: renueva de forma proactiva si al access le
  quedan menos de 5 minutos (`:122-127`) y **reintenta una sola vez** ante un 401
  (`:141-157`).
- `frontend/lib/auth-context.tsx:77-125` — segunda implementación, que ante `!response.ok`
  hace `logout()` (`:118`) sin redirigir, y ante error de red devuelve `false` **sin**
  cerrar sesión (`:121-124`). Además refresca por temporizador 5 minutos antes de expirar
  (`:152-178`).

Los tokens viven en `localStorage` / `sessionStorage` bajo las claves `token` (acceso) y
`refreshToken` (`frontend/lib/auth-context.tsx:127-142`).

---

## 5. 429 — límite de tasa

### 5.1 Scopes y tasas

Definidos en `backend/estate_map/settings.py:172-183`:

| Scope | Tasa | Endpoint | Clase de throttle | Dónde se asigna |
|---|---|---|---|---|
| `activity_create` | `30/min` | `POST /api/activity-events/` | `ScopedRateThrottle` | `views.py:948-953` |
| `pending_create` | `10/min` | `POST /api/pending-publications/` | `ScopedRateThrottle` | `views.py:896-901` |
| `map_points` | `120/min` | `GET /api/properties/map_points/` | `AntiScraperScopedThrottle` | `views.py:290-292` |
| `property_list` | `60/min` | `GET /api/properties/` | `AntiScraperScopedThrottle` | `views.py:293-295` |
| `property_write` | `30/hour` | `POST`/`PUT`/`PATCH` de `/api/properties/` | `ScopedRateThrottle` | `views.py:296-298` |

Cualquier otra acción devuelve `[]` en `get_throttles` (`views.py:299`, `views.py:901`,
`views.py:953`): **solo se limita lo que declara `throttle_scope`**. El comentario de
`settings.py:174-179` explica que los techos anti-scraper están muy por encima de la
navegación real y de lo que hace un crawler educado.

Para el reparto completo de permisos por endpoint, ver [`../permissions/matrix.md`](../permissions/matrix.md).

### 5.2 Exenciones

`AntiScraperScopedThrottle` (`backend/real_estate/throttling.py:42-51`) devuelve `True`
(sin contar la petición) en dos casos:

1. `request.user.is_staff` (`throttling.py:46-48`).
2. Cliente interno: `_is_internal_client` (`throttling.py:24-39`) considera interno a quien
   **no** trae `X-Forwarded-For` y cuya `REMOTE_ADDR` es privada, de loopback, o figura en
   `THROTTLE_EXEMPT_IPS` (`settings.py:188-190`). Esto existe para que el render de
   servidor de Next.js no comparta un único cubo de tasa con todo el sitio
   (`throttling.py:5-11`).

Las tasas viven en la caché por defecto, que es Redis DB 1 (`settings.py:449-462`), así que
el conteo es compartido entre los 3 workers de gunicorn
(`docker-compose.prod.yml:25`) y no por proceso.

### 5.3 Respuesta

La emite DRF: cuerpo `{"detail": "..."}` y cabecera `Retry-After` con los segundos que
faltan. **El frontend no lee `Retry-After`**: `frontend/lib/form-errors.ts:8` mapea el 429 a
un texto fijo, `'Se realizaron demasiados intentos. Espera un momento y vuelve a intentar.'`,
sin reintento automático ni cuenta atrás.

### 5.4 El otro 429: el que emite nginx

Desde el 20 de agosto de 2026 hay un segundo muro, por delante de Django, en el vhost
de la API: 10 r/s con ráfaga de 30 para todo `/api/`, y 5 r/s con ráfaga de 20 para
`GET /api/properties/map_points/`. Lo aplica `deploy/install-edge-config.sh` desde el
repositorio en cada despliegue, no a mano.

Está cinco veces por encima de los techos de Django a propósito. Los de Django son los
precisos; estos son los baratos: cortan un bucle de scraping en el borde de la máquina,
antes de que ocupe un worker de gunicorn, una ida a Redis y la decodificación del JWT.
Una persona navegando nunca los alcanza —una ficha dispara ocho llamadas simultáneas y
las ocho pasan— y un rastreador educado tampoco.

**Devuelve la misma forma que DRF**: `{"detail": "Se realizaron demasiados intentos.
Espera un momento y vuelve a intentar."}` con `Content-Type: application/json` y
`Retry-After: 60`, que es el texto exacto que `frontend/lib/form-errors.ts:8` ya muestra
para un 429. Lo que **no** trae son `X-Request-ID` ni `X-Release`, porque la petición
nunca llega a Django: si estás depurando un 429 y no encuentras el `request_id`, es este.

Dos exenciones, y las dos importan:

- **El render de servidor.** Llega desde el contenedor de Next.js por el puente de
  Docker, con dirección privada, y el bloque `geo` lo deja fuera. Es el mismo criterio
  que `_is_internal_client` en `throttling.py`. Comprobado con 60 peticiones simultáneas
  desde el contenedor: 60 de 60 en 200.
- **El vhost del frontend no tiene ningún límite.** Sirve 16.949 URLs cuyo objetivo es
  que las rastreen, y la velocidad de Googlebot no es algo con lo que apostar en un
  negocio que vive del buscador. La extracción masiva se hace por la API —una llamada a
  `map_points` devuelve miles de puntos—, así que el muro está donde se usa.

Detrás del CDN el límite cuenta por persona, no por edge, porque `real_ip` reescribe la
dirección antes (ver `docs/technical/cdn-cloudflare.md`).

---

## 6. 413 y errores de subida

### 6.1 Límites en Django

`backend/estate_map/settings.py:342-370`:

| Ajuste | Valor | Línea | Qué limita |
|---|---|---|---|
| `DATA_UPLOAD_MAX_MEMORY_SIZE` | `60 * 1024 * 1024` (60 MB) | `:347` | Cuerpo no-archivo. Es un margen deliberado por encima del límite de negocio para no rechazar multipart válidos antes de llegar al serializador (comentario en `:345-346`) |
| `FILE_UPLOAD_MAX_MEMORY_SIZE` | `5 * 1024 * 1024` | `:349` | Umbral memoria → disco temporal. **No es un límite total** |
| `DATA_UPLOAD_MAX_NUMBER_FILES` | `10` | `:350` | Número de archivos por petición |
| `ALLOWED_IMAGE_TYPES` | `['image/jpeg', 'image/jpg', 'image/png', 'image/webp']` | `:353` | Tipos permitidos |
| `MAX_IMAGES_PER_PROPERTY` | `10` | `:368` | Imágenes por propiedad |
| `MAX_IMAGE_SIZE_MB` | `10` | `:369` | Tamaño por imagen |
| `MAX_PROPERTY_UPLOAD_MB` | `50` | `:370` | Suma de las imágenes de una petición |

Los tres últimos los aplica el serializador (§7 de validación) y son los que producen
mensajes útiles en español; los de Django son la última red de seguridad.

### 6.2 `UploadErrorMiddleware` y una salvedad importante

`backend/estate_map/upload_errors.py:5-28` traduce tres excepciones del parser multipart a
JSON estable:

```python
except RequestDataTooBig:   # -> 413 {"detail": "La carga completa supera el tamaño máximo permitido de 50MB."}
except TooManyFilesSent:    # -> 400 {"detail": "No se pueden enviar más de 10 archivos por solicitud."}
except SuspiciousOperation: # -> 400 {"detail": "La solicitud contiene datos o archivos no válidos."}
```

**Salvedad verificada contra el código de Django 5.2 (no contra este repo):** Django envuelve
*cada* middleware con `convert_exception_to_response`
(`django/core/handlers/base.py:37` y `:95`), y ese envoltorio convierte
`SuspiciousOperation` —clase padre de `RequestDataTooBig` y `TooManyFilesSent`— en una
respuesta **400** antes de que la excepción pueda subir al middleware de más arriba
(`django/core/handlers/exception.py:112-136`). Como `UploadErrorMiddleware` está por encima de
la vista en la lista (`settings.py:51`), una excepción lanzada al parsear el cuerpo dentro de
la vista se convierte antes de llegar a su `except`. Es decir: **es probable que estas tres
respuestas JSON no se emitan nunca en producción y que el cliente reciba la página HTML de
400 de Django**. No hay ninguna prueba en `backend/real_estate/tests/` ni en
`backend/ingesta/tests/` que cubra este middleware (verificado con búsqueda de `413`,
`RequestDataTooBig`, `TooManyFilesSent` y `UploadError` en todo `backend/`: solo aparecen en
el propio middleware y en `settings.py:51`). **Conviene comprobarlo con una petición real
antes de documentarlo como contrato hacia clientes externos.**

Nótese además que estas tres respuestas, si llegaran a emitirse, **no llevarían
`X-Request-ID`, `X-Response-Time-Ms` ni `X-Release`**: `UploadErrorMiddleware` está por
encima de `ObservabilityMiddleware` (`settings.py:51-52`) y devuelve su `JsonResponse` sin
pasar por él.

### 6.3 nginx puede cortar antes que Django

En el repositorio **no existe ninguna directiva `client_max_body_size`** (verificado con
búsqueda en todo el árbol). Lo único versionado relacionado con nginx es:

- `frontend/nginx.conf` — un `server` que sirve un SPA estático desde
  `/usr/share/nginx/html`. **No lo usa ningún Dockerfile ni compose de este repo**
  (verificado): `docker-compose.prod.yml:103-144` ejecuta Next.js directamente en el
  puerto 3000.
- `frontend/nginx/conf.d/` — directorio vacío.
- `deploy/nginx-rate-limit.conf.example` — plantilla de rate limiting que debe fusionarse a
  mano en el host.

El nginx real es **nativo en el host de producción** (lo indica el propio ejemplo:
`# Nginx native (not Docker) runs on the Contabo prod host`) y su configuración no está en
este repositorio. Backend y frontend solo escuchan en `127.0.0.1`
(`docker-compose.prod.yml:36` y `:128`), así que todo el tráfico público pasa por ese nginx.

**Consecuencia operativa:** si en el host no se ha subido `client_max_body_size`, nginx
aplica su valor por defecto (1 MB) y devuelve su propio **413 en HTML**, sin cuerpo JSON de
DRF, sin `X-Request-ID` y sin que Django registre absolutamente nada. Un 413 que no aparece
en los logs de `estatemap_backend` es, casi con seguridad, un 413 de nginx. Los límites de
negocio (10 MB por imagen, 50 MB por publicación) solo tienen sentido si nginx permite al
menos ese tamaño.

---

## 7. Errores de validación de negocio

### 7.1 Imágenes

`PropertySerializer.validate_uploaded_images`
(`backend/real_estate/serializers.py:224-281`), en orden de comprobación:

| Mensaje (literal) | Línea |
|---|---|
| `"La propiedad no puede tener más de {max_images} imágenes. Actualmente tiene {existing_count} y se intentan agregar {len(value)}."` | `:241-244` |
| `"El conjunto de imágenes supera {MAX_PROPERTY_UPLOAD_MB}MB."` | `:249-251` |
| `"La imagen {idx + 1} es demasiado grande ({size_mb}MB). El tamaño máximo permitido es {max_size_mb}MB"` | `:259-262` |
| `"Formato de imagen {idx + 1} no permitido. Use JPEG, PNG o WebP"` | `:267-270` |
| `"Imagen {idx + 1}: {message}"` (envoltorio de los validadores de Django) | `:277-279` |

El campo también declara `max_length=10` en el `ListField`
(`serializers.py:175-185`), que produce el error estándar de DRF si se superan 10 archivos.

Los validadores de `backend/real_estate/validators.py`, cuyos mensajes se anteponen con
`"Imagen N: "`:

| Mensaje | Línea |
|---|---|
| `"El tamaño de la imagen no puede exceder {max_size_mb}MB. Tamaño actual: {...}MB"` | `validators.py:13-14` |
| `"La imagen debe tener al menos 200x200 píxeles. Dimensiones actuales: {width}x{height}px"` | `validators.py:26-27` |
| `"La imagen no puede exceder 8000x8000 píxeles. Dimensiones actuales: {width}x{height}px"` | `validators.py:29-30` |
| `"Error validando dimensiones de imagen: {str(e)}"` | `validators.py:32-33` |
| `"Formato de imagen no permitido. Use: jpg, jpeg, png, webp. Formato actual: {ext}"` | `validators.py:43-44` |

### 7.2 Polígono ("Forma del terreno")

`PropertySerializer.validate_polygon` (`backend/real_estate/serializers.py:283-306`)
devuelve `"Formato de polígono inválido"` si el string de FormData no es JSON
(`serializers.py:301`), y en el resto de casos reenvía el texto de
`PolygonValidationError` (`serializers.py:305-306`). Los mensajes reales están en
`backend/real_estate/geo.py`:

| Mensaje | Línea |
|---|---|
| `"El polígono GeoJSON debe ser de tipo 'Polygon'."` | `geo.py:135-137` |
| `"El polígono GeoJSON no tiene coordenadas válidas."` | `geo.py:140-142` |
| `"El anillo del polígono es inválido."` | `geo.py:145` |
| `"Cada coordenada debe ser un par [lng, lat]."` | `geo.py:150-152` |
| `"Cada coordenada debe ser un par [lat, lng]."` | `geo.py:164-166` |
| `"Las coordenadas deben ser numéricas."` | `geo.py:155`, `geo.py:169` |
| `"Formato de polígono no reconocido."` | `geo.py:173` |
| `"El polígono debe tener al menos 3 vértices distintos."` | `geo.py:195-197` |
| `"La coordenada ({lat:.5f}, {lng:.5f}) está fuera de Ecuador."` | `geo.py:202-204` |
| `"Los lados del polígono no pueden cruzarse entre sí."` | `geo.py:207-209` |
| `"El área del polígono es demasiado pequeña ({area:.1f} m², mínimo 10 m²)."` | `geo.py:214-217` |
| `"El área del polígono es demasiado grande ({area:.0f} m², máximo 5000000 m²)."` | `geo.py:219-222` |

Los límites: Ecuador continental y Galápagos como cajas separadas (`geo.py:15-23`), área
entre `MIN_POLYGON_AREA_M2 = 10.0` y `MAX_POLYGON_AREA_M2 = 5_000_000.0` (`geo.py:28-29`).

### 7.3 Otros serializadores

- Leads: `"El nombre es obligatorio."` (`serializers.py:462-465`) y
  `"El teléfono es obligatorio."` (`serializers.py:467-470`).
- Eventos de actividad: `"Nombre de evento inválido"` si no es alfanumérico con `_-.`
  (`serializers.py:523-527`) y `"El payload debe ser un objeto"` (`serializers.py:529-532`).
  `is_bot` es de solo lectura a propósito: lo decide el servidor a partir del User-Agent
  (`serializers.py:514-516`, `serializers.py:539-541`).
- Cambio de correo: `"Este correo ya está en uso por otra cuenta"` y
  `"Este es tu correo actual. Usa uno diferente"` (`serializers.py:685-695`).
- Cambio de contraseña: `"La contraseña actual no es correcta"` (`serializers.py:735-739`).

---

## 8. Dependencias externas y modo degradado

| Dependencia caída | Qué pasa | Qué ve el cliente | Origen |
|---|---|---|---|
| **Redis (caché, DB 1)** | `IGNORE_EXCEPTIONS: True` convierte los fallos en `None` en lugar de excepciones; los helpers de versión son defensivos y devuelven `1` por defecto | **Nada**: respuestas correctas, solo con *cache miss* (más lentas). Los errores ignorados sí se loguean porque `DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS = True` | `settings.py:449-465`; `cache_utils.py:31-44`, `:47-60` |
| **Redis (caché) y throttling** | Al ser la caché por defecto, el conteo de tasa vive ahí | Con Redis caído el throttling deja de contar de forma fiable | `settings.py:443-448` |
| **Redis (broker Celery, DB 0)** | `enqueue_optimization` captura cualquier fallo de publicación y **optimiza la imagen en línea** dentro del proceso web | La subida funciona, solo que más lenta (el comentario lo llama "the old latency instead of a 500") | `tasks.py:205-240`, en especial `:222-238`; `CELERY_TASK_PUBLISH_RETRY = False` y timeouts de 2 s en `settings.py:404-408` |
| **Worker parado** | La fila queda en `PENDING` con su archivo en disco; `sweep_pending_images` la reencola cada hora | La imagen se sirve desde el staging local vía `/api/pending-image/<id>/` con `Cache-Control: no-store`, así que el usuario ve su foto igual | `tasks.py:112-146`; `views.py:1082-1111`; `serializers.py:160-165` |
| **MinIO caído** | El proxy de imágenes captura `requests.RequestException`, loguea y lanza `Http404` | **404 en HTML, no JSON**, en `/api/media/<ruta>` | `views.py:1074-1079` |
| **Disco de staging lleno / no escribible** | `stage_property_image` captura `OSError`, loguea y devuelve `None` **sin** lanzar, para no revertir la publicación completa | La propiedad se crea igual (201), simplemente sin esa foto. El docstring lo justifica: *"A missing photo can be re-uploaded in seconds; a lost publication cannot."* | `serializers.py:94-129`, en especial `:110-118` |
| **SMTP caído (leads y publicaciones asistidas)** | Los servicios de notificación capturan cualquier excepción, la loguean con `logger.exception` y devuelven `False`; además esos dos envíos usan `fail_silently=True` | **Nada**: el lead o la solicitud se crean con 201 normal | `services/notifications.py:13-37`; `email_utils.py:225`, `:267`; llamadas en `views.py:876-878` y `views.py:926-928` |
| **SMTP caído (registro, verificación, reset)** | Esos envíos usan `fail_silently=False` y **no** están envueltos en try/except en el serializador | La excepción sube y el cliente recibe un **500 en HTML**; se registra un `SystemIncident` | `email_utils.py:59`, `:106`, `:191`, `:313`, `:362`; `serializers.py:640-657` |
| **SMTP caído (cambio de correo)** | Sí está capturado en la vista | **500 JSON** `{"error": "Error al enviar el correo de verificación"}` | `views.py:1337-1346` |
| **Frontend caído (revalidación de caché Next)** | Dos reintentos con backoff y timeout de 5 s; agotados, la tarea devuelve `{"status": "failed", ...}` sin propagar el error | Nada: la página queda algo obsoleta | `tasks.py:149-195` |
| **Base de datos caída** | `/api/health/` responde 503 con `checks.database = "error:<Excepcion>"`; el resto de la API devuelve 500 | 500 en HTML + incidente | `observability.py:99-106`, `:130` |

---

## 9. Cómo se cierra el bucle en la interfaz

El parser central es `frontend/lib/form-errors.ts`:

- `:1-13` — mapa de estado → mensaje en español, usado como *fallback*. Incluye entradas
  para 400, 401, 403, 404, 408, **413**, **429**, 500, 502/503 y 504.
- `:15-33` — `firstMessage(value)`: recorre recursivamente el cuerpo de DRF (string, array
  o diccionario) y devuelve **solo el primer mensaje**, prefijando el nombre del campo salvo
  cuando la clave es `detail` o `non_field_errors`.
- `:35-52` — `responseErrorMessage(response, fallback)`: para `status >= 500`
  **nunca lee el cuerpo** (`:38-40`), para evitar filtrar internals del servidor; para el
  resto lo parsea solo si el `content-type` es JSON.
- `:36-37` — **aquí se cierra el bucle con la observabilidad**:

  ```ts
  const requestId = response.headers.get('x-request-id');
  const reference = requestId ? ` Código de seguimiento: ${requestId}.` : '';
  ```

  Ese texto se anexa a **todos** los mensajes que produce la función, incluidos los 5xx cuyo
  cuerpo no se lee. Es la razón de ser de `CORS_EXPOSE_HEADERS`
  (`backend/estate_map/settings.py:227-229`). Hay una prueba que fija el comportamiento:
  `frontend/lib/form-errors.test.ts:6-15` verifica que un 500 con
  `{detail: 'database password leaked'}` no filtra el detalle pero sí incluye `req-123`.

Limitaciones verificadas, útiles al recibir un reporte de usuario:

- `X-Response-Time-Ms` y `X-Release` **no se leen en ninguna parte del frontend**.
- `responseErrorMessage` solo se invoca en cuatro sitios
  (`app/add-property/page.tsx:1003`, `app/my-properties/page.tsx:172`,
  `app/(auth)/forgot-password/page.tsx:34`, `app/(auth)/reset-password/page.tsx:49`): el
  resto de pantallas hace su propio sondeo ad-hoc del cuerpo (`data.detail || data.error || ...`)
  y **pierde el código de seguimiento**. Si el usuario no lo tiene, hay que buscar por
  ruta y hora.
- El único renderizador de errores campo a campo es
  `frontend/app/(auth)/register/page.tsx:47-60` (Formik `setErrors`).
- `frontend/lib/api.ts` es un envoltorio de transporte: nunca inspecciona el cuerpo ni lanza.
- Los *fetchers* de servidor tragan los errores y devuelven vacío
  (`frontend/lib/properties.ts:62`, `:113`, `:145`, `:221`, `:272`, `:286`;
  `frontend/lib/market-stats.ts:41`): un fallo de la API en SSR se ve como una página sin
  resultados, no como un error.
- El formulario de publicación valida en cliente antes de subir
  (`frontend/app/add-property/page.tsx:1152-1214`) con los mismos límites del backend
  (10 imágenes, 10 MB por archivo, 50 MB en total, JPG/PNG/WebP, mínimo 200×200,
  máximo 8000×8000), por lo que la mayoría de los 400/413 nunca llegan a salir del navegador.

### 9.1 Route handler propio de Next.js

`frontend/app/api/revalidate/route.ts` usa la clave `error` (nunca `detail`):

```json
{"error": "Revalidation is not configured"}
```
(503, `:18`, cuando `REVALIDATE_SECRET` no está definido)

```json
{"error": "Invalid secret"}
```
(401, `:21-24`, comparando la cabecera `x-revalidate-secret`)

```json
{"error": "Invalid JSON body"}
```
(400, `:30`)

```json
{"error": "`tags` must be a non-empty array of strings (max 50)"}
```
(400, `:40-43`)

El backend llama a esta ruta desde `revalidate_frontend_tags`
(`backend/real_estate/tasks.py:149-195`), que ante un `>= 400` loguea
`"Revalidation rejected for %s: HTTP %s %s"` y **no reintenta** (`tasks.py:185-192`).

---

## 10. Errores de la app `ingesta`

`backend/ingesta/api.py` no usa serializadores de DRF: son vistas `@api_view` que devuelven
diccionarios a mano. Su forma propia es **siempre `{"error": "<texto>"}`**, nunca `detail`:

| Código | Cuerpo | Línea |
|---|---|---|
| 404 | `{"error": "Ejecución no encontrada."}` | `api.py:145` |
| 404 | `{"error": "No se encontró una ejecución para cancelar."}` | `api.py:168-169` |
| 409 | `{"error": "El run #<id> ya está <estado>."}` | `api.py:170-172` |
| 404 | `{"error": "Fuente no encontrada."}` | `api.py:206` |
| 400 | `{"error": "Categoría de mantenimiento inválida."}` | `api.py:321`, `api.py:341` |
| 400 | `{"error": "Escribe ELIMINAR IMPORTADAS para confirmar."}` | `api.py:334-338` |
| 404 | `{"error": "Propiedad no encontrada."}` | `api.py:388-389` |
| 400 | `{"error": "La propiedad no proviene de un portal importado."}` | `api.py:390-392` |
| 400 | `{"error": "Scraper '<key>' no registrado."}` | `api.py:396-397` |
| 502 | `{"error": "No se pudo leer el anuncio en el portal (error transitorio). Inténtalo de nuevo en unos minutos."}` | `api.py:407-411` |
| 502 | `{"error": "El portal no entregó ninguna imagen descargable."}` | `api.py:429-431` |
| 400 | `{"error": "No se pudo actualizar (<resultado>)."}` | `api.py:432-433` |
| 400 | `{"error": "Fuente '<slug>' no disponible."}` | `api.py:443-445` |
| 409 | `{"error": "Ya hay una ejecución en curso (#<id>).", "run": {...}}` | `api.py:456-460` |

Como el frontend de admin lee `data.error` (`frontend/app/admin/ingesta/page.tsx:384`), este
formato es el que espera la UI. Nótese que la confirmación de borrado es una cadena exacta:
`request.data["confirmation"]` debe valer literalmente `"ELIMINAR IMPORTADAS"`
(`api.py:334`).

---

## 11. Diagnóstico en producción

### 11.1 Contenedores

`docker-compose.prod.yml` define tres contenedores con nombre fijo: `estatemap_backend`
(`:8`, gunicorn con 3 workers en el puerto 8000, `:25`), `estatemap_worker` (`:56`, Celery
con beat embebido, `:69`) y `estatemap_frontend` (`:116`, Next.js en el 3000). Los tres
publican solo en `127.0.0.1` (`:36`, `:128`); nginx nativo del host hace de frontal.

### 11.2 Buscar por `X-Request-ID`

El usuario reporta un "Código de seguimiento" (§9). Ese valor es el `request_id` de las
líneas JSON del logger `observability`:

```bash
# Todas las líneas de esa petición (una por request, más la de la excepción si la hubo)
docker logs estatemap_backend 2>&1 | grep '<request-id>'

# Errores no controlados recientes
docker logs --since 2h estatemap_backend 2>&1 | grep '"kind": "unhandled_error"'

# Endpoints lentos (duration_ms >= SLOW_ENDPOINT_MS, por defecto 1000)
docker logs --since 24h estatemap_backend 2>&1 | grep '"alert": "slow_endpoint"'

# Todo lo que respondió 5xx
docker logs --since 24h estatemap_backend 2>&1 | grep '"kind": "http_request"' | grep '"status": 5'

# Auditoría de acciones de administración
docker logs --since 7d estatemap_backend 2>&1 | grep 'admin_audit'
```

Si la petición **no aparece** en los logs del backend, no llegó a Django: sospechar de nginx
(413 por `client_max_body_size`, 429 por `limit_req`, o un timeout del proxy) — ver §6.3 y
§5.3.

Para el pipeline de imágenes, los logs relevantes están en el worker:

```bash
docker logs --since 2h estatemap_worker 2>&1 | grep -E 'Broker unavailable|Inline fallback failed|could not be optimized|sweep_pending_images'
```

Los tres primeros patrones son literales de `backend/real_estate/tasks.py:229`, `:238` y
`:96`; el último resume la barrida horaria (`tasks.py:145`).

### 11.3 Consultar `SystemIncident`

Vía API (requiere sesión de staff):

```
GET  /api/admin/system-status/      # estado + hasta 50 incidencias sin resolver
POST /api/admin/system-status/      # {"incident_id": <id>, "resolved": true}
```

(`backend/real_estate/views.py:1706-1819`; en la UI, `frontend/app/admin/system/page.tsx`.)

Vía shell del contenedor:

```bash
docker exec -it estatemap_backend python manage.py shell -c "
from real_estate.models import SystemIncident
for i in SystemIncident.objects.filter(resolved=False)[:20]:
    print(i.severity, i.status_code, i.method, i.path, i.occurrences, i.request_id, i.last_seen_at)
"
```

Recordatorio al leer la tabla: `message` es **solo el nombre de la clase de excepción**
(`observability.py:22`, `:35`) y `path` no incluye la query string. El traceback completo
está únicamente en los logs, en la línea `logger.exception` que emitió el mismo `request_id`
(`observability.py:67-71`) o en el volcado de Django. Si un incidente se repite, revisar
`occurrences` en lugar de contar líneas de log: la fila es única por huella.

### 11.4 Salud del sistema

```bash
# Desde el host (el healthcheck del contenedor hace exactamente esto)
curl -s -H 'X-Forwarded-Proto: https' http://127.0.0.1:8000/api/health/ | python3 -m json.tool
```

La cabecera `X-Forwarded-Proto: https` es necesaria porque en producción
`SECURE_SSL_REDIRECT` está activo por defecto (`settings.py:243`) y el healthcheck la envía
explícitamente (`docker-compose.prod.yml:39`). Interpretación: `503` significa base de datos
o caché caídas; `200` con `"status": "degraded"` significa worker sin latido reciente
(más de 180 s, `observability.py:117`), que es exactamente el síntoma de imágenes que se
quedan en `PENDING`.

### 11.5 Checklist rápido por síntoma

| Síntoma | Primera comprobación |
|---|---|
| "Se cayó al publicar" con Código de seguimiento | `grep '<request-id>'` en `estatemap_backend` |
| 413 al subir fotos | ¿Aparece la petición en los logs del backend? Si no, es nginx (§6.3) |
| 429 inesperado en tráfico normal | ¿Llega `X-Forwarded-For`? Si el SSR de Next.js lo trae, pierde la exención (`throttling.py:24-39`) |
| 401 en bucle | Refresh rotado y ya en la lista negra (`settings.py:195-196`); forzar logout |
| Fotos que no aparecen | `/api/health/` → `checks.worker`; luego `SystemIncident` y logs del worker |
| Datos obsoletos en el sitio público | Revalidación rechazada: `grep 'Revalidation rejected'` (`tasks.py:188`) |
