# Arquitectura de Geo Propiedades Ecuador

Verificado contra el código el 2026-08-04.

Este documento describe **este** sistema: el portal inmobiliario
`geopropiedadesecuador.com`, compuesto por un backend Django/DRF (`backend/`) y
un frontend Next.js App Router (`frontend/`), desplegado sobre un host Contabo
híbrido. Cada afirmación lleva su cita `archivo:línea`.

Documentos hermanos: [caching](./caching.md) · [celery](./celery.md) ·
[redis](./redis.md) · [actividad y métricas](./activity-metrics.md) ·
[flujos de trabajo](../workflows/) ·
[matriz de permisos](../permissions/matrix.md) ·
[errores de API](../errors/api-errors.md).

---

## 1. Diagrama de componentes

El rasgo definitorio del despliegue es que **solo las aplicaciones corren en
Docker**. Postgres, Redis, MinIO y nginx son servicios nativos del host, y ese
host de 8 GB / 4 vCPU está compartido con otros sistemas (Aents y el stack de
correo) — así lo declara el propio `docker-compose.prod.yml:80-82` al justificar
los límites del worker, y `deploy/nginx-rate-limit.conf.example:9`
("Nginx native (not Docker) runs on the Contabo prod host").

```
                          Internet (navegador, Googlebot, Bingbot)
                                        |
                                        | 443
        ========================================================================
        |                    HOST CONTABO (8 GB / 4 vCPU)                      |
        |                 compartido: Aents + GeoPropiedades + correo          |
        |                                                                      |
        |   +--------------------------------------------------------------+   |
        |   |  nginx  (NATIVO en el host, TLS + rate limiting)             |   |
        |   |  deploy/nginx-rate-limit.conf.example:9,17-34                |   |
        |   +----------------+---------------------------+-----------------+   |
        |                    |                           |                     |
        |        127.0.0.1:3000            127.0.0.1:8000                      |
        |                    |                           |                     |
        |   ,,,,,,,,,,,,,,,,,|,,,,,,,,,,,,,,,,,,,,,,,,,,,|,,,,,,,,,,,,,,,,,,   |
        |   :  DOCKER        v                           v                 :   |
        |   :  +---------------------+   SSR/ISR   +----------------------+:   |
        |   :  | estatemap_frontend  |------------>| estatemap_backend    |:   |
        |   :  | Next.js standalone  | http://     | gunicorn, 3 workers  |:   |
        |   :  | node server.js      | backend:8000| Django 5 + DRF       |:   |
        |   :  +---------------------+             +----------------------+:   |
        |   :            ^                                   |             :   |
        |   :            | POST /api/revalidate              | .delay()    :   |
        |   :            | (x-revalidate-secret)             v             :   |
        |   :            |                         +----------------------+:   |
        |   :            +-------------------------| estatemap_worker     |:   |
        |   :              tasks.revalidate_       | celery worker -B     |:   |
        |   :              frontend_tags           | 512 MB / cpu_shares  |:   |
        |   :                                      |          256         |:   |
        |   :                                      +----------------------+:   |
        |   :        red estatemap_network  +  red externa aents_shared    :   |
        |   ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,   |
        |                    |            |             |                      |
        |                    v            v             v                      |
        |          +-----------+  +--------------+  +--------+                 |
        |          | Postgres  |  | Redis        |  | MinIO  |   (todos        |
        |          | (nativo)  |  | (nativo,     |  |(nativo)|    NATIVOS)     |
        |          |           |  |  compartido) |  |        |                 |
        |          +-----------+  +--------------+  +--------+                 |
        |                          DB 0 broker Celery                          |
        |                          DB 1 caché Django                           |
        |                          DB 2/3 aents                                |
        ========================================================================
```

El registro de índices de Redis está escrito en
`backend/estate_map/settings.py:374-387`: DB 0 broker de este proyecto, DB 1
caché de Django de este proyecto, DB 2/3 de `aents`, DB 4+ libres. Los workers
nunca se comparten entre sistemas (`backend/estate_map/celery.py:4-7`).

---

## 2. Servicios

### Producción — `docker-compose.prod.yml`

| Servicio | Imagen / build | Puerto publicado | Rol |
|---|---|---|---|
| `estatemap_backend` | build `./backend` (`Dockerfile`, `python:3.12-slim`) | `127.0.0.1:8000:8000` (`:36`) | `gunicorn estate_map.wsgi:application --workers 3` (`:25`). Healthcheck contra `/api/health/` con `X-Forwarded-Proto: https` (`:39`) |
| `estatemap_worker` | build `./backend` | — (sin puertos) | `celery -A estate_map worker -B --concurrency=1 --max-tasks-per-child=50` (`:69`). Beat embebido |
| `estatemap_frontend` | build `./frontend/Dockerfile.prod` | `127.0.0.1:3000:3000` (`:128`) | Next.js standalone, `node server.js`. Healthcheck contra `/robots.txt` (`:131`) |
| Postgres | **nativo en el host** | — | No hay servicio en el compose de producción; `.env.prod.example:21-27` lo declara "Pre-instalado en servidor" |
| Redis | **nativo en el host** | — | Alcanzado como `redis://aents-redis:6379/0` y `/1` a través de la red externa `aents_shared` (`:17-20`) |
| MinIO | **nativo en el host** | — | `.env.prod.example:30-33` lo declara "Pre-instalado en servidor" |
| nginx | **nativo en el host** | 80/443 | Terminación TLS y rate limiting; ver `deploy/nginx-rate-limit.conf.example` |

Redes (`docker-compose.prod.yml:150-158`): `estatemap_network` (bridge propia) y
`aents_shared`, declarada `external: true` porque la crea el stack de Aents. El
frontend se conecta solo a `estatemap_network` — comentario explícito en `:141`:
"No aents_shared here: the frontend never talks to the broker". Backend y worker
además reciben `extra_hosts: host.docker.internal:host-gateway` (`:27-28`,
`:71-72`) para alcanzar los servicios nativos del host.

Volúmenes de producción (`:145-148`): `static_volume`, `media_volume` y
`pending_images`. Este último es el que hace funcionar el pipeline de imágenes:
el contenedor web escribe el original en `/app/tmp/pending-images` y el worker lo
lee del mismo volumen (`:30-33` y `:74-77`; ver también
`backend/real_estate/uploads.py:9-11`).

### Desarrollo — `docker-compose.yml`

| Servicio | Imagen / build | Puertos | Rol |
|---|---|---|---|
| `db` | `postgres:15` (`:4`) | `5434:5432` (`:10`) | Postgres desechable, volumen `postgres_data` |
| `minio` | `minio/minio:latest` (`:19`) | `9020:9000`, `9021:9001` (`:26-27`) | S3 local, volumen `minio_data` |
| `redis` | `redis:7-alpine` (`:61`) | `6389:6379` (`:64`) | Broker + caché de desarrollo. El comentario de `:59-60` aclara que producción reutiliza el Redis del host |
| `backend` | build `./backend` | `8010:8000` (`:52`) | `migrate && init_minio.py && runserver` (`:45-48`), con bind mount `./backend:/app` |
| `worker` | build `./backend` | — | `celery -A estate_map worker -B --concurrency=1` (`:84`), mismo bind mount |
| `frontend` | build `./frontend/Dockerfile` (`node:20-alpine`) | `3010:3000` (`:103`) | `npm run dev`, con volúmenes anónimos para `node_modules` y `.next` (`:105-107`) |

