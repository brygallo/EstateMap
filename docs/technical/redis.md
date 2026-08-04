# Redis

Verificado contra el código el 2026-08-04.

Este proyecto no tiene un Redis propio: **comparte una única instancia con los
demás sistemas Aents del mismo host** y se aísla por índice de base de datos.
Dos consumidores distintos dentro de ese Redis compartido:

- **DB 0** — broker de Celery (cola de optimización de imágenes y revalidación
  del frontend). Ver [celery.md](./celery.md).
- **DB 1** — caché de Django (`django_redis`). Ver [caching.md](./caching.md).

---

## 1. El registro de índices

Está documentado en `backend/estate_map/settings.py:374-387`, textualmente:

```
# One Redis serves every Aents system on the host; each project owns a database
# index so a FLUSHDB in one never wipes another's queue. Registry:
#
#   0      geoPropiedades  (Celery broker)      <- this project
#   1      geoPropiedades  (Django cache)        <- this project
#   2 / 3  aents           (broker / results)
#   4+     free for the next system
#
# DB 1 was originally reserved for a Celery result backend, but that was never
# enabled (see CELERY_RESULT_BACKEND below), so it is repurposed here for the
# Django cache instead of leaving it idle.
#
# Workers are not shared. A worker imports its own project's tasks, so each
# system runs its own worker against its own index.
```

La razón de la separación se repite en la sección de caché
(`settings.py:442-443`):

> Same physical Redis as the Celery broker, but a different DB index so a cache
> flush can never touch queued tasks (or vice versa).

Es un aislamiento operativo, no de seguridad: cualquiera con acceso al servidor
puede tocar todos los índices. Lo que compra es que un `FLUSHDB -n 1` para
purgar la caché **no vacía la cola de tareas**, y que un `FLUSHDB -n 0` para
descartar mensajes atascados no borra los payloads cacheados ni los contadores de
throttling. Un `FLUSHALL`, en cambio, tumbaría los cuatro índices y con ellos el
sistema `aents`.

El índice 1 no estaba en el plan original: se liberó al decidir que Celery no
tendría result backend (ver §4).

`backend/estate_map/celery.py:4-7` repite el mismo criterio en la cabecera de la
app Celery y remite a este registro.

---

## 2. Cómo se configura cada URL

| Variable | Default en código | Fuente |
|---|---|---|
| `CELERY_BROKER_URL` | `redis://127.0.0.1:6379/0` | `settings.py:388` |
| `REDIS_CACHE_URL` | `redis://127.0.0.1:6379/1` | `settings.py:451` (dentro de `CACHES['default']['LOCATION']`) |

Ambas se leen con `os.getenv`, así que el default solo aplica a una ejecución sin
entorno (por ejemplo, tests o un `manage.py` local).

### Dónde se definen

**Producción** — `.env.prod.example` (plantilla; el `.env.prod` real no está
versionado):

```
.env.prod.example:112   CELERY_BROKER_URL=redis://aents-redis:6379/0
.env.prod.example:113   REDIS_CACHE_URL=redis://aents-redis:6379/1
```

precedidas del comentario `# Redis compartido: colas y caché deben usar bases
distintas.` (`.env.prod.example:111`). En el mismo bloque viven las dos variables
de revalidación del frontend: `NEXT_REVALIDATE_URL` (`.env.prod.example:108`) y
`REVALIDATE_SECRET` (`.env.prod.example:109`).

`docker-compose.prod.yml` las vuelve a pasar con el mismo default, tanto al
proceso web como al worker:

```
docker-compose.prod.yml:17   CELERY_BROKER_URL: ${CELERY_BROKER_URL:-redis://aents-redis:6379/0}   # backend
docker-compose.prod.yml:20   REDIS_CACHE_URL:   ${REDIS_CACHE_URL:-redis://aents-redis:6379/1}     # backend
docker-compose.prod.yml:63   CELERY_BROKER_URL: ${CELERY_BROKER_URL:-redis://aents-redis:6379/0}   # worker
docker-compose.prod.yml:64   REDIS_CACHE_URL:   ${REDIS_CACHE_URL:-redis://aents-redis:6379/1}     # worker
```

**Desarrollo** — `docker-compose.yml` las escribe literalmente, apuntando al
servicio `redis` del propio compose:

```
docker-compose.yml:38   CELERY_BROKER_URL: redis://redis:6379/0   # backend
docker-compose.yml:41   REDIS_CACHE_URL:   redis://redis:6379/1   # backend
docker-compose.yml:79   CELERY_BROKER_URL: redis://redis:6379/0   # worker
docker-compose.yml:80   REDIS_CACHE_URL:   redis://redis:6379/1   # worker
```

Ni `.env` ni `.env.example` (raíz del repo) declaran `CELERY_BROKER_URL`,
`REDIS_CACHE_URL` ni `REVALIDATE_SECRET`: en dev el valor viene del compose y la
revalidación del frontend queda desactivada a propósito
(`docker-compose.yml:42-43`).

