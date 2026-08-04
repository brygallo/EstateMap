# Matriz de permisos — EstateMap / Geo Propiedades Ecuador

Verificado contra el código el 2026-08-04.

Este documento describe el estado **actual** del árbol de trabajo, incluidos los cambios sin
commitear en `backend/real_estate/views.py`, `backend/real_estate/serializers.py`,
`backend/estate_map/settings.py` y los ficheros nuevos
`backend/real_estate/services/authentication.py` y `backend/real_estate/services/notifications.py`.

Todo lo que aparece aquí está verificado leyendo el código. Cuando algo no se pudo confirmar,
se dice explícitamente en lugar de suponerlo.

---

## 1. Roles del sistema y cómo se determinan en el código

El modelo de usuario es `real_estate.User` (`backend/real_estate/models.py:7-16`), un
`AbstractUser` con `email` único y tres campos añadidos: `is_email_verified`, `oauth_provider`
/ `oauth_id` y `avatar_url`. Está declarado como `AUTH_USER_MODEL` en
`backend/estate_map/settings.py:160`.

| Rol | Cómo se determina en el código | Dónde se comprueba |
|---|---|---|
| **Anónimo** | No llega cabecera `Authorization: Bearer <jwt>` válida. `request.user` es `AnonymousUser`. | Única clase de autenticación configurada: `JWTAuthentication` (`backend/estate_map/settings.py:163-165`) |
| **Autenticado (JWT)** | Token de acceso válido y no expirado. `request.user.is_authenticated` es `True`. | `IsAuthenticated` / `IsAuthenticatedOrReadOnly` de DRF |
| **Autenticado con correo SIN verificar** | `user.is_active=True` y `user.is_email_verified=False`. **No existe ninguna comprobación de permiso que distinga este rol.** Ver §5. | — (ningún permission class lo lee) |
| **Autenticado con correo verificado** | `user.is_email_verified=True`, puesto en `backend/real_estate/views.py:1163` (verificación por código), `backend/real_estate/services/authentication.py:62,85` (Google) y `backend/real_estate/adapters.py:34,57` (allauth, no enrutado). | — (ningún permission class lo lee) |
| **Propietario del recurso** | `obj.owner == request.user` para `Property`; para `Lead`, `property__owner=user` vía filtrado de queryset. | `IsOwnerOrReadOnly.has_object_permission` (`backend/real_estate/permissions.py:9-15`); `LeadViewSet.get_queryset` (`backend/real_estate/views.py:867-874`) |
| **Staff (`is_staff=True`)** | `request.user.is_authenticated and request.user.is_staff`. | `IsAdminUser.has_permission` (`backend/real_estate/permissions.py:23-24`) |
| **Superusuario (`is_superuser=True`)** | **La API REST no distingue superusuario de staff en ningún punto.** `is_superuser` solo tiene efecto dentro del admin de Django (permisos por modelo). | `django.contrib.admin` (comportamiento estándar) |

### Clases de permiso propias

`backend/real_estate/permissions.py` (24 líneas, dos clases):

- **`IsOwnerOrReadOnly`** (`:4-15`): solo implementa `has_object_permission`. Devuelve `True`
  para métodos seguros (`GET`/`HEAD`/`OPTIONS`), `True` para cualquier usuario con `is_staff`
  y, si no, `obj.owner == request.user`. No implementa `has_permission`, así que por sí sola no
  bloquea nada a nivel de vista. **El atajo de staff existe porque el panel de inventario
  (`/mis-propiedades`) muestra el catálogo entero a un administrador y ofrece ahí los botones de
  editar y eliminar.** Para propiedades importadas (`owner=None`) la comparación de dueño siempre
  falla, así que solo staff puede editarlas por esa ruta.
  Uso: solo en `PropertyViewSet.permission_classes` (`backend/real_estate/views.py:274`).
- **`IsAdminUser`** (`:18-24`): `has_permission` exige autenticado **y** `is_staff`. No mira
  `is_superuser`.
  Uso: `PendingPublicationViewSet` (`views.py:894`), `ActivityEventViewSet` (`views.py:946`),
  `AdminDashboardView` (`:1600`), `AdminSystemStatusView` (`:1709`), `AdminUserViewSet`
  (`:1824`), `AdminPropertyViewSet` (`:1927`) y los 9 endpoints de `backend/ingesta/api.py`.

### Autenticación

- **JWT (SimpleJWT)** es el único mecanismo de la API. `DEFAULT_AUTHENTICATION_CLASSES` contiene
  solo `rest_framework_simplejwt.authentication.JWTAuthentication`
  (`backend/estate_map/settings.py:163-165`). **No hay `SessionAuthentication`**: estar logueado
  en el admin de Django no da acceso a `/api/`. Ninguna vista sobreescribe
  `authentication_classes` (verificado por grep en todo `backend/`).
- **Parámetros de token** (`backend/estate_map/settings.py:192-212`): acceso 1 h
  (`:193`), refresh 30 días (`:194`), `ROTATE_REFRESH_TOKENS=True` (`:195`),
  `BLACKLIST_AFTER_ROTATION=True` (`:196`, cambiado de `False` en el diff sin commitear, junto
  con el alta de `rest_framework_simplejwt.token_blacklist` en `INSTALLED_APPS` en `:34`),
  `UPDATE_LAST_LOGIN=True` (`:197`), `HS256` firmado con `SECRET_KEY` (`:199-200`).
