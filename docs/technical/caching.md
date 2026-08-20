# Caching

Verificado contra el código el 2026-08-04.

> Nota: el refactor de la clave de versión única a **claves de versión por
> ámbito** se cerró del lado lector el 2026-08-11 (§4). Los números de línea de
> `views.py` citados en este documento corresponden a la verificación de
> 2026-08-04 y pueden haber derivado; los símbolos siguen siendo válidos.

Este sistema tiene **dos capas de caché encadenadas** y un único disparador que
las invalida a ambas:

1. **Redis (Django cache)** — payloads JSON ya serializados de los endpoints
   públicos de lectura del backend DRF.
2. **Next.js Data Cache** — respuestas `fetch()` del App Router, etiquetadas con
   *cache tags*, más el ISR por tiempo de cada página.

Encima de las dos viaja
`Cache-Control: public, max-age=60, s-maxage=<TTL>, stale-while-revalidate=3600`
para que el navegador y cualquier proxy compartido reutilicen la respuesta
(`backend/real_estate/views.py:99-110`).

---

## 1. La capa Redis: claves versionadas

### El problema que resuelve

Casi todos los payloads cacheados dependen de combinaciones de filtros que **no
se pueden enumerar**: bbox del mapa, rangos de precio, texto libre. Por eso no
existe un borrado por patrón. El razonamiento está escrito en el propio módulo
(`backend/real_estate/cache_utils.py:1-15`):

> Invalidating is then a single `INCR` on `props:ver` (see `signals.py`) instead
> of enumerating and deleting keys: the old entries stop being addressable and
> Redis evicts them when their TTL expires. […] a delete-by-pattern sweep would
> either miss keys or block Redis with a `KEYS`/`SCAN` walk on every save.

Es decir: **no se borra nada**. Se mueve el número de versión que va embebido en
cada clave, las claves viejas dejan de ser direccionables y mueren solas cuando
vence su TTL. Un `SCAN` por patrón en cada `save()` de propiedad, sobre un Redis
compartido con los demás sistemas Aents, sería mucho más caro.

### Las claves de versión, por ámbito

`backend/real_estate/cache_utils.py:24-34`:

```python
VERSION_KEY = "props:ver"
VERSION_KEYS = {
    "properties":   VERSION_KEY,              # "props:ver"
    "map":          "props:map:ver",
    "summary":      "props:summary:ver",
    "detail":       "props:detail:ver",
    "locations":    "props:locations:ver",
    "catalog":      "props:catalog:ver",
    "market_stats": "props:market-stats:ver",
    "geo":          "geo:ver",
}
```

La idea del refactor es que un cambio de inventario no tenga que tirar
*absolutamente todo*: por ejemplo, el catálogo oficial de provincias y cantones
(`geo`) no cambia porque se edite el precio de un anuncio.

- **`props_version(scope="properties")`** (`cache_utils.py:41-55`) lee el
  contador con `cache.get_or_set(version_key, 1, timeout=None)` — sin TTL, es una
  clave permanente. Devuelve `1` si Redis está caído (con `IGNORE_EXCEPTIONS`
  `get_or_set` devuelve `None`), ante cualquier excepción, o si el valor no es
  convertible a `int`.
- **`bump_props_version(*scopes)`** (`cache_utils.py:58-63`) bumpea los ámbitos
  indicados; **sin argumentos bumpea todos** (`cache_utils.py:60-61`).
- **`_bump_version(scope)`** (`cache_utils.py:66-79`) hace `cache.incr()`.
  django-redis lanza `ValueError` cuando la clave no existe (nunca se creó, o fue
  evictada), así que el fallback siembra `props_version(scope) + 1` con
  `timeout=None`. Sembrar equivale a bumpear: los lectores que cachearon contra
  el valor anterior ya no aciertan sus claves.

### Construcción de claves

`versioned_key(name, *parts, scope="properties")` (`cache_utils.py:89-91`)
produce `"<name>:v<version-del-scope>:<part>:<part>"`.

