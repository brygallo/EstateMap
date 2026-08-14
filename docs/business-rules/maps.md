# Reglas de negocio: el mapa

Verificado contra el código el 2026-08-04.

Este documento describe únicamente lo que existe hoy en el repositorio. Cada
afirmación va acompañada de su cita `archivo:línea`. Cuando algo **no** existe se
dice explícitamente, con la evidencia de la ausencia.

El stack de mapas es **MapLibre GL únicamente**: `frontend/package.json:38`
declara `maplibre-gl`, y no hay ninguna dependencia de Leaflet ni de
`react-leaflet` en el manifiesto (`frontend/package.json:30`, `:38` son las
únicas entradas geoespaciales, junto con `@turf/turf`).

---

## 1. Recorrido completo: petición → payload → render

```
NAVEGADOR (MapLibre)
  │  el usuario panea / hace zoom
  │  moveend | zoomend  →  reportViewport()
  │  (MapLibreMap.tsx:500-501, :255-...)
  │  se descarta el movimiento pequeño: <18% del ancho y <0.25 de zoom
  │  (MapLibreMap.tsx:191-206)
  ▼
HOOK usePropertyFilters
  │  debounce 220 ms  (usePropertyFilters.ts:331, :411)
  │  clave de caché en memoria = filtros + bucket de zoom
  │  (usePropertyFilters.ts:138-141)
  │  si el bbox pedido ya está contenido en un área cacheada → NO hay red
  │  (usePropertyFilters.ts:356-363)
  ▼
GET /api/properties/map_points/?bbox=&zoom=&limit=&<filtros>
  │  limit = 900 si zoom <= 9.2, si no 1400  (usePropertyFilters.ts)
  ▼
DJANGO  PropertyViewSet.map_points          (views.py:578-628)
  │
  ├─ throttling AntiScraperScopedThrottle, scope `map_points` 120/min
  │  (views.py:290-292 · settings.py:179 · throttling.py:42-51)
  │
  ├─ bbox se redondea HACIA AFUERA a 3 decimales (~110 m)  (views.py:252-270)
  │
  ├─ clave de caché versionada `map_points:v<N>:z..:n..:bbox:filtros`
  │  (views.py:600-606 · cache_utils.py:70-72)
  │  HIT y petición anónima → respuesta inmediata  (views.py:607-610)
  │
  ├─ get_queryset(): excluye status='inactive' y is_duplicate=True
  │  (views.py:321) + filtros de query  (views.py:324-373)
  │  bbox se aplica en SQL SOLO si zoom > 9.2  (views.py)
  │
  ├─ .only(...) 10 columnas  (views.py:612-623)
  ▼
build_map_payload(queryset, zoom, max_items)   (map_payload.py)
  │
  ├─ .values(POINT_FIELDS) → 10 campos, nunca más  (map_payload.py:7-18, :137)
  ├─ descarta filas sin punto válido dentro de Ecuador  (map_payload.py:138, :205-245)
  │
  ├─ zoom > 9.2  →  mode='points'   lista plana de propiedades
  └─ zoom <= 9.2 →  mode='mixed'    clusters + puntos representativos
        group_level según zoom (country/province/city)
  ▼
JSON  { mode, zoom, context, total_count, cluster_count, point_count,
        city_groups, items[] }
  │  Cache-Control público 60 s navegador / 120 s CDN  (views.py:97-102, :83)
  ▼
NAVEGADOR
  │  items se separan en clusters y puntos  (MapLibreMap.tsx:242-249)
  ├─ clusters → marcadores HTML con anti-solape por prioridad  (MapLibreMap.tsx:556-588)
  │            clic → centro territorial y siguiente nivel fijo
  ├─ puntos   → capa GeoJSON `properties` + marcadores HTML de precio
  │            (MapLibreMap.tsx:542, :686-812)
  └─ polígonos→ capa `property-polygons`, visible solo desde zoom 14
               (MapLibreMap.tsx:373-393)
```

---

## 2. Endpoint del mapa

`GET /api/properties/map_points/`
(ruta: `backend/estate_map/urls.py:8` + `backend/real_estate/urls.py:33`;
acción `detail=False` en `backend/real_estate/views.py:578-579`).

Es `AllowAny` (`views.py:578`). Es el **único** endpoint que produce el payload
del mapa: no existen endpoints separados `clusters/`, `points/` ni `bbox/`
(`grep` sobre `real_estate/urls.py` y `views.py` no arroja ninguna otra acción
con esos nombres; el enrutado completo de la app está en
`backend/real_estate/urls.py:40-90`).

### 2.1 Parámetros de query

