# Publicar una propiedad

Verificado contra el código el 2026-08-04.

Recorrido completo desde el clic del usuario hasta que la propiedad aparece en el mapa.
El árbol tiene cambios sin commitear en `views.py`, `serializers.py`, `signals.py`,
`cache_utils.py` y `settings.py`, y ficheros nuevos en `backend/real_estate/services/`;
lo que sigue describe el estado **actual del working tree**, no el del último commit.
Ese árbol se está editando activamente: si un número de línea no cuadra, busca por el
nombre del símbolo citado.

---

## 1. Diagrama de secuencia

```
Usuario          Next.js (frontend)        API Django            Celery worker        MinIO / Redis
   |                     |                      |                       |                    |
   |-- /publicar-propiedad -->|                 |                       |                    |
   |                     | render add-property/page.tsx (wizard 5 pasos) |                    |
   |                     |                      |                       |                    |
   |-- paso 2: dibuja polígono -->|             |                       |                    |
   |                     | DrawLocationMap (MapLibre GL, sin servidor)   |                    |
   |                     |                      |                       |                    |
   |-- "Guardar Propiedad" -->|                 |                       |                    |
   |                     |                      |                       |                    |
   |          [SIN TOKEN]  POST /api/pending-publications/ (skipAuth)    |                    |
   |                     |--------------------->| PendingPublication     |                    |
   |                     |                      |   source=account_required                   |
   |                     |                      |   -> correo a ADMINS   |                    |
   |                     |<-- 201 --------------|  (NO entra al mapa)    |                    |
   |<-- modal login/registro --|                 |                       |                    |
   |                     |                      |                       |                    |
   |          [CON TOKEN]  POST /api/properties/  (multipart/form-data)  |                    |
   |                     |  + Idempotency-Key    |                       |                    |
   |                     |--------------------->|                       |                    |
   |                     |                      | throttle property_write 30/h               |
   |                     |                      | PropertySerializer.validate_*              |
   |                     |                      | @transaction.atomic:                        |
   |                     |                      |   Property.objects.create(owner=user)       |
   |                     |                      |   PropertyImage(PENDING) x N                |
   |                     |                      |   stash_upload -> disco local temporal      |
   |                     |                      |                       |                    |
   |                     |                      | signals post_save:                          |
   |                     |                      |   PropertyPriceHistory ------------------->|
   |                     |                      |   bump_props_version(6 scopes) -> INCR -->|
   |                     |                      |   submit_property() -> IndexNow (batch 10s) |
   |                     |                      |                       |                    |
   |                     |                      | on_commit -> enqueue_optimization           |
   |                     |                      |---------------------->| optimize_property_image
   |                     |                      |                       |-- WebP + thumb ---->|
   |                     |                      |                       |   status=READY      |
   |                     |                      |                       |-- bump properties+detail ->|
   |                     |                      |                       |                    |
   |                     |                      | on_commit -> revalidate_frontend_tags       |
   |                     |<-- POST /api/revalidate (x-revalidate-secret) |                    |
   |                     |  revalidateTag('properties','property-<id>')  |                    |
   |                     |                      |                       |                    |
   |<-- 201 + confetti + redirect /mis-propiedades --|                   |                    |
   |                     |                      |                       |                    |
   |-- ve el mapa ------>| GET /api/properties/map_points/ (caché versionada por scope)       |
```

---

## 2. Rutas del frontend: cuáles son reales y cuáles son alias

El formulario **existe una sola vez**. Las rutas en español son *re-exports* de un
único componente, no copias.

| Ruta | Archivo | Qué es |
|---|---|---|
| `/publicar-propiedad` | `frontend/app/publicar-propiedad/page.tsx:1` | Alias canónico e indexable. Todo su contenido es `export { default } from '../add-property/page';` |
| `/add-property` | `frontend/app/add-property/page.tsx` (2523 líneas) | **El formulario real.** Único componente del wizard |
| `/editar-propiedad/[id]` | `frontend/app/editar-propiedad/[id]/page.tsx:1` | Alias de `/edit-property/[id]` |
| `/edit-property/[id]` | `frontend/app/edit-property/[id]/page.tsx:1` | Alias: `export { default } from '../../add-property/page';`. El mismo componente entra en modo edición |
| `/mis-propiedades` | `frontend/app/mis-propiedades/page.tsx:1` | Alias de `/my-properties` |
| `/my-properties` | `frontend/app/my-properties/page.tsx` (612 líneas) | **Panel real** del propietario |
| `/publicar-asistido` | `frontend/app/publicar-asistido/page.tsx` (316 líneas) | Formulario corto e independiente. **No toca la API**: arma un mensaje y abre WhatsApp (`frontend/app/publicar-asistido/page.tsx:87-99`) |
| `/empezar-publicacion` | — | **No existe.** El directorio `frontend/app/empezar-publicacion/` está vacío, no tiene `page.tsx`, no está rastreado por git (`git ls-files` no devuelve nada) y ningún archivo del frontend lo referencia. No genera ruta |