`_normalize()` (`cache_utils.py:82-86`) convierte cada parte a `str` y, si supera
`MAX_PART_LENGTH = 32` (`cache_utils.py:38`), la sustituye por su MD5, para que
un querystring largo no genere una clave Redis de varios kilobytes.

Dos ayudantes de `views.py` alimentan esas partes:

- `_query_signature(params)` (`views.py:113-115`) — representación independiente
  del orden del querystring **completo**.
- `_filter_signature(params, extra=())` (`views.py:129-136`) — solo los
  parámetros de `_FILTER_PARAMS` (`views.py:121-126`: `search`, `type`,
  `property_type`, `status`, `city`, `province`, `min_price`/`minPrice`,
  `max_price`/`maxPrice`, `min_area`/`minArea`, `max_area`/`maxArea`, `rooms`,
  `bathrooms`, `owner`, `user`). Listarlos explícitamente evita que
  cache-busters o etiquetas de analítica fragmenten la caché
  (`views.py:118-120`).

### Solo lecturas anónimas

`_is_public_read(request)` (`views.py:94-96`) exige método `GET`/`HEAD` **y**
usuario no autenticado. El comentario de cabecera (`views.py:67-77`) explica por
qué: los endpoints cacheados son agregados `AllowAny` que nunca leen
`request.user`, pero se restringe igual para que una respuesta autenticada no
pueda servirse desde —ni escribirse en— una entrada compartida, y para que
`Cache-Control: public` nunca viaje junto a un header `Authorization`.

---

## 2. Configuración del backend de caché

`backend/estate_map/settings.py:440-465`:

| Ajuste | Valor | Línea |
|---|---|---|
| `BACKEND` | `django_redis.cache.RedisCache` | `settings.py:451` |
| `LOCATION` | `os.getenv("REDIS_CACHE_URL", "redis://127.0.0.1:6379/1")` | `settings.py:452` |
| `CLIENT_CLASS` | `django_redis.client.DefaultClient` | `settings.py:454` |
| `IGNORE_EXCEPTIONS` | `True` | `settings.py:455` |
| `SOCKET_CONNECT_TIMEOUT` | `2` | `settings.py:456` |
| `SOCKET_TIMEOUT` | `2` | `settings.py:457` |
| `KEY_PREFIX` | `"estatemap"` | `settings.py:459` |
| `TIMEOUT` | `300` | `settings.py:460` |
| `DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS` | `True` | `settings.py:465` |

**`IGNORE_EXCEPTIONS = True` es la decisión de diseño central de esta capa.** El
comentario en `settings.py:444-446` lo dice: si Redis es inalcanzable el sitio
debe seguir sirviendo peticiones **con cache misses, no con errores 500**. Toda
operación de caché devuelve `None` en vez de propagar la excepción. Consecuencias
concretas:

- `cache.get()` → `None` → el código recalcula el payload desde Postgres.
- `cache.set()` → no-op silencioso.
- `cache.add()` → devuelve `None`, no `True`/`False` (esto se explota en el lock
  de idempotencia, ver §3).
- `cache.incr()` **sí** sigue lanzando `ValueError` cuando falta la clave; por eso
  `_bump_version()` lo captura explícitamente (`cache_utils.py:70`) y el docstring
  del módulo lo advierte (`cache_utils.py:12-14`).

`DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS = True` evita que ese modo degradado sea
invisible: los errores ignorados se registran en el log (`settings.py:463-464`).

`TIMEOUT = 300` es solo el valor por defecto: **todas las llamadas de `views.py`
pasan un TTL explícito**, así que los 300 s aplican a las escrituras que no lo
indican.

`KEY_PREFIX = "estatemap"` se antepone a cada clave física: Django compone
`KEY_PREFIX:<version-django>:<clave>`, de modo que en Redis se ven como
`estatemap:1:props:ver`. Ese prefijo es lo que permite compartir la DB 1 sin
colisionar con otro consumidor (ver [redis.md](./redis.md)).

---

## 3. Qué se cachea exactamente

### TTLs declarados