- **Claims personalizados**: `username`, `email` e `is_staff` se inyectan en el token tanto en
  el login por contraseña (`backend/real_estate/serializers.py:558-564`) como en el login por
  Google (`backend/real_estate/services/authentication.py:103-109`).
- **Google OAuth**: `GoogleLoginView` (`views.py:987-1037`) verifica el `id_token` contra
  `GOOGLE_CLIENT_ID` con `google.oauth2.id_token.verify_oauth2_token` (`:1006-1010`) y delega en
  `GoogleAuthenticationService` (fichero nuevo). Ese servicio exige `email`, `sub` y
  `email_verified is True` en los claims (`services/authentication.py:31-32`); si falta alguno
  lanza `GoogleIdentityError` y la vista responde 400 (`views.py:1027-1031`). Vincula por
  `oauth_id` y, si no, por `email__iexact` con `select_for_update`
  (`services/authentication.py:53-55`), y marca `is_email_verified=True` e `is_active=True`
  (`:62-63`, `:85-86`). La configuración vive en `settings.py:267-286`; el proceso de alta de
  credenciales está en `GOOGLE_OAUTH.md`.
- **allauth / dj-rest-auth**: ambos están en `INSTALLED_APPS` (`settings.py:37-42`) y
  `CustomSocialAccountAdapter` está configurado (`settings.py:289`,
  `backend/real_estate/adapters.py`), **pero sus URLs no están montadas en ningún sitio**:
  `backend/estate_map/urls.py` solo incluye `/api/health/`, `/admin/` y `/api/`
  (`real_estate.urls`), y `backend/real_estate/urls.py` no hace `include` de allauth ni de
  dj-rest-auth. Es decir, `adapters.py` es código muerto por HTTP hoy; el único camino de
  Google es `POST /api/auth/google/`.

---

## 2. LA MATRIZ

Leyenda: ✅ permitido · ❌ denegado (401/403) · ➖ no aplica.
La columna **Propietario** describe al usuario autenticado que además es dueño del recurso;
cuando la propiedad del recurso es irrelevante se marca `=Aut.`.
La columna **Throttle** indica el scope realmente aplicado; **no existe
`DEFAULT_THROTTLE_CLASSES` global**, así que toda vista que no declare `get_throttles` está
sin límite de tasa.

### 2.1 Propiedades (`PropertyViewSet`, `views.py:273`)

Permisos de clase: `[IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]` (`views.py:274`).

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `GET /api/properties/` | `views.py:273` (`list`, serializer `MapPropertySerializer` `:280-283`) | ✅ | ✅ | ✅ | ✅ | `property_list` 60/min, exento staff e IP interna |
| `POST /api/properties/` | `views.py:441` + `perform_create` `:438` | ❌ | ✅ | ➖ | ✅ | `property_write` 30/hora (`ScopedRateThrottle` plano: **también limita a staff**) |
| `GET /api/properties/{id}/` | `views.py:477` (`retrieve`) | ✅ | ✅ | ✅ | ✅ | ninguno |
| `PUT /api/properties/{id}/` | `ModelViewSet` + `IsOwnerOrReadOnly` `permissions.py:15` | ❌ | ❌ | ✅ | ✅ (atajo de staff) | `property_write` 30/hora |
| `PATCH /api/properties/{id}/` | ídem | ❌ | ❌ | ✅ | ✅ | `property_write` 30/hora |
| `DELETE /api/properties/{id}/` | ídem | ❌ | ❌ | ✅ | ✅ | ninguno |
| `DELETE /api/properties/{id}/delete_image/` | `views.py:818-841` | ❌ | ✅ **sobre cualquier propiedad** | ✅ | ✅ | ninguno |
| `GET /api/properties/{id}/intelligence/` | `views.py:488` (`AllowAny` `:488`) | ✅ | ✅ | ✅ | ✅ | ninguno |
| `GET /api/properties/map_points/` | `views.py:578` (`AllowAny`) | ✅ | ✅ | ✅ | ✅ | `map_points` 120/min, exento staff e IP interna |
| `GET /api/properties/owners/` | `views.py:630` (`AllowAny`) | ✅ | ✅ | ✅ | ✅ | ninguno |
| `GET /api/properties/locations/` | `views.py:655` (`AllowAny`) | ✅ | ✅ | ✅ | ✅ | ninguno |
| `GET /api/properties/catalog/` | `views.py:691` (`AllowAny`) | ✅ | ✅ | ✅ | ✅ | ninguno |
| `GET /api/properties/summary/` | `views.py:739` (`AllowAny`) | ✅ | ✅ | ✅ | ✅ | ninguno |
| `GET /api/properties/my_properties/` | `views.py:811-816` (`IsAuthenticated`) | ❌ | ✅ (solo lo suyo) | ✅ | ✅ (**catálogo completo**) | ninguno |

Notas:
- El `queryset` base excluye `status='inactive'` y `is_duplicate=True`
  (`views.py:321`), lo que afecta también a `retrieve`/`update`/`destroy`. Un usuario con
  `is_staff` es la excepción en esas tres acciones: recibe el catálogo completo, para que una
  propiedad listada en el panel no responda 404 al abrirla.
- `retrieve` incrementa `views_count` de forma atómica solo si `is_bot_request(request)` es
  falso (`views.py:482-484`).
- El `owner` se fija siempre desde `request.user` en `perform_create` (`views.py:439`) y es
  `read_only` en el serializer (`serializers.py:173`, `:197-203`).
- `create` soporta idempotencia por cabecera `Idempotency-Key`, con clave derivada de
  `request.user.pk` (`views.py:443-450`), y la relectura filtra por `owner=request.user`
  (`views.py:454`).