Cuál se indexa:

- `frontend/app/publicar-propiedad/layout.tsx:11-12` — `robots: { index: true, follow: true }` y `alternates.canonical = '/publicar-propiedad'`. Esta es la URL pública de captación.
- `frontend/app/add-property/layout.tsx:5-8` — `robots: { index: false, follow: false }`. La ruta en inglés existe para el código, no para buscadores.
- `frontend/app/my-properties/layout.tsx` y `frontend/app/edit-property/[id]/layout.tsx` también son `index: false`.

Modo edición: el componente decide con `const isEditMode = Boolean(propertyId)`
(`frontend/app/add-property/page.tsx:176`). Ese `propertyId` sale del segmento `[id]`, así
que la misma página sirve para crear y para editar.

---

## 3. El formulario: 5 pasos

Los pasos se declaran en `frontend/app/add-property/page.tsx:1274-1305` y se validan en
`frontend/app/add-property/page.tsx:1308-1347`.

1. **Datos** — tipo de inmueble, título, descripción.
   Obligatorio: `title` no vacío (`frontend/app/add-property/page.tsx:1309-1315`).
2. **Ubicación** — dos modos excluyentes, `locationMode = 'point' | 'polygon'`.
   - Modo polígono: exige ≥3 vértices.
   - Modo punto: exige `latitude` y `longitude`.
   (`frontend/app/add-property/page.tsx:1316-1326`)
   La geolocalización del navegador se pide **al llegar a este paso**, no al cargar la
   página (`frontend/app/add-property/page.tsx:441-488`). Hay buscador de direcciones
   contra Nominatim de OpenStreetMap (`frontend/app/add-property/page.tsx:1065`).
3. **Características** — área, área construida, habitaciones, baños, parqueos, pisos,
   amoblado, año.
   Obligatorio solo `area`, y **solo en modo polígono**
   (`frontend/app/add-property/page.tsx:1327-1335`).
4. **Precio** — precio, negociable, teléfono de contacto.
   Obligatorio: `price` (`frontend/app/add-property/page.tsx:1336-1342`).
5. **Fotos** — carga de imágenes, reordenamiento (la primera es la principal,
   `frontend/app/add-property/page.tsx:1262-1273`) y envío.

El campo `status` del formulario acepta `for_sale`, `for_rent`, `sold`, `rented`,
`inactive` (`frontend/app/add-property/page.tsx:113`), pero el selector visible solo
ofrece **En venta**, **En alquiler** e **Inactivo**
(`frontend/app/add-property/page.tsx:1566-1570`). El modelo, por su parte, solo admite
`for_sale`, `for_rent` e `inactive` (`backend/real_estate/models.py:69-73`): enviar
`sold` o `rented` no está soportado por el backend.

### Dibujo del polígono (MapLibre)

`DrawLocationMap` se carga en diferido (`frontend/app/add-property/page.tsx:87`) y usa
MapLibre GL directamente, sin capa de dibujo de terceros:
`frontend/components/maps/DrawLocationMap.tsx:3-4` importa `maplibre-gl`, y el estado de
dibujo es propio — `'idle' | 'drawing' | 'closed'`
(`frontend/components/maps/DrawLocationMap.tsx:142`). Mantiene marcadores de vértices,
de puntos medios y de etiquetas de medidas
(`frontend/components/maps/DrawLocationMap.tsx:153-155`). El área se calcula en cliente
con turf (`frontend/components/maps/DrawLocationMap.tsx:61`), pero el backend la
recalcula y valida por su cuenta.

### Borrador local

Mientras el usuario escribe, el formulario guarda un borrador en `localStorage` con
rebote de 800 ms (`frontend/app/add-property/page.tsx:864-876`) y avisa antes de cerrar
la pestaña (`frontend/app/add-property/page.tsx:865-877`). En edición esto está
desactivado.

---

## 4. La puerta de autenticación

### Qué exige el backend

- `PropertyViewSet` declara `permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]`
  (`backend/real_estate/views.py:282`). Crear requiere sesión; editar y borrar requieren
  además ser dueño (`backend/real_estate/permissions.py:9-15`).
- El registro deja al usuario **inactivo** hasta verificar el correo:
  `is_active=False` en `backend/real_estate/serializers.py:646-653`, y se envía un código
  de verificación (`backend/real_estate/serializers.py:655-657`).
- El login rechaza a los no verificados con un código específico:
  `"code": "email_not_verified"` (`backend/real_estate/serializers.py:582-587`).
  Sin login no hay JWT, y sin JWT no se puede crear la propiedad. **Un correo no
  verificado no puede publicar en ningún caso.**

### Qué hace el frontend cuando falta la cuenta

En el submit, antes de tocar `/properties/`:

```
if (!token && !isEditMode) {
  savePublicationDraft();
  await savePendingPublication('account_required');
  ...
  setGateMode('login');
  setShowAccountModal(true);
  return;
}
```
(`frontend/app/add-property/page.tsx:901-914`)

Es decir: **el trabajo del usuario no se pierde ni se descarta**. Se guarda el borrador
en local y, además, se envía al backend como `PendingPublication`.

- Si el usuario se registra desde el modal, el frontend lo manda a
  `/verificar-correo?email=…` (`frontend/app/add-property/page.tsx:752`); no publica.
- Si inicia sesión desde el modal y su correo no está verificado, el backend responde
  `email_not_verified` y el frontend también lo manda a `/verificar-correo`
  (`frontend/app/add-property/page.tsx:780-784`).
- Si inicia sesión correctamente, se activa `pendingPublish` y un efecto reenvía el
  formulario en cuanto el token está disponible
  (`frontend/app/add-property/page.tsx:796-801` y `809-814`).

### PendingPublication: seguimiento comercial, no inventario

El modelo lo dice explícitamente: *"Solicitud de publicación capturada antes de que el
usuario cree o verifique su cuenta. **No se muestra en el mapa**; sirve para seguimiento
comercial"* (`backend/real_estate/models.py:423-427`).

Confirmado en código: `PendingPublication` es un modelo aparte, sin relación alguna con
`Property`. El mapa se construye desde `Property.objects.exclude(status='inactive')…`
(`backend/real_estate/views.py:347`), que nunca consulta `PendingPublication`. La
bandeja completa solo la ven administradores
(`backend/real_estate/views.py:917-920`: `create` es `AllowAny`, todo lo demás
`IsAuthenticated + IsAdminUser`; y `get_queryset` devuelve `none()` a los no-staff,
`backend/real_estate/views.py:929-932`).

Los tres orígenes que el formulario puede registrar
(`frontend/app/add-property/page.tsx:642`):

| `source` | Cuándo se dispara |
|---|---|
| `account_required` | Intentó publicar sin sesión (`frontend/app/add-property/page.tsx:903`) |
| `whatsapp_help` | Pulsó "ayuda por WhatsApp" (`frontend/app/add-property/page.tsx:707`) |
| `exit_prompt` | Abandonó el formulario con contenido escrito (`frontend/app/add-property/page.tsx:826`) |

Las opciones válidas del modelo son esas tres más `other`
(`backend/real_estate/models.py:435-440`); cualquier valor desconocido se degrada a
`"other"` en el serializer (`backend/real_estate/serializers.py:492-494`).

El envío se hace con `skipAuth: true` (`frontend/app/add-property/page.tsx:648-650`) e
incluye un `draft` JSON con todo lo tecleado, incluidos polígono y contador de fotos
(`frontend/app/add-property/page.tsx:664-690`). Solo se envía si hay contenido real:
`if (!hasDraftContent()) return` (`frontend/app/add-property/page.tsx:643`).

Al crearse, se notifica por correo a los administradores
(`backend/real_estate/views.py:952-954` → `PendingPublicationNotificationService`
en `backend/real_estate/services/notifications.py:25-37` →
`send_pending_publication_notification` en `backend/real_estate/email_utils.py:194-227`).

---

## 5. El endpoint de creación

Ruta: `POST /api/properties/`, registrada por el router en
`backend/real_estate/urls.py:33` (`router.register('properties', PropertyViewSet)`).

### Parsers y permisos

- `parser_classes = [MultiPartParser, FormParser, JSONParser]`
  (`backend/real_estate/views.py:285`) — el formulario envía `FormData` porque adjunta
  archivos (`frontend/app/add-property/page.tsx:917`).
- `permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]`
  (`backend/real_estate/views.py:282`).
- El dueño se asigna en servidor, nunca desde el cliente:
  `serializer.save(owner=self.request.user)` (`backend/real_estate/views.py:464-465`),
  y `owner` es de solo lectura en el serializer
  (`backend/real_estate/serializers.py:173` y `197-204`).

### Throttle `property_write` — 30/hour

```
if self.action in {'create', 'update', 'partial_update'}:
    self.throttle_scope = 'property_write'
    return [ScopedRateThrottle()]
```
(`backend/real_estate/views.py:323-325`)

La tasa está en `backend/estate_map/settings.py:182` → `'property_write': '30/hour'`.

Nota importante: aquí se usa `ScopedRateThrottle` **normal**, no
`AntiScraperScopedThrottle`. Las lecturas públicas (`map_points`, `property_list`,
`backend/real_estate/views.py:316-321`) sí usan la variante anti-scraper que exime al SSR
interno y al staff (`backend/real_estate/throttling.py:42-51`). La escritura no tiene esa
exención: **30 publicaciones o ediciones por hora aplican a todos, incluido el staff.**

### Idempotencia

