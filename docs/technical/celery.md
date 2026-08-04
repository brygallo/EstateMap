# Celery en Geo Propiedades

Verificado contra el código el 2026-08-04.

Este documento describe **esta** instalación de Celery: la app, los ajustes que
están en `backend/estate_map/settings.py`, las cuatro tareas de
`backend/real_estate/tasks.py`, el pipeline asíncrono de imágenes y su operación.
No es un tutorial de Celery.

Documentos relacionados: [redis.md](./redis.md), [caching.md](./caching.md),
[../workflows/publish-property.md](../workflows/publish-property.md).

---

## 1. Arranque de la aplicación Celery

La app se define en `backend/estate_map/celery.py:16`:

```python
app = Celery("estate_map")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

- El `namespace="CELERY"` (`backend/estate_map/celery.py:20`) hace que toda la
  configuración viva bajo el prefijo `CELERY_*` dentro de `settings.py`, de modo
  que la URL del broker y los ajustes de Django están en un solo archivo.
- `autodiscover_tasks()` (`backend/estate_map/celery.py:21`) recorre las apps
  instaladas buscando `tasks.py`; por eso `real_estate/tasks.py` no necesita
  registro manual.
- `DJANGO_SETTINGS_MODULE` se fija por defecto a `estate_map.settings` en
  `backend/estate_map/celery.py:14`, para que el worker levante sin depender del
  entorno.

`backend/estate_map/__init__.py:7` importa la app como `celery_app`. Ese import
es lo que hace que `@shared_task` se enlace a esta aplicación; sin él las tareas
quedarían registradas contra ninguna app y `.delay()` fallaría en tiempo de
ejecución en vez de en tiempo de import (`backend/estate_map/__init__.py:1-4`).

El docstring de `backend/estate_map/celery.py:4-7` deja explícito el modelo de
despliegue: **el broker se comparte** con los demás sistemas Aents del mismo
host (cada proyecto usa su propio índice de base de datos Redis), pero **los
workers nunca se comparten**, porque un worker ejecuta el código Python de su
propio proyecto.

---

## 2. Tabla de ajustes

Todos en `backend/estate_map/settings.py`, sección `CELERY / SHARED AENTS BROKER`
(líneas 371-437).

| Ajuste | Valor | Razón (documentada en el propio código) |
| --- | --- | --- |
| `CELERY_BROKER_URL` (`settings.py:388`) | `redis://127.0.0.1:6379/0` por defecto, `os.getenv` | Un solo Redis sirve a todos los sistemas Aents del host; cada proyecto es dueño de un índice de base de datos para que un `FLUSHDB` de uno nunca borre la cola de otro (`settings.py:373-387`). |
| Registro de índices (`settings.py:376-380`) | 0 = broker geoPropiedades, 1 = caché Django geoPropiedades, 2/3 = aents (broker/results), 4+ libres | Convención de host compartido. El índice 1 estaba originalmente reservado para un result backend de Celery que nunca se habilitó, así que se reutiliza para la caché de Django en lugar de dejarlo ocioso (`settings.py:382-385`). Ver [redis.md](./redis.md). |
| `CELERY_RESULT_BACKEND` (`settings.py:393`) | `os.getenv("CELERY_RESULT_BACKEND") or None` — es decir, **ninguno** | Nadie lee el valor de retorno de una optimización de imagen; guardarlo escribiría una clave Redis por tarea que jamás se consulta, y quemaría un segundo índice de base de datos por sistema (`settings.py:390-392`). |
| `CELERY_TASK_IGNORE_RESULT` (`settings.py:394`) | `True` | Corolario del anterior: las tareas no publican resultado. |
| `CELERY_TASK_ACKS_LATE` (`settings.py:398`) | `True` | Ack al terminar la tarea, no al entregarla: si el worker muere a mitad de una optimización, la imagen se reencola en vez de perderse en silencio (`settings.py:396-397`). |
| `CELERY_TASK_REJECT_ON_WORKER_LOST` (`settings.py:399`) | `True` | Misma razón: el mensaje vuelve a la cola cuando el proceso hijo desaparece. |
| `CELERY_TASK_PUBLISH_RETRY` (`settings.py:403`) | `False` | Por defecto kombu reintenta un publish fallido ~20 segundos, lo que convertiría una caída del broker en subidas colgadas. El llamador degrada a optimización inline, así que necesita el error rápido (`settings.py:400-402`). |
| `CELERY_BROKER_TRANSPORT_OPTIONS` (`settings.py:404-407`) | `socket_connect_timeout: 2`, `socket_timeout: 2` | Los 2 s cierran el mismo bucle: fallar rápido para que `enqueue_optimization` pueda optimizar inline en vez de dejar la petición esperando. |
| `CELERY_WORKER_CONCURRENCY` (`settings.py:411`) | `1` | La cola es deliberadamente secundaria: una tarea a la vez, tardando lo que tenga que tardar, para no competir nunca con el tráfico web en un host compartido con los otros sistemas Aents y el stack de correo (`settings.py:408-410`). |
| `CELERY_WORKER_PREFETCH_MULTIPLIER` (`settings.py:412`) | `1` | Sin prefetch: el worker toma un mensaje, lo termina y toma el siguiente. |
| `CELERY_WORKER_MAX_MEMORY_PER_CHILD` (`settings.py:416`) | `300_000` (KB, ~300 MB) | Recicla el proceso hijo cuando crece más allá de ~300 MB. Pillow mantiene un bitmap decodificado por imagen (~256 MB para una fuente de 64 MP) y esto devuelve esa memoria al host en vez de dejar que se acumule entre tareas (`settings.py:413-415`). |
| `CELERY_TASK_SERIALIZER` (`settings.py:417`) | `"json"` | — |
| `CELERY_ACCEPT_CONTENT` (`settings.py:418`) | `["json"]` | Solo JSON: nada de pickle en el broker compartido. |
| `CELERY_TIMEZONE` (`settings.py:419`) | `TIME_ZONE` del proyecto | — |
| `CELERY_TASK_SOFT_TIME_LIMIT` (`settings.py:422`) | `600` s | Generoso, porque la latencia aquí no importa. |
| `CELERY_TASK_TIME_LIMIT` (`settings.py:423`) | `900` s | El límite existe solo para que un archivo corrupto no pueda inmovilizar para siempre al único proceso worker y atascar la cola (`settings.py:420-421`). |
| `IMAGE_UPLOAD_TEMP_DIR` (`settings.py:469-472`) | `IMAGE_UPLOAD_TEMP_DIR` o `BASE_DIR/tmp/pending-images` | Las subidas aterrizan aquí primero para que la petición solo pague una escritura a disco local. **Debe ser una ruta real compartida entre el proceso web y el worker** (un volumen Docker cuando son contenedores distintos) (`settings.py:466-468`). |
| `IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS` (`settings.py:474`) | `48` | Red de seguridad para archivos temporales cuya tarea nunca corrió (worker caído durante la subida). |