### Diferencias dev ↔ prod que importan

| Aspecto | Desarrollo | Producción |
|---|---|---|
| Postgres / Redis / MinIO | contenedores del propio compose | nativos en el host, fuera del compose |
| Servidor WSGI | `runserver` (`docker-compose.yml:48`) | `gunicorn --workers 3` (`docker-compose.prod.yml:25`) |
| Código | bind mount `./backend:/app`, `./frontend:/app` | copiado en la imagen; sin bind mounts de código |
| Frontend | `next dev` sobre `node:20-alpine` | multi-stage `Dockerfile.prod` → `output: 'standalone'` (`frontend/next.config.js:4`) |
| Límites del worker | ninguno | `mem_limit: 512m`, `cpus: 1`, `cpu_shares: 256` (`:83-88`), rotación cada 50 tareas |
| Exposición | puertos publicados en todas las interfaces | ligados a `127.0.0.1` — solo nginx llega |
| Redes | red por defecto del compose | `estatemap_network` + `aents_shared` externa |
| Healthchecks | solo `db` y `redis` | `backend` y `frontend`, y el deploy espera a ambos |
| Migraciones | en el `command` del contenedor | paso separado del script de deploy |

---

## 3. Backend Django — `backend/estate_map/settings.py`

### Apps instaladas (`:24-45`)

Django estándar más `django.contrib.sites` (con `SITE_ID = 1`, `:47`), `rest_framework`,
`rest_framework.authtoken`, `rest_framework_simplejwt.token_blacklist`,
`corsheaders`, `storages`, la familia `allauth` (`account`, `socialaccount`,
`socialaccount.providers.google`), `dj_rest_auth` (+ `registration`) y las dos
apps propias: `real_estate` e `ingesta`.

El modelo de usuario es propio: `AUTH_USER_MODEL = "real_estate.User"` (`:160`),
definido en `backend/real_estate/models.py:7`.

### Middleware — el orden es deliberado (`:49-61`)

```
1. django.middleware.security.SecurityMiddleware
2. estate_map.upload_errors.UploadErrorMiddleware
3. estate_map.observability.ObservabilityMiddleware
4. django.contrib.sessions.middleware.SessionMiddleware
5. corsheaders.middleware.CorsMiddleware
6. django.middleware.common.CommonMiddleware
7. django.middleware.csrf.CsrfViewMiddleware
8. django.contrib.auth.middleware.AuthenticationMiddleware
9. django.contrib.messages.middleware.MessageMiddleware
10. django.middleware.clickjacking.XFrameOptionsMiddleware
11. allauth.account.middleware.AccountMiddleware
```

**`UploadErrorMiddleware`** (`backend/estate_map/upload_errors.py`) va en segunda
posición, por fuera de todo lo demás, porque las excepciones que captura las
lanza el *parser* de multipart de Django antes de que la vista exista. Traduce
tres fallos en JSON estable y en español: `RequestDataTooBig` → HTTP 413 "La
carga completa supera el tamaño máximo permitido de 50MB." (`:14-18`),
`TooManyFilesSent` → HTTP 400 "No se pueden enviar más de 10 archivos por
solicitud." (`:19-23`) y `SuspiciousOperation` → HTTP 400 (`:24-28`). Los límites
que las disparan están en `settings.py:347-350`.

**`ObservabilityMiddleware`** (`backend/estate_map/observability.py:51-93`) va
justo después, de modo que cubre la petición completa incluidos los errores de
sesión, CORS y CSRF, pero queda por dentro de `UploadErrorMiddleware` — el 413 ya
formateado se registra como respuesta normal. Ver §6.

`CorsMiddleware` va después de `SessionMiddleware` y antes de `CommonMiddleware`,
que es la posición que exige `django-cors-headers` para poder añadir cabeceras a
las respuestas que `CommonMiddleware` genera (redirecciones por `APPEND_SLASH`).

### Autenticación JWT (`:162-165`, `:192-211`)

DRF usa **solo** `JWTAuthentication` como clase de autenticación por defecto
(`:163-165`). La configuración de SimpleJWT:

- `ACCESS_TOKEN_LIFETIME`: 1 hora (`:193`).
- `REFRESH_TOKEN_LIFETIME`: 30 días (`:194`).
- `ROTATE_REFRESH_TOKENS: True` (`:195`) — cada uso del refresh emite uno nuevo.
- `BLACKLIST_AFTER_ROTATION: True` (`:196`), respaldado por la app
  `rest_framework_simplejwt.token_blacklist` (`:34`): el refresh rotado queda
  invalidado en base de datos y no puede reutilizarse.
- `UPDATE_LAST_LOGIN: True` (`:197`), `ALGORITHM: HS256` firmando con
  `SECRET_KEY` (`:199-200`), cabecera `Authorization: Bearer` (`:205`).

No se define `DEFAULT_PAGINATION_CLASS` a propósito (`:166-167`): los endpoints
públicos devuelven arrays planos y la paginación se declara por viewset
(`AdminPagination` en `backend/real_estate/views.py:131`).

`DEFAULT_THROTTLE_RATES` (`:172-183`) define seis ámbitos: `activity_create`
30/min, `pending_create` 10/min, `map_points` 120/min, `property_list` 60/min y
`property_write` 30/hour. Solo las vistas que declaran `throttle_scope` quedan
limitadas. `THROTTLE_EXEMPT_IPS` (`:188-190`) añade IPs exentas por encima de las
privadas y de loopback, que ya lo están; ver
`backend/real_estate/throttling.py:24-51`, donde `AntiScraperScopedThrottle`
exime al SSR interno de Next (peticiones sin `X-Forwarded-For` desde red privada)
y al personal `is_staff`.

### CORS (`:218-229`)

Si `CORS_ALLOWED_ORIGINS` viene definida se usa esa allowlist explícita y
`CORS_ALLOW_ALL_ORIGINS = False`. Si no viene y `DEBUG` es falso, el arranque
falla con `ImproperlyConfigured` (`:224`). `CORS_EXPOSE_HEADERS` (`:229`) publica
al navegador exactamente tres cabeceras — `X-Request-ID`, `X-Response-Time-Ms`,
`X-Release` — para que el frontend pueda mostrar una referencia de soporte sin
exponer cabeceras de autenticación.

### Endurecimiento fuera de `DEBUG` (`:235-250`)

El bloque `if not DEBUG:` activa:

- `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` (`:236`), para
  que Django reconozca el esquema que reenvía el nginx nativo.
- `SECURE_CONTENT_TYPE_NOSNIFF` (`:237`).
- HSTS: `SECURE_HSTS_SECONDS = 63072000` (2 años), `INCLUDE_SUBDOMAINS` y
  `PRELOAD` (`:238-240`).
- `SESSION_COOKIE_SECURE` y `CSRF_COOKIE_SECURE` (`:241-242`).
- `SECURE_SSL_REDIRECT` gobernado por variable de entorno (`:243`).
- `X_FRAME_OPTIONS = 'DENY'` (`:244`).
- `CSRF_TRUSTED_ORIGINS` obligatorio; si falta, `ImproperlyConfigured` (`:246-250`).