`backend/real_estate/views.py:79-91`:

```
CACHE_TTL_CATALOG        = 60 * 60 * 24   # 86400 s
CACHE_TTL_LOCATIONS      = 60 * 60        #  3600 s
CACHE_TTL_SUMMARY        = 60 * 10        #   600 s
CACHE_TTL_INTELLIGENCE   = 60 * 10        #   600 s
CACHE_TTL_MAP_POINTS     = 120            #   120 s
CACHE_TTL_MARKET_STATS   = 60 * 30        #  1800 s
CACHE_TTL_GEO            = 60 * 60 * 24   # 86400 s
CACHE_TTL_PROPERTY_LIST  = 120            #   120 s
BROWSER_MAX_AGE          = 60
STALE_WHILE_REVALIDATE   = 60 * 60        #  3600 s
```

`BROWSER_MAX_AGE = 60` es deliberadamente corto: el navegador revalida rápido y
son las cachés compartidas (CDN / reverse proxy) las que retienen el payload
tanto como viva la entrada del servidor (`views.py:88-89`).
`STALE_WHILE_REVALIDATE = 3600` permite al proxy servir una copia vencida durante
una hora mientras refresca por detrás (`views.py:108`).

### Tabla de entradas versionadas

| Endpoint | Clave | `scope` | TTL | Código |
|---|---|---|---|---|
| `ProvinceViewSet.list` | `provinces:list:v<N>:<query_signature>` | `geo` | 24 h | `views.py:174-181` |
| `ProvinceViewSet.cities` | `province:cities:v<N>:<pk>` | `geo` | 24 h | `views.py:189-196` |
| `CityViewSet.list` | `cities:list:v<N>:<query_signature>` | `geo` | 24 h | `views.py:225-230` |
| `PropertyViewSet.list` | `properties:list:v<N>:<query_signature>` | `properties` | 2 min | `views.py:288-304` |
| `PropertyViewSet.intelligence` | `intelligence:v<N>:<pk>` | *(default `properties`)* | 10 min | `views.py` (`def intelligence`) |
| `PropertyViewSet.map_points` | `map_points:v<N>:z<zoom>:n<limit>:<bbox\|all>:<filter_signature>` | `map` | 2 min | `views.py` (`def map_points`) |
| `PropertyViewSet.locations` | `locations:v<N>:` | `locations` | 1 h | `views.py` (`def locations`) |
| `PropertyViewSet.catalog` | `catalog:v<N>:` | `catalog` | 24 h | `views.py` (`def catalog`) |
| `PropertyViewSet.summary` | `properties:summary:v<N>:<filter_signature + bbox>` | `summary` | 10 min | `views.py` (`def summary`) |
| `MarketStatsView.get` | `market_stats:v<N>:<query_signature>` | `market_stats` | 30 min | `views.py` (`class MarketStatsView`) |

Notas por caso:

- **`provinces:list` / `cities:list`** guardan `list(super().list(...).data)`. El
  `list()` explícito es necesario: elimina la referencia al serializer que DRF
  cuelga de `ReturnList` y que si no se picklearía dentro de Redis
  (`views.py:177-179`).
- **`properties:list`** se cachea por el querystring **completo** normalizado
  (`views.py:289`), no por `_filter_signature`, y normaliza el tipo del payload
  antes de guardarlo: `dict` si hubo paginación, `list` si no
  (`views.py:301-302`). El listado usa `MapPropertySerializer`
  (`views.py:306-309`).
- **`map_points`** es el payload del mapa. El bbox se redondea con `_snap_bbox` y
  se formatea a 3 decimales antes de entrar en la clave (`views.py:622-623`), lo
  que hace que paneos mínimos reutilicen la misma entrada. Por debajo de zoom
  11.5 el clustering ignora el bbox y esa parte de la clave pasa a ser `all`
  (`views.py:620-630`).
- **`intelligence`** es, según su propio comentario, el endpoint de detalle más
  caro del sitio y el que los crawlers golpean justo después de la ficha
  (`views.py:519-521`).