### 2.2 Imágenes

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `GET /api/pending-image/{image_id}/` | `PendingImageView` `views.py:1082-1111`, ruta `urls.py:65` | ✅ | ✅ | =Aut. | ✅ | ninguno |
| `GET /api/media/{path}` | `ImageProxyView` `views.py:1040-1079`, ruta `urls.py:66` | ✅ | ✅ | =Aut. | ✅ | ninguno |
| `DELETE /api/properties/{id}/delete_image/` | ver §2.1 | ❌ | ✅ | ✅ | ✅ | ninguno |

Ambas vistas de imagen son `django.views.View` planas, **no DRF**: no pasan por
`JWTAuthentication` ni por ninguna `permission_class`. `PendingImageView` busca por id de fila
(nunca por ruta) y valida que el fichero esté dentro de `IMAGE_UPLOAD_TEMP_DIR`
(`views.py:1103-1105`), y responde `Cache-Control: no-store` (`:1110`). `ImageProxyView`
reenvía cualquier ruta bajo el bucket de MinIO configurado (`views.py:1047-1051`) con
`Cache-Control: public, max-age=31536000` (`:1068`).

No existe ningún ViewSet de `PropertyImage`: la subida se hace con el campo `uploaded_images`
del `PropertySerializer` (`serializers.py:175-185`) y el borrado con `images_to_delete`
(`serializers.py:186-190`, `:339`, que filtra por `property=instance`).

### 2.3 Mapa y geografía

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `GET /api/properties/map_points/` | `views.py:578` | ✅ | ✅ | =Aut. | ✅ | `map_points` 120/min |
| `GET /api/provinces/` | `ProvinceViewSet` `views.py:149`, `AllowAny` `:156` | ✅ | ✅ | =Aut. | ✅ | ninguno |
| `GET /api/provinces/{id}/` | ídem (`ReadOnlyModelViewSet`) | ✅ | ✅ | =Aut. | ✅ | ninguno |
| `GET /api/provinces/{id}/cities/` | `views.py:175-188` | ✅ | ✅ | =Aut. | ✅ | ninguno |
| `GET /api/cities/` | `CityViewSet` `views.py:191`, `AllowAny` `:198` | ✅ | ✅ | =Aut. | ✅ | ninguno |
| `GET /api/cities/{id}/` | ídem | ✅ | ✅ | =Aut. | ✅ | ninguno |

Ambos son `ReadOnlyModelViewSet`: no exponen `POST`/`PATCH`/`DELETE`. El CRUD de
`Province`/`City` solo existe en el admin de Django (`backend/real_estate/admin.py:12-31`).

### 2.4 Leads (`LeadViewSet`, `views.py:844`)

`get_permissions`: `AllowAny` solo para `create`, `IsAuthenticated` para el resto
(`views.py:857-860`). `http_method_names` limita a `get, post, patch, delete, head, options`
(`views.py:855`), así que no hay `PUT`.

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `POST /api/leads/` | `views.py:857-859`, `perform_create` `:876-878` | ✅ | ✅ | ➖ | ✅ | **ninguno** |
| `GET /api/leads/` | `get_queryset` `views.py:867-874` | ❌ | ✅ (0 filas si no es dueño) | ✅ solo los de sus propiedades | ✅ todos | ninguno |
| `GET /api/leads/{id}/` | ídem | ❌ | ❌ (404 fuera de su ámbito) | ✅ | ✅ | ninguno |
| `PATCH /api/leads/{id}/` | `LeadStatusSerializer` `views.py:862-865`, `serializers.py:473-479` | ❌ | ❌ (404) | ✅ solo `status` | ✅ | ninguno |
| `DELETE /api/leads/{id}/` | `views.py:855` + queryset filtrado | ❌ | ❌ (404) | ✅ | ✅ | ninguno |

En `create`, `status` es `read_only` (`serializers.py:460`), así que un anónimo no puede crear
un lead ya marcado. Tras guardar se dispara `LeadNotificationService().notify_created(lead)`
(`views.py:878`, servicio nuevo en `services/notifications.py:13-22`), que traga cualquier
excepción y la registra con `logger.exception`.

### 2.5 Publicación asistida (`PendingPublicationViewSet`, `views.py:881`)

`get_permissions`: `AllowAny` para `create`, `[IsAuthenticated, IsAdminUser]` para el resto
(`views.py:891-894`). `http_method_names`: `get, post, patch, head, options` (`:888`).

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `POST /api/pending-publications/` | `views.py:891-894`, `perform_create` `:926-928` | ✅ | ✅ | ➖ | ✅ | `pending_create` 10/min |
| `GET /api/pending-publications/` | `get_queryset` `views.py:903-919` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `GET /api/pending-publications/{id}/` | ídem | ❌ | ❌ | ➖ | ✅ | ninguno |
| `PATCH /api/pending-publications/{id}/` | `PendingPublicationStatusSerializer` `views.py:921-924` | ❌ | ❌ | ➖ | ✅ solo `status` | ninguno |

Doble barrera: además del permiso, `get_queryset` devuelve `PendingPublication.objects.none()`
si el usuario no es staff (`views.py:905-906`). `status` es `read_only` en la creación
(`serializers.py:490`).

### 2.6 Actividad (`ActivityEventViewSet`, `views.py:931`)