### Nota sobre concurrencia y memoria en producción

`docker-compose.prod.yml:69` añade `--concurrency=1` y `--max-tasks-per-child=50`
en la línea de comandos, y `docker-compose.prod.yml:83-88` limita el contenedor a
`mem_limit: 512m`, `cpus: 1` y `cpu_shares: 256`. El comentario del compose
explica el porqué: el host tiene 8 GB / 4 vCPU compartidos con Aents, el stack de
correo y nginx; bajo contención el kernel sirve primero el tráfico web y deja
esperar al optimizador (`docker-compose.prod.yml:79-88`).

---

## 3. Fichas de tareas

Las cuatro tareas viven en `backend/real_estate/tasks.py`. Todas usan
`@shared_task`, por lo que quedan ligadas a la app importada en
`estate_map/__init__.py`.

### 3.1 `real_estate.tasks.system_worker_heartbeat`

| Campo | Detalle |
| --- | --- |
| Definición | `backend/real_estate/tasks.py:25-30` |
| Qué hace | Escribe `time.time()` en la clave de caché `system:worker:heartbeat` con TTL de 5 minutos (`tasks.py:29`) y devuelve `{"timestamp": ...}`. |
| Quién la encola | Celery beat, cada 60 s (`settings.py:429-432`). No la encola ningún código de aplicación. |
| Parámetros | Ninguno. |
| Reintentos | Ninguno configurado. |
| Idempotencia | Total: sobrescribe una única clave. |
| Si falla | El heartbeat envejece. `estate_map/observability.py:116-118` marca `checks["worker"] = "stale"` si el valor falta o supera los 180 s, y degrada el estado global del endpoint de salud; el panel de administración hace lo mismo en `real_estate/views.py:1736-1742` (`status: "healthy"` solo si `age_seconds < 180`). |

Como el TTL es de 5 minutos y el umbral de 180 s, un worker parado se detecta en
menos de tres minutos.

### 3.2 `real_estate.tasks.optimize_property_image`