- **`catalog` vs `locations`**: `locations` deriva de las propiedades activas,
  así que una ciudad sin anuncios desaparece; `catalog` lee las tablas
  `Province`/`City` **más** todos los nombres de ciudad que alguna propiedad haya
  llevado alguna vez, para que una landing SEO ya indexada responda 200 con
  estado vacío en lugar de 404 (`views.py:719-727`, `:746-749`).
- **`market_stats`** vuelca todo el inventario activo a Python para armar las
  tablas de sector, evolución y demanda; las páginas SEO de estadísticas se
  renderizan en servidor desde él, así que corre también en crawls fríos
  (`views.py:1492-1494`).

### Entradas NO versionadas

Usan la caché como almacén de coordinación, no como caché de lectura:

| Clave | Uso | TTL | Código |
|---|---|---|---|
| `property:create:result:<sha256>` | Resultado de un `create` idempotente | 24 h | `views.py:476`, `:495` |
| `property:create:lock:<sha256>` | Lock de creación concurrente | 60 s | `views.py:477`, `:486` |
| `system:worker:heartbeat` | Latido del worker Celery (tarea cada 60 s) | 300 s | `tasks.py:29` |
| `system:health:probe` | Sonda de `/api/health/` | 10 s | `estate_map/observability.py:111-113` |
| `system:admin:probe` | Sonda del panel de estado admin | 10 s | `views.py:1755-1757` |

El **lock de idempotencia** merece atención por su interacción con
`IGNORE_EXCEPTIONS`: `lock_acquired = cache.add(lock_key, '1', 60)`
(`views.py:486`) devuelve `False` solo cuando otra petición ya lo tiene (→ HTTP
409), pero devuelve `None` cuando Redis está caído. La comprobación es
`if lock_acquired is False` para rechazar y `if lock_acquired` para liberar
(`views.py:487`, `:500-501`): con Redis caído el `None` no rechaza ni libera, de
modo que **publicar sigue funcionando, sin protección de idempotencia**, en vez
de fallar. El comentario lo declara explícitamente (`views.py:498-499`).

---

## 4. Quién invalida y cuándo

Todo pasa por señales de Django en `backend/real_estate/signals.py`. Ni
`serializers.py`, ni `views.py`, ni `ingesta/` invalidan por su cuenta: al
guardar modelos `Property`/`PropertyImage` las señales cubren también las
importaciones masivas.

`_invalidate(property_id)` (`signals.py:16-45`) dispara **las dos capas con un
solo trigger**:

```python
bump_props_version(
    "properties", "map", "summary", "detail", "locations", "market_stats"
)                                          # signals.py:26-28  -> capa Redis

def dispatch():
    revalidate_frontend_tags.delay(
        ["properties", f"property-{property_id}"]
    )                                      # signals.py:34     -> capa Next.js

transaction.on_commit(dispatch)            # signals.py:45
```

El ping al frontend va por Celery **y** por `on_commit` porque la tarea lee la
API de vuelta: dispararla dentro de la transacción dejaría al worker
reconstruyendo la página desde el estado pre-commit (`signals.py:20-24`). El
`try/except` es deliberadamente amplio —kombu envuelve cada fallo de transporte
de forma distinta— y una caída del broker no debe tumbar el `save` que la provocó;
la página simplemente se queda cacheada hasta que venza su TTL
(`signals.py:35-43`).

Receptores registrados:

| Señal | Modelo | Ámbitos bumpeados | Ping a Next.js | Línea |
|---|---|---|---|---|
| `post_save` | `Property` | `catalog` **solo si `created`**, más los 6 de `_invalidate` | sí | `signals.py:64-68` |
| `post_delete` | `Property` | `catalog` + los 6 de `_invalidate` | sí | `signals.py:71-74` |
| `post_save` / `post_delete` | `PropertyImage` | `properties`, `detail` | **no** | `signals.py:77-85` |

- El ámbito **`catalog`** solo se mueve al **crear o borrar** una propiedad
  (`signals.py:67`, `:73`): editar una existente no puede añadir ni quitar un
  cantón del catálogo, así que no hace falta tirar una entrada con TTL de 24 h.