> Ninguno de estos archivos versionados contiene credenciales reales. Las URLs
> de Redis no llevan contraseña en las plantillas; el valor efectivo de
> producción vive solo en el `.env.prod` del servidor.

---

## 3. Redis no corre en Docker en producción

Verificado: `docker-compose.prod.yml` define exactamente **tres servicios** —
`backend` (línea 4), `worker` (línea 52) y `frontend` (línea 103). **No hay
servicio `redis`.** Tampoco hay volumen para él (`docker-compose.prod.yml:146-148`
solo declara `static_volume`, `media_volume` y `pending_images`).

Los comentarios del repo lo dicen en dos sitios:

- `docker-compose.yml:59-60`: *"Dev-only broker. Production reuses the host's
  Redis, shared with the other Aents systems; here a throwaway container keeps
  the setup self-contained."*
- `docker-compose.prod.yml:50-51`: *"The broker is the host's Redis, shared with
  the other Aents systems; this project owns database index 0 (see settings.py
  for the registry)."*

Dos mecanismos permiten alcanzarlo desde los contenedores:

1. La red externa `aents_shared` (`docker-compose.prod.yml:157-158`, declarada
   `external: true`), a la que se unen `backend` (`:45-47`) y `worker`. Su
   comentario (`docker-compose.prod.yml:154-156`): *"Cross-project network
   carrying the Redis every Aents system shares. Created once by the
   aents-shared stack; declared external here so this compose joins it instead
   of trying to own it."* De ahí el hostname por defecto `aents-redis`.
2. `extra_hosts: - "host.docker.internal:host-gateway"` en backend
   (`docker-compose.prod.yml:27-28`) y worker (`:71-72`), que permite apuntar a
   un Redis del host con `redis://host.docker.internal:6379/N` vía variable de
   entorno.

El `frontend` **no** se une a `aents_shared` — comentario explícito en
`docker-compose.prod.yml:141`: *"No aents_shared here: the frontend never talks
to the broker."*

### El Redis de desarrollo

`docker-compose.yml:58-71` levanta un contenedor desechable:

```
image:   redis:7-alpine
command: redis-server --appendonly yes --maxmemory-policy noeviction
ports:   6389:6379            # el 6389 del host evita chocar con un Redis local
volume:  redis_data:/data
health:  redis-cli ping
```

`noeviction` es coherente con el diseño de la caché: los payloads dependen de que
expiren por TTL, no de que Redis los expulse por presión de memoria.

---

## 4. Por qué no hay result backend

`backend/estate_map/settings.py:390-394`:

```python
# No result backend on purpose. Nothing reads the return value of an image
# optimization, so storing one would write a Redis key per task that is never
# looked at — and it would burn a second database index per system.
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND") or None
CELERY_TASK_IGNORE_RESULT = True
```

Implicaciones prácticas:

- **No se puede consultar el estado de una tarea.** `AsyncResult(task_id).get()`
  o `.status` no devuelven nada útil. Cualquier código que quiera saber si una
  tarea terminó debe deducirlo del estado en Postgres — que es exactamente lo
  que hace el pipeline de imágenes con `PropertyImage.status`
  (`PENDING`/`FAILED`) y lo que verifica el barrido horario
  `sweep_pending_images` (`settings.py:433-436`).
- **No hay `chord`, `chain` con resultados ni `group().get()`**: esos primitivos
  requieren backend.
- **Redis no acumula claves basura**: sin backend, un pico de importación no
  deja miles de `celery-task-meta-*` con su TTL por delante.
- **Se liberó el índice 1**, que originalmente estaba reservado para esto y hoy
  es la caché de Django (`settings.py:382-384`).
- El valor sigue siendo overridable por entorno (`os.getenv(...) or None`), pero
  activarlo obligaría a elegir un índice libre (4+) del registro.

Las tareas cuyo retorno sí interesa lo devuelven solo para el log: p. ej.
`revalidate_frontend_tags` devuelve `{"status": "disabled"|"failed"|"rejected"}`
(`backend/real_estate/tasks.py:168`, `:182`, `:192`) y nadie lo lee.

---

## 5. Timeouts de socket: 2 segundos en ambos consumidores

**Broker** (`settings.py:404-407`):

```python
CELERY_BROKER_TRANSPORT_OPTIONS = {
    "socket_connect_timeout": 2,
    "socket_timeout": 2,
}
```

acompañado de `CELERY_TASK_PUBLISH_RETRY = False` (`settings.py:403`), cuyo
comentario (`settings.py:400-402`) explica el porqué:

> By default kombu retries a failed publish for ~20 seconds, which would turn a
> broker outage into hung uploads; the caller falls back to optimizing inline
> instead, so it needs the error quickly.

**Caché** (`settings.py:455-456`):

```python
"SOCKET_CONNECT_TIMEOUT": 2,
"SOCKET_TIMEOUT": 2,
```