| Parámetro | Tipo | Por defecto | Efecto | Cita |
|---|---|---|---|---|
| `zoom` | float | `7` | Decide modo (`points` vs `mixed`) y nivel de agrupación | `views.py:588-589`, `map_payload.py:133-134` |
| `bbox` | `oeste,sur,este,norte` (lng,lat,lng,lat) | — | Recorta en SQL solo con `zoom > 9.2`; los niveles territoriales se calculan sobre todo el conjunto filtrado | `views.py`, `map_payload.py` |
| `limit` | int | `1000` | Tope de ítems; se re-acota a 1600 (clusters) / 2000 (puntos) | `views.py:599`, `map_payload.py:135` |
| `search` | texto | — | `icontains` sobre título, dirección, ciudad y descripción | `views.py:324-331` |
| `type` / `property_type` | texto | — | Igualdad exacta; `all` se ignora | `views.py:333-335` |
| `status` | `for_sale` / `for_rent` | — | Igualdad exacta; `all` se ignora | `views.py:337-339` |
| `city` | texto | — | `iexact` | `views.py:341-343` |
| `province` | texto | — | `iexact` | `views.py:345-347` |
| `min_price` / `minPrice` | float | — | `price__gte` | `views.py:349-351` |
| `max_price` / `maxPrice` | float | — | `price__lte` | `views.py:352-354` |
| `min_area` / `minArea` | float | — | `area__gte` | `views.py:356-358` |
| `max_area` / `maxArea` | float | — | `area__lte` | `views.py:359-361` |
| `rooms` | entero | — | `rooms__gte` (solo si es dígito) | `views.py:363-365` |
| `bathrooms` | entero | — | `bathrooms__gte` (solo si es dígito) | `views.py:367-369` |
| `owner` / `user` | id | — | `owner_id` exacto | `views.py:371-373` |

Los parámetros que participan en la clave de caché están enumerados en
`views.py:113-118`; cualquier otro (cache busters, tags de analítica) se ignora
para no fragmentar la caché (`views.py:110-112`).

`page`, `page_size` e `include_images` **no aplican** a este endpoint: pertenecen
al listado paginado `/api/properties/` (`views.py:224-232`, `:418-434`).

### 2.2 Snapping del bbox

El bbox se redondea *hacia afuera* a 3 decimales antes de consultar y antes de
construir la clave de caché (`views.py:252-270`). Es redondeo hacia afuera y no
al más cercano precisamente para que la caja resultante siempre **contenga** la
pedida: la respuesta es un superconjunto del viewport y nada que deba verse en
pantalla desaparece (`views.py:256-259`).

### 2.3 Por qué el clustering ignora el bbox

Con `zoom <= 9.2` el flag `self._ignore_map_bbox` desactiva el filtro SQL por
bbox. País, provincia y ciudad se calculan sobre **todo** el dataset filtrado,
de modo que sus posiciones son estables y no "caminan" al panear.

---

## 3. Reglas de visibilidad: qué entra al mapa

El queryset base es (`views.py:321`):

```python
Property.objects.exclude(status='inactive').exclude(is_duplicate=True)
```

| Regla | Se excluye porque | Cita |
|---|---|---|
| `status == 'inactive'` | Solo se ve en `/my_properties/` | `views.py:302-316`, `:321`; valores posibles en `models.py:69-73` |
| `is_duplicate == True` | Es el duplicado que perdió la preferencia frente a la versión canónica | `views.py:317-319`, `:321`; campo en `models.py:145-146` |
| Sin punto válido | La fila se descarta al construir el payload, no en SQL | `map_payload.py:138`, `:205-210` |

"Punto válido" no equivale a "tiene lat/lng". La regla real está en
`map_payload.py:213-245`:

1. Si hay `latitude` y `longitude` **y** caen dentro de Ecuador
   (`geo.coord_in_ecuador`), ese es el punto.
2. Si no, se intenta derivar del `polygon`: se acepta GeoJSON (`{coordinates:
   [[[lng,lat],…]]}`) o el anillo simple `[[lat,lng],…]`, se quita el vértice de
   cierre repetido, se descartan los vértices fuera de Ecuador y se promedia el
   resto (`map_payload.py:227-245`).
3. Si tampoco hay polígono utilizable, la propiedad **no aparece en el mapa**
   (`map_payload.py:240`).

Es decir: una propiedad activa con coordenadas fuera de Ecuador (lat/lng
invertidos, geocodificación corrupta) es invisible en el mapa aunque exista en el
listado. El chequeo de pertenencia trata continente y Galápagos como dos cajas
separadas para que el océano entre ambos no sea "Ecuador válido"
(`geo.py:12-23`, `:43-53`).

Nota sobre el bbox en SQL (`views.py:383-392`): además de las propiedades cuyo
lat/lng cae dentro de la caja, se incluyen las que tienen `latitude IS NULL AND
longitude IS NULL AND polygon IS NOT NULL`, por compatibilidad con anuncios
antiguos que solo guardaron el polígono.

Índice que sostiene esta consulta: `prop_map_bbox_idx` sobre
`(status, is_duplicate, latitude, longitude)` (`models.py:177`).

---

## 4. Construcción del payload

### 4.1 Campos que se leen de la base

`POINT_FIELDS` (`map_payload.py:7-18`) es la lista cerrada de columnas que el
mapa consulta:

```
id · property_type · status · latitude · longitude · polygon ·
show_measurements · price · city · province
```

El `.only(...)` del viewset repite exactamente esas diez columnas
(`views.py:612-623`).

**Campos deliberadamente omitidos.** El payload del mapa no lleva `title`,
`description`, `address`, `images`, `area`, `rooms`, `bathrooms`,
`parking_spaces`, `owner`, `contact_phone`, `contact_email`, `source_url` ni
`views_count`. No aparecen en `POINT_FIELDS` (`map_payload.py:7-18`) ni en
`_point_payload` (`map_payload.py:268-281`). En particular:

- **`views_count` nunca sale por el mapa.** No está en `POINT_FIELDS`. El
  contador de visitas solo se incrementa en el detalle y solo para tráfico
  humano (`views.py:477-486`).
- El detalle y las tarjetas laterales sí traen título e imágenes, pero por otro
  endpoint (`/api/properties/`, serializado con `MapPropertySerializer`,
  `serializers.py:392-442`). El frontend fusiona ambas fuentes por `id`
  (`MapPageClient.tsx:163-175`).