| Campo | Detalle |
| --- | --- |
| Definición | `backend/real_estate/tasks.py:37-109` |
| Firma | `optimize_property_image(self, image_id)` — `bind=True`. |
| Qué hace | Carga el `PropertyImage`, lee el original desde `pending_path`, lo procesa con `ImageOptimizationService().process()`, guarda `image` y `thumbnail` (ambos `save()` empujan a MinIO), fija `file_size`, `status=READY`, limpia `optimization_error` y `pending_path`, y borra el archivo temporal. |
| Quién la encola | `enqueue_optimization()` desde `stage_property_image` (`serializers.py:128`), y `sweep_pending_images` al reencolar (`tasks.py:126`). |
| Decoradores | `autoretry_for=(OSError,)`, `retry_backoff=True`, `retry_kwargs={"max_retries": 3}`, `acks_late=True` (`tasks.py:38-43`). |
| Escritura de la fila | Un solo `save(update_fields=[...])` con los seis campos; los `image.save(..., save=False)` evitan escribir la fila tres veces (`tasks.py:72-90`). |
| Idempotencia | Sí. Si `status == READY` retorna `{"status": "already-ready"}` sin trabajo (`tasks.py:56-57`). Si la fila desapareció (propiedad borrada entre subida y procesamiento) retorna `{"status": "gone"}` y lo registra como `info`, no como error (`tasks.py:50-54`). |
| Fallo: archivo temporal ausente | Marca la fila `FAILED` con `optimization_error = "El archivo temporal ya no existe."` y lanza `PendingImageMissing` (`tasks.py:59-64`). La excepción es de clase propia (`tasks.py:33-34`) y su docstring lo justifica: reintentar no puede ayudar. |
| Fallo: imagen ilegible o excesiva | `ValueError` desde el servicio de optimización → fila `FAILED` con el mensaje como `optimization_error`, log `warning`, se borra el temporal y **retorna** `{"status": "failed", ...}` en vez de propagar, porque un reintento fallaría idénticamente (`tasks.py:91-98`). |
| Fallo: `OSError` | Reintenta hasta 3 veces con backoff exponencial (disco lleno, MinIO inaccesible, etc.). |
| Fallo: worker muerto | `acks_late` + `CELERY_TASK_REJECT_ON_WORKER_LOST` devuelven el mensaje a la cola. |
| Retorno en éxito | `{"id": ..., "status": "ready", "bytes": ...}` más un log con el tiempo transcurrido y si la imagen fue preservada (`tasks.py:100-109`). |

### 3.3 `real_estate.tasks.sweep_pending_images`

| Campo | Detalle |
| --- | --- |
| Definición | `backend/real_estate/tasks.py:112-146` |
| Qué hace | Dos barridos. (1) Para cada `PropertyImage` con `status=PENDING` cuyo `pending_path` todavía existe en disco, reencola `optimize_property_image.delay(pk)` (`tasks.py:124-127`). (2) Recorre `IMAGE_UPLOAD_TEMP_DIR` y borra los archivos que ninguna fila `PENDING` reclama y cuyo `mtime` es anterior a `now - IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS` (`tasks.py:129-143`). |
| Quién la encola | Celery beat, cada 3600 s (`settings.py:433-436`). |
| Parámetros | Ninguno. `max_age` sale de `settings.IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS` con default 48 (`tasks.py:122`). |
| Reintentos | Ninguno configurado. |
| Idempotencia | Sí: reencolar una fila ya `READY` termina en la rama `already-ready`; borrar un temporal ya borrado se traga el `OSError` en `_discard` (`tasks.py:198-202`). |
| Cobertura | La ventana en la que el proceso web escribió el temporal y encoló la tarea, pero el worker estuvo caído lo suficiente como para que el mensaje se perdiera (`tasks.py:114-118`). |
| Si falla | Se pierde una pasada; la siguiente ocurre en una hora. Mientras tanto, las filas siguen `PENDING` y el panel las reporta como `stale` a partir de 2 horas (`views.py:1748-1757`). |
| Retorno | `{"requeued": n, "removed": m}`, también logueado (`tasks.py:145-146`). |

### 3.4 `real_estate.tasks.revalidate_frontend_tags`