Si la petición trae la cabecera `Idempotency-Key`, el `create` la usa para no duplicar la
propiedad cuando el usuario reintenta una subida lenta
(`backend/real_estate/views.py:467-501`):

1. Se calcula un digest de `user.pk + clave` (`backend/real_estate/views.py:473-475`).
2. Si ya hay un resultado en caché, se devuelve la propiedad existente con **HTTP 200** y
   la cabecera `X-Idempotent-Replay: true` (`backend/real_estate/views.py:478-484`).
3. Se toma un candado de 60 s (`backend/real_estate/views.py:486`); si ya está tomado se
   responde **HTTP 409** con `"Esta publicación ya se está procesando…"`
   (`backend/real_estate/views.py:487-491`).
4. El id creado se cachea 24 h (`backend/real_estate/views.py:494-495`).

El frontend manda la clave solo al crear, nunca al editar
(`frontend/app/add-property/page.tsx:966`).

### Validaciones del serializer

`PropertySerializer` usa `fields = '__all__'`
(`backend/real_estate/serializers.py:194`), así que la obligatoriedad la marca el modelo.

**Prácticamente todo es opcional a nivel de modelo.** `title` y `description` son
`blank=True, default=""` (`backend/real_estate/models.py:75-76`); `price`, `area`,
`latitude` y `longitude` son `null=True, blank=True`
(`backend/real_estate/models.py:84-85`, `90`, `108`). Lo que hace que título, área y
precio se sientan obligatorios es la validación **de cliente** del wizard (sección 3), no
la API.

Campos de solo lectura — este es uno de los cambios sin commitear
(`backend/real_estate/serializers.py:195-204`):

```
read_only_fields = [
    'created_at', 'updated_at', 'owner', 'views_count',
    'source', 'source_agency', 'source_url', 'external_id',
    'is_imported', 'dedup_key', 'image_hash', 'is_duplicate',
    'duplicate_of', 'imported_at', 'source_published_at',
    'source_updated_at', 'last_seen_at',
]
```

Antes solo eran `created_at`, `updated_at` y `owner`. Ahora un usuario ya **no puede
inflar `views_count`** ni hacerse pasar por un anuncio importado a través del CRUD
público.

**Polígono** (`backend/real_estate/serializers.py:283-306`). Acepta un objeto GeoJSON o
un anillo simple `[[lat, lng], …]`, y si llega como cadena por `FormData` lo parsea
(`backend/real_estate/serializers.py:294-300`). Delega en
`validate_and_normalize_polygon` (`backend/real_estate/geo.py:176`), que exige:

- ≥3 vértices **realmente distintos** (`backend/real_estate/geo.py:193-197`);
- todas las coordenadas dentro de Ecuador continental
  (`backend/real_estate/geo.py:199-204`), con límites lat `-5.45 … 1.9` y lng
  `-81.35 … -74.75` (`backend/real_estate/geo.py:15-18`);
- que los lados no se crucen (`backend/real_estate/geo.py:206-209`);
- área entre `10 m²` y `5 000 000 m²` (`backend/real_estate/geo.py:28-29`, comprobado en
  `backend/real_estate/geo.py:212-222`).

Devuelve siempre un `Polygon` GeoJSON canónico y cerrado en orden `[lng, lat]`.

**Coordenadas.** Si llega polígono pero no punto, el centro se deriva del polígono:
`ensure_polygon_center` (`backend/real_estate/serializers.py:60`) se llama tanto en
`create` (`backend/real_estate/serializers.py:311`) como en `update`
(`backend/real_estate/serializers.py:326`). El frontend solo manda `latitude`/`longitude`
en modo punto (`frontend/app/add-property/page.tsx:928-929`).

---

## 6. Imágenes

### Límites

Definidos en `backend/estate_map/settings.py:368-370`:

| Constante | Valor | Dónde se aplica |
|---|---|---|
| `MAX_IMAGES_PER_PROPERTY` | 10 | `backend/real_estate/serializers.py:230-245` |
| `MAX_IMAGE_SIZE_MB` | 10 | `backend/real_estate/serializers.py:255-262` |
| `MAX_PROPERTY_UPLOAD_MB` | 50 | `backend/real_estate/serializers.py:246-251` (suma del lote) |

Formatos permitidos: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
(`backend/real_estate/serializers.py:265`, y la misma lista global en
`backend/estate_map/settings.py:353`). Hay además una segunda capa de validadores del
modelo que se ejecuta imagen por imagen — tamaño, dimensiones y formato real del archivo
— en `backend/real_estate/serializers.py:272-279`, apoyada en
`backend/real_estate/validators.py`.

El tope de 10 también está declarado como `max_length=10` en el propio `ListField`
(`backend/real_estate/serializers.py:183`), de modo que se rechaza antes incluso de
contar las existentes.

En edición el conteo descuenta lo que se va a borrar en la misma petición: lee
`images_to_delete` de `initial_data` y lo resta del total
(`backend/real_estate/serializers.py:232-241`). Sin eso, reemplazar 10 fotos por 10 sería
imposible.