A esto se suman tres validaciones de arranque fuera de `DEBUG`: `SECRET_KEY` de
al menos 50 caracteres y distinta del valor de desarrollo (`:12-15`) y
`ALLOWED_HOSTS` como allowlist explícita, nunca `*` (`:21-22`).

### Almacenamiento MinIO / S3 (`:299-338`)

`django-storages` con backend `S3Boto3Storage` como storage por defecto
(`:332-338`); los estáticos siguen en `StaticFilesStorage`. Hay dos endpoints
distintos y esa distinción es el punto clave: `MINIO_ENDPOINT` es el que usa
boto3 desde el backend (`:299`, `:307-311`) y `MINIO_PUBLIC_ENDPOINT` el que se
incrusta en las URLs que ve el navegador vía `AWS_S3_CUSTOM_DOMAIN`
(`:300`, `:327`). Detalles que resuelven fallos concretos, documentados en el
propio archivo:

- `AWS_S3_ADDRESSING_STYLE = "path"` y `SIGNATURE_VERSION = "s3v4"` (`:315-316`).
- `AWS_QUERYSTRING_AUTH = False` y `AWS_DEFAULT_ACL = None` (`:319-320`).
- `AWS_S3_FILE_OVERWRITE = False` (`:324`) — sin esto, las imágenes importadas
  que compartían nombre (`0.webp`) colisionaban en cinco archivos.
- `AWS_S3_URL_PROTOCOL` derivado de `MINIO_USE_SSL` (`:330`), porque el valor por
  defecto de django-storages es `https:` aunque MinIO esté en HTTP.

### Caché y Celery

`CACHES` (`:449-461`) usa `django_redis.cache.RedisCache` sobre `REDIS_CACHE_URL`
(DB 1), con `IGNORE_EXCEPTIONS: True` para que un Redis caído produzca *misses*
en vez de 500, `KEY_PREFIX: "estatemap"` y TTL por defecto de 300 s.
`DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS = True` (`:465`) deja rastro en logs.
Al ser la caché por defecto, el throttling de DRF pasa a ser compartido entre
procesos en lugar de per-proceso (`:445-447`).

Celery (`:389-437`) no tiene result backend a propósito (`:393-394`), usa
`acks_late` con `reject_on_worker_lost` (`:398-399`), desactiva el reintento de
publicación para fallar rápido y permitir el *fallback* inline (`:403`),
concurrencia 1 y reciclado de hijo a los 300 MB (`:411-416`).
`CELERY_BEAT_SCHEDULE` (`:429-437`) tiene dos entradas: `system-worker-heartbeat`
cada 60 s y `sweep-pending-images` cada hora. Detalle en [celery](./celery.md) y
[redis](./redis.md).

---

## 4. Superficie de la API

`backend/estate_map/urls.py` monta solo tres cosas: `api/health/` → la vista
`health` de observabilidad (`:6`), `admin/` → el admin de Django (`:7`) y `api/`
→ `real_estate.urls` (`:8`). **Todo el API vive bajo `/api/`.**

`backend/real_estate/urls.py` combina un `DefaultRouter` (`:32-38`) con rutas
explícitas (`:40-88`).

### ViewSets del router (`backend/real_estate/urls.py:33-38`)

| Prefijo | ViewSet | Notas |
|---|---|---|
| `/api/properties/` | `PropertyViewSet` (`views.py:273`) | Núcleo del catálogo. Acciones extra: `map_points`, `intelligence`, `owners`, `locations`, `catalog`, `summary`, `my_properties`, `delete_image`, `code/{code}` y `promotion-stats` (la única privada: dueño o staff, ver [activity-metrics](./activity-metrics.md)) |
| `/api/provinces/` | `ProvinceViewSet` (`views.py:149`) | Solo lectura, `AllowAny`, cacheado 24 h |
| `/api/cities/` | `CityViewSet` (`views.py:191`) | Solo lectura, `AllowAny`, cacheado 24 h |
| `/api/leads/` | `LeadViewSet` (`views.py:844`) | `create` público; el resto autenticado y filtrado por propietario |
| `/api/pending-publications/` | `PendingPublicationViewSet` (`views.py:881`) | `create` público con throttle; el resto solo staff |
| `/api/activity-events/` | `ActivityEventViewSet` (`views.py:931`) | `create` público con throttle; consulta solo staff |

### Rutas explícitas, agrupadas por área

| Área | Prefijos | Vistas |
|---|---|---|
| Autenticación | `/api/login/`, `/api/token/refresh/`, `/api/register/`, `/api/auth/google/` | `CustomTokenObtainPairView`, `TokenRefreshView` de SimpleJWT, `RegisterView`, `GoogleLoginView` (`urls.py:42-45`) |
| Verificación de correo | `/api/verify-email/`, `/api/resend-verification/` | `urls.py:48-49` |
| Recuperación de contraseña | `/api/request-password-reset/`, `/api/reset-password/` | `urls.py:52-53` |
| Cambio de correo | `/api/request-email-change/`, `/api/verify-email-change/` | Autenticadas (`urls.py:56-57`) |
| Perfil y mercado | `/api/me/`, `/api/change-password/`, `/api/market-stats/` | `urls.py:60-62`; `MarketStatsView` es `AllowAny` y cacheada |
| Imágenes | `/api/pending-image/<id>/`, `/api/media/<path>` | Proxy sobre MinIO para evitar CORS (`urls.py:65-66`) |
| Panel admin propio | `/api/admin/dashboard/`, `/api/admin/system-status/`, `/api/admin/users/…`, `/api/admin/properties/…` (incluye `stats/` y `bulk-status/`) | `urls.py:69-76`, todas `IsAuthenticated + IsAdminUser` |
| Ingesta (agregador) | `/api/admin/ingesta/{sources,runs,runs/<id>,launch,cancel,properties,refresh-property,maintenance,maintenance/cleanup}/` | Function-based views de `ingesta/api.py`, montadas aquí (`urls.py:79-87`) |
| Salud | `/api/health/` | `observability.health` (`estate_map/urls.py:6`) |

La matriz completa de quién puede llamar a qué está en
[../permissions/matrix.md](../permissions/matrix.md).

---

## 5. Las dos apps Django y la frontera entre ellas

### `real_estate` — el dominio

Dueña del modelo de datos público: `User`, `Province`, `City`, `Property`,
`PropertyPriceHistory`, `PropertyImage`, `SystemIncident`, los tres modelos de
token de correo, `Lead`, `PendingPublication` y `ActivityEvent`
(`backend/real_estate/models.py:7-467`). Expone toda la API pública, sirve las
imágenes, emite los JWT y alimenta el panel de administración.

`RealEstateConfig.ready()` (`backend/real_estate/apps.py:7-8`) importa
`signals.py`, que es donde se cierra el círculo de invalidación de cachés (§9).

### `ingesta` — el agregador de portales externos