| Campo | Detalle |
| --- | --- |
| Definición | `backend/real_estate/tasks.py:149-195` |
| Firma | `revalidate_frontend_tags(self, tags)` — `bind=True`. |
| Qué hace | `POST` a `NEXT_REVALIDATE_URL` con `{"tags": [...]}` y cabecera `x-revalidate-secret`, timeout de 5 s, para que Next.js invalide las entradas de caché etiquetadas (`tasks.py:170-176`). |
| Quién la encola | `real_estate/signals.py:32`, dentro de un `transaction.on_commit`, con `["properties", f"property-{property_id}"]`. |
| Reintentos | `autoretry_for=(requests.RequestException,)`, `retry_backoff=True`, `max_retries=2` (`tasks.py:150-153`). Acotado a propósito: una importación masiva dispara una de estas por listado, así que un frontend caído o lento debe costar un puñado de fallos rápidos, no una cola llena de tareas martillándolo. Servir una página ligeramente rancia es mucho más barato que una tormenta de reintentos (`tasks.py:158-162`). |
| Deshabilitación | Si `NEXT_REVALIDATE_URL` o `REVALIDATE_SECRET` están vacíos, retorna `{"status": "disabled"}` sin llamar a nadie (`tasks.py:164-168`). Es el default en desarrollo (`docker-compose.yml:42-44`). |
| Si falla | Agotados los reintentos, la excepción **no** burbujea como error de tarea: se loguea y se retorna `{"status": "failed", ...}` (`tasks.py:177-183`). Un HTTP >= 400 (401/404 = ruta o secreto mal configurados) se loguea y retorna `{"status": "rejected", "code": ...}` sin reintentar (`tasks.py:185-192`). |
| Si el broker está caído | `signals.py:29-42` envuelve el `.delay()` en un `except Exception` deliberadamente amplio: la página simplemente se queda cacheada hasta su propio TTL. Ver [caching.md](./caching.md). |

---

## 4. Celery beat

`CELERY_BEAT_SCHEDULE` (`settings.py:428-437`) tiene exactamente dos entradas:

```python
"system-worker-heartbeat": {"task": "real_estate.tasks.system_worker_heartbeat", "schedule": 60}
"sweep-pending-images":    {"task": "real_estate.tasks.sweep_pending_images",   "schedule": 60 * 60}
```

Beat corre **embebido en el worker** con la bandera `-B`, tanto en desarrollo
(`docker-compose.yml:84`) como en producción (`docker-compose.prod.yml:69`). El
comentario de `settings.py:425-427` y el de `docker-compose.prod.yml:67-68`
explican por qué es seguro: **hay exactamente un worker por sistema**; con varios,
cada uno dispararía su propia copia del schedule (dos heartbeats, dos barridos por
hora). Si algún día se escala a más de un worker, `-B` debe salir del comando del
worker y beat pasar a ser un proceso propio.

### El archivo `celerybeat-schedule`

Beat persiste la última ejecución de cada entrada en un shelve local. Con
`WORKDIR /app` (`backend/Dockerfile:4`) el archivo queda en `/app/celerybeat-schedule`.

El commit `b0b89e2` («Stop tracking the Celery beat schedule file») lo sacó de git
y añadió `backend/celerybeat-schedule` al `.gitignore`, porque el worker lo
reescribe en cada arranque y aparecía como binario modificado en todos los
árboles de trabajo: es estado local de runtime, no fuente.

Implicaciones prácticas:

- En producción el archivo vive en la capa de escritura del contenedor
  `estatemap_worker` — no hay volumen montado para él
  (`docker-compose.prod.yml:74-77` solo monta `pending_images`). Cada
  recreación del contenedor lo pierde.
- Perderlo es inocuo con este schedule: ambas entradas son intervalos (`60` y
  `3600` segundos), no crontabs; tras un reinicio beat simplemente vuelve a
  contar desde cero. Lo peor que ocurre es un heartbeat o un barrido adelantado.
- No debe volver a añadirse al repositorio.

---

## 5. Pipeline asíncrono de imágenes, de punta a punta

El docstring de `tasks.py:1-8` resume la motivación: la petición de subida solo
escribe el original en disco local y retorna; los dos encodes WebP y los dos PUT
a MinIO ocurren en el worker. Antes, con diez imágenes, todo eso corría dentro del
bloque atómico, antes de la respuesta.

### 5.1 Diagrama