- La asimetría de `PropertyImage` es intencional (`signals.py:80-84`): los
  payloads de listado embeben las URLs de imagen, así que una foto que aparece,
  se reemplaza o termina de optimizarse cambia lo que devuelven las listas
  cacheadas; pero el worker toca **fila por fila** cada imagen de una subida, y
  cada una se convertiría en su propia petición de revalidación al frontend.

### Estado del refactor de ámbitos (verificado; lado lector cerrado el 2026-08-11)

Del lado **escritor**, `signals.py` bumpea ámbitos concretos. Del lado
**lector**, desde el 2026-08-11 cada endpoint pasa su `scope=`:

- `geo` → `provinces:list`, `province:cities`, `cities:list`.
- `map` → `map_points`; `locations` → `locations`; `catalog` → `catalog`;
  `summary` → `properties:summary`; `market_stats` → `market_stats`.
- `properties` → `properties:list` (explícito) e `intelligence` (por omisión:
  es por propiedad y cualquier `save()` le afecta, así que un ámbito propio no
  ganaría nada).

Consecuencias reales:

1. El *churn* de imágenes ya no recicla los payloads que no embeben URLs de
   imagen: `property_image_changed` bumpea solo `properties` y `detail`
   (`signals.py:77-85`), así que `map_points`, `locations`, `summary` y
   `market_stats` sobreviven a la optimización fila por fila de una subida o
   una importación. `catalog` solo se mueve con altas y bajas, con lo que su
   TTL de 24 h por fin corre entero; el caso raro de renombrar la ciudad de
   una propiedad existente espera a ese TTL, y el payload lo tolera porque
   conserva grafías históricas de todos modos.
2. El ámbito **`detail` se bumpea y nadie lo lee**: el detalle de propiedad
   sigue sin caché Redis. Es el hueco que queda del refactor.
3. El ámbito **`geo` no lo bumpea nadie**. `bump_props_version()` sin argumentos
   —la única llamada que lo tocaría (`cache_utils.py:60-61`)— no aparece en
   ninguna parte del backend. Las provincias y cantones cacheados solo se
   refrescan cuando vence su TTL de 24 h (`CACHE_TTL_GEO`). Es asumible porque
   esas tablas cambian, según el propio comentario del código, "una vez cada
   pocos años" (`views.py:171`), pero conviene saberlo: **editar una provincia en
   el admin de Django no se ve en la API hasta 24 h después.**

---

## 5. Capa Next.js: revalidación bajo demanda

### El emisor (backend)

```
NEXT_REVALIDATE_URL = os.getenv('NEXT_REVALIDATE_URL', '')   # settings.py:502
REVALIDATE_SECRET   = os.getenv('REVALIDATE_SECRET', '')     # settings.py:503
```

Dejar cualquiera de los dos vacío convierte la llamada en no-op, que es lo que
quieren dev y CI (`settings.py:499-501`).

La tarea `revalidate_frontend_tags(self, tags)`
(`backend/real_estate/tasks.py:149-194`):

- Si falta `url` o `secret` → `{"status": "disabled"}` sin llamar
  (`tasks.py:164-168`).
- `POST` con cuerpo `{"tags": [...]}`, header `x-revalidate-secret` y **timeout
  de 5 s** (`tasks.py:171-176`).
- `autoretry_for=(requests.RequestException,)`, `retry_backoff=True`,
  `max_retries=2` (`tasks.py:149-154`). Acotado a propósito: una importación
  masiva dispara una de estas por anuncio, así que un frontend caído debe costar
  un puñado de fallos rápidos y no una cola llena de tareas martillándolo
  (`tasks.py:159-162`).
- Agotados los reintentos devuelve `{"status": "failed"}` en vez de propagar la
  excepción (`tasks.py:177-183`).
- Un HTTP ≥ 400 (401 = secreto mal configurado, 404 = ruta ausente) **no** se
  reintenta: fallaría idéntico, se loguea y se corta con `{"status": "rejected"}`
  (`tasks.py:185-192`).