`get_permissions`: `AllowAny` para `create`, `[IsAuthenticated, IsAdminUser]` para el resto
(`views.py:943-946`). `http_method_names`: `get, post, head, options` (`:936`) — no hay
`PATCH`/`DELETE`.

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `POST /api/activity-events/` | `views.py:943-945` | ✅ | ✅ | ➖ | ✅ | `activity_create` 30/min |
| `GET /api/activity-events/` | `get_queryset` `views.py:955-974` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `GET /api/activity-events/{id}/` | ídem | ❌ | ❌ | ➖ | ✅ | ninguno |

En `create` el cliente no controla la identidad: `user` se toma de `request.user` solo si está
autenticado, si no queda `None`, e `is_bot` se decide en servidor a partir del User-Agent,
ignorando lo que mande el cliente (`serializers.py:534-544`; `is_bot` es `read_only` en
`:516`). `event_name` se valida contra alfanuméricos y `_-.` (`serializers.py:523-527`) y
`payload` debe ser un objeto (`:529-532`).

### 2.7 Cuenta y autenticación

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `POST /api/login/` | `CustomTokenObtainPairView` `views.py:977`, ruta `urls.py:42` | ✅ | ✅ | ➖ | ✅ | **ninguno** |
| `POST /api/token/refresh/` | `TokenRefreshView` (SimpleJWT), ruta `urls.py:43` | ✅ | ✅ | ➖ | ✅ | **ninguno** |
| `POST /api/register/` | `RegisterView` `views.py:981`, `AllowAny` `:984` | ✅ | ✅ | ➖ | ✅ | **ninguno** |
| `POST /api/auth/google/` | `GoogleLoginView` `views.py:987`, `AllowAny` `:992` | ✅ | ✅ | ➖ | ✅ | **ninguno** |
| `POST /api/verify-email/` | `VerifyEmailView` `views.py:1114`, `AllowAny` `:1117` | ✅ | ✅ | ➖ | ✅ | **ninguno** |
| `POST /api/resend-verification/` | `ResendVerificationView` `views.py:1188`, `AllowAny` `:1191` | ✅ | ✅ | ➖ | ✅ | **ninguno** |
| `POST /api/request-password-reset/` | `RequestPasswordResetView` `views.py:1226`, `AllowAny` `:1229` | ✅ | ✅ | ➖ | ✅ | **ninguno** |
| `POST /api/reset-password/` | `ResetPasswordView` `views.py:1258`, `AllowAny` `:1261` | ✅ | ✅ | ➖ | ✅ | **ninguno** |
| `POST /api/request-email-change/` | `RequestEmailChangeView` `views.py:1305`, `IsAuthenticated` `:1308` | ❌ | ✅ solo su cuenta | ✅ | ✅ | ninguno |
| `POST /api/verify-email-change/` | `VerifyEmailChangeView` `views.py:1357`, `IsAuthenticated` `:1360` | ❌ | ✅ solo su cuenta | ✅ | ✅ | ninguno |
| `GET /api/me/` | `MeView` `views.py:1428`, `get_object` `:1434` | ❌ | ✅ solo su cuenta | ✅ | ✅ | ninguno |
| `PUT\|PATCH /api/me/` | ídem (`RetrieveUpdateAPIView`) | ❌ | ✅ solo `username`, `first_name`, `last_name` | ✅ | ✅ | ninguno |
| `POST /api/change-password/` | `ChangePasswordView` `views.py:1438`, `IsAuthenticated` `:1442` | ❌ | ✅ solo su cuenta | ✅ | ✅ | ninguno |

Detalles verificados:
- `MeView.get_object` devuelve `self.request.user` (`views.py:1435`): no acepta `pk`, luego no
  hay IDOR posible. `UserProfileSerializer` marca `id`, `email`, `is_email_verified`,
  `avatar_url` e `is_staff` como `read_only` (`serializers.py:722`), así que **un usuario no
  puede auto-concederse `is_staff` por `/api/me/`**.
- `ChangePasswordSerializer` exige la contraseña actual (`serializers.py:735-738`).
- `RequestPasswordResetView` responde siempre 200 aunque el correo no exista, para no filtrar
  qué cuentas están registradas (`views.py:1250-1255`). `ResendVerificationView` y
  `VerifyEmailView`, en cambio, responden **404 "Usuario no encontrado"** (`views.py:1131-1134`,
  `:1204-1207`): son un oráculo de existencia de cuentas.
- `RequestEmailChangeView` invalida los tokens previos antes de emitir uno nuevo
  (`views.py:1323`) y `VerifyEmailChangeView` comprueba que el correo destino no esté ya en uso
  (`views.py:1387-1391`).

### 2.8 Público / operación

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `GET /api/market-stats/` | `MarketStatsView` `views.py:1456`, `AllowAny` `:1459`, ruta `urls.py:62` | ✅ | ✅ | =Aut. | ✅ | **ninguno** |
| `GET /api/health/` | `health` `backend/estate_map/observability.py:96`, ruta `estate_map/urls.py:6` | ✅ | ✅ | =Aut. | ✅ | ninguno |

`health` es una función Django plana sin decoradores de permiso; devuelve estado de base de
datos, caché, worker, `RELEASE_SHA` y `ENVIRONMENT`
(`observability.py:96-130`).

### 2.9 Admin y métricas