```
  Cliente (POST /api/properties/  multipart, hasta 10 imágenes)
        |
        v
+--------------------------------------------------------------+
|  Proceso web (gunicorn)   @transaction.atomic                 |
|                                                              |
|  PropertySerializer.create()            serializers.py:308-317|
|      |                                                        |
|      +-> stage_property_image()         serializers.py:94-129 |
|             |                                                 |
|             |  1. stash_upload(file)    uploads.py:50-65      |
|             |     escribe el original en IMAGE_UPLOAD_TEMP_DIR|
|             |     con nombre uuid4().hex + sufijo (opaco)     |
|             |     -> (path, size)                             |
|             |     OSError => return None, la propiedad se     |
|             |        guarda SIN esa foto (no revienta)        |
|             |                                                 |
|             |  2. PropertyImage.objects.create(               |
|             |        status=PENDING, pending_path=path,       |
|             |        file_size=size, original_filename=...)   |
|             |                                                 |
|             |  3. enqueue_optimization(image.pk) tasks.py:205 |
|             +------------------+                              |
+--------------------------------|-----------------------------+
                                 |
                        transaction.on_commit
                                 |
                                 v
                   optimize_property_image.delay(id)
                        |                    |
                 publish OK           publish FALLA (broker caído)
                        |                    |
                        |                    v
                        |        optimize_property_image(id) INLINE
                        |        (mismo proceso web, más lento)
                        |             |
                        |             +-- si también falla:
                        |                 la fila queda PENDING con su
                        |                 archivo en disco -> el sweep
                        |                 horario la recoge
                        v
+--------------------------------------------------------------+
|  Redis DB 0 (broker compartido Aents)                         |
+--------------------------------------------------------------+
                        |
                        v
+--------------------------------------------------------------+
|  Worker  (concurrency=1, prefetch=1, acks_late)               |
|  optimize_property_image(image_id)          tasks.py:37-109   |
|                                                              |
|   PropertyImage.objects.get(pk)  -- no existe -> "gone"       |
|   status == READY                -> "already-ready"           |
|   pending_path ausente           -> FAILED + PendingImageMissing|
|                                                              |
|   ImageOptimizationService().process()  image_utils.py:60-132 |
|      - un solo decode de Pillow, exif_transpose               |
|      - master:   <=1920x1920, WEBP calidad 88 (o preservado)  |
|      - thumbnail: <=640x640,  WEBP calidad 82                 |
|                                                              |
|   image.save(...)      -> PUT MinIO                           |
|   thumbnail.save(...)  -> PUT MinIO                           |
|   save(update_fields=[image, thumbnail, file_size,            |
|                       status=READY, optimization_error='',    |
|                       pending_path=''])                       |
|   _discard(temp)                                              |
|                                                              |
|   ValueError (ilegible / >64 MP) -> FAILED + optimization_error|
+--------------------------------------------------------------+

  Mientras status == PENDING, la API sirve la foto desde staging:
      PropertyImageSerializer.get_image/get_thumbnail  serializers.py:145-165
          -> /api/pending-image/<id>/
      PendingImageView                                 views.py:1082-1111
          -> FileResponse del temporal, Cache-Control: no-store
```

### 5.2 Detalles verificados

**Staging (`backend/real_estate/uploads.py`).** `temp_dir()` crea el directorio si
falta (`uploads.py:21-24`). `stash_upload()` escribe en trozos de 1 MB
(`uploads.py:18,60`) y nombra el destino con `uuid4().hex` más el sufijo del
original truncado a 10 caracteres, «opaco a propósito: el nombre original es
controlado por el atacante y se guarda en la fila, no se usa para construir una
ruta» (`uploads.py:53-55`). El nombre original sí se persiste en
`PropertyImage.original_filename` (`serializers.py:122`). El docstring del módulo
justifica el disco local: hacer staging en MinIO subiría el **original** (hasta
10 MB) en vez del WebP de ~300 KB, que es más lento que lo que se reemplazó
(`uploads.py:4-11`).

**La fila.** `PropertyImage` (`backend/real_estate/models.py:216-270`) tiene
`Status.PENDING/READY/FAILED`, `pending_path` y `optimization_error`. El default
del campo `status` es `READY` (`models.py:250`), porque las filas creadas por
otras rutas (por ejemplo la ingesta) ya llegan publicadas. `is_ready()` exige
`status == READY` **y** que `image` tenga contenido (`models.py:269-270`).

**No romper la publicación.** `stage_property_image` no lanza si el staging falla:
corre dentro del bloque atómico que acaba de crear la `Property`, y una excepción
descartaría todo lo que el usuario escribió por un solo archivo que no se pudo
escribir. «Una foto perdida se re-sube en segundos; una publicación perdida no»
(`serializers.py:100-106`, retorno `None` en `serializers.py:112-119`).

**Optimización (`backend/real_estate/image_utils.py`).** Un único decode produce
master y thumbnail (`image_utils.py:60-132`). Parámetros desde
`settings.IMAGE_OPTIMIZATION` (`settings.py:355-364`):