### 4.2 Tope de ítems

```python
max_items = max(1, min(int(max_items), 1600 if cluster_zoom else 2000))
```
(`map_payload.py:135`)

| Modo | Tope efectivo de `items` | Cita |
|---|---|---|
| `mixed` (zoom ≤ 9.2) | ≤ 1600, y de esos como máximo `min(180, max(40, max_items//4))` son puntos individuales | `map_payload.py` |
| `points` (zoom > 9.2) | ≤ 2000 | `map_payload.py` |

El cliente pide 900 o 1400 según el modo (`usePropertyFilters.ts:380`,
`PropertyNearbyMap.tsx:58`), así que en la práctica el tope duro del backend
nunca se alcanza desde la UI.

### 4.3 Niveles de zoom

Umbral maestro: `MAX_CLUSTER_ZOOM = 9.2`, compartido por el constructor del
payload y la vista; el cliente usa el mismo corte para límites y caché.

| Zoom | `group_level` | Qué se agrupa | Cita |
|---|---|---|---|
| ≤ 5.2 | `country` | Todo Ecuador en un solo bucket | `map_payload.py:249-250`, `:292-293` |
| 5.2 – 6.8 | `province` | Por nombre normalizado de provincia | `map_payload.py` |
| 6.8 – 9.2 | `city` | Por provincia y ciudad/cantón | `map_payload.py` |
| > 9.2 | *(sin agrupación)* | `mode='points'` | `map_payload.py` |

Cuando una provincia o ciudad no tiene un ancla conocida, conserva su nivel
territorial y usa el centro de su propio inventario como destino.

### 4.4 Tamaño de la rejilla

| Zoom | `grid_size` (grados) | Cita |
|---|---|---|
| ≤ 6 | 1.0 | `map_payload.py:259-260` |
| 6 – 8 | 0.45 | `map_payload.py:261-262` |
| 8 – 10 | 0.18 | `map_payload.py:263-264` |
| > 10 | 0.08 | `map_payload.py:265` |

Cada bucket mantiene además micro-celdas de `grid_size/4` (mínimo 0.01°) para
localizar el "foco" más denso (`map_payload.py:412-421`).

### 4.5 Cluster vs punto suelto

En el nivel `city`, un bucket con **3 o menos** propiedades no se
convierte en cluster: sus filas se emiten como puntos individuales
(`map_payload.py:428`, `:431-433`). En `country` y `province` siempre se fuerza
el cluster (`map_payload.py:428`).

Los clusters se ordenan por `count` descendente y los puntos representativos por
precio descendente antes de recortar (`map_payload.py:169-170`, `:172-174`).

---

## 5. Forma de la respuesta

### 5.1 Raíz

| Campo | Presente en | Descripción | Cita |
|---|---|---|---|
| `mode` | ambos | `'points'` o `'mixed'` | `map_payload.py:144`, `:177` |
| `zoom` | ambos | Zoom efectivo usado | `map_payload.py:145`, `:178` |
| `group_level` | solo `mixed` | `country` / `province` / `city` | `map_payload.py` |
| `grid_size` | solo `mixed` | Grados de la celda | `map_payload.py:180` |
| `context` | ambos | Títulos para la UI + `total_count` | `map_payload.py:146`, `:181`, `:566-597` |
| `total_count` | ambos | Filas con punto válido en **todo** el dataset filtrado, no solo las enviadas | `map_payload.py:139`, `:147`, `:182` |
| `cluster_count` | ambos | 0 en modo `points` | `map_payload.py:148`, `:183` |
| `point_count` | ambos | Puntos individuales enviados | `map_payload.py:149`, `:184` |
| `city_groups` | ambos | Resumen por ciudad de todo el dataset filtrado | `map_payload.py:150`, `:185`, `:600-657` |
| `items` | ambos | Mezcla de clusters y puntos | `map_payload.py:151`, `:186` |

### 5.2 Ítem de tipo punto (`_point_payload`, `map_payload.py:268-281`)

| Campo | Notas |
|---|---|
| `id` | PK de la propiedad |
| `property_type` | |
| `status` | `for_sale` / `for_rent` |
| `latitude`, `longitude` | Ya normalizados: si venían nulos, es el centro del polígono (`map_payload.py:209`) |
| `polygon` | Tal como está en la base (GeoJSON `[lng,lat]`), **sin transformar** |
| `show_measurements` | Booleano, se envía siempre |
| `price` | |
| `city`, `province` | |
| `is_cluster` | Siempre `False` |

### 5.3 Ítem de tipo cluster (`_cluster_payload`, `map_payload.py:447-466`)

| Campo | Significado | Cita |
|---|---|---|
| `id` | `cluster:<clave del bucket>` | `map_payload.py:453`, claves en `:284-298` |
| `is_cluster` | Siempre `True` | `map_payload.py:454` |
| `count` | Propiedades del grupo | `map_payload.py:455` |
| `label` | Nombre de provincia/ciudad, o `null` en rejilla | `map_payload.py:456`, `:396`, `:120-129` |
| `group_level` | Nivel de agrupación | `map_payload.py:457` |
| `latitude`, `longitude` | **Medoide** del grupo: la propiedad real más cercana a la mediana | `map_payload.py:460-461`, `:346-374` |
| `focus_latitude`, `focus_longitude` | Centro de la micro-celda más densa; respaldo cuando el grupo está partido en dos bolsones | `map_payload.py:462-463`, `:436-441` |
| `expansion_zoom` | Zoom al que la extensión del grupo llena la pantalla, acotado a [11.0, 16.5] | `map_payload.py:463`, `:472-494` |
| `bounds` | `{west, south, east, north}` recortados al percentil 5/95 | `map_payload.py:464`, `:537-563` |
| `suspicious_count` | Propiedades a más de 85 km del ancla nominal de su ciudad | `map_payload.py:465`, `:409-410` |