Todos exigen `[IsAuthenticated, IsAdminUser]` a nivel de clase. Ninguno declara throttle, y
`AntiScraperScopedThrottle` de todos modos exime a staff.

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `GET /api/admin/dashboard/` | `AdminDashboardView` `views.py:1598`, perms `:1600`, ruta `urls.py:69` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `GET /api/admin/system-status/` | `AdminSystemStatusView` `views.py:1706`, perms `:1709`, `get` `:1711` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `POST /api/admin/system-status/` | ídem, `post` `views.py:1808-1819` (resolver incidencia) | ❌ | ❌ | ➖ | ✅ | ninguno |
| `GET /api/admin/users/` | `AdminUserViewSet` `views.py:1822`, perms `:1824`, ruta `urls.py:71` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `GET /api/admin/users/{pk}/` | `AdminUserDetailSerializer` `views.py:1869-1872`, ruta `urls.py:72` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `PATCH /api/admin/users/{pk}/` | `partial_update` `views.py:1874-1907` | ❌ | ❌ | ➖ | ✅ solo `is_active` e `is_staff` (`:1876`) | ninguno |
| `DELETE /api/admin/users/{pk}/` | `destroy` `views.py:1909-1922` | ❌ | ❌ | ➖ | ✅ (no a sí mismo, `:1911`) | ninguno |
| `GET /api/admin/properties/` | `AdminPropertyViewSet` `views.py:1925`, perms `:1927`, ruta `urls.py:73` | ❌ | ❌ | ➖ | ✅ (incluye inactivas) | ninguno |
| `GET /api/admin/properties/stats/` | `stats` `views.py:2054-2079`, ruta `urls.py:74` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `POST /api/admin/properties/bulk-status/` | `bulk_status` `views.py:2010-2052`, ruta `urls.py:75` | ❌ | ❌ | ➖ | ✅ máx. 200 ids (`:2022`) | ninguno |
| `GET /api/admin/properties/{pk}/` | `views.py:1974-1977`, ruta `urls.py:76` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `PATCH /api/admin/properties/{pk}/` | `partial_update` `views.py:1979-1998` | ❌ | ❌ | ➖ | ✅ solo `status, title, price, city, description` (`:1938`) | ninguno |
| `DELETE /api/admin/properties/{pk}/` | `destroy` `views.py:2000-2008` | ❌ | ❌ | ➖ | ✅ **cualquier propiedad, incluidas las de usuarios** | ninguno |

Las métricas de propietario del dashboard vienen de
`AdminMetricsService(now=now).build()` (`views.py:1687`), definido en
`backend/real_estate/services/admin_metrics.py`. **Ese servicio no expone ninguna URL propia**
(grep confirmado: solo lo importan `views.py:1607` y los tests), así que su única superficie
HTTP es `GET /api/admin/dashboard/`, que sí exige staff.

Todas las mutaciones admin dejan traza: `admin_audit action=...` con `actor=request.user.pk`
en `views.py:1815-1818`, `:1901-1904`, `:1918-1921`, `:1993-1996`, `:2004-2007`, `:2048-2051` y
`backend/ingesta/api.py:360-363`.

### 2.10 Ingesta (`backend/ingesta/api.py`)

Los 9 endpoints son funciones `@api_view` con
`@permission_classes([IsAuthenticated, IsAdminUser])`. **Verificado uno por uno**: ninguno queda
sin la doble comprobación.

| Endpoint (método + ruta) | Vista/`archivo:línea` | Anónimo | Autenticado | Propietario | Staff | Throttle |
|---|---|---|---|---|---|---|
| `GET /api/admin/ingesta/sources/` | `ingesta/api.py:112-117`, ruta `urls.py:79` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `GET /api/admin/ingesta/runs/` | `ingesta/api.py:120-136`, ruta `urls.py:80` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `GET /api/admin/ingesta/runs/{run_id}/` | `ingesta/api.py:139-146`, ruta `urls.py:81` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `POST /api/admin/ingesta/launch/` | `ingesta/api.py:436-482`, ruta `urls.py:82` | ❌ | ❌ | ➖ | ✅ lanza subproceso de scraping | ninguno |
| `POST /api/admin/ingesta/cancel/` | `ingesta/api.py:149-175`, ruta `urls.py:83` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `GET /api/admin/ingesta/properties/` | `ingesta/api.py:191-262`, ruta `urls.py:84` | ❌ | ❌ | ➖ | ✅ | ninguno |
| `POST /api/admin/ingesta/refresh-property/` | `ingesta/api.py:372-433`, ruta `urls.py:85` | ❌ | ❌ | ➖ | ✅ re-scrapea 1 anuncio | ninguno |
| `GET /api/admin/ingesta/maintenance/` | `ingesta/api.py:313-323`, ruta `urls.py:86` | ❌ | ❌ | ➖ | ✅ solo lectura | ninguno |
| `POST /api/admin/ingesta/maintenance/cleanup/` | `ingesta/api.py:326-369`, ruta `urls.py:87` | ❌ | ❌ | ➖ | ✅ borra en lotes ≤200 | ninguno |

Salvaguardas del borrado masivo: exige la frase exacta `"ELIMINAR IMPORTADAS"` en el cuerpo
(`ingesta/api.py:334-338`), acota el lote a 1–200 (`:343`), la consulta base filtra
`is_imported=True` (`:277`) y hay una comprobación explícita por fila dentro de la transacción
para que **nunca** entre una publicación creada por un usuario (`:352-354`).
`launch` impide dos corridas simultáneas de la misma fuente y responde 409 (`:454-460`).

### 2.11 Admin de Django (`/admin/`)