| Clave | Valor | Efecto verificado |
| --- | --- | --- |
| `MAX_WIDTH` / `MAX_HEIGHT` | `1920` / `1920` | Redimensiona con LANCZOS solo si excede (`image_utils.py:86-87`). |
| `QUALITY` | `88` | Calidad del master WebP (`image_utils.py:88-94`). |
| `FORMAT` | `'WEBP'` | El master no preservado y el thumbnail siempre salen WebP (`image_utils.py:107-111`, `115-126`). |
| `THUMBNAIL_SIZE` | `(640, 640)` | Caja del thumbnail, respeta proporción (`image_utils.py:113-114`). |
| `THUMBNAIL_QUALITY` | `82` | Calidad del thumbnail. |
| `PRESERVE_MAX_BYTES` | `512 * 1024` | Si la imagen ya cabe en 1920px, pesa ≤512 KB, su formato está soportado y no trae metadatos sensibles, se conserva byte a byte (`image_utils.py:70-83`). |
| `MINIMUM_SAVINGS_RATIO` | `0.12` | Tras encodear, si el ahorro es menor al 12 % y el original era aceptable, se descarta el WebP y se conserva el original (`image_utils.py:95-105`). |

Otras reglas del servicio: `exif_transpose` antes de procesar
(`image_utils.py:66`); PNG de origen fuerza WebP **lossless**
(`image_utils.py:68`, `93`, `120`); GPS EXIF (IFD `0x8825`) descalifica la
preservación, o sea que las fotos con geolocalización siempre se re-encodean
(`image_utils.py:65`, `169-175`); tope duro de 64 megapíxeles que lanza
`ValueError` (`image_utils.py:153-154`); un archivo ilegible también lanza
`ValueError` (`image_utils.py:156-157`), que es el que la tarea convierte en
`FAILED`; el perfil ICC de origen se preserva si existe (`image_utils.py:187-189`).

**Ruta síncrona alternativa.** `uploads.publish_optimized()` optimiza y publica sin
pasar por la cola (`uploads.py:27-47`), y la usa el pipeline de ingesta
(`backend/ingesta/pipeline/images.py:145` y `:180`). Su docstring explica la
asimetría: la ingesta ya corre desprendida de cualquier petición HTTP, no hay
usuario esperando, así que pagar el encode inline es más simple que dejar un
archivo que el worker tendría que recoger.

### 5.3 El fallback inline

`enqueue_optimization()` (`backend/real_estate/tasks.py:205-240`) hace dos cosas,
ambas documentadas en su docstring (`tasks.py:206-219`):

1. **`transaction.on_commit`**: antes del commit, el worker podría tomar el id y
   no encontrar la fila, porque lee desde su propia conexión.
2. **Fallback**: una caída del broker no debe costarle al usuario su subida.
   Publicar es la única forma nueva en que esta petición puede fallar, y fallaría
   *después* de que la foto ya fue aceptada. Degradar a un encode síncrono es
   exactamente el comportamiento que este cambio reemplazó — más lento, pero
   correcto y completo — así que el peor caso es la latencia antigua en vez de un 500.

El `except Exception` es deliberadamente amplio: kombu envuelve cada fallo de
transporte de forma distinta (`OperationalError`, `ConnectionError`, errores de
socket) y ningún fallo al alcanzar la cola justifica perder la imagen
(`tasks.py:226-228`). Si el encode inline *también* falla, se registra la
excepción y la fila se queda `PENDING` con su archivo en disco, para que el
barrido horario la reintente cuando el broker vuelva (`tasks.py:235-238`).

Este fallback solo es rápido gracias a `CELERY_TASK_PUBLISH_RETRY = False` y a los
timeouts de 2 s: sin ellos, kombu tardaría ~20 s en rendirse antes de que el
fallback siquiera empezara.

---

## 6. Requisito operativo: volumen compartido

`IMAGE_UPLOAD_TEMP_DIR` debe ser visible por el proceso web **y** por el worker
(`settings.py:466-468`, `uploads.py:9-10`). Verificado en ambos compose:

| Entorno | Web | Worker | ¿Comparten? |
| --- | --- | --- | --- |
| Desarrollo (`docker-compose.yml`) | bind mount `./backend:/app` (`:49-50`) | mismo bind mount `./backend:/app` (`:85-87`) | **Sí.** Ambos ven `/app/tmp/pending-images` (el default de `settings.py:471`). El comentario del compose lo dice explícitamente (`docker-compose.yml:86`). |
| Producción (`docker-compose.prod.yml`) | volumen nombrado `pending_images:/app/tmp/pending-images` (`:33`) | mismo volumen `pending_images:/app/tmp/pending-images` (`:77`) | **Sí.** Declarado en `docker-compose.prod.yml:148`. El comentario advierte: «sin este volumen compartido el worker no puede ver el archivo que se le pide optimizar» (`:75-76`). |