### 5.4 `city_groups` (`map_payload.py:600-657`)

Resumen por par `provincia:ciudad` calculado sobre **todas** las filas válidas,
independientemente del viewport y del nivel de agrupación (se envía también en
modo `points`). Campos: `id`, `label`, `province`, `count`, `latitude`,
`longitude`, `zoom`, `bounds`, `suspicious_count` (`map_payload.py:646-656`).
Se ordena por `count` descendente y luego alfabéticamente
(`map_payload.py:657`).

### 5.5 `context` (`map_payload.py:566-597`)

Textos en español ya listos para la UI:

| `group_level` | `title` | `subtitle` | `next_level` |
|---|---|---|---|
| `country` | Ecuador | Resumen nacional por provincias | `province` |
| `province` | Provincias | Toca una provincia para ver sus ciudades | `city` |
| `city` | Ciudades | Toca una ciudad para abrir sus propiedades | `points` |
| `grid` | Zonas | Agrupadores por zonas visibles | `points` |
| `points` | Propiedades | Puntos individuales en la vista actual | `null` |

Más `group_level` y `total_count` (`map_payload.py:594-597`).

---

## 6. Dónde se dibuja el marcador de un grupo

Tres coordenadas distintas conviven a propósito, y conviene no confundirlas:

1. **Ancla nominal** (`_reference_anchor`, `map_payload.py:314-334`): la
   coordenada oficial del cantón o la provincia, tomada de las tablas
   `ECUADOR_CENTER`, `PROVINCE_CENTERS`, `CITY_CENTERS` y `CITY_NAME_CENTERS`
   (`map_payload.py:20-94`). **No** es donde se dibuja el marcador: se usa solo
   para medir a qué distancia está una propiedad del lugar que dice ocupar, lo
   que alimenta `suspicious_count` (`map_payload.py:316-322`, `:409-410`).

2. **Medoide** (`_medoid`, `map_payload.py:346-374`): mediana de latitudes y de
   longitudes del grupo, "pegada" después a la propiedad real más cercana. Es la
   posición del marcador (`map_payload.py:460-461`). La mediana ya cae dentro de
   la masa de anuncios, y pegarla a una propiedad real cierra el caso del grupo
   nacional o provincial cuya mediana caería en mar abierto
   (`map_payload.py:348-357`).

3. **Foco** (`focus_*`, `map_payload.py:436-441`): centro de la micro-celda más
   densa. Respaldo para grupos partidos en dos bolsones distantes.

Las tablas de anclas incluyen normalización de nombres sin tildes
(`_normalize_name`, `map_payload.py:190-193`), alias de cantones
(`CITY_ALIASES`, `map_payload.py:96-118`: "Distrito Metropolitano de Quito" →
"quito", "Eloy Alfaro (Duran)" → "duran", etc.) y nombres de presentación con
tildes (`CITY_DISPLAY_NAMES`, `map_payload.py:120-129`).

### 6.1 `bounds` y `expansion_zoom`

`bounds` se calcula con percentiles 5 y 95 en vez de min/max
(`BOUNDS_TRIM = 0.05`, `map_payload.py:531`, `:551-554`), para que un anuncio
mal geocodificado en otra provincia no obligue a la cámara a alejarse tanto que
los anuncios reales queden ilegibles (`map_payload.py:528-531`). Si el grupo
resulta más estrecho que `MIN_BOUNDS_SPAN = 0.0014` (~150 m) la caja se ensancha
hasta ese mínimo, porque una caja de ancho cero no tiene zoom que la encuadre
(`map_payload.py:532-534`, `:556-561`).

`expansion_zoom` conserva la traducción de esa extensión contra un lienzo
nominal de 1100×700 px, acotada a `[11.0, 16.5]`, como dato descriptivo. El
clic ya no lo usa para decidir el siguiente nivel: país, provincia y ciudad
avanzan a zoom 6, 8 y 12 respectivamente. El
comentario del código explica que en Ecuador, sobre el ecuador, un grado de
latitud y uno de longitud cubren casi los mismos píxeles Mercator, por lo que
ambos ejes se comparan directamente (`map_payload.py:481-486`).

### 6.2 Navegación territorial

Los niveles agrupados no se recortan por viewport: se calculan sobre todo el
inventario filtrado. El clic usa `anchor_latitude` y `anchor_longitude`; si no
existe un ancla conocida, el backend entrega el centro del inventario del grupo.
Después de ciudad se solicita directamente el modo `points`.

---

## 7. `polygon` y `show_measurements`

**El payload envía el polígono siempre, y `show_measurements` como un booleano
aparte.** No hay ninguna rama que suprima, redondee o simplifique la geometría
cuando `show_measurements` es `False`: `_point_payload` copia `polygon` y
`show_measurements` sin condición (`map_payload.py:275-276`).

Comprobación de las consecuencias en el cliente:

- `MapLibreMap.tsx` construye la colección de polígonos sin mirar
  `show_measurements` (`MapLibreMap.tsx:109-128`, `:155-173`), y la dibuja desde
  zoom 14 (`MapLibreMap.tsx:377`, `:387`). Un `grep` de `show_measurements` en
  todo `frontend/` devuelve solo `app/add-property/page.tsx`,
  `components/PropertyModal.tsx` y `lib/types.ts`: **el mapa de navegación nunca
  lee el campo**.
- Donde sí tiene efecto es al **dibujar**: en `DrawLocationMap` la prop
  `showMeasurements` decide únicamente si se pintan las etiquetas de longitud de
  cada lado (`DrawLocationMap.tsx:40`, `:134`, `:163-164`, `:276-290`,
  `:700`).
- Y en el detalle: con `show_measurements === false` el modal muestra la fila
  "Medidas: Referencia aproximada" (`PropertyModal.tsx:772`, `:778`).

Es decir, `show_measurements=False` es una promesa de UI ("las medidas son
referenciales"), **no** una ocultación de datos: el anillo exacto viaja al
navegador igualmente. Si eso se considera un problema de privacidad, hoy no está
resuelto en el backend.

En la UI de publicación, esta geometría se llama **"Forma del terreno"**
(`app/add-property/page.tsx:1047`, `:1617`, `:1763`).

---

## 8. `backend/real_estate/geo.py`

Módulo de validación y normalización geométrica. **No** contiene rejilla,
deduplicación geográfica ni cálculo de clusters: la rejilla y los buckets viven
íntegramente en `map_payload.py` (`map_payload.py:284-298`, `:377-422`), y la
deduplicación de anuncios es `Property.is_duplicate`, decidida en la ingesta, no
aquí (`models.py:143-146`). `map_payload.py` solo importa `coord_in_ecuador` de
este módulo (`map_payload.py:4`).

Lo que sí hace:

| Función | Qué hace | Cita |
|---|---|---|
| `coord_in_ecuador(lat, lng)` | Pertenencia a continente **o** Galápagos, como dos cajas separadas para que el océano intermedio no sea "Ecuador válido" | `geo.py:12-23`, `:43-53` |
| `polygon_area_m2(ring)` | Área aproximada por proyección equirrectangular centrada en la latitud media + fórmula del zapatero | `geo.py:56-80` |
| `polygon_self_intersects(ring)` | Detecta cruce entre lados no adyacentes | `geo.py:83-123` |
| `_extract_ring_latlng(value)` | Acepta GeoJSON `Polygon` (`[lng,lat]`) o anillo simple `[[lat,lng],…]` y normaliza a `[lat,lng]` | `geo.py:126-173` |
| `validate_and_normalize_polygon(value)` | Valida y devuelve GeoJSON `Polygon` canónico cerrado en orden `[lng,lat]` | `geo.py:176-227` |

Límites que impone la validación:

| Regla | Valor | Cita |
|---|---|---|
| Vértices distintos mínimos | 3 | `geo.py:193-197` |
| Todos los vértices dentro de Ecuador | — | `geo.py:200-204` |
| Sin auto-intersecciones | — | `geo.py:206-209` |
| Área mínima | 10 m² | `geo.py:28`, `:213-217` |
| Área máxima | 5 000 000 m² (500 ha) | `geo.py:29`, `:218-222` |

Caja de Ecuador continental: lat `[-5.45, 1.9]`, lng `[-81.35, -74.75]`;
Galápagos: lat `[-1.75, 1.85]`, lng `[-92.2, -88.45]` (`geo.py:15-23`). El
frontend replica exactamente los mismos números (`frontend/lib/geo.ts:10-14`,
`DrawLocationMap.tsx:46-48`).

El serializer invoca esta validación en `validate_polygon`
(`serializers.py:283-304`) y deriva el centro cuando falta lat/lng
(`serializers.py:60-62`, `:311`, `:323-326`).

---

## 9. Throttling del mapa

### 9.1 Configuración

```python
'DEFAULT_THROTTLE_RATES': {
    ...
    'map_points': '120/min',
    'property_list': '60/min',
    'property_write': '30/hour',
}
```
(`backend/estate_map/settings.py:171-182`)

El scope se asigna por acción en `PropertyViewSet.get_throttles`
(`views.py:285-299`): `map_points` → `map_points` con
`AntiScraperScopedThrottle`; `list` → `property_list`; escrituras →
`property_write`. Cualquier otra acción queda **sin** throttle, porque DRF solo
limita las vistas que declaran `throttle_scope` (`views.py:286-289`, y el
comentario de `settings.py:167-170`).

### 9.2 Por qué existe

El comentario en `settings.py:174-178` lo dice sin ambigüedad: son techos
**anti-scraper**. 120 peticiones por minuto está muy por encima del uso humano
—panear el mapa dispara un puñado de peticiones por minuto, no dos por
segundo— y también por encima de lo que hace un crawler educado. Limitan
**peticiones**, no indexación: Googlebot y similares se quedan holgadamente por
debajo. Refuerza la idea el docstring de `throttling.py:1-4`: "el catálogo
público está pensado para ser rastreado y leído; estos límites existen solo para
frenar bucles de scraping masivo, nunca para bloquear contenido".

Además, `frontend/app/robots.ts:35-38` bloquea `/api/` para crawlers: la API no
tiene contenido indexable, así que los rastreadores legítimos ni siquiera deberían
llegar a `map_points`.

### 9.3 Exenciones

`AntiScraperScopedThrottle.allow_request` (`throttling.py:42-51`) deja pasar sin
contar:

1. **Staff** (`request.user.is_staff`), que golpea las vistas admin en ráfagas
   (`throttling.py:46-47`, `:11`).
2. **Clientes internos** (`_is_internal_client`, `throttling.py:24-39`):
   - Si la petición trae `X-Forwarded-For`, **no** es interna: llegó por el proxy
     inverso público y se limita normalmente (`throttling.py:27-29`, `:12-15`).
   - Si no lo trae, se exime cuando `REMOTE_ADDR` está en
     `settings.THROTTLE_EXEMPT_IPS` (`throttling.py:33-34`) o es una dirección
     privada o de loopback (`throttling.py:35-39`).

El caso que esto resuelve está documentado en `throttling.py:6-10`: el servidor
Next.js que renderiza nuestras propias páginas llega por la red interna sin
`X-Forwarded-For`, así que todas las vistas SSR compartirían un único bucket y el
sitio entero empezaría a devolver 429 con tráfico normal.

`THROTTLE_EXEMPT_IPS` se lee de la variable de entorno homónima, separada por
comas (`settings.py:185-189`).

---

## 10. Caché

El payload del mapa se cachea en dos capas:

1. **Redis, del lado del servidor.** Clave versionada
   `map_points:v<N>:z<zoom>:n<limit>:<bbox>:<filtros>` (`views.py:600-606`), TTL
   `CACHE_TTL_MAP_POINTS = 120` segundos (`views.py:83`, `:627`). Solo se lee y
   se escribe para peticiones **anónimas** de lectura (`_is_public_read`,
   `views.py:92-94`, usado en `:607` y `:626`), de modo que una respuesta
   autenticada nunca se sirve desde —ni se escribe en— una entrada compartida
   (`views.py:69-73`).
2. **Navegador y CDN.** `Cache-Control: public, max-age=60, s-maxage=120`
   (`views.py:97-102`, constante `BROWSER_MAX_AGE = 60` en `views.py:89`).

La invalidación es por versión: `versioned_key` incrusta el contador `props:ver`
(`cache_utils.py:24`, `:70-72`) y cualquier `save`/`delete` de `Property` lo
incrementa vía señal (`signals.py:62-69`, `cache_utils.py:47-60`). Se hace así
porque las claves están parametrizadas por combinaciones de bbox y filtros que no
se pueden enumerar para borrarlas una a una (`cache_utils.py:4-10`).

Detalle completo del sistema de caché: [../technical/caching.md](../technical/caching.md).
*(Nota: a fecha de esta verificación, `docs/technical/caching.md` todavía no
existe en el repositorio — el directorio `docs/` se crea con este documento.)*

Hay además una tercera capa, en memoria del cliente: `usePropertyFilters`
mantiene un caché por clave de filtros+zoom y evita la petición cuando el bbox
pedido ya está contenido en un área ya traída (`usePropertyFilters.ts:160-165`,
`:332-363`). Por debajo de zoom 9.2 el área cacheada se registra como el mundo
entero, porque la respuesta ya cubre todo el dataset (`usePropertyFilters.ts:143-148`).

---

## 11. Reglas confirmadas por tests

`backend/real_estate/tests/test_map_payload.py` (4 tests) fija estas garantías:

| Test | Regla que fija | Cita |
|---|---|---|
| `test_polygon_without_stored_point_gets_a_map_pin_at_its_center` | Una propiedad sin lat/lng pero con polígono recibe un pin en el centro del anillo | `test_map_payload.py:29-57` |
| `test_city_cluster_sits_on_its_listings_not_on_the_canton_center` | El marcador del cluster de ciudad cae sobre sus anuncios (Cumbayá), no sobre las coordenadas oficiales de Quito, y coincide con una propiedad real | `test_map_payload.py:60-77` |
| `test_cluster_bounds_ignore_a_single_misplaced_listing` | Un anuncio geocodificado en otra provincia no dilata los `bounds`, y `expansion_zoom <= 16.5` | `test_map_payload.py:80-91` |
| `test_expansion_zoom_follows_how_spread_out_the_group_is` | Un grupo compacto obtiene mayor `expansion_zoom` que uno disperso | `test_map_payload.py:94-107` |

Los tests usan un `FakeQuerySet` que solo implementa `.values()`
(`test_map_payload.py:21-26`), lo que confirma que `build_map_payload` no depende
de nada más del ORM.

`backend/real_estate/tests/test_polygon_validation.py` cubre la normalización de
polígonos: anillo abierto `[lat,lng]` → GeoJSON cerrado `[lng,lat]`
(`test_polygon_validation.py:6-15`) y rechazo de polígonos auto-intersecantes
(`test_polygon_validation.py:18-25`).

**No hay tests** del endpoint `map_points` en sí (parámetros, caché, throttling):
`grep` de `map_points` bajo `backend/real_estate/tests/` no devuelve resultados.

---

## 12. Frontend

### 12.1 Estructura

| Archivo | Rol |
|---|---|
| `frontend/components/maps/maplibre-style.ts` | Estilo compartido por todos los mapas |
| `frontend/components/maps/MapLibreMap.tsx` | Mapa de navegación (consume `map_points`) |
| `frontend/components/maps/DrawLocationMap.tsx` | Dibujo de "Forma del terreno" al publicar |
| `frontend/components/maps/PropertyNearbyMap.tsx` | Mapa del detalle: la propiedad + cercanas |
| `frontend/components/map/LayerSwitch.tsx` | Conmutador calles / satélite |
| `frontend/components/map/MapLegend.tsx`, `MapFilters.tsx`, `MapPropertyCard.tsx`, `PropertySidebar.tsx`, `UserFilter.tsx` | Controles y panel lateral |
| `frontend/components/MapPageClient.tsx` | Página del mapa: estado, URL compartible, orquestación |
| `frontend/hooks/usePropertyFilters.ts` | Peticiones a `map_points` y a `/properties/` |
| `frontend/lib/geo.ts` | `isPointInEcuadorBounds`, `getPropertyPoint`, `distanceKm` |

`components/maps/` contiene los mapas; `components/map/` (singular) contiene los
controles y el panel que los rodean.

### 12.2 Estilo compartido

`buildMapStyle()` (`maplibre-style.ts:9-37`) es la única fuente de verdad del
mapa base: dos fuentes ráster, Carto Voyager (`maplibre-style.ts:14-24`) y Esri
World Imagery (`maplibre-style.ts:25-31`), con la capa satélite oculta por
defecto (`maplibre-style.ts:35`). `applyBaseLayer` alterna la visibilidad
(`maplibre-style.ts:41-44`). El centro de Ecuador se exporta en orden MapLibre
`[lng, lat]` (`maplibre-style.ts:47`). El comentario del archivo confirma que el
mapa de navegación, el de cercanas y el de dibujo comparten este estilo
(`maplibre-style.ts:3-8`).

### 12.3 Consumo del payload

`usePropertyFilters` construye la query con `filtersToApiParams`
(`usePropertyFilters.ts:99-124`), añade `zoom` y `limit`
(`usePropertyFilters.ts:379-380`) y lee `items`, `city_groups` y `context` del
JSON (`usePropertyFilters.ts:388-390`). Acepta también una respuesta que sea un
array plano o traiga `results` (`usePropertyFilters.ts:388`).

Protecciones contra parpadeo, todas verificables en el código:

- Debounce de 220 ms (`usePropertyFilters.ts:331`, `:411`).
- Al cambiar de bucket de zoom se limpian los clusters anteriores, porque
  arrastrarlos con la cámara parecía que el cluster clicado se cargaba dos veces
  (`usePropertyFilters.ts:336-345`).
- Spinner con retardo (400 ms sin datos previos, 900 ms con ellos)
  (`usePropertyFilters.ts:369-375`).
- Solo la petición vigente puede alternar `loading` (`usePropertyFilters.ts:374`,
  `:409`).

### 12.4 Render

`MapLibreMap` separa `items` en clusters (`is_cluster === true`) y puntos
(`MapLibreMap.tsx:242-249`).

**Clusters (siempre del backend).** Se dibujan como marcadores HTML, no como
capas GL. Antes de pintarlos se proyecta cada uno a píxeles y se descartan los
que solapan a otro de mayor prioridad —nivel de agrupación, tener etiqueta y
`count`— con radios de 50 px para country/province/city y 42 px para rejilla
(`MapLibreMap.tsx:71-77`, `:556-588`). Al hacer clic, la cámara encuadra
`cluster.bounds` con `maxZoom = expansion_zoom` acotado a `[11, 16.5]`
(`MapLibreMap.tsx:644`, `:656-665`); si la extensión es degenerada, cae al
`easeTo` sobre `focus_*` (`MapLibreMap.tsx:666-672`). El comentario explica por
qué: un centro y zoom fijos por nivel ignoran los filtros activos y abrían mapa
vacío (`MapLibreMap.tsx:651-655`).

**Clustering en cliente: no lo hay.** La fuente GeoJSON `properties` se declara
con `cluster: false` (`MapLibreMap.tsx:366`). Existen capas `property-clusters`
y `property-cluster-count` filtradas por `['has', 'point_count']`
(`MapLibreMap.tsx:394-430`) y un handler `clickCluster` que llama a
`getClusterExpansionZoom` (`MapLibreMap.tsx:503-520`), pero con `cluster: false`
MapLibre nunca genera features con `point_count`, así que esas capas y ese
handler no llegan a activarse. Además ambas capas están pintadas con opacidad 0
(`MapLibreMap.tsx:413-414`, `:429`). Todo el clustering visible viene del
backend.

**Puntos.** Doble representación: círculos GL hasta zoom 11.0 (que se desvanecen
entre 10.2 y 10.9, `MapLibreMap.tsx:431-444`) y marcadores HTML de precio a
partir de `HTML_MARKER_MIN_ZOOM = 10.5` (`MapLibreMap.tsx:53`, `:686-812`). Por
debajo de 10.5 solo se dibujan marcadores de las propiedades que además están en
el listado lateral (`is_card_result`), para no llenar el mapa
(`MapLibreMap.tsx:691-696`). Los marcadores se acotan por cantidad —de 70 a 320
según zoom y si la interacción es táctil (`MapLibreMap.tsx:703-713`)— y por
distancia mínima entre ellos (`MapLibreMap.tsx:714`), priorizando la propiedad
seleccionada, luego las del listado y luego el precio más alto
(`MapLibreMap.tsx:731-734`). Por debajo de zoom 12 el marcador muestra icono en
vez de precio (`MapLibreMap.tsx:753`).

**Polígonos.** Capas `property-polygons-fill` y `-line`, ambas con `minzoom: 14`
(`MapLibreMap.tsx:373-393`). Se acepta tanto GeoJSON como el anillo simple
`[lat,lng]`, y se descartan los vértices fuera de Ecuador
(`MapLibreMap.tsx:109-128`). Con una propiedad seleccionada, el resto de
polígonos se atenúa (`MapLibreMap.tsx:823-834`).

El cliente vuelve a validar cada coordenada con `isPointInEcuadorBounds` antes de
dibujar (`MapLibreMap.tsx:565`, `:596`, `:600`; `lib/geo.ts:10-14`), y deriva el
punto del polígono igual que el backend cuando falta lat/lng
(`lib/geo.ts:29-60`).

### 12.5 Panel lateral

`PropertySidebar` muestra la tarjeta "Vista actual" con `context.title` y
`context.total_count` mientras `group_level !== 'points'`
(`PropertySidebar.tsx:137`, `:297-308`), y una lista navegable de `city_groups`
(`PropertySidebar.tsx:311-320`). El clic sobre una ciudad encuadra sus `bounds`
(`MapPageClient.tsx:231-241`, `:93-109`).

Ningún componente del mapa muestra contadores de visitas: `views_count` no viaja
en el payload del mapa (`map_payload.py:7-18`) ni se renderiza en
`PropertySidebar.tsx`, `MapPropertyCard.tsx` ni `MapLibreMap.tsx`.

### 12.6 `DrawLocationMap` (dibujo de la Forma del terreno)

Mapa independiente, con MapLibre puro y `@turf/turf` para geometría
(`DrawLocationMap.tsx:2-11`). Comparte el estilo base
(`DrawLocationMap.tsx:11`).

- Dos modos: `'point'` y `'polygon'` (`DrawLocationMap.tsx:36`, `:130`).
- Máquina de estados de tres fases: `idle` → `drawing` (camino abierto) →
  `closed` (polígono editable) (`DrawLocationMap.tsx:141-142`).
- Validación en vivo (`polygonError`, `DrawLocationMap.tsx:50-66`), con los
  mismos criterios que el backend: coordenadas finitas, todas dentro de Ecuador
  (`DrawLocationMap.tsx:46-48`), ≥3 puntos distintos y sin cruces
  (`turf.kinks`, `DrawLocationMap.tsx:62-64`). Los mensajes hablan de "la forma",
  en línea con el nombre de UI.
- Edición táctil: vértices arrastrables, tocar el primero cierra el anillo
  (`DrawLocationMap.tsx:212-217`), clic derecho o pulsación larga de 600 ms borra
  un vértice (`DrawLocationMap.tsx:219-238`), y los manejadores de punto medio
  insertan un vértice al arrastrarlos (`DrawLocationMap.tsx:244-275`).
- Etiquetas de longitud por lado, calculadas con `turf.length`, solo si
  `showMeasurements` (`DrawLocationMap.tsx:276-290`).
- Puede pintar polígonos de referencia de otras propiedades, aceptando ambos
  formatos de anillo (`DrawLocationMap.tsx:68-90`).

---

## 13. Endpoints auxiliares que alimentan el mapa

| Endpoint | Qué devuelve | Caché | Cita |
|---|---|---|---|
| `GET /api/properties/owners/` | Propietarios con al menos una propiedad activa, para el filtro por usuario | Sin caché | `views.py:630-653` |
| `GET /api/properties/locations/` | Provincias y ciudades **presentes en el inventario activo**, con la grafía exacta que espera el filtro `iexact` | 1 h | `views.py:655-689`, `:80` |
| `GET /api/properties/catalog/` | Catálogo estable de provincias y cantones desde las tablas `Province`/`City`, más toda ciudad que alguna propiedad haya tenido. Existe para que una landing SEO responda 200 con estado vacío en lugar de 404 | 24 h | `views.py:691-737`, `:79` |
| `GET /api/properties/summary/` | Conteos agregados en SQL sobre todo el inventario filtrado (el listado tapa `page_size` en 2000 y congelaba los totales) | 10 min | `views.py:739-748`, `:81` |

`owners` y `locations` se apoyan solo en `status != 'inactive'`
(`views.py:638`, `:670`); a diferencia del mapa, **no** excluyen
`is_duplicate=True`.

---

## 14. Qué no existe (verificado)

- **No hay endpoints `clusters/`, `points/` ni `bbox/`.** El enrutado completo
  está en `backend/real_estate/urls.py:40-90` y el único acceso al mapa es
  `map_points` (`views.py:578-579`).
- **No hay clustering en cliente activo.** `cluster: false` en la fuente GeoJSON
  (`MapLibreMap.tsx:366`).
- **No hay Leaflet ni react-leaflet.** `frontend/package.json` solo declara
  `maplibre-gl` (`:38`) y `@turf/turf` (`:30`).
- **`MapPointPropertySerializer` no se usa.** Está definido en
  `serializers.py:367-389`, pero un `grep` de su nombre en todo `backend/` solo
  lo encuentra en su propia definición: el payload del mapa se construye a mano
  en `map_payload.py`, sin pasar por DRF.
- **`self.filter_queryset(...)` en `map_points` (`views.py:612`) es un no-op.**
  `PropertyViewSet` no declara `filter_backends` (a diferencia de
  `ProvinceViewSet`, `views.py:157`, y `CityViewSet`, `views.py:199`) y
  `settings.py` no define `DEFAULT_FILTER_BACKENDS` (`settings.py:161-183`).
  Todo el filtrado ocurre en `get_queryset`.
- **`show_measurements` no oculta el polígono en el mapa** (ver §7).