### Pipeline asíncrono PENDING → READY

La petición **no optimiza nada**. Escribe el original en disco local y crea la fila en
estado pendiente (`backend/real_estate/serializers.py:94-128`):

```
path, size = stash_upload(uploaded_file)
image = PropertyImage.objects.create(..., status=PropertyImage.Status.PENDING, pending_path=path)
enqueue_optimization(image.pk)
```

Detalles que importan:

- **Un fallo al guardar la foto no tumba la publicación.** `stage_property_image` captura
  `OSError` y devuelve `None` en lugar de propagar, porque corre dentro del bloque atómico
  que creó la `Property`: *"A missing photo can be re-uploaded in seconds; a lost
  publication cannot"* (`backend/real_estate/serializers.py:96-118`).
- El *staging* es a disco local a propósito, no a MinIO: subir el original de 10 MB sería
  más lento que el WebP de ~300 KB que lo reemplaza
  (`backend/real_estate/uploads.py:1-11`). Web y worker deben ver la misma ruta.
- `enqueue_optimization` encola con `transaction.on_commit`, y si el broker está caído
  **degrada a optimización síncrona** en vez de fallar
  (`backend/real_estate/tasks.py:205-240`).
- El worker `optimize_property_image` (`backend/real_estate/tasks.py:44`) lee el temporal,
  genera imagen y miniatura, las sube a MinIO y marca `READY`
  (`backend/real_estate/tasks.py:73-89`). Si el archivo temporal desapareció, marca
  `FAILED` (`backend/real_estate/tasks.py:60-65`); si la imagen es ilegible, marca
  `FAILED` sin reintentar (`backend/real_estate/tasks.py:92-98`).
- Una barrida horaria reintenta lo que quedó pendiente
  (`sweep_pending_images`, `backend/real_estate/tasks.py:113-126`).
- Mientras tanto el usuario **ve la foto igual**: el serializer sirve la imagen pendiente
  desde el endpoint local `pending_image` (`backend/real_estate/serializers.py:145-166`,
  ruta en `backend/real_estate/urls.py:65`).

Detalle completo del broker, colas y reintentos: [../technical/celery.md](../technical/celery.md).

---

## 7. Efectos posteriores al guardado

Todo esto lo disparan señales en `backend/real_estate/signals.py`.

### Historial de precios

En cada `post_save` de `Property`, si hay precio y difiere del último registrado, se crea
una fila de `PropertyPriceHistory` (`backend/real_estate/signals.py:48-53`). Es
append-only y ordenado por `recorded_at` (`backend/real_estate/models.py:204-213`).

### Invalidación de caché Redis (contadores de versión)

No se borra ninguna clave: se mueve un **contador de versión** y las entradas viejas
dejan de ser direccionables, de modo que Redis las desaloja al vencer su TTL. El motivo
está documentado en `backend/real_estate/cache_utils.py:1-15`: la mayoría de estos
payloads se indexan por combinaciones de filtros que no se pueden enumerar (bbox, rangos
de precio, texto libre), así que un barrido por patrón o fallaría claves o bloquearía
Redis con un `KEYS`/`SCAN` en cada guardado.

La invalidación está **segmentada por espacio de nombres**, no es un único interruptor
global. `VERSION_KEYS` (`backend/real_estate/cache_utils.py:25-34`) define ocho
generaciones independientes:

| Scope | Clave Redis |
|---|---|
| `properties` | `props:ver` (`backend/real_estate/cache_utils.py:24`) |
| `map` | `props:map:ver` |
| `summary` | `props:summary:ver` |
| `detail` | `props:detail:ver` |
| `locations` | `props:locations:ver` |
| `catalog` | `props:catalog:ver` |
| `market_stats` | `props:market-stats:ver` |
| `geo` | `geo:ver` |

`bump_props_version(*scopes)` (`backend/real_estate/cache_utils.py:58-63`) sube solo los
scopes pedidos; sin argumentos sube todos
(`backend/real_estate/cache_utils.py:60-61`). Cada subida es un `INCR`, y si la clave no
existe todavía se siembra — que es equivalente a un bump, porque los lectores que
cachearon con el valor anterior ya no pueden acertar su clave
(`backend/real_estate/cache_utils.py:66-79`).

Del otro lado, `versioned_key(name, *parts, scope="properties")`
(`backend/real_estate/cache_utils.py:89-91`) construye `<name>:v<version>:<partes>`,
hasheando las partes de más de 32 caracteres para que un querystring largo no genere una
clave de kilobytes (`backend/real_estate/cache_utils.py:36-38`, `82-86`).

Qué sube cada señal:

- Guardar o borrar una `Property` → `_invalidate()` sube seis scopes de golpe:
  `properties`, `map`, `summary`, `detail`, `locations` y `market_stats`
  (`backend/real_estate/signals.py:26-28`).
