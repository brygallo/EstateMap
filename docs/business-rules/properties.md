# Reglas de negocio: Propiedades

Verificado contra el código el 2026-08-04. Revisado el 2026-08-05 en lo que tocó el cierre de
anuncios y el precio anterior: §1.1, §2.2, §2.3, §2.4, §7.1, §9.1, §9.2 y §10.1. En el resto,
las referencias `archivo:línea` pueden haberse desplazado desde entonces.

Este documento describe **solo** lo que está implementado en el repositorio. Cuando una
capacidad no existe se indica explícitamente con la evidencia. Los identificadores de
código se citan en inglés, tal como aparecen. El árbol de trabajo tiene cambios sin
commitear en `backend/real_estate/serializers.py` y `backend/real_estate/views.py`: lo
documentado es el estado actual de esos archivos.

---

## 1. El modelo `Property`

Definido en `backend/real_estate/models.py:59`. No hereda de ningún modelo base ni tiene
borrado lógico: `status='inactive'` es la única forma de sacar un anuncio del catálogo
público sin borrar la fila.

### 1.1 Información general

| Campo | Definición | Regla |
| --- | --- | --- |
| `title` | `backend/real_estate/models.py:75` | `CharField(max_length=150)`, `blank=True, default=""`. No es obligatorio. En la ingesta se trunca a 150 (`backend/ingesta/pipeline/upsert.py:24`). |
| `description` | `backend/real_estate/models.py:76` | Texto libre opcional. La ingesta la limpia de HTML preservando saltos de línea (`clean_description`, `backend/ingesta/pipeline/normalize.py:160`). |
| `property_type` | `backend/real_estate/models.py:77` | Choices `house`, `land`, `apartment`, `commercial`, `other` (`backend/real_estate/models.py:61`). **Default `land`**: el portal nació orientado a terrenos. La ingesta lo deduce por palabras clave del título/categoría/URL y cae a `other` si no reconoce nada (`backend/ingesta/pipeline/normalize.py:31`). |
| `status` | `backend/real_estate/models.py:78` | Choices `for_sale`, `for_rent`, `inactive` (`backend/real_estate/models.py:72`). Default `for_sale`. **Siguen siendo tres**: «vendido» y «alquilado» no son estados, ver §2.3. |
| `closed_reason` / `closed_at` | `backend/real_estate/models.py:142-149` | Por qué y cuándo dejó de ofrecerse el anuncio. Vacío = sigue abierto. Ver §2.3. |

Propiedades de conveniencia `is_for_sale` / `is_for_rent` en
`backend/real_estate/models.py:195` y `backend/real_estate/models.py:199`: comparan
`status` contra `"for_sale"` / `"for_rent"`.

### 1.2 Ubicación

| Campo | Definición | Regla |
| --- | --- | --- |
| `address` | `backend/real_estate/models.py:81` | Opcional. Se usa como "sector" en la inteligencia de mercado: se toma el texto anterior a la primera coma (`backend/real_estate/views.py:535`). |
| `city` | `backend/real_estate/models.py:82` | Default `"Macas"` (origen del proyecto). Se filtra con `iexact` (`backend/real_estate/views.py:343`). |
| `province` | `backend/real_estate/models.py:83` | Default `"Morona Santiago"`. Filtro `iexact` (`backend/real_estate/views.py:347`). |
| `latitude` / `longitude` | `backend/real_estate/models.py:84` | Opcionales. Si el anuncio trae polígono y no trae punto, el serializer calcula el centro y lo guarda (`ensure_polygon_center`, `backend/real_estate/serializers.py:60`). |
| `polygon` | `backend/real_estate/models.py:86` | `JSONField` con un GeoJSON `Polygon`. Ver §3. |
| `show_measurements` | `backend/real_estate/models.py:87` | Default `True`. Cuando es `False` el frontend muestra "Medidas: Referencia aproximada" en lugar de las medidas exactas (`frontend/components/PropertyModal.tsx:778`). No cambia nada en el backend: el polígono se sigue enviando igual en `MapPointPropertySerializer` y `MapPropertySerializer`. |

`City` y `Province` (`backend/real_estate/models.py:36` y `:19`) son un catálogo
independiente de cantones/provincias. **`Property` no tiene FK a ellos**: guarda
`city`/`province` como texto libre. El endpoint `catalog` (`backend/real_estate/views.py:692`)
mezcla el catálogo oficial con los nombres coloquiales que ya guardaron las propiedades,
justamente porque no coinciden.

### 1.3 Características

| Campo | Definición | Regla |
| --- | --- | --- |
| `area` | `backend/real_estate/models.py:90` | Área total en m², **opcional**: el help_text dice "opcional en anuncios importados". Un anuncio sin área se publica igual. La inteligencia de mercado y el precio por m² excluyen las propiedades con `area <= 0` (`backend/real_estate/views.py:509`). |
| `built_area` | `backend/real_estate/models.py:91` | Opcional, para casas. |
| `rooms`, `bathrooms`, `parking_spaces` | `backend/real_estate/models.py:92`–`:94` | `PositiveIntegerField(default=0)`. En la ingesta, un valor no parseable se convierte en `0`, nunca en `NULL` (`parse_int`, `backend/ingesta/pipeline/normalize.py:133`). Los filtros `rooms`/`bathrooms` del API son "mínimo" (`__gte`, `backend/real_estate/views.py:365`). |
| `floors`, `year_built` | `backend/real_estate/models.py:95`, `:97` | Opcionales. **No los escribe la ingesta** (`_apply_fields` no los toca, `backend/ingesta/pipeline/upsert.py:23`). |
| `furnished` | `backend/real_estate/models.py:96` | Booleano, default `False`. Tampoco lo escribe la ingesta. |

### 1.4 Métricas y fechas

| Campo | Definición | Regla |
| --- | --- | --- |
| `views_count` | `backend/real_estate/models.py:168` | Se incrementa **solo** en `retrieve` y **solo si el request no es un bot**: `Property.objects.filter(pk=...).update(views_count=F('views_count') + 1)` (`backend/real_estate/views.py:477`). El incremento es atómico en SQL, no un `save()`. Es de solo lectura en el API público (§6.1) y nunca se expone en cifras públicas (ver `test_market_stats_city_filter_scopes_every_metric`). |
| `created_at` / `updated_at` | `backend/real_estate/models.py:171` | `auto_now_add` / `auto_now`. |

---

## 2. `price`, `rent_price` y `status`

La semántica está documentada en el propio modelo (`backend/real_estate/models.py:100`–`:108`):

- `price` es el **precio principal**. Si el anuncio es de venta, es el precio de venta.
- Si el anuncio es **solo alquiler**, el precio de alquiler va en `price` y `rent_price`
  queda en `NULL`.
- `rent_price` solo se usa cuando **un mismo anuncio es venta Y alquiler a la vez**:
  entonces `price` guarda la venta (operación prioritaria) y `rent_price` el alquiler.