App separada (`backend/ingesta/apps.py:4-7`, verbose_name "Ingesta de propiedades
(agregador)") con sus propios modelos: `Fuente`, `IngestaRun`, `ListingCruda` y
`ListingRetirada` (`backend/ingesta/models.py:15-153`). Contiene los scrapers
(`ingesta/scrapers/`: `base.py`, `plusvalia.py`, `properati.py`, `remax.py`), el
pipeline (`ingesta/pipeline/`: `dedup`, `images`, `location`, `normalize`,
`retirement`, `upsert`), el `runner.py` que ejecuta las corridas y cinco comandos
de gestión (`ingesta_scrape`, `ingesta_import`, `ingesta_load`, `ingesta_sources`,
`ingesta_stats`).

**Dónde está exactamente la frontera.** `ingesta` no tiene un modelo propio de
propiedad: escribe en `real_estate.Property`. La dirección de la dependencia es
unilateral y verificable:

- `ingesta/pipeline/upsert.py` escribe filas de `Property` con `owner = NULL` e
  `is_imported = True` (`:8`), y usa `(source, external_id)` como clave lógica
  primaria (`:5-6`).
- `Property` lleva los campos de procedencia: `source` como FK a `ingesta.Fuente`
  (`models.py:125`), `source_agency`, `source_url`, `external_id`, `is_imported`,
  `imported_at`, `source_published_at`, `source_updated_at`
  (`models.py:133-160`), más una restricción única parcial
  `uniq_source_external_when_imported` (`models.py:186-188`).
- `ingesta` importa de `real_estate` — `real_estate.permissions.IsAdminUser`
  (`ingesta/api.py:17`) y `real_estate.uploads.publish_optimized`
  (`ingesta/pipeline/images.py:19`).
- En sentido contrario, `real_estate` solo importa modelos de `ingesta` para
  métricas: `admin_metrics.py:8` trae `Fuente`, `IngestaRun`, `ListingRetirada`.

Es decir: `ingesta` es un **productor** que rellena el dominio de `real_estate`;
`real_estate` no depende de `ingesta` para servir el catálogo, solo para
reportarlo. Las rutas de `ingesta` se montan bajo `/api/admin/ingesta/`
(`real_estate/urls.py:79-87`) y **todas** exigen staff
(`ingesta/api.py:113`, `:121`, `:140`, `:150`, `:192`, `:314`, `:327`, `:373`,
`:437`).

Una diferencia de imágenes que conviene conocer: la ingesta optimiza **en línea**
(`uploads.publish_optimized`, justificado en `uploads.py:30-35`: "there is no
user waiting"), mientras que la subida por HTTP encola el trabajo
(`uploads.stash_upload` + `tasks.enqueue_optimization`).

---

## 6. `backend/real_estate/services/`

| Módulo | Responsabilidad |
|---|---|
| `admin_metrics.py` | `AdminMetricsService.build()` (`:43-50`) arma las métricas del panel del dueño: audiencia por sesiones distintas excluyendo bots, series diarias y variaciones porcentuales. Define los grupos de eventos `DETAIL_EVENTS`, `DISCOVERY_EVENTS` y `PUBLISH_INTENT_EVENTS` (`:12-14`). Es el único punto de `real_estate` que lee modelos de `ingesta` (`:8`). Lo consume `AdminDashboardView` con import diferido (`views.py:1607`) |
| `promotion_stats.py` | `promotion_stats(property_id)` (`:79`): visitantes reales por red social que trajeron los enlaces del kit de un anuncio. Agrega `ActivityEvent` por `payload.attribution.source` filtrando `campaign="owner_kit"` (`:94-110`), cuenta `session_id` distintos y no filas, excluye bots y nunca mira más atrás del 2026-08-03 (`BOT_FLAGGING_SINCE`, `:61`), que es cuando empezó a marcarse `is_bot`. Devuelve un `state` de tres valores para que la interfaz no pinte un cero desnudo (`:68-70`). Lo consume la acción `promotion_stats` del `PropertyViewSet`, restringida al dueño o a staff. Detalle en [activity-metrics](./activity-metrics.md) |
| `map_payload.py` | `build_map_payload(queryset, zoom, max_items, viewport)` (`:132`): convierte el queryset en el payload del mapa. A zoom bajo agrupa en clusters con conteo; a zoom alto devuelve puntos. Incluye la tabla de centros por provincia de Ecuador (`:22-45`), el medoide para el centro del cluster (`:346`), el zoom de expansión (`:477`) y el recorte por viewport (`:497`) |
| `indexnow.py` | Aviso instantáneo a buscadores. Acumula rutas durante `BATCH_SECONDS = 10` en un `threading.Timer` y las envía en un solo POST a `api.indexnow.org` (`:23-83`), para que una importación masiva no dispare cientos de peticiones. `submit_property()` (`:94-100`) pinga la ficha más los hubs afectados: `/`, `/sitemap.xml`, `/estadisticas-inmobiliarias` y `/estadisticas-inmobiliarias/<ciudad>`. Se desactiva solo si el sitio es localhost o si `INDEXNOW_ENABLED` está en falso (`:37-43`). Su `_slugify` (`:85-91`) replica el del frontend para que las URLs pingadas existan |
| `authentication.py` | **Nuevo, sin commitear.** Extrae de la vista todo el enlace de identidad Google. `GoogleIdentity.from_claims()` (`:27-39`) exige `email`, `sub` y `email_verified is True`, o lanza `GoogleIdentityError`. `GoogleAuthenticationService.authenticate()` (`:45-48`) busca al usuario por `oauth_id`, luego por email (`select_for_update`, dentro de `transaction.atomic`), y si no existe lo crea reservando un `username` con reintentos sobre `IntegrityError`; si el conflicto es la misma identidad Google creada en paralelo, devuelve la existente en lugar de agotar sufijos. Emite los JWT con claims extra `username`, `email` e `is_staff` (`:103-109`). La vista `GoogleLoginView` (`views.py:987-1038`) queda reducida a validar el token con `google.oauth2.id_token`, delegar y serializar |
| `notifications.py` | **Nuevo, sin commitear.** Dos servicios *best-effort* que envuelven `email_utils`: `LeadNotificationService.notify_created(lead)` (`:16-22`) y `PendingPublicationNotificationService.notify_created(publication)` (`:28-37`). Ambos capturan cualquier excepción, la registran con `logger.exception` y devuelven `False`: un fallo de SMTP nunca hace fracasar el POST que creó el lead o la solicitud. Se invocan desde `LeadViewSet.perform_create` (`views.py:876-878`) y `PendingPublicationViewSet.perform_create` (`views.py:926-928`) |

Los dos módulos nuevos comparten un mismo criterio: las vistas traducen HTTP y
los servicios contienen las reglas, de modo que otro punto de entrada pueda
reutilizarlas (`authentication.py:3-5`).

---

## 7. Observabilidad — `backend/estate_map/observability.py`

`ObservabilityMiddleware` (`:51-93`) hace cuatro cosas en cada petición:

1. **Request id.** Toma `X-Request-ID` de la petición entrante si viene, o genera
   un `uuid4`, y lo trunca a 64 caracteres (`:61`). Es decir: el id se propaga
   desde el frontend o desde nginx si ya existía.
2. **Cabeceras de respuesta.** Añade siempre `X-Request-ID`,
   `X-Response-Time-Ms` (milisegundos con un decimal) y `X-Release` (`:80-82`).
   Las tres están en `CORS_EXPOSE_HEADERS` (`settings.py:229`), así que el
   navegador puede leerlas.
3. **Log JSON.** Emite un registro `{"kind": "http_request", "request_id",
   "method", "path", "status", "duration_ms", "release"}` (`:83-87`). Si la
   duración supera `SLOW_ENDPOINT_MS` (por defecto 1000 ms, `:56`) el registro
   añade `"alert": "slow_endpoint"` y sube a `WARNING`; si no, es `INFO`
   (`:88-92`). El logger `observability` está configurado en
   `settings.py:72` con nivel gobernado por `OBSERVABILITY_LOG_LEVEL`.
4. **Incidentes persistidos.** Ante una excepción no controlada, o ante una
   respuesta 5xx que no venga ya de una excepción registrada, llama a
   `record_incident()` (`:62-79`).

`record_incident()` (`:17-48`) guarda un `SystemIncident` **agregado**: calcula
una huella `sha256(method|path|status|exception_name)` (`:25-26`) y hace
`get_or_create`; si ya existía, incrementa `occurrences`, actualiza
`last_seen_at` y `request_id` y reabre el incidente (`:39-45`). Nunca guarda
query strings, cuerpos ni cabeceras (`:18`), y todo el bloque está envuelto en un
`try/except` porque "observability must never turn the original failure into
another one" (`:46-48`).

`RELEASE_SHA` y `ENVIRONMENT` se leen del entorno con valor por defecto
`"development"` (`settings.py:63-64`; también en el middleware, `:57`). En
producción el workflow inyecta `RELEASE_SHA=${{ github.sha }}`
(`.github/workflows/deploy.yml:93`), de modo que la cabecera `X-Release` de
cualquier respuesta identifica exactamente el commit desplegado.

La vista `health` (`:96-130`) responde en `/api/health/` con
`{status, release, environment, checks}`. Comprueba base de datos con
`SELECT 1`, caché con un `set`/`get` de sonda, y el worker leyendo la clave
`system:worker:heartbeat` que escribe la tarea de latido: si tiene más de 180 s
el estado pasa a `degraded` (`:116-119`). Devuelve 200 con `ok` o `degraded` y
503 solo si algo está en `error` (`:130`) — por eso un worker caído no tumba el
healthcheck de Docker.

El catálogo de errores que ve el cliente y su correspondencia con estos
incidentes está en [../errors/api-errors.md](../errors/api-errors.md).

---

## 8. Frontend Next.js — `frontend/`

Next.js **16.2.12** con React 19.2.4 (`frontend/package.json:40-43`), App Router,
Tailwind 3.4, Radix UI, `maplibre-gl` 5.24 (`:38`) y `@turf/turf` (`:30`).
`output: 'standalone'` (`frontend/next.config.js:4`) es lo que permite la imagen
de producción mínima. `distDir` es configurable por `NEXT_DIST_DIR` (`:8`) para
que un `next dev` en el host no corrompa el `.next` del contenedor.

### Rutas en español y rutas legacy en inglés: **sí conviven duplicados**

Y conviene entender el mecanismo exacto, porque no es una duplicación de código
sino una separación entre *módulo* y *URL canónica*.

1. **La implementación vive en el directorio en inglés.** `app/add-property/page.tsx`
   tiene 2523 líneas, `app/property/[id]/page.tsx` 830, `app/my-properties/page.tsx`
   612, `app/account/page.tsx` 383, `app/help/page.tsx` 350.
2. **La ruta en español es un re-export de una línea.** Por ejemplo
   `app/publicar-propiedad/page.tsx` es literalmente
   `export { default } from '../add-property/page';`, y
   `app/propiedad/[id]/page.tsx` es
   `export { default, generateMetadata } from '../../property/[id]/page';`.
   Igual con `ayuda`, `cuenta`, `mis-propiedades`, `editar-propiedad/[id]`,
   `iniciar-sesion`, `registro`, `verificar-correo`, `recuperar-contrasena` y
   `restablecer-contrasena`.
3. **La URL en inglés redirige a la española** con `permanent: true` (HTTP 308),
   en `frontend/next.config.js:102-112`: `/add-property` → `/publicar-propiedad`,
   `/my-properties` → `/mis-propiedades`, `/edit-property/:path*` →
   `/editar-propiedad/:path*`, `/property/:path*` → `/propiedad/:path*`,
   `/help` → `/ayuda`, `/account` → `/cuenta`, `/login` → `/iniciar-sesion`,
   `/register` → `/registro`, `/forgot-password` → `/recuperar-contrasena`,
   `/reset-password` → `/restablecer-contrasena`, `/verify-email` →
   `/verificar-correo`.

Como `redirects()` se evalúa antes del enrutado por sistema de archivos, **las
URLs en inglés nunca sirven contenido**: solo existe la española. Los archivos en
inglés siguen siendo alcanzables como módulos, no como rutas. El caso de
`app/edit-property/[id]/page.tsx` merece mención aparte: también es un re-export
de una línea, apuntando a `../../add-property/page` — alta y edición comparten un
único componente de 2523 líneas. La misma canonicalización cubre el host: `www` →
apex, también con `permanent: true` (`next.config.js:96-101`). No hay
`rewrites()` definidos, y **no existe ningún `middleware.ts`** en el proyecto.

Los `layout.tsx` siguen la misma técnica de re-export, con **una excepción
deliberada que es la razón de ser de todo el montaje**:
`app/publicar-propiedad/layout.tsx` es un layout propio de 26 líneas que declara
`robots: { index: true, follow: true }` y
`alternates.canonical: '/publicar-propiedad'` (`:8-12`), mientras que
`app/add-property/layout.tsx:6-9` declara `robots: { index: false, follow: false }`.
Es decir: el mismo componente se sirve bajo dos layouts, y solo la variante en
español se ofrece a los buscadores.

El grupo `app/(auth)/` contiene las cinco pantallas reales de sesión
(`login`, `register`, `verify-email`, `forgot-password`, `reset-password`) bajo un
layout compartido; los paréntesis lo excluyen de la URL, así que solo se llega
por las rutas en español que las re-exportan.

### Rutas propias (sin equivalente en inglés)

Landings SEO: `casas-en-venta`, `terrenos-en-venta`,
`departamentos-en-alquiler`, `locales-comerciales`, `propiedades/`,
`propiedades/[ciudad]`, `provincias/[provincia]`, `estadisticas-inmobiliarias/`
y `estadisticas-inmobiliarias/[ciudad]`, `inmobiliarias`, `guias/` y
`guias/[slug]`, `publicar-asistido` (implementación independiente, sin gemela en
inglés), y el catch-all `app/[combo]/` que sirve combinaciones
tipo/operación/lugar. Panel interno:
`app/admin/` con `page`, `activity`, `ingesta`, `pending-publications`,
`properties`, `system`, `users`.

Especiales en la raíz de `app/`: `layout.tsx`, `page.tsx`, `error.tsx`,
`not-found.tsx`, `opengraph-image.tsx`, `sitemap.ts`, `robots.ts`, `globals.css`
y `aents-tokens.css`.

### Route handlers

Solo hay un archivo bajo `app/api/`: **`app/api/revalidate/route.ts`**. Es el
extremo receptor de la invalidación bajo demanda. Autentica comparando la
cabecera `x-revalidate-secret` con `process.env.REVALIDATE_SECRET`: si la
variable no está definida responde 503 "Revalidation is not configured"
(`:15-19`), y si no coincide, 401 (`:21-24`). Valida que el cuerpo traiga
`tags` como array de strings no vacío y de como mucho `MAX_TAGS = 50`
(`:33-44`), y llama a `revalidateTag(tag, 'max')` por cada uno (`:46-48`).

Hay tres route handlers más, fuera de `app/api/`: `app/image-sitemap.xml/route.ts`,
`app/llms.txt/route.ts` y `app/llms-full.txt/route.ts` — los tres con
`revalidate = 3600`.

Los tags que se emiten desde el servidor son `properties`, `catalog`,
`market-stats` y `property-<id>` (`lib/properties.ts:60,111,143,219,270,283` y
`lib/market-stats.ts:39`). Los `export const revalidate` van de 300 s en la ficha
de propiedad (`app/property/[id]/page.tsx:79`) a 1800 s en estadísticas y 3600 s
en landings y sitemap.

### `frontend/lib/`

`api-url.ts` es la pieza de arquitectura: `getServerApiUrl()` devuelve
`NEXT_INTERNAL_API_URL` (en Docker, `http://backend:8000/api`) y
`getPublicApiUrl()` devuelve `NEXT_PUBLIC_API_URL` — dos URLs distintas para el
mismo backend según se llame desde el servidor o desde el navegador (`:7-13`).
`api.ts` es el cliente del navegador con auto-renovación de JWT.
`properties.ts` y `market-stats.ts` son los helpers de servidor que hacen los
`fetch` etiquetados. `auth-context.tsx` mantiene la sesión en cliente.
`metadata.ts`, `seo-combos.ts`, `og-card.tsx`, `guias.ts` y `help-faqs.ts`
alimentan SEO y contenido. `geo.ts`, `geocoding.ts`, `browser-geolocation.ts`,
`map-navigation.ts` y `mapMarkers.ts` cubren mapa y ubicación. `analytics.ts`,
`share.ts`, `phone.ts`/`phone-detect.ts`, `form-errors.ts`,
`image-compression.ts`, `property-labels.ts`, `haptics.ts`, `constants.ts`,
`types.ts`, `utils.ts` y `aents-tokens.json` completan el conjunto.

### `frontend/components/`

25 componentes en la raíz (navegación, `PropertyCard`, `PropertyModal`,
`PropertyGallery`, `PropertyIntelligence`, `SeoLanding`, `AdminSidebar`,
`AdminRoute`/`PrivateRoute`, …) más cuatro subdirectorios: `ui/` (26 primitivas
shadcn/Radix), `map/` (6 controles: `MapFilters`, `MapLegend`, `LayerSwitch`,
`MapPropertyCard`, `PropertySidebar`, `UserFilter`), `maps/` (4: `MapLibreMap`,
`DrawLocationMap`, `PropertyNearbyMap` y el estilo compartido
`maplibre-style.ts`) y `aents/` (1: `BrandAtmosphere`). Los hooks viven aparte en
`frontend/hooks/` (`useGeolocation`, `useMediaQuery`, `usePropertyFilters`,
`useShareAction`).

### nginx dentro de `frontend/`

**Aquí hay una discrepancia verificada que conviene no confundir.**
`frontend/nginx/conf.d/` existe pero está **vacío**, y `frontend/nginx.conf` es
una configuración de SPA estática (`root /usr/share/nginx/html`,
`try_files $uri $uri/ /index.html`) que no corresponde a un Next.js standalone.
Ningún `Dockerfile`, `Dockerfile.prod` ni compose los referencia — el único
`nginx` que aparece en los compose es una mención en un comentario
(`docker-compose.prod.yml:81`). Son restos de la etapa SPA previa. El nginx real
es el nativo del host; su fragmento de configuración versionado es
`deploy/nginx-rate-limit.conf.example`.

Las cabeceras de seguridad del frontend, por tanto, las pone el propio Next:
`next.config.js:62-74` aplica HSTS de 2 años con preload, `X-Content-Type-Options`,
`X-Frame-Options: SAMEORIGIN`, `Referrer-Policy` y `Permissions-Policy` a todas
las rutas, y fuerza `no-store` en `/sw.js` (`:78-85`). No hay CSP, y el propio
comentario explica por qué se dejó como pendiente (`:58-61`).

### Imágenes

`next.config.js:12-56`: la optimización se desactiva solo en desarrollo (`:17`),
formatos `avif` y `webp` (`:21`), `minimumCacheTTL` de 86400 s (`:24`) y
`remotePatterns` que autorizan `minio.geopropiedadesecuador.com/estatemap/**` y
localhost:9010 (`:25-55`). En producción, `sharp` se instala en un stage propio
del `Dockerfile.prod` (`:41-48`) porque el modo standalone no lo empaqueta.

---

## 9. Recorrido de una petición

### Lectura: puntos del mapa (`GET /api/properties/map_points/?bbox=…&zoom=…`)

```
Navegador ──► nginx (host, TLS + limit_req zone=api_map 5r/s)
          ──► 127.0.0.1:8000 ──► gunicorn ──► Django middleware
```

1. **nginx nativo** aplica la zona `api_map` (5 r/s, burst 20) salvo que la IP
   sea privada o loopback (`deploy/nginx-rate-limit.conf.example:17-34`), y
   reenvía `X-Forwarded-Proto`.
2. `ObservabilityMiddleware` arranca el cronómetro y fija el request id
   (`observability.py:60-61`).
3. `PropertyViewSet.get_throttles()` (`views.py:285-297`) detecta la acción
   `map_points`, fija `throttle_scope = 'map_points'` (120/min) y usa
   `AntiScraperScopedThrottle`, que deja pasar sin contar al SSR interno y al
   staff (`throttling.py:45-51`).
4. `map_points` (`views.py:579-628`) normaliza el zoom, decide si agrupa
   (`zoom < 11.5`, `:594`) y **redondea el bbox hacia fuera a 3 decimales**
   (`_snap_bbox`, `views.py:252-271`): panear unos píxeles cae en la misma
   entrada de caché, y como el recuadro redondeado siempre contiene al pedido,
   la respuesta es un superconjunto y no se pierde nada de la pantalla.
5. Construye la clave con `versioned_key('map_points', zoom, limit, bbox,
   filtros)` (`views.py:600-606`). La clave incorpora la versión del inventario
   (`cache_utils.versioned_key`, `:70-72`).
6. Si la petición es **anónima** (`_is_public_read`, `views.py:92-94`) consulta
   Redis DB 1. Acierto → responde con `Cache-Control: public, max-age=60,
   s-maxage=120` (`_public_response`, `views.py:97-102`, con
   `CACHE_TTL_MAP_POINTS = 120`, `:83`). Nunca se cachea una respuesta
   autenticada, ni se sirve una cacheada a un usuario autenticado.
7. Fallo de caché → queryset con `.only()` de diez columnas (`views.py:612-624`)
   y `build_map_payload()` (`services/map_payload.py:132`) para clusterizar.
   Guarda en Redis y responde.

Si Redis está caído, `IGNORE_EXCEPTIONS` (`settings.py:454`) convierte el fallo
en un *miss* y la petición se sirve igual, más lenta. Detalle completo de TTLs y
claves en [caching](./caching.md).

### Escritura: publicar una propiedad con fotos (`POST /api/properties/`)

```
Navegador ──► nginx ──► backend ──► [tx] Property + PropertyImage(PENDING)
                                 └─► disco: /app/tmp/pending-images/<uuid>
                                 └─► Redis DB 0 (Celery) ──► worker ──► MinIO
                                                                  └─► señales ──► Redis DB 1 (INCR)
                                                                            └─► Celery ──► Next /api/revalidate
```

1. `UploadErrorMiddleware` cubre el parseo multipart: más de 50 MB o más de 10
   archivos se convierten en JSON legible antes de llegar a la vista
   (`upload_errors.py:14-23`, límites en `settings.py:347-350`).
2. `PropertyViewSet.get_throttles()` aplica `property_write` (30/hour) a
   `create`/`update`/`partial_update` (`views.py:293-295`).
3. `PropertyViewSet.create()` (`views.py:441-475`) implementa **idempotencia**: si
   el cliente manda `Idempotency-Key`, se calcula
   `sha256(user_id:key)` y se usan dos entradas en Redis — `result_key`, que
   guarda 24 h el id creado y permite responder 200 con
   `X-Idempotent-Replay: true` ante un reintento, y `lock_key`, un `cache.add`
   de 60 s que devuelve 409 si la misma publicación ya se está procesando. Si la
   caché está caída, `cache.add` devuelve `None` y la publicación sigue adelante
   (`:472-475`).
4. `PropertySerializer.create()` (`serializers.py:309-317`) crea la `Property` y
   llama a `stage_property_image()` por cada archivo.
5. `stage_property_image()` (`serializers.py:94-130`) escribe el original en el
   directorio de staging con nombre opaco (`uploads.stash_upload`,
   `:50-65`), crea la fila `PropertyImage` en estado `PENDING` con
   `pending_path`, y encola. Si el archivo no se puede escribir **no lanza**:
   devuelve `None` y registra el fallo, porque una excepción dentro del bloque
   atómico haría perder la publicación entera por una foto (`:101-105`).
6. `enqueue_optimization()` (`tasks.py:205`) encola con `on_commit` — antes del
   commit el worker leería una fila inexistente desde su propia conexión — y cae
   a optimizar en línea si el broker no acepta el mensaje. Ese *fallback* es lo
   que justifica `CELERY_TASK_PUBLISH_RETRY = False` (`settings.py:403`): la
   llamada debe fallar rápido.
7. La API ya respondió. El **worker** ejecuta `optimize_property_image`
   (`tasks.py:44-109`): lee el temporal del volumen compartido, produce WebP
   1920px + miniatura 640px (`settings.py:356-364`), sube ambos a MinIO con un
   único `save()` de la fila, pasa el estado a `READY` y borra el temporal. Un
   archivo ilegible marca `FAILED` sin reintentar (`:91-98`).
8. **Invalidación en dos capas**, disparada por señales
   (`signals.py:62-80`). `bump_props_version()` hace un `INCR` sobre `props:ver`
   en Redis DB 1: todas las claves versionadas dejan de ser direccionables de
   golpe, sin `KEYS`/`SCAN`, que es imprescindible porque las combinaciones de
   bbox y filtros no se pueden enumerar (`cache_utils.py:1-14`). En paralelo,
   `transaction.on_commit` encola `revalidate_frontend_tags(["properties",
   "property-<id>"])` (`signals.py:28-43`), que POSTea a
   `NEXT_REVALIDATE_URL` con la cabecera `x-revalidate-secret`, con dos
   reintentos y 5 s de timeout (`tasks.py:155-195`). El route handler de Next
   valida el secreto y llama a `revalidateTag`. Los cambios en `PropertyImage`
   solo mueven la versión de Redis, no piden revalidación al frontend, porque el
   worker toca cada imagen por separado y cada una sería una petición
   (`signals.py:75-80`).
9. `post_save` de `Property` también registra el histórico de precio si cambió y
   pinga IndexNow (`signals.py:46-52`), que agrupa las URLs 10 s antes de enviar.

---

## 10. Despliegue

**`.github/workflows/deploy.yml`** se dispara con cada push a `main` (`:3-6`) y
tiene dos jobs encadenados.

El job `verify` (`:9-61`) levanta servicios `postgres:16` y `redis:7-alpine`,
instala Python 3.12 y ejecuta `pytest -q` más
`manage.py makemigrations --check --dry-run` (`:44-45`); después, con Node 20,
`npm ci --legacy-peer-deps`, `lint`, `typecheck`, `test` y `build` (`:57-61`).

El job `deploy` (`:63-140`), condicionado a `needs: verify`, entra por SSH
(`appleboy/ssh-action`), va a `/var/www/estatemap`, **reescribe `.env.prod`
entero** desde los secrets del repositorio (`:86-135`) y ejecuta
`./scripts/deploy.sh`. Dos valores se fijan aquí y no vienen de secrets:
`RELEASE_SHA=${{ github.sha }}` (`:93`) y
`NEXT_REVALIDATE_URL=http://frontend:3000/api/revalidate` (`:135`).

**`scripts/deploy.sh`** tiene tres decisiones de diseño que merecen constar:

- Todo el script está envuelto en `{ … }` (`:12`, `:129`) porque se reescribe a
  sí mismo a mitad de ejecución con `git reset --hard origin/main` (`:75`); sin
  el grupo, bash continuaría leyendo en un desplazamiento de bytes dentro del
  archivo nuevo (`:6-11`).
- Valida **antes** de tocar el release en curso: 16 variables obligatorias que
  además no pueden contener `your_`, `replace_with` ni `tu-dominio` (`:25-37`),
  y `DEBUG=False` exacto (`:39-42`).
- No hace `down`. Construye las imágenes con los servicios en marcha (`:80`),
  corre `check --deploy`, `makemigrations --check`, `migrate` y `collectstatic`
  en contenedores efímeros (`:83-96`), y solo entonces `up -d --remove-orphans`
  (`:101`). Luego espera hasta 120 s a que `estatemap_backend` y
  `estatemap_frontend` reporten `healthy` (`:104-116`) y confirma con dos curls
  contra `/api/health/` y `/robots.txt` (`:118-119`).

**`deploy/`** contiene un único archivo: `nginx-rate-limit.conf.example`. Es un
**ejemplo que hay que fusionar a mano** en el server block real del host
(`:3-5`); no se despliega tal cual. Define dos zonas — `api_general` 10 r/s y
`api_map` 5 r/s — y un `geo`/`map` que asigna clave vacía (y por tanto exención)
a loopback y a los rangos privados 10/8, 172.16/12 y 192.168/16, precisamente
para que el SSR de Next desde Docker no consuma cuota (`:20-34`, `:110-111`).

**`rebuild-frontend.sh`** es una utilidad **solo de desarrollo**: hace
`docker-compose down -v`, borra la imagen del frontend, reconstruye con
`--no-cache` y levanta en primer plano. Usa `docker-compose.yml`, no el de
producción, y el `-v` destruye volúmenes — no debe ejecutarse en el servidor.

---

## 11. Variables de entorno

Nombres y propósito. Los valores reales viven en `.env` y `.env.prod`, que no se
versionan.

| Variable | Ámbito | Para qué sirve |
|---|---|---|
| `SECRET_KEY` / `DJANGO_SECRET_KEY` | backend | Firma de sesiones y de los JWT (`settings.py:9`, `:200`). Fuera de `DEBUG` debe tener ≥50 caracteres o el arranque falla (`:12-15`) |
| `DEBUG` | backend | Interruptor maestro: gobierna el bloque de endurecimiento y el CORS abierto (`:10`, `:235`) |
| `ALLOWED_HOSTS` | backend | Allowlist de hosts, separada por comas. En producción no puede ser `*` (`:19-22`) |
| `CORS_ALLOWED_ORIGINS` | backend | Orígenes autorizados del navegador; obligatoria en producción (`:218-224`) |
| `CSRF_TRUSTED_ORIGINS` | backend | Orígenes de confianza para el admin sobre HTTPS; obligatoria en producción (`:246-250`) |
| `SECURE_SSL_REDIRECT` | backend | Redirección a HTTPS por Django (por defecto `True` fuera de `DEBUG`) (`:243`) |
| `ENVIRONMENT` | backend | Etiqueta de entorno que devuelve `/api/health/` (`:64`) |
| `RELEASE_SHA` | backend | Commit desplegado; sale en la cabecera `X-Release` y en cada log (`:63`) |
| `OBSERVABILITY_LOG_LEVEL` | backend | Nivel del logger `observability` (`:72`) |
| `SLOW_ENDPOINT_MS` | backend | Umbral para marcar `alert: slow_endpoint`, por defecto 1000 (`observability.py:56`) |
| `DATABASE_URL` | backend | Cadena única de Postgres; si está, tiene prioridad (`:99-105`) |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | backend | Postgres por partes, alternativa a la anterior (`:124-132`) |
| `MINIO_ENDPOINT` | backend | Endpoint **interno** que usa boto3 (`:299`, `:307`) |
| `MINIO_PUBLIC_ENDPOINT` | backend | Endpoint **público** incrustado en las URLs de imagen (`:300`, `:327`) |
| `MINIO_USE_SSL` | backend | Decide `http`/`https` tanto en boto3 como en las URLs públicas (`:301`, `:330`) |
| `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | backend | Credenciales S3 (`:303-304`) |
| `MINIO_BUCKET_NAME` | backend | Bucket, por defecto `estatemap` (`:305`) |
| `CELERY_BROKER_URL` | backend + worker | Broker Redis, DB 0 de este proyecto (`:389`) |
| `REDIS_CACHE_URL` | backend + worker | Caché Django, DB 1 (`:452`) |
| `CELERY_RESULT_BACKEND` | backend | Deliberadamente vacío: nada lee el resultado (`:393-394`) |
| `IMAGE_UPLOAD_TEMP_DIR` | backend + worker | Directorio de staging compartido; en producción es el volumen `pending_images` (`:470-473`) |
| `IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS` | worker | Edad a partir de la cual el barrido horario borra temporales huérfanos, por defecto 48 (`:475`) |
| `NEXT_REVALIDATE_URL` | backend + worker | URL del route handler de revalidación. Vacía = no-op (`:502`) |
| `REVALIDATE_SECRET` | backend + frontend | Secreto compartido de la revalidación bajo demanda (`:503`; `app/api/revalidate/route.ts:15`) |
| `THROTTLE_EXEMPT_IPS` | backend | IPs adicionales nunca limitadas (`:188-190`) |
| `INDEXNOW_KEY`, `INDEXNOW_ENABLED` | backend | Clave del protocolo IndexNow e interruptor (`services/indexnow.py:25`, `:38`) |
| `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | backend | SMTP saliente; por defecto Brevo (`:484-490`) |
| `FRONTEND_URL` | backend | Base de los enlaces de los correos y del sitio para IndexNow (`:497`; `indexnow.py:34`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | backend | OAuth de Google del lado servidor (`:277-278`) |
| `NEXT_PUBLIC_API_URL` | frontend (build) | URL del API para el **navegador**. Se incrusta en el bundle (`Dockerfile.prod:23,30`; `lib/api-url.ts:4-5`) |
| `NEXT_INTERNAL_API_URL` | frontend (runtime) | URL del API para el **servidor** de Next; en Docker `http://backend:8000/api` (`docker-compose.yml:101`; `lib/api-url.ts:8`) |
| `NEXT_PUBLIC_FRONTEND_URL` | frontend (build) | URL pública del sitio; base de canónicas y sitemap (`lib/properties.ts:15-17`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | frontend (build+runtime) | Mismo client id que el backend; en producción se pasa además en runtime (`docker-compose.prod.yml:114,124`) |
| `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID` | frontend (build) | Google Tag Manager y GA4 (`Dockerfile.prod:25-26`) |
| `NEXT_DIST_DIR` | frontend | Aísla la carpeta de build para que un `next dev` en el host no choque con el contenedor (`next.config.js:8`) |
| `NODE_ENV`, `PORT`, `HOSTNAME` | frontend | Runtime del servidor standalone (`Dockerfile.prod:54,77-78`) |
| `SERVER_IP` | despliegue | IP del servidor, usada por el workflow (`.env.prod.example:116`) |

`GOOGLE_CLIENT_ID` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID` **deben ser el mismo valor**
(`.env.example:57`).

---

## 12. Discrepancias verificadas

Hechos comprobados que contradicen la documentación existente o que son restos
sin uso. Se listan para evitar que alguien los tome como configuración vigente.

1. **Puertos de MinIO en desarrollo.** `docker-compose.yml:26-27` publica
   `9020:9000` y `9021:9001`, pero `.env.example:14` fija
   `MINIO_PUBLIC_ENDPOINT=localhost:9010`, `README.md:70-71` anuncia 9010/9011 y
   `frontend/next.config.js:25-49` autoriza `localhost:9010` en
   `remotePatterns`. Los tres apuntan al puerto 9010, que el compose no publica.
2. **`README.md:36` dice "Leaflet"**; el `package.json` no incluye
   react-leaflet y el mapa es `maplibre-gl` (`package.json:38`,
   `components/maps/MapLibreMap.tsx`).
3. **`README.md:152` remite a `nginx/estatemap.conf`**, archivo que no existe.
   La configuración nginx versionada es `deploy/nginx-rate-limit.conf.example`.
4. **`frontend/nginx.conf` y `frontend/nginx/conf.d/`** son restos de la etapa
   SPA: el directorio está vacío y el archivo describe un sitio estático
   (`try_files … /index.html`) que nada construye ni monta.
5. **`backend/estate_map/celery.py:7` cita `docs/celery.md`**; la ruta real de la
   documentación es `docs/technical/celery.md`.
6. **`frontend/app/empezar-publicacion/` es un directorio vacío**: no contiene
   ningún archivo y por tanto no produce ruta alguna. Es un andamio muerto.
7. **`backend/ingesta/README.md:4-5` afirma que "el scraping se hace en LOCAL y
   producción solo importa"**, pero `ingesta/api.py:437-480` expone
   `POST /api/admin/ingesta/launch/`, que lanza corridas desde el panel, y
   `requirements.txt:11-12` instala `httpx` y `curl_cffi` marcando explícitamente
   "el admin scrapea en producción".