| Superficie | `archivo:línea` | Quién entra | Qué puede hacer |
|---|---|---|---|
| Sitio `/admin/` | `estate_map/urls.py:7` | `is_active` **y** `is_staff` (comportamiento estándar de `AdminSite.has_permission`) | Depende de los permisos por modelo; el superusuario los tiene todos |
| `User` | `real_estate/admin.py:81` (`UserAdmin` por defecto) | staff con permiso | **CRUD completo, incluidos `is_staff` e `is_superuser`** |
| `Province` / `City` | `real_estate/admin.py:12-31` | staff con permiso | CRUD completo (única vía para editarlos) |
| `Property` / `PropertyImage` | `real_estate/admin.py:39-50` | staff con permiso | CRUD completo, sin restricción de campos |
| `Lead` / `PendingPublication` | `real_estate/admin.py:53-68` | staff con permiso | CRUD; `created_at`/`updated_at` de solo lectura |
| `ActivityEvent` | `real_estate/admin.py:71-78` | staff con permiso | Todos los campos son `readonly` (`:76-78`), pero el borrado sigue permitido |
| `Fuente` (ingesta) | `ingesta/admin.py:16-87` | staff | CRUD + botones "Cargar 500 más" / "Ejecutar todo" que lanzan el scraper; `lanzar_view` revalida `is_staff` y si no lanza `PermissionDenied` (`:49-50`) |
| `IngestaRun` | `ingesta/admin.py:90-131` | staff | Solo lectura (`readonly_fields` con todos los campos, `:95`) y `has_add_permission=False` (`:99-100`); acción de cancelar (`:109-116`) |
| `ListingCruda` | `ingesta/admin.py:134-139` | staff | CRUD |

---

## 3. Reglas transversales

### 3.1 Filtrado de queryset por propietario

| Vista | Regla | `archivo:línea` |
|---|---|---|
| `PropertyViewSet` (público) | Excluye `status='inactive'` e `is_duplicate=True` para **todos**, incluido el dueño | `views.py:321` |
| `PropertyViewSet.my_properties` | staff → `Property.objects.all()`; resto → `filter(owner=request.user)`. Es la única vía para ver las inactivas propias, y llega paginada de 24 en 24 | `views.py:814` |
| `LeadViewSet` | Anónimo → `none()`; staff → todo; resto → `filter(property__owner=user)` | `views.py:867-874` |
| `PendingPublicationViewSet` | No-staff → `none()` (redundante con el permiso, a propósito) | `views.py:903-906` |
| `ActivityEventViewSet` | Sin filtro por usuario: la lista completa está protegida solo por `IsAdminUser` | `views.py:955-974` |
| `AdminUserViewSet` / `AdminPropertyViewSet` | Sin filtro: staff ve todo | `views.py:1832-1867`, `:1940-1972` |

### 3.2 Comprobaciones a nivel de objeto

- La única `has_object_permission` del proyecto es `IsOwnerOrReadOnly` (`permissions.py:9-15`),
  y solo la aplica `PropertyViewSet`.
- En `LeadViewSet` y en los viewsets admin **no hay** comprobación de objeto: la protección es
  el filtrado del queryset, que convierte el acceso ajeno en 404 en vez de 403. Es correcto,
  pero significa que si alguien amplía el queryset se pierde la protección sin que salte ningún
  permiso.
- `delete_image` filtra la imagen por `property=property_instance` (`views.py:831-834`), pero
  no valida quién es el dueño de `property_instance`; ver §4.
- El borrado de imágenes vía `images_to_delete` sí acota por propiedad
  (`serializers.py:339`), y la propiedad ya pasó por `IsOwnerOrReadOnly`.

### 3.3 Campos que el cliente no controla

`PropertySerializer.read_only_fields` (`serializers.py:197-203`, ampliado en el diff sin
commitear) blinda `owner`, `views_count`, `source`, `source_agency`, `source_url`,
`external_id`, `is_imported`, `dedup_key`, `image_hash`, `is_duplicate`, `duplicate_of`,
`imported_at`, `source_published_at`, `source_updated_at` y `last_seen_at`. Antes del cambio
solo eran `created_at`, `updated_at` y `owner`, es decir un usuario podía marcarse
`is_imported`/`is_duplicate` o inflar `views_count` al crear o editar una propiedad. **Este
endurecimiento está sin commitear**: en `main` el agujero sigue abierto.

Otros campos blindados: `Lead.status` (`serializers.py:460`),
`PendingPublication.status` (`:490`), `ActivityEvent.user`/`property`/`is_bot` (`:516`),
`User.is_staff`/`email`/`is_email_verified` en el perfil propio (`:722`).

### 3.4 Caché pública y usuarios autenticados

`_is_public_read` (`views.py:92-94`) exige método `GET`/`HEAD` **y** usuario no autenticado.
Solo entonces la respuesta se lee de Redis, se escribe en Redis y se etiqueta
`Cache-Control: public` (`views.py:97-102`). Esto evita que una respuesta autenticada se sirva
desde una entrada compartida o viaje con `public` junto a una cabecera `Authorization`.
Aplica a `provinces:list`, `province:cities`, `cities:list`, `intelligence`, `map_points`,
`locations`, `catalog`, `properties:summary` y `market_stats`.

### 3.5 Throttling como capa de control

- **No hay `DEFAULT_THROTTLE_CLASSES`** en `settings.py` (solo `DEFAULT_THROTTLE_RATES`,
  `:172-183`). Por tanto solo se limitan las vistas que declaran `get_throttles`.
- Tasas: `activity_create` 30/min, `pending_create` 10/min, `map_points` 120/min,
  `property_list` 60/min, `property_write` 30/hora (`settings.py:173-182`).