### El receptor (frontend)

`frontend/app/api/revalidate/route.ts` — contrato documentado en el propio
archivo (`route.ts:8-10`):

```
POST http://frontend:3000/api/revalidate
Header: x-revalidate-secret: <REVALIDATE_SECRET>
Body:   { "tags": ["properties", "property-123"] }
```

| Situación | Respuesta | Línea |
|---|---|---|
| `REVALIDATE_SECRET` sin definir en el frontend | `503 Revalidation is not configured` | `route.ts:15-19` |
| Secreto que no coincide | `401 Invalid secret` | `route.ts:21-24` |
| Cuerpo no-JSON | `400 Invalid JSON body` | `route.ts:26-31` |
| `tags` no es array de strings no vacías, o supera `MAX_TAGS = 50` | `400` | `route.ts:12`, `:33-44` |
| OK | `revalidateTag(tag, 'max')` por cada tag → `200 {revalidated:true, tags}` | `route.ts:46-50` |

### Tabla de cache tags

| Tag | Declarado en | Páginas que invalida |
|---|---|---|
| `properties` | `lib/properties.ts:60` (`getProperties`), `:111` (`getPropertySummary`), `:219` (`getNearbyProperties`), `:270` (`getFeaturedProperties`), `:283` (`getProperty`) | `app/page.tsx`, `app/propiedades/page.tsx`, `app/propiedades/[ciudad]/page.tsx` + su `opengraph-image`, `app/provincias/[provincia]/page.tsx` + su `opengraph-image`, `app/[combo]/page.tsx` + su `opengraph-image`, `app/casas-en-venta`, `app/terrenos-en-venta`, `app/departamentos-en-alquiler`, `app/locales-comerciales`, `app/estadisticas-inmobiliarias/[ciudad]`, `app/property/[id]`, `app/sitemap.ts`, `app/image-sitemap.xml/route.ts`, `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts` |
| `property-<id>` | `lib/properties.ts:283` (`getProperty`) | Solo la ficha `app/property/[id]/page.tsx` |
| `catalog` | `lib/properties.ts:143` (`getLocationCatalog`, `revalidate = 86400`) | `app/provincias/[provincia]/page.tsx:22`, `app/propiedades/[ciudad]/page.tsx:28`, `app/estadisticas-inmobiliarias/[ciudad]/page.tsx:36` (los `generateStaticParams`) |
| `market-stats` | `lib/market-stats.ts:39` (`revalidate: 1800`) | `app/estadisticas-inmobiliarias/page.tsx:18,31`, `app/llms.txt/route.ts:25`, `app/llms-full.txt/route.ts:25` |

**Hueco verificado:** el backend solo emite `["properties", "property-<id>"]`
(`signals.py:34`). **Nadie emite `catalog` ni `market-stats`**, aunque la ruta los
aceptaría sin cambios. Esos dos tags dependen exclusivamente de su revalidación
por tiempo: 86400 s para el catálogo y 1800 s para las estadísticas. Es el mismo
patrón que el hueco del lado Redis descrito en §4: la infraestructura de
granularidad existe, pero los productores todavía no la usan.

### ISR por tiempo (segunda red de seguridad)

Cada página exporta su propio `revalidate`, que actúa aunque el ping bajo demanda
nunca llegue:

| `revalidate` | Rutas |
|---|---|
| `300` | `app/property/[id]/page.tsx:79` |
| `1800` | `app/estadisticas-inmobiliarias/page.tsx:15`, `app/estadisticas-inmobiliarias/[ciudad]/page.tsx:23` |
| `3600` | `app/page.tsx:32`, `app/propiedades/page.tsx:24`, `app/propiedades/[ciudad]/page.tsx:9`, `app/provincias/[provincia]/page.tsx:8`, `app/[combo]/page.tsx:18`, `app/casas-en-venta/page.tsx:6`, `app/terrenos-en-venta/page.tsx:6`, `app/departamentos-en-alquiler/page.tsx:6`, `app/locales-comerciales/page.tsx:6`, `app/sitemap.ts:11`, `app/image-sitemap.xml/route.ts:8`, `app/llms.txt/route.ts:22`, `app/llms-full.txt/route.ts:22`, y los `opengraph-image.tsx` de `[combo]`, `provincias/[provincia]` y `propiedades/[ciudad]` |