- **Crear** o **borrar** una `Property` sube además `catalog`
  (`backend/real_estate/signals.py:64-68` y `71-74`). Editar una existente no lo toca: el
  catálogo enumera qué existe, y una edición no cambia esa lista.
- Cambiar una `PropertyImage` sube solo `properties` y `detail`
  (`backend/real_estate/signals.py:77-85`) — incluido el momento en que el worker la pasa
  a `READY`, porque las listas cacheadas llevan las URLs de imagen incrustadas. Aquí
  **no** se pide revalidación del frontend: el worker toca las filas de una subida una por
  una, y cada una se convertiría si no en su propia petición de revalidación
  (`backend/real_estate/signals.py:80-84`).

Las lecturas de provincias y ciudades usan el scope `geo`, separado del inventario
(`backend/real_estate/views.py:174`, `189`, `225`), así que publicar una propiedad no las
invalida.

### Revalidación de Next.js

`_invalidate` programa con `transaction.on_commit` la tarea
`revalidate_frontend_tags(["properties", f"property-{id}"])`
(`backend/real_estate/signals.py:30-45`). Va por Celery y tras el commit a propósito: la
tarea vuelve a leer la API, así que dispararla dentro de la transacción reconstruiría la
página con el estado previo (`backend/real_estate/signals.py:20-25`).

La tarea (`backend/real_estate/tasks.py:155`) hace `POST` a `NEXT_REVALIDATE_URL` con la
cabecera `x-revalidate-secret`, con timeout de 5 s y **máximo 2 reintentos**
(`backend/real_estate/tasks.py:150-153` y `168-174`). Si falta URL o secreto, la función
se salta silenciosamente (`backend/real_estate/tasks.py:165-168`). Del otro lado,
`frontend/app/api/revalidate/route.ts:15-23` valida el secreto y
`frontend/app/api/revalidate/route.ts:46-48` llama `revalidateTag(tag, 'max')`.

Una caída del frontend cuesta un puñado de fallos rápidos, nunca una tormenta de
reintentos (`backend/real_estate/tasks.py:157-163`).

### IndexNow

`submit_property(instance.pk, city=instance.city)` en `post_save`
(`backend/real_estate/signals.py:54`) y también en `post_delete`, porque IndexNow acepta
URLs eliminadas y así el buscador recibe el 404 antes
(`backend/real_estate/signals.py:57-61`).

Cada aviso encola cuatro rutas más el hub de la ciudad
(`backend/real_estate/services/indexnow.py:94-100`):
`/propiedad/<id>`, `/`, `/sitemap.xml`, `/estadisticas-inmobiliarias` y
`/estadisticas-inmobiliarias/<ciudad>`.

Los pings se acumulan 10 segundos y salen en un solo POST
(`backend/real_estate/services/indexnow.py:26`, `backend/real_estate/services/indexnow.py:46-66`)
para que una importación masiva no dispare cientos de peticiones. Está desactivado en
local: si `FRONTEND_URL` contiene `localhost` o `127.0.0.1`, no se envía nada
(`backend/real_estate/services/indexnow.py:37-43`).

### Notificaciones por correo

Publicar una propiedad **no envía correo**. Los correos automáticos del flujo son otros
dos, y ambos pasan ahora por los servicios nuevos sin commitear
(`backend/real_estate/services/notifications.py`):

- `PendingPublication` creada → `PendingPublicationNotificationService.notify_created`
  (`backend/real_estate/services/notifications.py:28-37`) →
  `send_pending_publication_notification` (`backend/real_estate/email_utils.py:194`), que
  escribe a `settings.ADMINS` con respaldo en `PENDING_PUBLICATION_NOTIFY_EMAIL`
  (`backend/real_estate/email_utils.py:196-197`).
- `Lead` creado → `LeadNotificationService.notify_created`
  (`backend/real_estate/services/notifications.py:16-22`) →
  `send_lead_notification` (`backend/real_estate/email_utils.py:229`).

Ambos servicios son *best-effort*: capturan cualquier excepción y la registran con
`logger.exception` en vez de romper la petición
(`backend/real_estate/services/notifications.py:17-22` y `28-37`). Esto sustituye a los
`print(...)` que había antes en `views.py`.

### ActivityEvent

El formulario registra el embudo completo vía `trackEvent`, que termina en
`POST /api/activity-events/` (`backend/real_estate/urls.py:38`). Eventos emitidos desde
el flujo de publicación:

| Evento | Dónde |
|---|---|
| `publication_submit_attempted` | `frontend/app/add-property/page.tsx:893` |
| `publication_account_required` | `frontend/app/add-property/page.tsx:904` |
| `publication_pending_saved` / `publication_pending_save_failed` | `frontend/app/add-property/page.tsx:692-696` y `699-702` |
| `publication_account_created_from_modal` | `frontend/app/add-property/page.tsx:750` |
| `publication_account_create_failed` | `frontend/app/add-property/page.tsx:744-746` |
| `publication_login_from_modal` / `publication_login_failed` | `frontend/app/add-property/page.tsx:793` y `787` |
| `publication_created` / `publication_updated` | `frontend/app/add-property/page.tsx:974` |
| `publication_create_failed` / `publication_update_failed` | `frontend/app/add-property/page.tsx:1005` y `1014` |
| `publication_whatsapp_help_clicked` | `frontend/app/add-property/page.tsx:708` |
| `publication_exit_prompt_shown` | `frontend/app/add-property/page.tsx:828` |

El `is_bot` se marca en servidor a partir del User-Agent y los eventos de bots se
almacenan pero se excluyen de las métricas humanas
(`backend/real_estate/models.py:488-491`, asignado en
`backend/real_estate/serializers.py:541`). La creación está limitada a `30/min`
(`backend/estate_map/settings.py:173`, aplicada en `backend/real_estate/views.py:974-979`).

---

## 8. Al terminar

Con `201`, el frontend (`frontend/app/add-property/page.tsx:969-997`):

1. Borra el borrador de `localStorage` y renueva la clave de idempotencia
   (`frontend/app/add-property/page.tsx:970-972`).
2. Lanza confeti — decorativo, y su fallo se registra sin bloquear
   (`frontend/app/add-property/page.tsx:979-994`).
3. Muestra "Propiedad creada exitosamente" y redirige a `/mis-propiedades` tras 650 ms
   (`frontend/app/add-property/page.tsx:996-997`).

La propiedad ya es visible: `get_queryset` solo excluye `inactive` y duplicados de
ingesta (`backend/real_estate/views.py:347`), y la caché del mapa quedó invalidada por el
`INCR` de los contadores de versión.

---

## 9. Edición y baja

### Editar

`PUT /api/properties/<id>/` (`frontend/app/add-property/page.tsx:961-966`). Se exige ser
dueño (`backend/real_estate/permissions.py:9-15`) y aplica el mismo throttle
`property_write` 30/hour (`backend/real_estate/views.py:323-325`).

Diferencias frente a crear (`backend/real_estate/serializers.py:320-366`):

- **No se manda `Idempotency-Key`** (`frontend/app/add-property/page.tsx:966`).
- Cambiar de polígono a punto exige mandar `polygon: null` explícito; omitir el campo
  conserva el `JSONField` anterior (`frontend/app/add-property/page.tsx:931-935`). El
  serializer, al recibir polígono sin coordenadas, limpia `latitude`/`longitude` y las
  recalcula desde el centro (`backend/real_estate/serializers.py:323-326`).
- Las fotos a borrar viajan como JSON en `images_to_delete`
  (`frontend/app/add-property/page.tsx:952-954`). Una lista malformada devuelve error de
  validación (`backend/real_estate/serializers.py:334-337`).
- **Las nuevas imágenes se procesan antes de borrar las viejas**, y los archivos físicos
  se eliminan sólo tras el commit, para que un rollback no deje filas apuntando a objetos
  ya borrados (`backend/real_estate/serializers.py:348-365`).
- Si ya no queda ninguna principal, la primera nueva pasa a serlo
  (`backend/real_estate/serializers.py:340-347`).

Cada guardado vuelve a disparar todas las señales de la sección 7: si el precio cambió, se
añade una fila más a `PropertyPriceHistory`.

### Dar de baja: `status = "inactive"`

Es **ocultamiento, no borrado**. La fila y sus imágenes siguen intactas.

- Desaparece del catálogo y del mapa: `Property.objects.exclude(status='inactive')`
  (`backend/real_estate/views.py:347`).
- El dueño la sigue viendo: `my_properties` filtra solo por `owner`, *"including
  inactive"* (`backend/real_estate/views.py:838-843`), y el panel ofrece el filtro
  "Inactivas" (`frontend/app/my-properties/page.tsx:54`).
- Se activa desde el mismo selector del formulario
  (`frontend/app/add-property/page.tsx:1570`).

### Borrar de verdad

El botón "eliminar" del panel llama `DELETE /api/properties/<id>/`
(`frontend/app/my-properties/page.tsx:154-177`), previo `window.confirm`
(`frontend/app/my-properties/page.tsx:155`). No hay `destroy` sobrescrito en
`PropertyViewSet`, así que se usa el de `ModelViewSet`: **es un borrado físico**. Las
imágenes caen con él por `on_delete=models.CASCADE`
(`backend/real_estate/models.py:224-226`). El `post_delete` avisa a IndexNow para que el
buscador recoja el 404 (`backend/real_estate/signals.py:57-61`).

Hay además un borrado de una sola imagen:
`DELETE /api/properties/<id>/delete_image/` con `image_id` en el cuerpo
(`backend/real_estate/views.py:844-868`).

---