- Quién aplica cada una:
  - `AntiScraperScopedThrottle` (`throttling.py:42-51`) → `map_points` y `property_list`
    (`views.py:290-295`). **Exime a staff** (`throttling.py:47-48`) y a clientes internos
    (`throttling.py:49-50`).
  - `ScopedRateThrottle` plano → `property_write` en `create`/`update`/`partial_update`
    (`views.py:296-298`), `pending_create` (`views.py:896-901`) y `activity_create`
    (`views.py:948-953`). Estas **no** eximen a staff.
- `_is_internal_client` (`throttling.py:24-39`): si llega `X-Forwarded-For` se trata como
  visitante normal; si no, se exime cuando `REMOTE_ADDR` está en `THROTTLE_EXEMPT_IPS`
  (`settings.py:188-190`) o es una IP privada/loopback. Esto es lo que evita que todo el SSR de
  Next.js comparta un único bucket.
- El backend de caché es Redis compartido (`settings.py:449-462`), así que los contadores de
  throttle son consistentes entre procesos. Ojo: `IGNORE_EXCEPTIONS: True` (`:455`) significa
  que **si Redis cae, el throttling deja de contar** y las peticiones pasan.

---

## 4. Riesgos y huecos detectados

Ordenados por impacto. Todos verificados en el código, sin extrapolar.