Si el volumen se pierde o se desmonta, cada tarea encontrará su `pending_path`
ausente y marcará la fila `FAILED` con «El archivo temporal ya no existe.»
(`tasks.py:60-64`). Es el síntoma característico de este error de configuración.

También nota: `PendingImageView` valida que el archivo esté exactamente en
`IMAGE_UPLOAD_TEMP_DIR` (`views.py:1104`), así que un cambio del directorio en
caliente rompe también la previsualización de las imágenes ya en cola.

---

## 7. Reglas confirmadas por los tests

### `backend/real_estate/tests/test_async_image_pipeline.py`

Todos los tests corren con `task_always_eager = True`, activado por una fixture
`autouse` en `backend/real_estate/tests/conftest.py:92-105`; sin ella, cualquier
`.delay()` intentaría alcanzar un broker real y el test fallaría por conexión
rechazada en vez de por su propia aserción.

| Test | Regla confirmada |
| --- | --- |
| `test_staging_returns_before_any_optimization` (`:34-45`) | Tras `stage_property_image` la fila está `PENDING`, `image` y `thumbnail` están vacíos, y el original está en disco dentro de `IMAGE_UPLOAD_TEMP_DIR`. Nada se publicó todavía en storage. |
| `test_worker_publishes_and_clears_the_staged_file` (`:48-67`) | El worker deja `status=READY`, `image` termina en `.webp`, el thumbnail lleva `_thumb` en el nombre, `is_ready()` es cierto, el master no supera 1920 px, el archivo de staging desaparece y `pending_path` queda vacío. |
| `test_unreadable_file_fails_the_row_without_retrying_forever` (`:70-82`) | Un archivo que no es imagen retorna `{"status": "failed"}`, deja la fila `FAILED` y llena `optimization_error`, sin reintentos. |
| `test_sweep_removes_orphan_files_but_keeps_claimed_ones` (`:85-109`) | El barrido reencola (y aquí completa) una fila `PENDING` huérfana de mensaje, y borra el archivo temporal que ninguna fila reclama. |
| `test_broker_outage_still_produces_a_finished_image` (`:112-133`) | Con `.delay()` lanzando `kombu.exceptions.OperationalError`, la imagen igual termina `READY` con `image` y `thumbnail` publicados: el broker caído cuesta latencia, nunca la subida. Usa `django_capture_on_commit_callbacks` porque el dispatch ocurre en el commit. |
| `test_unwritable_staging_never_costs_the_listing` (`:136-153`) | Con `stash_upload` lanzando `OSError("No space left on device")`, `stage_property_image` retorna `None`, la `Property` sobrevive y queda con 0 imágenes. |
| `test_serializer_serves_pending_images_from_staging` (`:156-167`) | Una fila `PENDING` serializa `status: "pending"` e `image: "/api/pending-image/<id>/"`, para que el cliente vea la foto de inmediato en lugar de una imagen rota. |

### `backend/real_estate/tests/test_image_optimization.py`

| Test | Regla confirmada |
| --- | --- |
| `test_small_optimized_image_is_preserved_byte_for_byte` (`:16-25`) | Un WebP de 720x532 ya optimizado se preserva idéntico: `preserved is True`, mismos bytes, mismo tamaño y el nombre conserva `.webp`. |
| `test_large_image_is_resized_once_and_encoded_as_high_quality_webp` (`:28-41`) | Un JPEG de 2600x1800 sale `preserved is False`, formato WEBP y con ambas dimensiones ≤ 1920. |
| `test_thumbnail_is_generated_directly_at_the_configured_bound` (`:44-53`) | Con `thumbnail_size=(640, 640)`, un 1600x1200 produce un thumbnail WEBP de exactamente 640x480 (proporción respetada). |
| `test_large_transparent_png_keeps_alpha_with_lossless_webp` (`:56-69`) | Un PNG RGBA de 2200x1200 sale WEBP en modo `RGBA`, con el canal alfa intacto (valor 100) y ancho 1920. |

---

## 8. Operación

### Lanzar worker y beat

Comandos reales, tomados de los compose:

```bash
# Desarrollo (docker-compose.yml:84)
celery -A estate_map worker -B --loglevel=info --concurrency=1

# Producción (docker-compose.prod.yml:69)
celery -A estate_map worker -B --loglevel=info --concurrency=1 --max-tasks-per-child=50
```

En Docker:

```bash
docker compose up -d worker                                  # desarrollo
docker compose -f docker-compose.prod.yml up -d worker       # producción
docker compose -f docker-compose.prod.yml restart worker
docker compose -f docker-compose.prod.yml logs -f worker
```