Todos los helpers de `lib/properties.ts` devuelven `[]` o `null` ante cualquier
fallo, para que las páginas degraden en lugar de romper el build o la petición
(`lib/properties.ts:42-44`, `:62-67`).

Detalle de tamaño: `getProperties` pide `page_size = 2000` pero con
`include_images = '0'` por defecto, porque con imágenes la respuesta **no cabe en
la Data Cache de Next** (`lib/properties.ts:52-58`); las imágenes son opt-in y
solo las usan las grillas de destacados y el image sitemap.

---

## 5 bis. Las láminas del kit de promoción

`GET /api/social/[id]/[format]` no consulta Redis ni el Data Cache: compone una
imagen. Es la ruta más cara del frontend —baja hasta cuatro fotografías del
almacén de objetos, las decodifica, recorta y revela, y rasteriza un árbol— y la
que más veces se pide de golpe, porque cada red social la raspa en cuanto
alguien pega el enlace. Tiene tres capas propias.

**1. La foto maestra, en memoria del proceso.** `photoMaster` guarda hasta doce
fotografías ya decodificadas y normalizadas a 1920 px, junto con las
estadísticas de las que sale su revelado. Los siete formatos de un mismo anuncio
comparten ese trabajo: cada uno vuelve a recortar, ninguno vuelve a descargar.
Un fallo no se memoriza —que MinIO esté un momento caído no es motivo para
dibujar la lámina de marca el resto de la vida del proceso.

**2. La clave de versión en la URL.** `laminaPath` firma cada dirección con
`v=<revisión del arte>.<updated_at del anuncio>`. Con eso, una URL describe una
imagen inmutable: si se edita el precio o se redibuja la tarjeta, la dirección
cambia. Las versionadas salen con `s-maxage=2592000` (un mes) y las tecleadas a
mano conservan los 60 segundos de siempre.

El mes no es un año, y no lleva `immutable`, por una razón concreta:
`LAMINA_REVISION` se sube a mano en `frontend/lib/social-kit.ts`. Si alguien
cambia el arte y olvida subirla, la entrada caduca sola en treinta días en vez
de necesitar una purga en Cloudflare.

**3. El ETag.** Se calcula antes de dibujar nada, a partir de todo lo que puede
cambiar la imagen (revisión, anuncio, `updated_at`, formato, fotograma, red y
mensaje). Un `If-None-Match` que coincide responde 304 sin tocar el almacén de
objetos.

Sobre eso, el peso: la ruta reencoda a JPEG lo que `next/og` rasteriza como PNG
(`LAMINA_MIME`). La historia 9:16 pasó de 2,7 MB a unos 430 KB. El mapa se queda
en PNG porque es color plano y tipografía fina, que es justo lo que JPEG
emborrona.

---

## 6. Interacción con el throttling de DRF

DRF construye sus contadores de rate limit sobre `caches['default']`. El
comentario de `settings.py:446-448` lo explica:

> Once this becomes the default cache, DRF throttling (`DEFAULT_THROTTLE_RATES`
> above) automatically becomes shared across processes instead of per-process
> LocMemCache.

Esto importa porque producción corre `gunicorn ... --workers 3`
(`docker-compose.prod.yml:25`). Con `LocMemCache` cada worker tendría su propio
contador: el límite efectivo sería 3× el declarado y además errático, según a qué
worker cayera cada petición. Con Redis en DB 1 los tres comparten el bucket y los
límites de `settings.py:172-183` significan lo que dicen:

```
activity_create   30/min
pending_create    10/min
map_points       120/min
property_list     60/min
property_write    30/hour
```