**1. `DELETE /api/properties/{id}/delete_image/` no comprueba propiedad.**
`views.py:818` declara `@action(..., permission_classes=[IsAuthenticated])`. En DRF, los kwargs
de `@action` **sustituyen** los `*_classes` del viewset (documentado en
`rest_framework/decorators.py:140-143`), así que `IsOwnerOrReadOnly` no se evalúa en esta
acción. `self.get_object()` (`views.py:821`) solo ejecuta `IsAuthenticated`, que no implementa
`has_object_permission`. Resultado: **cualquier usuario autenticado puede borrar imágenes de la
propiedad de cualquier otro**, pasando `image_id`. El nombre y el docstring ("Delete a specific
image from a property") sugieren una operación del dueño. Mitigante: el frontend no llama a este
endpoint en ningún sitio (grep en `frontend/` sin resultados), es superficie muerta pero
alcanzable.

**2. `is_email_verified` no bloquea absolutamente nada.**
El campo existe (`models.py:11`) y se escribe en varios flujos, pero la única lectura en un
camino de autenticación es `serializers.py:582`:
`if not user.is_active and not user.is_email_verified`. Como `RegisterSerializer` crea al
usuario con `is_active=False` (`serializers.py:650`) y `VerifyEmailView` pone ambos flags a la
vez (`views.py:1162-1164`), la condición que realmente bloquea es `is_active`, que Django y
SimpleJWT ya verifican por su cuenta. Ninguna `permission_class`, ningún viewset y ningún
endpoint leen `is_email_verified`. Consecuencia concreta: una cuenta con `is_active=True` y
`is_email_verified=False` (creada desde el admin de Django, o reactivada por staff con
`PATCH /api/admin/users/{pk}/`, que permite justamente `is_active`, `views.py:1876`) puede
iniciar sesión y publicar propiedades sin haber verificado nunca su correo. Si el requisito de
producto es "verificado para publicar", hoy no está implementado.

**3. `POST /api/leads/` es público y no tiene throttle.**
`LeadViewSet` no define `get_throttles` (contrastar con `PendingPublicationViewSet`
`views.py:896-901` y `ActivityEventViewSet` `views.py:948-953`, que sí limitan su `create`
público a 10/min y 30/min). Los tres son el mismo patrón —POST anónimo que crea una fila y
dispara un correo— pero solo dos están limitados. Además `perform_create` envía un correo de
notificación de forma síncrona (`views.py:878` → `services/notifications.py:16`), así que cada
POST cuesta una conexión SMTP.

**4. Ningún endpoint de autenticación tiene límite de tasa.**
`POST /api/login/`, `/api/register/`, `/api/token/refresh/`, `/api/auth/google/`,
`/api/reset-password/`, `/api/verify-email/` y `/api/resend-verification/` son todos `AllowAny`
sin throttle. `resend-verification` y `request-password-reset` además envían un correo por
petición. No hay bloqueo por intentos fallidos en ninguna parte del backend.

**5. `GET /api/properties/{id}/intelligence/` es `AllowAny` y publica métricas de demanda.**
`views.py:488` marca la acción como `AllowAny` y el payload incluye
`demand.views` (`views_count` de la propiedad), `demand.contacts` (clics de contacto reales) y
`demand.city_median_views` (`views.py:570-571`). Es coherente con el nombre del endpoint, pero
va en contra de la regla del proyecto de no exponer contadores de visitas públicamente. También
es el endpoint de detalle más caro (recorre todo el inventario activo de la ciudad,
`views.py:503-512`) y **no tiene throttle**, a diferencia de `map_points` y `list`.

**6. `GET /api/properties/{id}/` incrementa `views_count` sin throttle.**
`views.py:483-484`. Solo se filtran bots por User-Agent (`:482`). Cualquiera que no se declare
crawler puede inflar el contador de demanda de una propiedad en bucle, y ese contador alimenta
tanto `intelligence` como el panel del propietario.

**7. Cualquier `is_staff` puede promover a otros a `is_staff` y borrar usuarios.**
`AdminUserViewSet.partial_update` permite `is_staff` (`views.py:1876`) y `destroy` borra
usuarios (`views.py:1909-1922`). Las únicas salvaguardas son contra uno mismo: no puedes
quitarte staff (`:1886-1890`), no puedes desactivarte (`:1891-1895`) y no puedes borrarte
(`:1911-1915`). **No hay nada que reserve estas operaciones a `is_superuser`**: un staff puede
degradar o eliminar a un superusuario, o promover a un tercero. `IsAdminUser`
(`permissions.py:23-24`) nunca mira `is_superuser`, en todo el backend REST.

**8. `/api/media/{path}` es un proxy abierto al bucket de MinIO.**
`ImageProxyView` (`views.py:1040-1079`) no tiene autenticación, ni permisos, ni throttle, y
reconstruye la URL con el path recibido tal cual (`:1051`). Está acotado al bucket configurado,
así que no permite salir de él, pero sí enumerar y descargar cualquier objeto del bucket sin
coste para el atacante, con `Cache-Control: public, max-age=31536000` (`:1068`). Lo mismo, en
menor medida, para `PendingImageView` (`views.py:1082`): expone públicamente por id numérico
cualquier imagen en estado `PENDING`, incluidas las de propiedades aún no publicadas.

**9. `resend-verification` y `verify-email` filtran qué correos están registrados.**
Responden 404 `"Usuario no encontrado"` (`views.py:1131-1134`, `:1204-1207`), mientras que
`request-password-reset` responde 200 genérico precisamente para evitarlo
(`views.py:1250-1255`). Inconsistencia entre endpoints equivalentes.

**10. El propietario no puede gestionar sus propias propiedades inactivas por la ruta CRUD.**
`get_queryset` excluye `status='inactive'` (`views.py:321`) sin excepción para el dueño, así que
`GET/PATCH/DELETE /api/properties/{id}/` devuelven 404 para una propiedad propia inactiva. Solo
`my_properties` (`views.py:814`) la lista. Es un hueco funcional, no de seguridad, pero convierte
el estado `inactive` en irreversible desde la API pública. Un usuario con `is_staff` sí tiene esa
excepción desde que el panel de inventario le muestra el catálogo completo, así que hoy la única
forma de reactivar una propiedad es que la toque un administrador.

**11. Si Redis cae, el throttling desaparece.**
`CACHES["default"]["OPTIONS"]["IGNORE_EXCEPTIONS"] = True` (`settings.py:455`). Es una decisión
deliberada y documentada para que el sitio siga sirviendo, pero implica que la única capa
anti-abuso de los POST públicos desaparece durante una caída de Redis.

**12. El frontend no es la frontera de seguridad, y aquí es literal.**
- **No existe `frontend/middleware.ts`** (búsqueda en todo el repo sin resultados): no hay
  ninguna protección en el edge ni en servidor. Toda página "privada" es un bundle público que
  solo se protege tras hidratar en el navegador.
- Los tokens viven en `localStorage`/`sessionStorage`
  (`frontend/lib/auth-context.tsx:135-139`, `frontend/lib/api.ts:119`), **no** en cookies
  `httpOnly`, y se envían como `Authorization: Bearer` (`frontend/lib/api.ts:132`).
- El rol staff del frontend sale de decodificar el JWT **sin verificar la firma**
  (`frontend/lib/auth-context.tsx:32-57`, `is_staff` en `:56`) y nunca se contrasta contra
  `/api/me/`. `AdminRoute` (`frontend/components/AdminRoute.tsx:11-19`, `:32`) solo decide qué
  se pinta; falsificar el payload local muestra la carcasa del panel, pero el backend sigue
  rechazando cada llamada. **Es UX, no autorización.**
- Los `useEffect` de carga de datos de las páginas admin se disparan en el mismo componente que
  devuelve `<AdminRoute>`, así que la petición sale antes del veredicto del guard (p. ej.
  `frontend/app/admin/page.tsx:181-183` llama a `/admin/dashboard/` sin condición). Lo único
  que impide la fuga es la autorización del backend.
- Solo hay una comprobación en servidor en todo el frontend: el webhook
  `frontend/app/api/revalidate/route.ts:21-24`, que compara `x-revalidate-secret` con
  `REVALIDATE_SECRET` mediante un `!==` normal (no comparación en tiempo constante) y responde
  503 si el secreto no está configurado (`:15-19`).
- `next.config.js:57-91` añade HSTS, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy` y `Permissions-Policy`, pero **no CSP** (ausencia deliberada, comentada en
  `:58-61`). Con los tokens en `localStorage`, eso eleva el impacto de un XSS a robo de sesión.

---

## 5. Notas de verificación

- `dj-rest-auth` y `allauth` están instalados pero **sus URLs no están montadas**
  (`estate_map/urls.py:5-9`, `real_estate/urls.py:40-90`): `real_estate/adapters.py` no es
  alcanzable por HTTP en la configuración actual.
- No existe `SessionAuthentication` en DRF: una sesión del admin de Django **no** autentica
  contra `/api/`.
- `AdminMetricsService` (`real_estate/services/admin_metrics.py`) no publica ninguna URL propia;
  se consume desde `AdminDashboardView` (`views.py:1607`, `:1687`), que exige staff.
- `services/notifications.py` (fichero nuevo) solo mueve el envío de correos a servicios con
  `logger.exception`; **no cambia ningún permiso** respecto al `try/except` con `print` que
  sustituye.
- `services/authentication.py` (fichero nuevo) sí endurece el login con Google: ahora exige
  `email_verified is True` en los claims (`:31-32`), cosa que el código anterior en
  `views.py` no comprobaba.