El servicio de producción se llama `worker` y el contenedor `estatemap_worker`
(`docker-compose.prod.yml:52-56`), con `restart: always` y logging rotado a
3 archivos de 10 MB (`:90-94`).

El proceso web **también** necesita `CELERY_BROKER_URL`, porque es quien encola
(`docker-compose.yml:37-38`, `docker-compose.prod.yml:15-17`).

### Ver la cola

La cola por defecto de Celery sobre Redis es la lista `celery` en el índice 0:

```bash
# Producción: Redis nativo del host, compartido con Aents
redis-cli -n 0 llen celery          # mensajes pendientes
redis-cli -n 0 lrange celery 0 4    # inspeccionar los primeros
redis-cli -n 0 keys 'unacked*'      # tareas entregadas y aún sin ack (acks_late)

# Desarrollo: contenedor redis, publicado en el host en 6389
redis-cli -p 6389 -n 0 llen celery
```

Nunca ejecutar `FLUSHALL`: el mismo Redis sirve a los demás sistemas Aents. Como
mucho `FLUSHDB` sobre un índice concreto, y aun así el índice 0 es la cola viva.
Ver [redis.md](./redis.md) para el registro completo de índices.

Estado del worker por vía de la aplicación, sin tocar Redis:

```bash
curl -s https://<host>/api/health/ | jq '.checks.worker'   # "ok" | "stale" | "unknown"
```

Deriva del heartbeat: `ok` solo si la clave `system:worker:heartbeat` tiene menos
de 180 s (`estate_map/observability.py:116-119`).

Inspección directa de Celery, si hace falta:

```bash
docker compose -f docker-compose.prod.yml exec worker celery -A estate_map inspect active
docker compose -f docker-compose.prod.yml exec worker celery -A estate_map inspect scheduled
```

### Diagnosticar imágenes atascadas en PENDING

El panel de administración ya lo señala: cuenta las `FAILED` y las `PENDING` con
más de 2 horas, y reporta `error` / `stale` en el componente «Procesamiento de
imágenes» (`real_estate/views.py:1746-1757`).

Secuencia de diagnóstico:

1. **¿Está vivo el worker?** `/api/health/` → `checks.worker`. Si es `stale`,
   el worker está caído o sin acceso al Redis del caché: `docker compose ... logs worker`.
2. **¿Hay mensajes encolados?** `redis-cli -n 0 llen celery`. Cola larga y worker
   vivo = está procesando en serie (concurrencia 1, a propósito). Cola vacía con
   filas `PENDING` = el mensaje se perdió; lo arregla el barrido horario.
3. **¿Existen los archivos?**

   ```bash
   docker compose -f docker-compose.prod.yml exec worker \
     python manage.py shell -c "
   from pathlib import Path
   from real_estate.models import PropertyImage
   for i in PropertyImage.objects.filter(status='pending'):
       print(i.pk, i.uploaded_at, i.pending_path, Path(i.pending_path).exists() if i.pending_path else None)
   "
   ```

   `False` en la última columna sobre el contenedor del worker, con `True` sobre
   el del backend, significa que el volumen compartido no está montado (ver §6).
4. **Forzar el barrido** en vez de esperar la hora:

   ```bash
   docker compose -f docker-compose.prod.yml exec worker \
     python manage.py shell -c "from real_estate.tasks import sweep_pending_images; print(sweep_pending_images.delay())"
   ```

   Reencola toda fila `PENDING` cuyo archivo siga existiendo (`tasks.py:124-127`).
5. **Reencolar una sola imagen**:

   ```bash
   docker compose -f docker-compose.prod.yml exec worker \
     python manage.py shell -c "from real_estate.tasks import optimize_property_image; optimize_property_image.delay(<id>)"
   ```

6. **Revisar las `FAILED`**: el motivo está en `optimization_error`.
   «El archivo temporal ya no existe.» (`tasks.py:62`) apunta a volumen no
   compartido o a un barrido que ya limpió el archivo por antigüedad
   (`IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS = 48`). Los demás mensajes vienen del
   `ValueError` del optimizador: «The uploaded file is not a readable image.»,
   «The image exceeds the 64 megapixel safety limit.» o «The uploaded image is
   empty.» (`image_utils.py:146,154,157`). Ninguno de esos se arregla
   reintentando; el usuario debe volver a subir la foto.

Mientras una imagen sigue `PENDING`, el usuario **no** ve una imagen rota: la API
la sirve desde staging a través de `/api/pending-image/<id>/`
(`views.py:1082-1111`), sin caché (`Cache-Control: no-store`) porque esa URL deja
de ser válida en cuanto el worker termina.