Solo se limitan las vistas que declaran `throttle_scope` (`views.py:311-325`):
`map_points` y `list` con `AntiScraperScopedThrottle`, las escrituras con
`ScopedRateThrottle`. `AntiScraperScopedThrottle`
(`real_estate/throttling.py:42-51`) exime a staff y a los llamadores internos;
`_is_internal_client` (`throttling.py:24-39`) considera interno todo lo que
llegue **sin** `X-Forwarded-For` desde una IP privada o loopback, más las
listadas en `THROTTLE_EXEMPT_IPS` (`settings.py:188-190`). Sin esa exención el
servidor Next renderizando nuestras propias páginas compartiría un único bucket y
el sitio entero devolvería 429 con tráfico normal (`throttling.py:6-10`).

El corolario operativo: **purgar la caché purga también el rate limiting.** Un
`FLUSHDB` en la DB 1 resetea todos los buckets a cero.

---

## 7. Modo degradado: qué pasa si Redis se cae

| Componente | Comportamiento |
|---|---|
| **Caché de lectura** | Todos los `cache.get()` devuelven `None` → cada petición recalcula contra Postgres. El sitio sigue en pie, más lento. Los errores se loguean (`settings.py:465`) y se cortan a los 2 s por `SOCKET_TIMEOUT` (`settings.py:456-457`). |
| **Claves de versión** | `props_version()` devuelve `1` (`cache_utils.py:50-51`), así que las claves se siguen componiendo sin fallar; `_bump_version()` traga la excepción (`cache_utils.py:78-79`). |
| **Idempotencia de `create`** | `cache.add()` devuelve `None`: no se rechaza por 409 ni se libera lock. Publicar sigue disponible, sin deduplicación (`views.py:486-501`). |
| **Throttling DRF** | Los contadores viven en la misma caché. Con `IGNORE_EXCEPTIONS` las lecturas devuelven `None`, de modo que **el límite deja de aplicarse** en lugar de bloquear el tráfico. |
| **Celery** | Es otra DB (0) del mismo Redis, pero **otro camino de código**: `CELERY_TASK_PUBLISH_RETRY = False` y timeouts de 2 s (`settings.py:401-408`) hacen que encolar falle rápido; el llamador optimiza la imagen en línea. La revalidación del frontend nunca sale de la cola y las páginas se quedan cacheadas hasta su TTL (`signals.py:35-43`). |
| **Health checks** | `/api/health/` marca `checks["cache"]` como error y responde **503** (`observability.py:108-130`). El panel admin marca `Redis y caché` en `error` y el worker en `unknown` (`views.py:1754-1771`). |

Es decir: la caída de Redis se traduce en **latencia y pérdida de rate limiting**,
nunca en errores 500 para el visitante.

---

## 8. Estado del despliegue

Los dos pendientes históricos están **resueltos a nivel de repositorio**:

- **`django-redis` en la imagen** — declarado en `backend/requirements.txt:16`
  (`django-redis>=5.4`), junto a `redis>=5.0` (`requirements.txt:15`). Falta
  únicamente reconstruir la imagen en el servidor, cosa que no puede verificarse
  desde el repo.
- **`REVALIDATE_SECRET` en ambos entornos** — está en la plantilla
  (`.env.prod.example:109`), llega al backend y al worker vía
  `env_file: .env.prod` (`docker-compose.prod.yml:11-12`, `:59-60`), y se inyecta
  explícitamente al contenedor frontend en `docker-compose.prod.yml:125`. Además
  `scripts/deploy.sh:25-37` lo incluye en `required_vars` y **aborta el
  despliegue** si está vacío o si conserva el placeholder `replace_with...`.

En **desarrollo** la revalidación queda deliberadamente desactivada:
`docker-compose.yml:44` define `NEXT_REVALIDATE_URL` pero el `.env` de dev no
trae `REVALIDATE_SECRET`, así que el backend loguea y salta la llamada
(`docker-compose.yml:42-43`, `tasks.py:166-168`).

---

Ver también: [redis.md](./redis.md) · [celery.md](./celery.md)