Consecuencia: `status` es un único valor (`for_sale` **o** `for_rent`), no hay un estado
"venta y alquiler". Un anuncio mixto se modela como `status='for_sale'` + `rent_price`
poblado. El frontend lo renderiza así: precio principal grande y, si hay `rent_price > 0`,
la línea "Alquiler {precio}/mes" (`frontend/app/property/[id]/page.tsx:351` y `:492`).

Ambos precios son `DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)`.
**`price` puede ser `NULL`**: el help_text lo justifica ("los anuncios importados pueden no
traer precio, 'a consultar'"). Nada obliga a tener precio para publicar.

### 2.1 Saneamiento de precios en la ingesta

`sanitize_price` (`backend/ingesta/pipeline/normalize.py:100`) se aplica en el punto único de
escritura (`backend/ingesta/pipeline/upsert.py:83`) y descarta a `None` (nunca lanza) todo
precio que:

| Condición | Constante | Motivo registrado |
| --- | --- | --- |
| No numérico | — | `precio_no_numerico` |
| `<= 0` | — | `precio_no_positivo` |
| Venta `< 1.000` USD | `_SALE_PRICE_MIN` (`backend/ingesta/pipeline/normalize.py:95`) | `precio_bajo_sospechoso` |
| Alquiler `< 20` USD | `_RENT_PRICE_MIN` (`backend/ingesta/pipeline/normalize.py:96`) | `precio_bajo_sospechoso` |
| `> 50.000.000` USD | `_PRICE_MAX` (`backend/ingesta/pipeline/normalize.py:97`) | `precio_alto_sospechoso` |

`rent_price` siempre se valida con las cotas de alquiler, independientemente del `status`
del anuncio (`backend/ingesta/pipeline/upsert.py:84`).

`parse_price` (`backend/ingesta/pipeline/normalize.py:50`) interpreta el formato ecuatoriano
(`.` miles, `,` decimales) y devuelve `None` para textos tipo "Consultar".

### 2.2 Visibilidad por `status`

- `status='inactive'` desaparece del listado, del mapa y de todos los agregados públicos:
  `Property.objects.exclude(status='inactive')` es la base del queryset público
  (`backend/real_estate/views.py:321`).
- Las inactivas **solo** se listan en `/api/properties/my_properties/`, que consulta por
  `owner` sin filtrar el estado (`backend/real_estate/views.py:973`), y en el panel admin
  (`backend/real_estate/views.py:2331`).
- Desde el 2026-08-05 las acciones que se dirigen a **un** anuncio por su id
  (`retrieve`, `update`, `partial_update`, `destroy`, `delete_image`) no usan ese queryset:
  resuelven la fila con su propia condición (`backend/real_estate/views.py:380-405`). Ver
  §2.3.

### 2.3 Cierre de un anuncio: `closed_reason` y `closed_at`

`status` responde «¿qué ofrece este anuncio?». `closed_reason` responde otra pregunta
distinta: «¿por qué se fue?». Son `sold`, `rented` y `withdrawn`
(`backend/real_estate/models.py:91-95`), y el valor vacío significa que el anuncio sigue
abierto. **No hay estados `sold` ni `rented`**, y la decisión de que no los haya está
razonada en [ADR 0003](../decisions/0003-el-cierre-de-un-anuncio-no-es-un-estado.md).

Un anuncio cerrado es un anuncio `inactive` **con motivo**. La normalización vive en
`save()` (`backend/real_estate/models.py:258-269`), que es por donde pasan todos los caminos
de escritura —API, panel e ingesta—:

- Poner `closed_reason` fuerza `status='inactive'` y sella `closed_at` si estaba vacío. Un
  piso vendido que se quedara en `for_sale` seguiría ofreciéndose en el mapa.
- Quitar `closed_reason` borra `closed_at`.
- **Reabrir significa borrar el motivo, no cambiar el estado.** Mientras el motivo siga
  puesto, el siguiente guardado devuelve la fila a `inactive` él solo. Por eso el serializer
  limpia el motivo cuando alguien mueve el selector de estado a algo distinto de «Inactivo»
  (`reopen_on_reactivation`, `backend/real_estate/serializers.py:38-49`), y por eso el cambio
  de estado en lote del panel admin lo repite a mano: usa `.update()`, que nunca llega a
  `save()` (`backend/real_estate/views.py:2531-2534`).

`closed_at` es de solo lectura en el API público (§9.1): el motivo lo afirma el dueño, la
fecha la sella el servidor.

**Un anuncio cerrado conserva ficha y código corto.** Sale del catálogo igual que cualquier
inactivo, pero sigue resolviéndose individualmente: la condición de las acciones de detalle
deja pasar cualquier fila con motivo de cierre (`backend/real_estate/views.py:399`) y la ruta
del código corto excluye solo `inactive` **sin** motivo
(`backend/real_estate/views.py:769`). El porqué es concreto: la lámina de «vendido» existe
para reenviarse y lleva impresos el código corto y el QR del anuncio; si la ficha respondiera
404, el portal estaría repartiendo imágenes que apuntan a un anuncio que él mismo niega.

**Retirar sigue siendo retirar.** Sin motivo de cierre, la ficha desaparece para todo el que
no sea su dueño o staff, exactamente como antes. La diferencia no es de estado, es de
intención.

**El dueño alcanza siempre su propio anuncio**, esté como esté
(`backend/real_estate/views.py:404`). Antes no podía: quien desactivaba un anuncio se quedaba
sin abrirlo, editarlo ni reactivarlo por la API. Con el cierre habría sido peor, porque
marcar «vendido» habría equivalido a perder el anuncio.

Ese privilegio es de la ficha y **solo** de la ficha. La ruta por código corto no mira quién
pregunta a propósito: su respuesta se cachea con `s-maxage` para que la sirva el borde cuando
llega desde un QR impreso, y una respuesta que dependiera de la sesión ensuciaría esa caché
compartida. Así que el dueño de un anuncio simplemente inactivo recibe 404 por el código y
200 por la ficha.

### 2.4 Los momentos de un anuncio

Un anuncio se comparte bien una vez y luego se queda quieto. Los momentos que dan una excusa
para volver a publicarlo son pocos y conocidos, y el cierre es la mitad de ellos:

| Momento | Qué lo hace cierto |
| --- | --- |
| **Bajó el precio** | Hay `previous_price` y `price_changed_at` en la ficha y el anterior es **estrictamente mayor** que el actual (`priceDrop`, `frontend/lib/social-kit.ts:622-640`). Una subida no es una bajada y devuelve `null`: reutilizar el diseño pondría «ANTES» sobre la cifra más barata. |
| **Se vendió o se alquiló** | `closed_reason` es `sold` o `rented` (`closureKind`, `frontend/lib/social-kit.ts:655-658`; en el backend, `SUCCESSFUL_CLOSURES`, `backend/real_estate/models.py:99`). `withdrawn` **no** cuenta: retirar un anuncio no es un logro, y felicitar a alguien por ello es falso y además ofensivo. |

Lo que decide si el momento existe es un único predicado compartido —`momentFormats`
(`frontend/lib/social-kit.ts:679-684`)— con dos llamantes: la pantalla del kit y la ruta que
dibuja la imagen. Si la pantalla lo dedujera por su cuenta acabaría ofreciendo una tarjeta
que la ruta responde con 404; y cuando el momento no ocurrió, la ruta niega la lámina en vez
de devolver una sustituta, porque estas URL acaban en `og:image` y una imagen equivocada la
cachearían todos los *scrapers* sin que nadie aguas abajo pueda distinguir cuál recibió.

La lámina de «vendido» no lleva precio a propósito: un importe junto a VENDIDO se lee como
«se vendió por», que es una cifra que nadie registró.

---

## 3. Polígono (`polygon`) y coordenadas

Se almacena siempre como **GeoJSON `Polygon` canónico y cerrado, con orden `[lng, lat]`**
(estándar GeoJSON). Todo el trabajo de validación está en `backend/real_estate/geo.py`.

### 3.1 Entradas aceptadas

`validate_polygon` (`backend/real_estate/serializers.py:283`) acepta:

1. Un objeto GeoJSON `{"type": "Polygon", "coordinates": [[[lng, lat], ...]]}`.
2. Un anillo simple `[[lat, lng], ...]`.
3. Cualquiera de los dos **codificado como string JSON** (caso `FormData`); si el
   `json.loads` falla, error `"Formato de polígono inválido"`.

### 3.2 Reglas que aplica `validate_and_normalize_polygon`

`backend/real_estate/geo.py:176`:

| Regla | Detalle | Evidencia |
| --- | --- | --- |
| Tipo GeoJSON | Un dict debe declarar `"type": "Polygon"` | `backend/real_estate/geo.py:134` |
| Pares numéricos | Cada coordenada es un par de 2 números (no booleanos) | `backend/real_estate/geo.py:39`, `:149` |
| ≥3 vértices **distintos** | Se descarta el punto de cierre y los duplicados consecutivos antes de contar | `backend/real_estate/geo.py:189` |
| Dentro de Ecuador | Bounding box continental (lat −5.45…1.9, lng −81.35…−74.75) **o** Galápagos (lat −1.75…1.85, lng −92.2…−88.45). Se separan a propósito para que el océano entre ambos no sea "Ecuador válido" | `backend/real_estate/geo.py:15`–`:23`, `:43` |
| Sin auto-intersección | Ningún par de lados no adyacentes puede cruzarse | `backend/real_estate/geo.py:110`, `:206` |
| Área entre 10 m² y 5.000.000 m² (500 ha) | Shoelace sobre proyección equirectangular centrada en la latitud media | `backend/real_estate/geo.py:28`, `:56`, `:212` |
| Salida canónica | Anillo cerrado (primer punto repetido al final) en orden `[lng, lat]` | `backend/real_estate/geo.py:224` |

Los errores se propagan como `PolygonValidationError` y el serializer los reemite como
`serializers.ValidationError` con el mismo mensaje en español
(`backend/real_estate/serializers.py:303`).

### 3.3 Relación entre polígono y punto

- **Al crear**: si viene polígono y falta `latitude` o `longitude`, se rellenan con el
  centro aritmético del anillo (`polygon_center_lat_lng`,
  `backend/real_estate/serializers.py:22`; invocado en `create`,
  `backend/real_estate/serializers.py:311`).
- **Al actualizar**: si el `polygon` cambia y el cliente no manda coordenadas nuevas, se
  **anulan** `latitude`/`longitude` y se recalculan desde el nuevo polígono
  (`backend/real_estate/serializers.py:323`). Así el pin no queda pegado al terreno viejo.
- **En las respuestas**: el polígono se devuelve convertido a `[[lat, lng], ...]` para el
  frontend, en `PropertySerializer.to_representation`
  (`backend/real_estate/serializers.py:205`) y en los serializers de mapa
  (`backend/real_estate/serializers.py:383` y `:436`).
- **En el filtro `bbox`**: los anuncios antiguos que solo tienen polígono y no tienen punto
  se incluyen igualmente mediante un `OR`
  (`Q(latitude__isnull=True, longitude__isnull=True, polygon__isnull=False)`,
  `backend/real_estate/views.py:391`), y el payload del mapa les calcula un pin en el centro
  (`build_map_payload`, ver `test_polygon_without_stored_point_gets_a_map_pin_at_its_center`).

**No implementado a fecha de hoy**: el `polygon` no se valida contra `area` (nadie compara
el área del polígono con el campo `area`), y la ingesta **nunca escribe polígonos**
(`_apply_fields` no toca `polygon`, `backend/ingesta/pipeline/upsert.py:23`). Todo polígono
del sistema proviene del formulario de publicación.

---

## 4. Propiedades importadas vs. propias

Una `Property` es "propia" (publicada por un usuario) o "importada" (recopilada de otro
portal por el agregador). El bloque de campos de origen está en
`backend/real_estate/models.py:122`–`:165`.

| Campo | Definición | Regla |
| --- | --- | --- |
| `is_imported` | `backend/real_estate/models.py:139` | `db_index=True`. `True` solo lo escribe la ingesta (`backend/ingesta/pipeline/upsert.py:45`); el API público lo ignora si lo mandan (§6.1). |
| `owner` | `backend/real_estate/models.py:112` | FK a `AUTH_USER_MODEL` con `on_delete=SET_NULL`. **En las importadas queda `NULL`**. En las propias se asigna desde `request.user` en `perform_create` (`backend/real_estate/views.py:438`), nunca desde el payload. |
| `source` | `backend/real_estate/models.py:125` | FK a `ingesta.Fuente` (`backend/ingesta/models.py:15`), `on_delete=SET_NULL`. |
| `source_agency` | `backend/real_estate/models.py:133` | Inmobiliaria/publicador en el portal de origen. Se muestra como "Contactar en {agencia}" (`frontend/app/property/[id]/page.tsx:681`). |
| `source_url` | `backend/real_estate/models.py:135` | Enlace al anuncio original; es el **último escalón de la cascada de contacto**. |
| `external_id` | `backend/real_estate/models.py:137` | ID del anuncio en el portal, `db_index=True`. Clave lógica junto con `source`. |
| `imported_at` | `backend/real_estate/models.py:155` | Se escribe **solo al crear** (`backend/ingesta/pipeline/upsert.py:128`). Es la fecha de "detección". |
| `last_seen_at` | `backend/real_estate/models.py:164` | Se refresca en **cada** upsert (`backend/ingesta/pipeline/upsert.py:53`), para poder caducar anuncios. |
| `source_published_at` | `backend/real_estate/models.py:156` | Fecha original declarada por el portal. Solo se sobreescribe si viene un valor no vacío (`backend/ingesta/pipeline/upsert.py:47`). |
| `source_updated_at` | `backend/real_estate/models.py:160` | Igual, para la última actualización declarada. |

Las fechas del portal se extraen del JSON-LD del anuncio (`extract_html_source_dates`) y
**nunca se inventan**: un texto como "publicado recientemente" devuelve `None`
(`test_invalid_source_date_is_not_invented`).

### 4.1 Antigüedad mostrada

`intelligence` (`backend/real_estate/views.py:553`) elige el inicio de publicación con esta
cascada y expone la base usada en `publication_basis`:

| Orden | Valor | `publication_basis` |
| --- | --- | --- |
| 1 | `source_published_at` | `source` |
| 2 | `imported_at` | `detected` (si `is_imported`) |
| 3 | `created_at` | `platform` |

El frontend etiqueta cada caso con un texto distinto: "Publicado originalmente el…",
"Detectado en Geo Propiedades el…" o "Publicado el…"
(`frontend/app/property/[id]/page.tsx:371`).

### 4.2 Cascada de contacto

Como las importadas no tienen `owner`, el contacto cae en cascada. Está implementada en el
frontend (el backend solo entrega los campos):

1. **`contact_phone`** → botón de WhatsApp (`wa.me` con un mensaje que incluye el título y
   la URL de la ficha propia) y botón "Llamar"
   (`frontend/app/property/[id]/page.tsx:498`, `frontend/components/PropertyModal.tsx:827`).
2. **`source_url`** (solo si no hay teléfono) → "Contactar anunciante" / "Ver anuncio
   original", que abre el portal de origen
   (`frontend/app/property/[id]/page.tsx:511`, `frontend/components/PropertyModal.tsx:873`).
3. Si no hay ninguno de los dos → mensaje "Esta propiedad no tiene contacto disponible." /
   "Información del anunciante no disponible."
   (`frontend/app/property/[id]/page.tsx:686`, `frontend/components/PropertyModal.tsx:899`).

`contact_email` **no es un escalón de la cascada de acción**: se muestra como dato
informativo junto al teléfono cuando existe
(`frontend/components/PropertyModal.tsx:816`), pero no genera ningún CTA. La ingesta sí lo
puebla cuando el portal lo entrega (`backend/ingesta/pipeline/upsert.py:40`).

El frontend considera "importada" cualquier propiedad con
`is_imported || source_url || external_id || source`
(`frontend/app/property/[id]/page.tsx:355`), no solo el flag.

### 4.3 Retirada de anuncios importados

Cuando un anuncio desaparece del portal, `retire_property` /`retire_listing`
(`backend/ingesta/pipeline/retirement.py:35` y `:10`) **borran la fila y sus imágenes de
MinIO**, dejando solo un registro de auditoría `ListingRetirada` (fuente, `external_id`,
`source_url`, `http_status`). No se marcan como `inactive`.

Regla dura: **una propiedad de usuario nunca se retira**. `retire_property` sale de
inmediato si `is_imported` es `False` (`backend/ingesta/pipeline/retirement.py:37`).

---

## 5. Deduplicación

Hay dos niveles, descritos en `backend/ingesta/pipeline/dedup.py:1`.

### 5.1 Nivel 1 — misma fuente: `(source, external_id)`

La `UniqueConstraint` `uniq_source_external_when_imported`
(`backend/real_estate/models.py:185`) es **parcial**: solo aplica con
`condition=Q(is_imported=True)`. Así, dos propiedades de usuario con `source=NULL` y
`external_id=""` no chocan entre sí.

El upsert (`backend/ingesta/pipeline/upsert.py:98`) busca primero por esa clave; si existe,
actualiza en vez de crear. Además envuelve el `save()` en un savepoint
(`backend/ingesta/pipeline/upsert.py:135`): si dos ejecuciones simultáneas crean la misma
fila, el `IntegrityError` se captura, se recupera la fila existente y el "created" se
degrada a "updated" sin envenenar la transacción exterior.

### 5.2 Nivel 2 — entre fuentes distintas

`find_duplicate` (`backend/ingesta/pipeline/dedup.py:55`) solo considera candidatas
canónicas: `is_imported=True, is_duplicate=False`, excluyendo la propia fuente. Señales, de
más a menos confiable:

| # | Señal | Umbral | Constante |
| --- | --- | --- | --- |
| 1 | Mismo `image_hash` (mismas fotos) | Coincidencia exacta del hash; ignora ubicación, precio y teléfono | `backend/ingesta/pipeline/dedup.py:80` |
| 2 | Proximidad + área compatible | ≤ 30 m y área dentro de ±10 % | `PROXIMITY_M`, `AREA_TOLERANCE` (`backend/ingesta/pipeline/dedup.py:15`, `:17`) |
| 3 | Área **y** precio casi idénticos a media distancia | ≤ 500 m con área ±3 % **y** precio ±3 % | `WIDE_RADIUS_M`, `ATTR_TOLERANCE` (`backend/ingesta/pipeline/dedup.py:16`, `:18`) |

Detalles que son decisiones de negocio explícitas:

- **El teléfono NO se usa como señal** (`backend/ingesta/pipeline/dedup.py:59`): una
  inmobiliaria tiene un solo número y muchas propiedades distintas.
- Si a alguno de los dos le falta el área, **no se descarta por área**
  (`_area_compatible`, `backend/ingesta/pipeline/dedup.py:42`).
- La señal 3 exige que coincidan área **y** precio, para no fusionar lotes vecinos del
  mismo proyecto.
- Sin PostGIS: se prefiltra con un bounding box sobre los índices B-tree de
  `latitude`/`longitude` y se confirma con haversine en Python
  (`backend/ingesta/pipeline/dedup.py:88`).

### 5.3 Qué fuente "gana"

Resuelto en `backend/ingesta/pipeline/upsert.py:114`: **gana el anuncio que tiene teléfono
(WhatsApp)**.

| Situación | Resultado |
| --- | --- |
| El nuevo trae teléfono y el existente no | El nuevo se crea y el existente se marca para *demote*: se borran sus imágenes y la fila **después** de que el reemplazo quedó completo (`backend/ingesta/pipeline/upsert.py:180`). Nunca se borra antes de validar el nuevo. |
| Empate, o el existente ya tiene contacto | Se devuelve `skipped_duplicate` y **no se crea nada**: gana el existente. |

Si el `save()` choca con la constraint por una carrera, el *demote* se anula
(`backend/ingesta/pipeline/upsert.py:148`) y el siguiente ciclo lo resuelve.

### 5.4 `image_hash`, `dedup_key`, `is_duplicate`, `duplicate_of`

| Campo | Estado real |
| --- | --- |
| `image_hash` (`backend/real_estate/models.py:143`) | dHash perceptual de 16 caracteres hex de la **primera** imagen, calculado con Pillow: escala de grises, redimensión a 9×8 y comparación de píxeles contiguos (`image_dhash_from_url`, `backend/ingesta/pipeline/images.py:70`). Se calcula solo en el flujo directo, y solo si el dato no venía ya (`backend/ingesta/pipeline/upsert.py:94`). Si la descarga falla devuelve `''`. Se guarda truncado a 32 caracteres (`backend/ingesta/pipeline/upsert.py:52`). |
| `dedup_key` (`backend/real_estate/models.py:141`) | Rejilla geográfica de ~11 m: `f"{round(lat,4)},{round(lng,4)}"` (`build_dedup_key`, `backend/ingesta/pipeline/normalize.py:141`). **Se escribe en cada upsert pero ningún código lo lee**: `find_duplicate` usa bounding box + haversine, no la clave. Un `grep` de `dedup_key` en `backend/` solo encuentra la escritura, la definición del modelo, la lista de campos de solo lectura del serializer y los scripts de réplica. |
| `is_duplicate` (`backend/real_estate/models.py:145`) | **Solo se lee, nunca se escribe por el código de la aplicación a fecha de hoy.** El pipeline resuelve los duplicados descartando el nuevo (`skipped_duplicate`) o eliminando el anterior (*demote*), así que no queda ninguna fila marcada. El flag se consulta para ocultar del mapa (`backend/real_estate/views.py:321`), para el filtro "duplicadas" del panel de ingesta (`backend/ingesta/api.py:215`), para el mantenimiento masivo (`backend/ingesta/api.py:279`) y para las métricas del dashboard (`backend/real_estate/views.py:1677`). Las réplicas prod→local sí preservan el valor (`backend/paquetes/.pipeline/replica_export.py:17`). |
| `duplicate_of` (`backend/real_estate/models.py:147`) | **No implementado a fecha de hoy**: ninguna línea del backend asigna este FK. Solo aparece en el modelo, en la lista de campos de solo lectura del serializer (`backend/real_estate/serializers.py:201`) y en el script de réplica. |

---

## 6. Índices y constraints (`Meta`)

`backend/real_estate/models.py:174`:

| Índice | Campos | Consulta que sirve |
| --- | --- | --- |
| `prop_map_bbox_idx` | `status`, `is_duplicate`, `latitude`, `longitude` | El queryset público completo: excluye inactivas y duplicadas y luego filtra por el bbox del viewport (`backend/real_estate/views.py:321` y `:383`). Es el índice del mapa. |
| `prop_filter_price_idx` | `status`, `property_type`, `price` | Filtros del listado por tipo + rango de precio (`backend/real_estate/views.py:335`, `:351`) y los comparables de `intelligence` (`backend/real_estate/views.py:503`). |
| `prop_location_idx` | `province`, `city`, `status` | Landings SEO por ciudad/provincia y los endpoints `locations`, `summary` y `market-stats` (`backend/real_estate/views.py:669`, `:761`). |
| `prop_owner_status_idx` | `owner`, `status` | `my_properties` (`backend/real_estate/views.py:814`), el filtro `?owner=` (`backend/real_estate/views.py:373`) y los conteos por usuario del panel admin. |
| `prop_source_status_idx` | `source`, `is_imported`, `status` | Panel de ingesta: listar las importadas de una fuente por estado (`backend/ingesta/api.py:208`) y las métricas por fuente (`backend/real_estate/services/admin_metrics.py:265`). |
| `prop_views_desc_idx` | `-views_count` | Orden descendente por visitas (ranking de propiedades más vistas del panel). |

Constraint: `uniq_source_external_when_imported` sobre `(source, external_id)` con
`condition=Q(is_imported=True)` — ver §5.1.

`ordering = ["-created_at"]` (`backend/real_estate/models.py:175`): el listado por defecto
es del más nuevo al más viejo.

---

## 7. `PropertyPriceHistory`

Modelo en `backend/real_estate/models.py:204`. Tres campos: FK `property` (con
`related_name="price_history"`, `on_delete=CASCADE`), `price` y `recorded_at`
(`auto_now_add`). Índice `property_price_date_idx` sobre `(property, recorded_at)`.

**Cuándo se escribe una fila**: en el signal `post_save` de `Property`
(`backend/real_estate/signals.py:46`), no en el serializer ni en la vista. La condición
exacta es:

```python
if instance.price is not None:
    latest = instance.price_history.order_by("-recorded_at").first()
    if latest is None or latest.price != instance.price:
        PropertyPriceHistory.objects.create(property=instance, price=instance.price)
```

Consecuencias verificables:

- Cubre **cualquier** origen de escritura: publicación desde el formulario, edición, PATCH
  del admin y upsert de la ingesta, porque todos terminan en un `save()`.
- Se registra también la creación: la primera vez `latest is None`, así que un anuncio nuevo
  con precio nace con una fila de historial.
- Un `save()` que no cambia el precio **no** añade filas (se compara con el último valor).
- Un precio que pasa a `NULL` no borra ni registra nada.
- No hay historial de `rent_price`: solo se sigue `price`.

El endpoint `intelligence` devuelve el historial y, si está vacío pero hay precio, sintetiza
una entrada con `created_at` para no mostrar un gráfico vacío
(`backend/real_estate/views.py:549`).

### 7.1 `previous_price` y `price_changed_at` en la ficha

Desde el 2026-08-05 el detalle de una propiedad publica también el **último salto** de
precio: `previous_price` y `price_changed_at`, ambos `SerializerMethodField` calculados por
`_price_change` (`backend/real_estate/serializers.py:204-232`). Lo pide la lámina de «bajó el
precio» (§2.4), que necesita los dos importes.

La lógica es corta y las tres decisiones que contiene importan:

- Hacen falta **al menos dos filas** de historial; si no, no hubo salto.
- Si la fila más reciente **no coincide** con el precio actual —alguien escribió la columna
  sin pasar por `save()`— se devuelve `null` en los dos campos. Hornear un «antes» dudoso en
  una imagen que sobrevive a la corrección es peor que no ofrecer la lámina.
- `previous_price` viaja como **texto**, igual que `price`: DRF serializa los decimales así,
  y dos campos de precio de tipos distintos en el mismo payload son una trampa para quien
  los compare.

No es una fuga nueva: ambos importes fueron precios públicos mientras estuvieron vigentes, y
el endpoint `intelligence`, que es `AllowAny`, ya sirve el historial completo. La regla de no
exponer contadores va de visitas, no de precios.

---

## 8. `PropertyImage`

Modelo en `backend/real_estate/models.py:216`. Orden por defecto:
`["-is_main", "-uploaded_at"]` (`backend/real_estate/models.py:262`), así que la principal
siempre encabeza.

### 8.1 Estados del pipeline

`Status` es un `TextChoices` (`backend/real_estate/models.py:219`):

| Estado | Significado | Cuándo se asigna |
| --- | --- | --- |
| `pending` | Pendiente de optimizar | Al subir desde el API: la fila se crea **antes** de que los bytes lleguen a MinIO (`stage_property_image`, `backend/real_estate/serializers.py:120`). |
| `ready` | Optimizada y publicada | Cuando el worker termina (`backend/real_estate/tasks.py:78`) o cuando la ingesta optimiza en línea (`publish_optimized`, `backend/real_estate/uploads.py:45`). Es el **default del campo** (`backend/real_estate/models.py:250`). |
| `failed` | La optimización falló | Archivo temporal inexistente (`backend/real_estate/tasks.py:61`) o imagen ilegible/inválida (`ValueError`, `backend/real_estate/tasks.py:93`). El detalle queda en `optimization_error`. |

`is_ready()` (`backend/real_estate/models.py:269`) exige `status == READY` **y** que `image`
tenga contenido. Es un método, no una `@property`, porque la FK se llama `property` y
sombrea el builtin dentro del cuerpo de la clase.

### 8.2 Flujo asíncrono de subida

1. El request escribe el original en disco local con un nombre opaco UUID —el nombre
   original es dato del atacante y se guarda solo en la columna, nunca en la ruta—
   (`stash_upload`, `backend/real_estate/uploads.py:50`), guarda la ruta en `pending_path`
   (`backend/real_estate/models.py:254`) y encola la tarea.
2. `enqueue_optimization` (`backend/real_estate/tasks.py:205`) despacha en `on_commit`; si el
   broker está caído, **optimiza en línea** en lugar de perder la imagen.
3. `optimize_property_image` (`backend/real_estate/tasks.py:44`) genera WebP + thumbnail, los
   sube a MinIO en un único `save()` de la fila, pone `status=READY`, recalcula `file_size`,
   limpia `pending_path` y borra el temporal.
4. `sweep_pending_images` (`backend/real_estate/tasks.py:113`) re-encola las filas `pending`
   cuyo archivo sigue en disco y borra los temporales huérfanos más antiguos que
   `IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS` (48 h por defecto).

Mientras está `pending`, `PropertyImageSerializer` devuelve una URL servida desde el staging
local (`/api/pending-image/{id}/`) tanto para `image` como para `thumbnail`
(`backend/real_estate/serializers.py:145`–`:165`), para que la foto se vea de inmediato en
lugar de una imagen rota.

**Regla explícita**: `stage_property_image` **no lanza excepciones**
(`backend/real_estate/serializers.py:94`). Corre dentro del bloque atómico que creó la
`Property`, así que fallar ahí haría perder toda la publicación por un archivo no escribible.
Devuelve `None` y el anuncio se guarda sin esa foto.

### 8.3 Imagen principal (`is_main`)

- Al **crear**: la primera imagen subida es la principal (`idx == 0`,
  `backend/real_estate/serializers.py:315`).
- Al **actualizar**: la nueva primera imagen solo es principal si, tras descontar las que se
  van a borrar, no queda ninguna principal (`backend/real_estate/serializers.py:345`).
- La ingesta marca principal la primera imagen descargada
  (`backend/ingesta/pipeline/images.py:138` y `:177`).
- Los serializers de mapa y del panel eligen la que tiene `is_main` y, si no hay, la primera
  (`backend/real_estate/serializers.py:431`, `backend/real_estate/serializers.py:889`).

### 8.4 Borrado de imágenes al actualizar

En `PropertySerializer.update` (`backend/real_estate/serializers.py:319`):

- `images_to_delete` llega como string JSON; si no parsea o no es una lista, error de
  validación (`backend/real_estate/serializers.py:334`).
- Solo se borran imágenes que pertenezcan a **esa** propiedad
  (`filter(id__in=..., property=instance)`, `backend/real_estate/serializers.py:339`).
- Las nuevas se procesan **antes** de borrar las viejas, y los archivos físicos se eliminan
  en `transaction.on_commit` (`backend/real_estate/serializers.py:360`): así un rollback
  nunca deja filas restauradas apuntando a objetos ya borrados de MinIO.

### 8.5 Límites y validación de imágenes

Configuración en `backend/estate_map/settings.py`:

| Ajuste | Valor | Línea |
| --- | --- | --- |
| `MAX_IMAGES_PER_PROPERTY` | 10 | `backend/estate_map/settings.py:367` |
| `MAX_IMAGE_SIZE_MB` | 10 | `backend/estate_map/settings.py:368` |
| `MAX_PROPERTY_UPLOAD_MB` | 50 (suma de la subida) | `backend/estate_map/settings.py:369` |
| `ALLOWED_IMAGE_TYPES` | `image/jpeg`, `image/jpg`, `image/png`, `image/webp` | `backend/estate_map/settings.py:352` |
| `IMAGE_OPTIMIZATION` | máx. 1920×1920, calidad 88, formato WEBP, thumbnail 640×640 calidad 82, `PRESERVE_MAX_BYTES` 512 KB, `MINIMUM_SAVINGS_RATIO` 0.12 | `backend/estate_map/settings.py:355` |
| `DATA_UPLOAD_MAX_NUMBER_FILES` | 10 | `backend/estate_map/settings.py:349` |
| `DATA_UPLOAD_MAX_MEMORY_SIZE` | 60 MB (margen para el multipart; los archivos se validan uno a uno en el serializer) | `backend/estate_map/settings.py:346` |

`validate_uploaded_images` (`backend/real_estate/serializers.py:224`) aplica, en orden:

1. **Tope de 10 imágenes por propiedad**, contando las existentes y **restando** las que el
   mismo request va a borrar vía `images_to_delete`
   (`backend/real_estate/serializers.py:232`).
2. **Tope combinado** de `MAX_PROPERTY_UPLOAD_MB` sobre la suma de tamaños
   (`backend/real_estate/serializers.py:246`).
3. Por cada imagen: tamaño ≤ `MAX_IMAGE_SIZE_MB`, `content_type` en la lista permitida
   (lista **literal** en el serializer, `backend/real_estate/serializers.py:265`, que
   coincide con `ALLOWED_IMAGE_TYPES` pero no lo importa), y luego los tres validadores del
   modelo.
4. `image.seek(0)` tras validar (`backend/real_estate/serializers.py:276`), porque los
   validadores consumen el stream y el guardado posterior necesita leerlo desde el inicio.

Validadores de `backend/real_estate/validators.py`, aplicados **también** a nivel de modelo
en el campo `image` (`backend/real_estate/models.py:229`):

| Validador | Regla | Línea |
| --- | --- | --- |
| `validate_image_size` | ≤ 10 MB (constante local, no lee settings) | `backend/real_estate/validators.py:8` |
| `validate_image_dimensions` | Entre 200×200 y 8000×8000 px | `backend/real_estate/validators.py:17` |
| `validate_image_format` | Extensión en `jpg`, `jpeg`, `png`, `webp` | `backend/real_estate/validators.py:36` |

La ingesta aplica su propio tope leyendo el mismo setting
(`MAX_IMAGES = getattr(settings, "MAX_IMAGES_PER_PROPERTY", 10)`,
`backend/ingesta/pipeline/images.py:21`), pero **no pasa por los validadores del serializer**:
optimiza en línea y guarda (`backend/ingesta/pipeline/images.py:137`).

**Regla de la ingesta**: si ninguna imagen se pudo descargar y la propiedad se acababa de
crear, la propiedad se borra y se devuelve `skipped_no_images`
(`backend/ingesta/pipeline/upsert.py:159`). Y en `attach_images_from_urls`, las imágenes
existentes solo se reemplazan **después** de confirmar que al menos una descarga nueva
funcionó (`backend/ingesta/pipeline/images.py:133`).

---

## 9. Validaciones de negocio del API público (`PropertySerializer`)

`backend/real_estate/serializers.py:172`. Usa `fields = '__all__'`.

### 9.1 Campos de solo lectura

`read_only_fields` (`backend/real_estate/serializers.py:187-202`): `created_at`, `updated_at`,
`owner`, `views_count`, `short_code`, `closed_at`, `source`, `source_agency`, `source_url`,
`external_id`, `is_imported`, `dedup_key`, `image_hash`, `is_duplicate`, `duplicate_of`,
`imported_at`, `source_published_at`, `source_updated_at`, `last_seen_at`.

Los dos últimos añadidos tienen el mismo motivo, y no es de agregación: `short_code` se
imprime en las láminas y la columna es única, así que un cliente que lo eligiera podría
okupar el código de un anuncio ajeno; y `closed_at` lo sella el servidor porque la fecha de
un cierre no es de nadie para retrodatarla. `closed_reason`, en cambio, **sí** es escribible:
es el dueño quien afirma que vendió.

Es decir: **agregación, moderación y analítica se controlan solo desde los servicios de
ingesta/admin, nunca desde el CRUD público**. Un cliente que mande `views_count`,
`is_imported` o `external_id` en el POST recibe 201 y esos valores se ignoran (confirmado
por test, §11).

### 9.2 Campos obligatorios

**Ninguno.** Verificado por introspección del serializer en el contenedor: la lista de
campos con `required=True` está vacía. Todos los campos del modelo son `blank=True`,
`null=True` o tienen `default`, así que DRF los marca `required=False`. Un POST autenticado
con un cuerpo vacío crea una propiedad válida con `property_type='land'`,
`status='for_sale'`, `city='Macas'`, `province='Morona Santiago'` y sin precio.

Campos escribibles por el API público: `address`, `area`, `bathrooms`, `built_area`, `city`,
`closed_reason`, `contact_email`, `contact_phone`, `description`, `floors`, `furnished`,
`images_to_delete`, `is_negotiable`, `latitude`, `longitude`, `parking_spaces`, `polygon`,
`price`, `property_type`, `province`, `rent_price`, `rooms`, `show_measurements`, `status`,
`title`, `uploaded_images`, `year_built`.

`previous_price` y `price_changed_at` no aparecen porque son `SerializerMethodField`: se
calculan al leer y no se pueden escribir (§7.1).

**No implementado a fecha de hoy**: no existe validación cruzada de precios (nada exige
`price` cuando `status='for_sale'`, ni impide `rent_price` sin `price`, ni aplica las cotas
de `sanitize_price` a lo que publica un usuario — ese saneamiento vive solo en la ingesta).
Tampoco hay validación de rango sobre `latitude`/`longitude` sueltos: `coord_in_ecuador`
(`backend/real_estate/geo.py:43`) solo se invoca desde la validación del **polígono**, así
que un punto fuera de Ecuador sin polígono se acepta.

### 9.3 Otras reglas del serializer

- `uploaded_images` es un `ListField` write-only con `max_length=10`
  (`backend/real_estate/serializers.py:175`), redundante con el chequeo de
  `MAX_IMAGES_PER_PROPERTY` pero aplicado antes.
- `create` y `update` son `@transaction.atomic`
  (`backend/real_estate/serializers.py:308`, `:319`).
- `to_representation` añade `owner_username` con el nombre completo del dueño, o el
  `username` si no tiene nombre (`backend/real_estate/serializers.py:217`).

---

## 10. Visibilidad, permisos y señales

### 10.1 Permisos

`PropertyViewSet` usa `[IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]`
(`backend/real_estate/views.py:274`). `IsOwnerOrReadOnly`
(`backend/real_estate/permissions.py:4`) compara `obj.owner == request.user`.

Consecuencia directa para las importadas: como su `owner` es `NULL`, **nadie puede
editarlas ni borrarlas desde el API público**; solo el `AdminPropertyViewSet`
(`backend/real_estate/views.py:2331`), restringido a `is_staff`, y su PATCH está limitado a
`{'status', 'title', 'price', 'city', 'description'}`
(`PATCH_ALLOWED_FIELDS`, `backend/real_estate/views.py:2344`).

Esa lista tiene una consecuencia que conviene conocer: **`closed_reason` no está en ella**,
así que desde el panel admin se puede reabrir un anuncio (cambiando el estado, que arrastra
el borrado del motivo) pero no cerrarlo. Marcar un anuncio como vendido es hoy cosa de su
dueño, por el CRUD de propiedades. No es un descuido: un cierre es una afirmación sobre un
negocio ajeno.

La lectura de la ficha, en cambio, ya no la decide `get_queryset` del catálogo. Las acciones
dirigidas a un anuncio por su id resuelven la fila con su propia condición de visibilidad
(`backend/real_estate/views.py:380-405`), detallada en §2.3: cerrado con motivo, o propio, o
público. La matriz completa está en
[../permissions/matrix.md](../permissions/matrix.md).

### 10.2 Idempotencia al publicar

`create` acepta una cabecera `Idempotency-Key` (`backend/real_estate/views.py:441`): se
deriva un hash con el id del usuario, se guarda el id creado en caché 24 h y un reintento
devuelve 200 con `X-Idempotent-Replay: true` en lugar de duplicar el anuncio. Un request
concurrente con la misma clave recibe 409. Si la caché no está disponible, la publicación
sigue funcionando.

### 10.3 Señales (`backend/real_estate/signals.py`)

| Señal | Disparador | Efecto |
| --- | --- | --- |
| `post_save` de `Property` (`:46`) | Cualquier guardado | Escribe `PropertyPriceHistory` si el precio cambió (§7) y notifica la URL a IndexNow (`submit_property`). |
| `post_delete` de `Property` (`:55`) | Borrado | También notifica a IndexNow: el buscador recrawlea, recibe el 404/410 y saca la URL del índice antes. |
| `post_save` / `post_delete` de `Property` (`:62`, `:67`) | Alta, edición o borrado | `bump_props_version()` invalida de golpe todas las lecturas cacheadas en Redis, y en `on_commit` encola `revalidate_frontend_tags(["properties", f"property-{id}"])` para que Next.js reconstruya las páginas etiquetadas. Un fallo del broker se registra y se ignora: la página se queda cacheada hasta su TTL. |
| `post_save` / `post_delete` de `PropertyImage` (`:72`) | Foto nueva, reemplazada o recién optimizada | **Solo** `bump_props_version()`. No dispara revalidación del frontend a propósito: el worker toca las filas de una subida una a una y cada una generaría su propia petición. |

---

## 11. `Lead` y `PendingPublication` (relación con propiedades)

Solo lo que toca a propiedades; el detalle de estos flujos merece su propio documento.

- **`Lead`** (`backend/real_estate/models.py:378`): FK obligatoria a `Property` con
  `on_delete=CASCADE` — borrar una propiedad borra sus leads. La creación es **pública**
  (`AllowAny`); listar/editar exige autenticación y cada usuario ve solo los leads de sus
  propias propiedades (los `is_staff` ven todos, `backend/real_estate/views.py:867`). El
  `status` es de solo lectura en la creación (`backend/real_estate/serializers.py:460`) y
  solo se cambia con `LeadStatusSerializer`. Al crear se notifica por correo al dueño
  mediante `LeadNotificationService` (`backend/real_estate/views.py:876`), que es
  *best-effort*: si el envío falla, se registra y el lead se conserva
  (`backend/real_estate/services/notifications.py:16`).
- **`PendingPublication`** (`backend/real_estate/models.py:423`): **no** es una `Property` ni
  crea ninguna. Es una solicitud capturada antes de que el usuario tenga cuenta verificada;
  guarda el borrador en `draft` (JSON) y campos sueltos de texto (incluido `price` como
  `CharField`). No aparece en el mapa; sirve para seguimiento comercial. Creación pública y
  con throttle; la bandeja es solo para `is_staff` (`backend/real_estate/views.py:891`).

---

## 12. Reglas confirmadas por tests

| Regla | Test |
| --- | --- |
| Un anillo abierto `[[lat, lng], ...]` se normaliza a GeoJSON cerrado en orden `[lng, lat]` | `test_normalizes_open_lat_lng_ring_to_closed_geojson` — `backend/real_estate/tests/test_polygon_validation.py:6` |
| Un polígono con lados que se cruzan se rechaza | `test_rejects_self_intersecting_polygon` — `backend/real_estate/tests/test_polygon_validation.py:18` |
| Una imagen menor de 200×200 px se rechaza | `test_rejects_image_below_minimum_dimensions` — `backend/real_estate/tests/test_property_image_validation.py:18` |
| Un formato no permitido (GIF) se rechaza | `test_rejects_disallowed_image_format` — `backend/real_estate/tests/test_property_image_validation.py:25` |
| Una imagen válida pasa y el stream queda rebobinado en 0 | `test_accepts_supported_image_and_rewinds_stream` — `backend/real_estate/tests/test_property_image_validation.py:32` |
| La suma de la subida se limita con `MAX_PROPERTY_UPLOAD_MB` | `test_rejects_combined_upload_over_50mb` — `backend/real_estate/tests/test_property_image_validation.py:41` |
| No se pueden superar 10 imágenes por propiedad | `test_rejects_more_than_ten_images_already_on_property` — `backend/real_estate/tests/test_property_image_validation.py:53` |
| La subida devuelve sin optimizar nada: fila `pending`, sin `image`/`thumbnail`, original en disco | `test_staging_returns_before_any_optimization` — `backend/real_estate/tests/test_async_image_pipeline.py:34` |
| El worker publica WebP + thumbnail ≤1920 px, deja `status=READY`, limpia `pending_path` y borra el temporal | `test_worker_publishes_and_clears_the_staged_file` — `backend/real_estate/tests/test_async_image_pipeline.py:48` |
| Un archivo ilegible deja la fila en `FAILED` con `optimization_error`, sin reintentar en bucle | `test_unreadable_file_fails_the_row_without_retrying_forever` — `backend/real_estate/tests/test_async_image_pipeline.py:70` |
| El barrido re-encola las filas `pending` reclamadas y borra los temporales huérfanos | `test_sweep_removes_orphan_files_but_keeps_claimed_ones` — `backend/real_estate/tests/test_async_image_pipeline.py:85` |
| Con el broker caído la imagen se optimiza en línea; nunca se pierde | `test_broker_outage_still_produces_a_finished_image` — `backend/real_estate/tests/test_async_image_pipeline.py:112` |
| Un disco no escribible no revierte la publicación: la propiedad sobrevive sin esa foto | `test_unwritable_staging_never_costs_the_listing` — `backend/real_estate/tests/test_async_image_pipeline.py:136` |
| Una imagen `pending` ya devuelve una URL usable (`/api/pending-image/{id}/`) | `test_serializer_serves_pending_images_from_staging` — `backend/real_estate/tests/test_async_image_pipeline.py:156` |
| El API público ignora `views_count`, `is_imported`, `is_duplicate`, `external_id` y `dedup_key` enviados por el cliente, y asigna `owner` desde el request | `test_public_property_serializer_ignores_internal_fields` — `backend/real_estate/tests/test_services.py:56` |
| Cambiar el precio añade una fila a `price_history` (creación + cambio = 2 filas) y una importada sin `source_published_at` reporta `publication_basis='detected'` | `test_property_intelligence_compares_inventory_and_tracks_price_changes` — `backend/real_estate/tests/test_market_intelligence.py:11` |
| Las estadísticas públicas nunca exponen visitas ni oferta/demanda cruda, y el sector agrupa sin distinguir mayúsculas | `test_market_stats_city_filter_scopes_every_metric` — `backend/real_estate/tests/test_market_intelligence.py:38` |
| Una propiedad con polígono y sin punto recibe un pin en el centro del polígono | `test_polygon_without_stored_point_gets_a_map_pin_at_its_center` — `backend/real_estate/tests/test_map_payload.py:29` |
| Si ninguna imagen se puede adjuntar, la propiedad recién creada se revierte (`skipped_no_images`) | `test_created_property_rolls_back_when_all_images_fail` — `backend/ingesta/tests/test_upsert_images.py:34` |
| Con `require_images=True` y sin imágenes del scraper, la propiedad recién creada se revierte | `test_created_property_rolls_back_when_images_are_required_but_missing` — `backend/ingesta/tests/test_upsert_images.py:54` |
| Si fallan todas las descargas, las imágenes existentes se conservan | `test_attach_images_keeps_existing_images_when_downloads_fail` — `backend/ingesta/tests/test_upsert_images.py:72` |
| Retirar un anuncio importado borra la propiedad y sus imágenes, y deja `ListingRetirada` con el `http_status` | `test_retirement_keeps_audit_but_deletes_imported_property` — `backend/ingesta/tests/test_retirement.py:19` |
| Retirar un `external_id` nunca importado solo deja el registro de auditoría | `test_never_imported_retirement_only_keeps_small_audit_record` — `backend/ingesta/tests/test_retirement.py:45` |
| Una propiedad publicada por un usuario nunca se borra por retirada | `test_user_published_property_is_never_deleted` — `backend/ingesta/tests/test_retirement.py:59` |
| El mantenimiento por categorías solo cuenta candidatas importadas (una `is_duplicate=True` de usuario no entra) | `test_preview_counts_only_imported_cleanup_candidates` — `backend/ingesta/tests/test_maintenance.py:25` |
| La limpieza masiva exige confirmación textual y nunca borra propiedades de usuario | `test_cleanup_requires_confirmation_and_never_deletes_user_property` — `backend/ingesta/tests/test_maintenance.py:44` |
| El dashboard cuenta calidad del catálogo: sin imágenes, sin ubicación, sin precio, duplicadas, inactivas | `test_dashboard_reports_catalog_quality_and_ingestion_health` — `backend/real_estate/tests/test_admin_dashboard.py:13` |
| Un lead público notifica por correo al dueño y al `contact_email` de la propiedad | `test_public_lead_creation_notifies_property_owner` — `backend/real_estate/tests/test_leads.py:9` |
| Cada usuario solo lista los leads de sus propias propiedades | `test_user_only_lists_leads_for_own_properties` — `backend/real_estate/tests/test_leads.py:43` |
| Una fecha de publicación no parseable no se inventa (`None`) | `test_invalid_source_date_is_not_invented` — `backend/ingesta/tests/test_source_dates.py:15` |