En ambos casos el llamador está dentro de un ciclo petición-respuesta HTTP. Los
defaults de kombu y redis-py están pensados para procesos batch, no para
gunicorn: con 3 workers (`docker-compose.prod.yml:25`), un Redis colgado durante
20 s bloquearía los tres y el sitio dejaría de responder por completo. Con 2 s,
lo peor que ocurre es que la petición pierda 2 s y siga:

- La caché devuelve `None` por `IGNORE_EXCEPTIONS` y se recalcula desde Postgres.
- El encolado falla y la imagen se optimiza en línea.

Ver el detalle del modo degradado en [caching.md](./caching.md).

---

## 6. Comandos operativos

> **Todos los comandos de esta sección son de solo lectura salvo los marcados
> como DESTRUCTIVO.**

Presupone un `redis-cli` con acceso a la instancia (en el host de producción, o
`redis-cli -p 6389` contra el contenedor de dev según `docker-compose.yml:64`).

### Broker — DB 0

```bash
# Profundidad de la cola por defecto de Celery (no hay override de
# task_default_queue en settings.py, así que el nombre es "celery").
redis-cli -n 0 LLEN celery

# Cuántas claves hay en total en el índice del broker.
redis-cli -n 0 DBSIZE

# Espiar el primer mensaje pendiente sin consumirlo.
redis-cli -n 0 LINDEX celery 0

# Colas "unacked" y demás estructuras que crea kombu.
redis-cli -n 0 --scan --pattern 'unacked*'
```

### Caché — DB 1

```bash
# Todas las claves del proyecto. Django compone la clave física como
# KEY_PREFIX:<version>:<clave>, con KEY_PREFIX="estatemap" (settings.py:458).
redis-cli -n 1 --scan --pattern 'estatemap:*'

# La clave de versión del inventario: si sube, es que algo invalidó la caché.
redis-cli -n 1 GET 'estatemap:1:props:ver'

# TTL restante de una entrada concreta (-1 = sin expiración, -2 = no existe).
redis-cli -n 1 TTL 'estatemap:1:props:ver'

# Latido del worker Celery (lo escribe tasks.py:29 cada 60 s, TTL 300 s).
redis-cli -n 1 GET 'estatemap:1:system:worker:heartbeat'

# Cuántas entradas de mapa hay vivas para la versión actual.
redis-cli -n 1 --scan --pattern 'estatemap:1:map_points:v*' | wc -l

# Buckets de throttling de DRF (comparten esta misma DB).
redis-cli -n 1 --scan --pattern 'estatemap:1:throttle_*'
```

> Usa siempre `--scan` y nunca `KEYS *`: `KEYS` bloquea el servidor entero, y
> este Redis es compartido con los otros sistemas Aents.

### Diagnóstico general

```bash
redis-cli INFO memory        # uso de memoria del host compartido
redis-cli INFO keyspace      # claves por índice: confirma el registro 0/1/2/3
redis-cli CLIENT LIST        # quién está conectado
redis-cli --stat             # ops/seg en vivo
```

`INFO keyspace` es la forma más rápida de verificar que nadie invadió un índice
ajeno.

### DESTRUCTIVOS

```bash
# DESTRUCTIVO — vacía SOLO la caché de lectura. Es seguro en el sentido de que
# el sitio se repuebla solo desde Postgres, pero durante unos minutos toda
# petición pega a la base de datos, y también borra los contadores de throttling
# y el heartbeat del worker.
redis-cli -n 1 FLUSHDB

# DESTRUCTIVO — descarta todos los mensajes encolados. Las imágenes pendientes
# se recuperan en el barrido horario sweep_pending_images (settings.py:433-436),
# pero las revalidaciones del frontend perdidas NO se reintentan: esas páginas
# quedan cacheadas hasta que venza su TTL.
redis-cli -n 0 FLUSHDB

# DESTRUCTIVO — invalida la caché sin borrar nada, moviendo la versión.
# Equivalente a lo que hace bump_props_version() (cache_utils.py:47-60).
redis-cli -n 1 INCR 'estatemap:1:props:ver'

# NUNCA. Borra los cuatro índices y tumba también el sistema aents (DB 2/3).
redis-cli FLUSHALL
```

De los tres primeros, `INCR props:ver` es casi siempre el que se quiere: invalida
todo el inventario cacheado sin tocar throttling, heartbeat, locks de
idempotencia ni la cola.

---

## 7. Salud

Ambos health checks sondean Redis escribiendo y releyendo una clave:

- `GET /api/health/` — `backend/estate_map/observability.py:108-123`, con
  `system:health:probe` (TTL 10 s). Un fallo de caché marca `status: "error"` y
  devuelve **HTTP 503** (`observability.py:130`); un worker con latido de más de
  180 s marca `worker: "stale"` y degrada a `status: "degraded"`, que sí
  responde 200 (`observability.py:116-119`).
- Panel admin — `backend/real_estate/views.py:1728-1745`, con
  `system:admin:probe`, expone los componentes `Redis y caché` y
  `Worker de tareas` con su `age_seconds`.

---

Ver también: [caching.md](./caching.md) · [celery.md](./celery.md)