## 10. Errores frecuentes y qué devuelve la API

Referencia completa en [../errors/api-errors.md](../errors/api-errors.md).

| Situación | Respuesta | Origen |
|---|---|---|
| Publicar sin sesión | `401` en la API; el frontend lo intercepta **antes** y abre el modal creando un `PendingPublication` | `backend/real_estate/views.py:282`; `frontend/app/add-property/page.tsx:901-914` |
| Sesión expirada durante el envío | `401` → "Tu sesión ha expirado…", `logout()` | `frontend/app/add-property/page.tsx:999-1002` |
| Correo sin verificar al iniciar sesión | `400` con `{"code": "email_not_verified", "email": …}` → redirige a `/verificar-correo` | `backend/real_estate/serializers.py:582-587`; `frontend/app/add-property/page.tsx:780-784` |
| Editar propiedad ajena | `403` | `backend/real_estate/permissions.py:9-15` |
| Más de 30 escrituras en una hora | `429 Too Many Requests` | `backend/real_estate/views.py:323-325`; `backend/estate_map/settings.py:182` |
| Doble envío con la misma `Idempotency-Key`, ya resuelto | `200` + `X-Idempotent-Replay: true` (no crea otra) | `backend/real_estate/views.py:478-484` |
| Doble envío simultáneo | `409` "Esta publicación ya se está procesando. Espera un momento." | `backend/real_estate/views.py:487-491` |
| Polígono con menos de 3 vértices distintos | `400` "El polígono debe tener al menos 3 vértices distintos." | `backend/real_estate/geo.py:193-197` |
| Coordenada fuera de Ecuador | `400` "La coordenada (…) está fuera de Ecuador." | `backend/real_estate/geo.py:199-204` |
| Lados del polígono cruzados | `400` "Los lados del polígono no pueden cruzarse entre sí." | `backend/real_estate/geo.py:206-209` |
| Polígono < 10 m² o > 5 000 000 m² | `400` con el área calculada y el límite | `backend/real_estate/geo.py:212-222` |
| Polígono no parseable desde `FormData` | `400` "Formato de polígono inválido" | `backend/real_estate/serializers.py:298-301` |
| Más de 10 imágenes | `400` "La propiedad no puede tener más de 10 imágenes. Actualmente tiene X…" | `backend/real_estate/serializers.py:242-245` |
| Una imagen > 10 MB | `400` "La imagen N es demasiado grande (X MB)…" | `backend/real_estate/serializers.py:256-262` |
| Lote > 50 MB | `400` "El conjunto de imágenes supera 50MB." | `backend/real_estate/serializers.py:248-251` |
| Formato no permitido | `400` "Formato de imagen N no permitido. Use JPEG, PNG o WebP" | `backend/real_estate/serializers.py:265-270` |
| `images_to_delete` malformado | `400` "La lista de imágenes a eliminar no es válida." | `backend/real_estate/serializers.py:334-337` |
| Fallo de disco al guardar una foto | **La propiedad se crea igual**, sin esa imagen; queda en el log | `backend/real_estate/serializers.py:96-118` |
| Broker Celery caído | La imagen se optimiza en línea (más lento, sin error) | `backend/real_estate/tasks.py:226-239` |
| Frontend caído al revalidar | La tarea se rinde tras 2 reintentos; la página sigue cacheada hasta su TTL | `backend/real_estate/tasks.py:178-184` |
| `PendingPublication`: más de 10/min | `429` | `backend/estate_map/settings.py:174`; `backend/real_estate/views.py:922-927` |

---

## Notas sobre el estado sin commitear

Cambios relevantes para este flujo que están en el working tree y **no** en el último
commit:

1. `backend/real_estate/serializers.py:195-204` — `read_only_fields` ampliado: `views_count`
   y todos los campos de ingesta ya no son escribibles desde el CRUD público.
2. `backend/real_estate/services/notifications.py` (fichero nuevo) — reemplaza los
   `try/except` con `print` que había en `views.py` por servicios con `logger.exception`
   (`backend/real_estate/views.py:902-904` y `backend/real_estate/views.py:952-954`).
3. `backend/real_estate/services/authentication.py` (fichero nuevo) — extrae la lógica de
   login con Google fuera de la vista; afecta a cómo el usuario obtiene sesión antes de
   publicar, no al guardado en sí.
4. `backend/estate_map/settings.py:196` — `BLACKLIST_AFTER_ROTATION` pasa a `True` y se
   añade `rest_framework_simplejwt.token_blacklist` (`backend/estate_map/settings.py:34`):
   los refresh tokens rotados quedan invalidados.
5. `backend/real_estate/cache_utils.py:25-34` y `backend/real_estate/signals.py:26-28`,
   `64-74`, `77-85` — la invalidación de caché pasa de un único `props:ver` global a ocho
   contadores por espacio de nombres, y cada señal sube solo los que le corresponden. Ver
   la sección 7.
