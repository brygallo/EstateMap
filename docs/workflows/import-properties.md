# Importación de propiedades desde portales externos (app `ingesta`)

Verificado contra el código el 2026-08-04.

La app Django `backend/ingesta/` es el agregador: visita portales inmobiliarios,
normaliza cada anuncio y lo escribe como `Property` del catálogo público con
`owner = NULL` e `is_imported = True`. No hay API de socio ni dataset comprado:
todo sale del HTML/JSON que los portales sirven a un navegador.

Documentos relacionados: [reglas de negocio de propiedades](../business-rules/properties.md)
y [Celery](../technical/celery.md).

---

## 1. Estado de las fuentes hoy

| Fuente | Scraper en código | ¿Registrado? | Estado operativo |
|---|---|---|---|
| Plusvalía Ecuador | `backend/ingesta/scrapers/plusvalia.py:228` | Sí — importado en `backend/ingesta/scrapers/__init__.py:8` | **Única fuente activa** |
| Properati Ecuador | `backend/ingesta/scrapers/properati.py` | Sí — importado en `backend/ingesta/scrapers/__init__.py:7` | Purgada de producción y desactivada el 2026-08-03 (estado en base de datos, no en código) |
| RE/MAX Ecuador | `backend/ingesta/scrapers/remax.py:78` | **No** — el `import` está comentado en `backend/ingesta/scrapers/__init__.py:12` | Inactivo. Tiene el decorador `@register` (`remax.py:77`) pero, al no importarse el módulo, nunca entra al registro |

Matices verificados que conviene tener presentes:

- **La desactivación de Properati no está en el código.** El scraper sigue
  registrado, así que `_ensure_sources()` (`backend/ingesta/api.py:105-109`) lo
  vuelve a crear/actualizar como `Fuente` cada vez que el panel pide
  `GET /api/admin/ingesta/sources/`. Lo único que marca su desactivación es el
  flag `Fuente.activa` en la base (`backend/ingesta/models.py:21`).
- **`Fuente.activa` no gobierna nada del pipeline.** Su `help_text` dice "Si se
  incluye al correr `--all`", pero `ingesta_scrape --all` recorre
  `available_scrapers()`, es decir los scrapers registrados en código, no las
  fuentes activas (`backend/ingesta/management/commands/ingesta_scrape.py:42-50`).
  El flag solo se muestra (`admin.py:18`, `api.py:54`, `ingesta_sources.py:42`).
- **Los defaults de "source" siguen apuntando a Properati**: `ingesta_load`
  (`ingesta_load.py:28`) y el endpoint `launch` (`api.py:439`) usan
  `"properati"` cuando no se indica fuente. Hay que pasar `--source plusvalia` /
  `{"source": "plusvalia"}` de forma explícita.

### Cloudflare: el scraping ya corre EN producción

El scraper usa `curl_cffi` imitando el fingerprint TLS de Chrome Android:

- `backend/ingesta/scrapers/plusvalia.py:261` → `impersonate="chrome99_android"`
  dentro de `PlusvaliaScraper._client()`.
- `backend/ingesta/pipeline/images.py:27` → `_IMPERSONATE = "chrome99_android"`
  para descargar del CDN `naventcdn.com`, que está detrás del mismo Cloudflare.

El docstring del módulo (`plusvalia.py:27-48`) documenta la verificación: desde
IPs residenciales pasan varios fingerprints, pero **desde IPs de datacenter (el
servidor Contabo) Cloudflare bloquea todos los de escritorio y solo pasa
`chrome99_android`** (probado el 2026-07-20: chrome136, chrome131, safari184 y
firefox135 → 403; chrome99_android → 200). Si `curl_cffi` no está instalado,
ambos clientes degradan a `httpx` (`plusvalia.py:264-270`, `images.py:43-46`),
que recibirá 403 desde el servidor.

**Consecuencia operativa:** ya no hace falta el flujo "scrapear en local, subir
paquete, importar en prod". Producción puede correr `ingesta_load` (un solo paso)
directamente contra Plusvalía.

### Contradicción con `PLUSVALIA_IMPORT_RUNBOOK.md`

`PLUSVALIA_IMPORT_RUNBOOK.md` (raíz del repo, fechado 2026-07-08) dice en su
contexto: *"Cloudflare bloquea la IP de produccion en Contabo … El servidor no
debe llamar a Plusvalia"* y en sus notas finales *"No ejecutar la carga directa
desde el admin de produccion para Plusvalia"*. **Eso ya no es cierto**: quedó
superado por el cambio a `chrome99_android` (verificado el 2026-07-20, doce días
después del runbook). El runbook sigue siendo útil como historia del backfill
inicial (los 5.584 anuncios cargados por lotes entre el 2026-07-08 y el
2026-07-13) y como referencia del flujo de paquetes, que sigue existiendo en el
código; pero su premisa de red está obsoleta.

---

## 2. El pipeline por fases

Hay **dos caminos** que comparten el mismo tramo final (normalizar → validar →
deduplicar → escribir). El de un solo paso es el que se usa hoy.

```
 CAMINO A — UN SOLO PASO (ingesta_load / botón del admin / POST launch/)
 =======================================================================

   [0] ARRANQUE                        runner.run_load()            runner.py:185
       ├─ get_scraper(fuente.scraper_key) ......................... runner.py:189
       ├─ estado=running, started_at, heartbeat_at ................ runner.py:199-203
       ├─ _refresh_disponibles(): scraper.count_available() ....... runner.py:137-146
       └─ si solo_nuevas: _load_known_listings(fuente) ............ runner.py:149-172
              (IDs/URLs de Property importadas + ListingRetirada
               vistas hace < 30 días -> predicado skip_url)
                                   │
                                   v
   [1] LISTADOS                        scraper.scrape()          plusvalia.py:272
       ├─ round-robin entre las 6 búsquedas por defecto .......... plusvalia.py:79-86, 281-296
       ├─ paginación ?page=N hasta que no aporte URLs nuevas ..... plusvalia.py:349-385
       ├─ _records_from_listing(): {external_id -> coords,
       │    address, city, province} leídos del JSON SSR ......... plusvalia.py:387-420
       └─ skip_url(url, external_id) -> saltar conocido;
            120 conocidos seguidos = "franja histórica",
            se cierra esa categoría ............................... plusvalia.py:244, 310-316
                                   │
                                   v
   [2] FICHA                           _scrape_detail/_parse_detail  plusvalia.py:560,578
       ├─ _fetch con curl_cffi (chrome99_android) ................ plusvalia.py:249-270, 422
       ├─ backoff exponencial 15s..300s ante 403/429 ............. plusvalia.py:452-480
       ├─ 3 bloqueos seguidos -> ScraperBlocked .................. plusvalia.py:238, 482-492
       ├─ 404/410, redirect fuera de /propiedades/ o
       │    postingStatus != "ONLINE" -> "GONE" + on_gone() ...... plusvalia.py:434-440, 572-575
       └─ devuelve el dict canónico (contrato en base.py:9-25)
                                   │
                                   v
   [3] RETIRADA / RESUCITACIÓN         runner.py:226-240, 259-264
       ├─ on_gone -> retire_listing(): audita ListingRetirada y
       │    BORRA la Property + sus imágenes .................... retirement.py:10-32
       └─ si el anuncio reaparece: se borra su ListingRetirada .. runner.py:259-264
                                   │
                                   v
   [4] UBICACIÓN                       validate_location()        location.py:19-33
       ├─ sin lat/lng -> "sin_coordenadas"    \  ambos suman a
       └─ fuera del bbox EC -> "fuera_de_ecuador" > run.sin_ubicacion
          (bbox continental + Galápagos: real_estate/geo.py:43-53)
                                   │
                                   v
   [5] PRECIO                          sanitize_price()      normalize.py:100-122
       venta < $1.000, alquiler < $20/mes o > $50M -> price=None
       ("a consultar"), nunca se descarta el anuncio ....... normalize.py:95-97
                                   │
                                   v
   [6] HUELLA DE IMAGEN                image_dhash_from_url()  images.py:70-96
       dHash 8x8 de la PRIMERA imagen -> hex de 16 chars
                                   │
                                   v
   [7] DEDUP                           upsert_property()        upsert.py:56
       ├─ ¿existe (source, external_id)? -> UPDATE ............. upsert.py:98-99
       └─ si no: find_duplicate() contra OTRAS fuentes ......... dedup.py:55-106
             ├─ duplicado con teléfono nuevo y el viejo sin él
             │     -> se crea el nuevo y luego se borra el viejo  upsert.py:115-121, 180-183
             └─ en cualquier otro caso -> "skipped_duplicate"    upsert.py:122-123
                                   │
                                   v
   [8] ESCRITURA                       _apply_fields() + save()  upsert.py:23-53, 131-150
       IntegrityError por carrera en (source, external_id)
       -> se recupera la fila y se convierte en UPDATE ......... upsert.py:137-150
                                   │
                                   v
   [9] IMÁGENES                        attach_images_from_urls()  images.py:99-148
       ├─ máx. 10 por anuncio (MAX_IMAGES_PER_PROPERTY) ........ images.py:21
       ├─ descarga a memoria -> publish_optimized (WebP + thumb)
       │     -> MinIO -> libera el buffer ..................... images.py:137-147
       ├─ solo borra las anteriores tras confirmar ≥1 descarga . images.py:130-134
       └─ 0 imágenes adjuntas y la propiedad era nueva
             -> rollback (prop.delete()) y "skipped_no_images" . upsert.py:158-176
                                   │
                                   v
  [10] EFECTOS SECUNDARIOS (señales de real_estate, ver §8)
       bump props:ver  ·  revalidate Next (Celery)  ·  IndexNow
                                   │
                                   v
  [11] CIERRE                         runner.py:302-332
       estado done/cancelled/error, log volcado,
       fuente.last_scrape_at y last_import_at si terminó bien


 CAMINO B — PAQUETE (scrapear en un sitio, importar en otro)
 ===========================================================

   LOCAL: ingesta_scrape                      PRODUCCIÓN: ingesta_import
   ─────────────────────                      ─────────────────────────
   fases [1]-[4] iguales                      PaqueteReader.validate()   packaging.py:103
        │                                          │  (manifiesto + JSONL +
        v                                          │   external_id únicos)
   ListingCruda.update_or_create()                 v
        (auditoría del payload)               fases [5]-[10], mismo
   download_images() -> disco                 upsert_property() pero con
        │                                     reader= en vez de image_urls=
        v                                          │
   paquetes/<slug>-<fecha>/                        v
     manifest.json                           sync_property_images() lee
     listings.jsonl                          las imágenes del paquete
     images/<external_id>/0.jpg              en disco     images.py:151-181
```

### Los tres modos de un `IngestaRun`

`execute()` despacha por `run.modo` (`runner.py:175-182`); los modos están
declarados en `models.py:61-65`.

| `modo` | Función | Qué hace | Cómo se lanza |
|---|---|---|---|
| `load` | `run_load` (`runner.py:185`) | Recorre los listados y crea/actualiza. Con `solo_nuevas=True` salta lo conocido y avanza por tandas | CLI, admin de Django, `POST launch/` |
| `refresh` | `run_refresh` (`runner.py:467`) | Re-visita **cada** `Property` ya importada con `scrape_one`, actualiza sus datos y retira las que ya no existen | `ingesta_load --refresh`, `POST launch/ {"modo":"refresh"}` |
| `verify` | `run_verify` (`runner.py:337`) | Solo comprueba vigencia (`check_many`), sin datos ni imágenes. Visita primero las de `last_seen_at` más antiguo y sella las vivas, así que un run interrumpido reanuda donde quedó | **Solo** `POST launch/ {"modo":"verify"}` — no hay flag CLI para este modo |

Robustez del runner, verificada:

- `RunLogger` (`runner.py:45-77`) persiste las últimas 300 líneas en `run.log` y
  refresca `heartbeat_at` como máximo cada 10 s.
- `reap_zombie_runs` (`runner.py:80-104`) marca en `error` los runs sin señal de
  vida durante más de 10 minutos (`STALE_AFTER`, `runner.py:34`). Se invoca de
  forma perezosa desde los endpoints, no hay cron.
- Un anuncio corrupto no tumba el run: se cuenta en `run.errores`
  (`runner.py:286-289`).
- La cancelación se pide con una marca en base (`cancel_requested`) y el proceso
  la lee en su checkpoint cada 10 anuncios (`runner.py:291-300`).
- En modo `verify`, un bloqueo de Cloudflare no aborta: enfría 8 minutos y
  reanuda, hasta 4 veces (`runner.py:40-42, 424-436`).

---

## 3. Comandos de gestión

Todos viven en `backend/ingesta/management/commands/`. En producción el
contenedor se llama `estatemap_backend`; en local se usa `docker compose exec
backend`.

| Comando | Argumentos reales | Qué hace | Ejemplo |
|---|---|---|---|
| `ingesta_load` (`ingesta_load.py:27-37`) | `--source` (str, default `properati`), `--limit` (int), `--no-images`, `--only-new`, `--refresh`, `--run-id` (int) | Flujo de un solo paso: scrape → base → MinIO. Crea un `IngestaRun` y llama a `execute()`. Con `--run-id` continúa un run creado por el admin | `docker exec estatemap_backend python manage.py ingesta_load --source plusvalia --only-new --limit 500` |
| `ingesta_scrape` (`ingesta_scrape.py:28-40`) | `--source` (str), `--all`, `--out` (ruta), `--limit` (int), `--dry-run`, `--no-images`, `--skip-known` | Genera un **paquete** en disco (`manifest.json` + `listings.jsonl` + `images/`). Guarda además cada payload crudo en `ListingCruda`. Sin `--out`, escribe en `paquetes/<slug>-<YYYY-MM-DD>` | `docker compose exec backend python manage.py ingesta_scrape --source plusvalia --limit 250 --skip-known --out paquetes/plusvalia-057` |
| `ingesta_import` (`ingesta_import.py:26-34`) | `paquete` (posicional, obligatorio), `--expire`, `--limit` (int), `--validate-only` | Importa un paquete. Valida siempre antes de tocar la base. `--expire` retira lo que no venga en el paquete y es incompatible con `--limit` (`ingesta_import.py:54-55`) | `docker exec estatemap_backend python manage.py ingesta_import /tmp/plusvalia-057 --validate-only` y luego sin el flag |
| `ingesta_sources` (`ingesta_sources.py:20-22`) | `--activate SLUG`, `--deactivate SLUG` | Lista scrapers registrados y fuentes en base; conmuta `Fuente.activa` (que, como se explicó, hoy es solo informativo) | `docker exec estatemap_backend python manage.py ingesta_sources --deactivate properati` |
| `ingesta_stats` (`ingesta_stats.py:17`) | (ninguno) | Por fuente: total, activas, con precio, con área, con imágenes, con inmobiliaria | `docker exec estatemap_backend python manage.py ingesta_stats` |

Notas de uso verificadas:

- `ingesta_load --refresh` produce `modo="refresh"`; **no existe** un flag para
  `modo="verify"` (`ingesta_load.py:52-57`).
- `ingesta_scrape --all` recorre todos los scrapers **registrados**, no las
  fuentes activas (`ingesta_scrape.py:42-44`).
- `--skip-known` une cuatro conjuntos: `ListingCruda` (URLs e IDs),
  `Property` de esa fuente y `ListingRetirada` (`ingesta_scrape.py:79-124`).
  A diferencia del incremental del runner, aquí **no** hay ventana de 30 días:
  una retirada se salta para siempre mientras la fila exista.

### El formato de paquete

Definido en `backend/ingesta/packaging.py:19-22`. Ejemplo real en el repo:
`backend/paquetes/plusvalia-056/` (`manifest.json` con `formato: 1` y `total: 2`,
`listings.jsonl`, y `images/150575806/`, `images/150576140/`).

```
<paquete>/
  manifest.json      # {fuente:{slug,nombre,base_url}, total, formato:1, generado, descartados_*}
  listings.jsonl     # un dict canónico por línea
  images/<external_id>/0.jpg, 1.jpg, ...
```

Sirve para **desacoplar el scraping de la escritura**: se scrapea en un entorno
(el que tenga salida de red aceptada por el portal) y se importa en otro. El
paquete es autocontenido y portátil; `PaqueteReader.validate()`
(`packaging.py:103-129`) comprueba antes de escribir nada que el manifiesto
declare el formato soportado, que el total cuadre con las líneas del JSONL, que
todas las líneas sean objetos JSON válidos, que cada uno traiga `external_id` y
que no haya `external_id` repetidos. Reimportar el mismo paquete es idempotente
porque la clave lógica es `(source, external_id)`.

---

## 4. Mapeo campo a campo: anuncio externo → `Property`

El punto único de escritura es `_apply_fields` (`backend/ingesta/pipeline/upsert.py:23-53`).
La columna "origen en Plusvalía" corresponde a `_parse_detail`
(`plusvalia.py:578-733`).

| Campo de `Property` | Origen en el dict canónico | Origen en Plusvalía | Transformación |
|---|---|---|---|
| `owner` | — | — | **Nunca se toca: queda `NULL`.** Ninguna ruta de la ingesta asigna owner |
| `is_imported` | — | — | Siempre `True` (`upsert.py:45`) |
| `source` | — | — | La `Fuente` del run (`upsert.py:41`) |
| `external_id` | `external_id` | ID numérico del final de la URL `…-<ID>.html` (`plusvalia.py:92, 579-580`) | Recortado a 120 chars |
| `source_url` | `source_url` | `og:url` o la URL de la ficha (`plusvalia.py:711`) | Recortado a 500. Es el **contacto fallback** cuando no hay teléfono ni email (`real_estate/models.py:124-136`) |
| `source_agency` | `source_agency` | `'name'` contiguo a `publisherId` en el dataLayer (`plusvalia.py:131-133, 690-691`) | `clean_text`, 150 chars |
| `title` | `title` | `og:title` sin el sufijo ", Provincia de X" / " - Plusvalía" (`plusvalia.py:582-584`) | `clean_text`, 150 chars |
| `description` | `description` | `<div id="reactDescription">`, con fallback a `og:description` (`plusvalia.py:637-641`) | `clean_description`: quita HTML, decodifica entidades, repara mojibake y elimina los CTA "Leer descripción completa" (`normalize.py:160-177`, `plusvalia.py:165-168`) |
| `property_type` | `property_type` | Título + categoría + URL (`plusvalia.py:586`) | `map_property_type` por palabras clave → `land`/`apartment`/`house`/`commercial`/`other` (`normalize.py:13-37`). Default `land` si falta (`upsert.py:29`) |
| `status` | `status` | `pricesData` por operación (`plusvalia.py:595-611`) | Venta gana: si hay ambos precios → `for_sale`; solo alquiler → `for_rent`. Default `for_sale` |
| `price` | `price` | `prices[].amount` de la operación de venta | `parse_price` (miles/decimales EC) → `sanitize_price`. **Fuera de rango → `NULL` = "a consultar"** (`normalize.py:95-122`), el anuncio se publica igual |
| `rent_price` | `rent_price` | Monto de la operación de alquiler cuando el anuncio es venta **y** alquiler (`plusvalia.py:598-604`) | Mismo saneamiento con umbral de alquiler |
| `area` | `area` | `mainFeatures.CFT100` (superficie total), con fallback al caption "Tipo · N m²" y al título (`plusvalia.py:621-630`) | `parse_area` |
| `built_area` | `built_area` | `mainFeatures.CFT101` (superficie cubierta) | `None` si `property_type == "land"` (`plusvalia.py:631`) |
| `rooms` | `rooms` | `mainFeatures.CFT2` | `parse_int`, `0` si falta |
| `bathrooms` | `bathrooms` | `CFT3` + `CFT4` (baños + medios baños) (`plusvalia.py:619-620`) | `parse_int`, `0` si falta |
| `latitude` / `longitude` | `latitude` / `longitude` | `postingGeolocation.geolocation` — **prioridad: listado sobre ficha** (`plusvalia.py:665-682`) | `validate_location`: sin coordenadas o fuera del bbox de Ecuador el anuncio **no entra** |
| `address` | `address` | Dirección + zona del listado, con fallback al DOM de la ficha (`plusvalia.py:646-663`) | `clean_text`, 255 chars |
| `city` | `city` | Etiqueta `CIUDAD` del listado (`plusvalia.py:111`) | `clean_text`, 100 chars |
| `province` | `province` | Etiqueta `PROVINCIA` del listado, con fallback al título | `clean_text`, 100 chars |
| `contact_phone` | `contact_phone` | `'whatsApp'` del dataLayer (`plusvalia.py:128, 685-688`) | Solo dígitos y `+`, 20 chars. `'partialPhone'` (enmascarado) se ignora |
| `contact_email` | `contact_email` | Plusvalía no lo publica: siempre `""` (`plusvalia.py:729`) | 254 chars |
| `source_published_at` | `source_published_at` | `datePosted`/`datePublished`/`dateCreated`/`article:published_time` (`base.py:78`) | Solo se asigna si viene con valor (`upsert.py:46-47`). **Nunca se inventa** |
| `source_updated_at` | `source_updated_at` | `dateModified`/`dateUpdated`/`article:modified_time` (`base.py:79`) | Igual que el anterior (`upsert.py:48-49`) |
| `dedup_key` | — | — | `build_dedup_key(lat, lng)` = `"lat,lng"` redondeado a 4 decimales ≈ rejilla de 11 m (`normalize.py:141-148`) |
| `image_hash` | `image_hash` | dHash de la primera imagen (`upsert.py:94-95`) | 32 chars máx. Solo se calcula en el flujo directo |
| `imported_at` | — | — | `timezone.now()` solo al crear (`upsert.py:128-129`) |
| `last_seen_at` | — | — | `timezone.now()` en cada escritura (`upsert.py:53`); en modo `verify` se sella por lote (`runner.py:421`) |
| `is_duplicate` / `duplicate_of` | — | — | **La ingesta actual nunca los escribe.** Existen en el modelo (`real_estate/models.py:145-153`) y se leen para filtrar (`dedup.py:75`, `api.py:56`), pero el pipeline resuelve los duplicados omitiendo o borrando, no marcando |

Campos que el scraper produce y el upsert **no** persiste: `image_urls` (se extrae
antes con `data.pop`, `runner.py:271`) y `search`/categoría, que solo guían el
parseo.

---

## 5. Deduplicación

Hay dos niveles, y son independientes.

### Nivel 1 — misma fuente: `(source, external_id)`

Es la clave lógica. `upsert_property` busca primero
`Property.objects.filter(source=fuente, external_id=external_id)`
(`upsert.py:98-99`); si existe, actualiza. La base lo respalda con una
`UniqueConstraint` condicionada a `is_imported=True`
(`real_estate/models.py:185-188`), y el upsert captura el `IntegrityError` de una
carrera para convertir el INSERT fallido en UPDATE (`upsert.py:131-150`).
Reimportar el mismo paquete N veces produce N-1 `updated`, nunca filas nuevas.

### Nivel 2 — entre fuentes distintas: `find_duplicate`

`backend/ingesta/pipeline/dedup.py:55-106`. Solo se ejecuta cuando el nivel 1 no
encontró nada, y **excluye la propia fuente** (`exclude_source_id=fuente.id`,
`upsert.py:112`). El universo de candidatos son las `Property` con
`is_imported=True, is_duplicate=False` (`dedup.py:75`).

Las señales, en orden de aplicación:

1. **Misma huella de imagen** (`dedup.py:80-83`). Si el `image_hash` coincide
   exactamente, es duplicado, sin mirar ubicación ni precio. El hash es un
   **dHash** perceptual (`images.py:70-96`): se descarga la primera imagen, se
   pasa a escala de grises, se reescala a 9×8 con LANCZOS y se compara cada
   píxel con su vecino de la derecha; los 64 bits resultantes se serializan como
   16 caracteres hex. Es robusto a reescalados y recompresión, así que la misma
   foto en dos portales da el mismo hash. La comparación es **igualdad exacta**,
   no distancia de Hamming.
2. **Proximidad < 30 m con área compatible** (`dedup.py:99-101`). Se prefiltra
   con un bounding box de ±500 m sobre `latitude`/`longitude` (índices B-tree, no
   hay PostGIS) y se confirma con haversine en Python (`dedup.py:86-98`). "Área
   compatible" = ±10 % (`AREA_TOLERANCE`) o que a alguno le falte el área.
3. **Área ±3 % y precio ±3 % dentro de 500 m** (`dedup.py:102-105`). Cubre el
   caso del mismo lote con el pin desplazado entre portales. Exige que
   **ambos** atributos coincidan, para no fusionar lotes vecinos de un mismo
   proyecto.

El **teléfono no se usa como señal** y está documentado el porqué
(`dedup.py:59-61`): una inmobiliaria tiene un número y muchas propiedades
distintas, así que uniría anuncios diferentes.

### Quién gana el empate

Decidido en `upsert.py:114-123`:

- Si el anuncio **nuevo trae teléfono y el existente no**, gana el nuevo: se crea
  la fila nueva y solo **después** de que quede completa (con sus imágenes) se
  borran el registro anterior y sus archivos (`upsert.py:180-183`). El comentario
  del código lo resume: "el anuncio CON WhatsApp gana".
- En cualquier otro caso (empate, o el existente ya tiene contacto) **gana el
  existente**: se devuelve `skipped_duplicate` y el nuevo no se escribe.

`dedup_key` **no** es el mecanismo de deduplicación: es solo la huella de rejilla
de ~11 m que se guarda para acelerar consultas. Que se repita entre filas no es
un bug (lo confirma también `PLUSVALIA_IMPORT_RUNBOOK.md`, sección "Validacion de
no-duplicados").

**Estado real hoy:** con Plusvalía como única fuente y `exclude_source_id`
excluyendo la propia fuente, el nivel 2 no tiene contra qué comparar. En la
práctica solo opera el nivel 1. El nivel 2 volverá a activarse en cuanto haya una
segunda fuente escribiendo.

---

## 6. Caducidad y retirada de anuncios

No hay "marcado como inactivo" en el flujo actual: un anuncio que el portal
confirma como desaparecido **se borra** del catálogo, y solo queda una fila de
auditoría.

`retire_listing` (`backend/ingesta/pipeline/retirement.py:10-32`), atómico:

1. `ListingRetirada.update_or_create(fuente, external_id)` con la URL y el
   `http_status`.
2. Busca la `Property` por `(source, external_id, is_imported=True)`.
3. `delete_property_images(prop)` (borra también los objetos en MinIO) y
   `prop.delete()`.

`retire_property(prop)` (`retirement.py:35-48`) es el envoltorio que se llama
desde el runner y desde el admin. **Nunca borra publicaciones de usuarios**: si
`prop.is_imported` es falso, devuelve `None` sin tocar nada (`retirement.py:36-37`).

Qué dispara una retirada:

| Detección | Dónde | Modo |
|---|---|---|
| HTTP 404/410 en la ficha | `plusvalia.py:434-436` | `load`, `scrape` |
| Redirect fuera de `/propiedades/` | `plusvalia.py:437-440`, `plusvalia.py:508` | `load`, `refresh`, `verify` |
| `postingStatus != "ONLINE"` en el JS inline (el aviso finalizado sigue devolviendo HTTP 200) | `plusvalia.py:162, 572-575, 511-513, 545-546` | todos |
| `scrape_one` devuelve `"GONE"` | `runner.py:514-519` | `refresh` |
| `check_many` devuelve `False` | `runner.py:397-402` | `verify` |
| `--expire` en un paquete completo | `ingesta_import.py:94-104` | paquete |

`ListingRetirada` (`models.py:139-164`) cumple dos funciones: evita que un run
incremental vuelva a abrir la misma ficha muerta, y su ID cuenta para la racha
histórica que corta una categoría. Pero la retirada **caduca**: pasados 30 días
(`RETIRED_RECHECK_AFTER`, `runner.py:35`) deja de considerarse conocida y el
siguiente run incremental la vuelve a comprobar (`runner.py:156-159`). Y si el
anuncio reaparece con datos, su `ListingRetirada` se borra al vuelo
(`runner.py:259-264`, `ingesta_scrape.py:139-142`).

`last_seen_at` tiene dos usos distintos:

- Se sella en **cada escritura** (`upsert.py:53`).
- En modo `verify` es además el **cursor de reanudación**: la consulta ordena por
  `last_seen_at` ascendente con nulos primero (`runner.py:377`) y sella por lote
  las confirmadas vivas (`runner.py:418-421`). Un run cortado por bloqueo o
  cancelación reanuda exactamente donde quedó al relanzarse.

---

## 7. API de administración y panel

Rutas montadas en `backend/real_estate/urls.py:79-87`, todas con
`IsAuthenticated + IsAdminUser` (`api.py:112-113` y siguientes). Las consume el
panel de Next en `frontend/app/admin/ingesta/page.tsx`, salvo
`refresh-property/`, que usa `frontend/components/AdminRefreshProperty.tsx`.

| Endpoint | Método | Qué hace | Función |
|---|---|---|---|
| `/api/admin/ingesta/sources/` | GET | Fuentes + estadísticas + salud (`running`/`error`/`never`/`stale`/`healthy`) y último run. Además crea/actualiza las `Fuente` desde los scrapers registrados | `api.py:112-117` |
| `/api/admin/ingesta/runs/` | GET | Últimas ejecuciones; filtros `source`, `status`, `limit` (máx. 200) | `api.py:120-136` |
| `/api/admin/ingesta/runs/<id>/` | GET | Detalle de un run (incluye `log` y `error_detail`) | `api.py:139-146` |
| `/api/admin/ingesta/launch/` | POST | Lanza un run: `{source, limit, only_new, modo}`. Devuelve 409 si ya hay uno activo. Es **la única vía** para `modo="verify"` | `api.py:436-482` |
| `/api/admin/ingesta/cancel/` | POST | Marca `cancel_requested` por `run_id` o por `source` | `api.py:149-175` |
| `/api/admin/ingesta/properties/` | GET | Lista paginada (20/página) de importadas por fuente; filtros `estado` y `q` | `api.py:191-262` |
| `/api/admin/ingesta/refresh-property/` | POST | Re-scrapea **una** propiedad síncronamente, forzando la re-descarga de imágenes. Si el aviso ya no está, la retira | `api.py:372-433` |
| `/api/admin/ingesta/maintenance/` | GET | Recuento y muestra de candidatos a limpieza por categoría | `api.py:313-323` |
| `/api/admin/ingesta/maintenance/cleanup/` | POST | Borra un lote acotado (1-200). Exige `confirmation == "ELIMINAR IMPORTADAS"` y deja traza `admin_audit` en el log | `api.py:326-369` |

Las cuatro categorías de mantenimiento son `duplicates`, `inactive`,
`missing_location` y `orphan_source` (`api.py:265-286`); todas parten de
`is_imported=True`, y el bucle repite la comprobación fila a fila
(`api.py:352-354`) para que una publicación de usuario no pueda entrar nunca.

Desde el **admin de Django** (`backend/ingesta/admin.py`):

- `Fuente`: botones "Cargar 500 más" (`?limit=500&nuevas=1`) y "Ejecutar todo",
  que crean el `IngestaRun` y lanzan el subproceso (`admin.py:35-87`). También
  bloquean dos corridas simultáneas de la misma fuente (`admin.py:60-67`).
- `IngestaRun`: solo lectura, sin alta manual, con estado coloreado, progreso,
  duración y la acción masiva "Cancelar ejecuciones seleccionadas"
  (`admin.py:90-131`).
- `ListingCruda`: consulta de payloads crudos (`admin.py:134-139`).

`launch_subprocess` (`runner.py:126-134`) arranca
`python manage.py ingesta_load --run-id <id>` con `start_new_session=True` y la
salida a `/dev/null` — por eso el log útil es el que `RunLogger` persiste en
`run.log`, no el stdout del proceso.

---

## 8. Efectos secundarios de una importación

La ingesta no invalida cachés por su cuenta: escribe `Property` y las **señales
de `real_estate`** hacen el resto (`backend/real_estate/signals.py`). Como cada
anuncio se guarda uno a uno, **cada** creación, actualización o borrado dispara
esta cadena.

1. **Caché Redis** — `bump_props_version()` (`signals.py:26`, `signals.py:64,69`)
   hace `INCR` sobre `props:ver` (`real_estate/cache_utils.py:24,47`). Todas las
   claves versionadas dejan de ser direccionables de golpe; no hay barrido de
   claves. Guardar o borrar una `PropertyImage` también lo dispara
   (`signals.py:72-80`).
2. **Revalidación de Next** — dentro de `transaction.on_commit`, se encola la
   tarea Celery `revalidate_frontend_tags(["properties", f"property-{id}"])`
   (`signals.py:28-43`, `real_estate/tasks.py:155`). Va por `on_commit` a
   propósito: la tarea vuelve a leer la API, así que dispararla dentro de la
   transacción reconstruiría la página con el estado anterior. Si el broker está
   caído, se registra un warning y la página se queda con su TTL: **la
   importación no falla** (`signals.py:33-41`). Requiere `NEXT_REVALIDATE_URL` y
   `REVALIDATE_SECRET` (`estate_map/settings.py:499-503`); sin ellos, se omite en
   silencio (`tasks.py:164-167`).
3. **IndexNow** — `submit_property(pk, city=...)` en alta/actualización y también
   en borrado (`signals.py:46-59`, `real_estate/services/indexnow.py`). En el
   borrado es deliberado: el buscador recrawlea, recibe el 404/410 y saca la URL
   del índice antes.

Ojo con el volumen: una carga de miles de anuncios genera miles de bumps de
versión y miles de tareas de revalidación. No hay agrupación por run.
`CELERY_BEAT_SCHEDULE` (`settings.py:429-437`) **no** contiene ninguna tarea de
ingesta: no hay importación programada, todo se lanza a mano o desde el panel.

---

## 9. Operación y diagnóstico

### Una importación no trae nada: qué mirar, en orden

1. **¿El run terminó en `error` con `current_stage = "bloqueado por el portal"`?**
   Es Cloudflare. `run.mensaje` lleva el texto de `ScraperBlocked`. Causas
   verificables: `curl_cffi` no instalado en la imagen (el cliente cae a `httpx`,
   `plusvalia.py:264-270`), o el fingerprint dejó de funcionar. Comprobación
   rápida dentro del contenedor:
   `docker exec estatemap_backend python -c "import curl_cffi; print(curl_cffi.__version__)"`.
   Recordatorio: desde el servidor **solo** pasa `chrome99_android`
   (`plusvalia.py:43-48`).
2. **¿`vistos` es 0 pero `revisados` y `saltados` son altos?** El run incremental
   está saltando todo lo conocido. Es el comportamiento correcto de
   `solo_nuevas`: `_load_known_listings` cargó los IDs conocidos y el log lleva la
   línea `[incremental] N IDs conocidos (M retirados)` (`runner.py:221-224`).
   Si además aparece `franja histórica alcanzada`, la categoría se cerró tras 120
   conocidos seguidos (`plusvalia.py:244, 310-316`). Para forzar un barrido
   completo, lanzar sin `--only-new`.
3. **¿`sin_ubicacion` se lleva todo?** El anuncio no traía coordenadas en el
   listado ni en la ficha, o caían fuera del bbox de Ecuador
   (`location.py:19-33`). La ingesta **no geocodifica**: solo existe el gancho
   opcional `PLUSVALIA_GEOCODE=1` con Nominatim, desactivado por defecto
   (`plusvalia.py:63-65, 678-680`). Un cambio en el marcador
   `postingGeolocation` del portal se manifiesta así.
4. **¿`errores` alto sin bloqueo?** Cada línea `[item] error en …` del `run.log`
   trae el tipo de excepción (`runner.py:286-289`). Ojo: los anuncios omitidos
   por no poder adjuntar ninguna imagen **también** suman a `errores`
   (`runner.py:282-283`), y su línea es `[imagenes] … omitido`. Si son masivos,
   suele ser el CDN `naventcdn.com` bloqueando (mismo problema de fingerprint,
   `images.py:24-27`).
5. **¿El run se quedó en `running` para siempre?** El watchdog lo marca en
   `error` con `current_stage = "watchdog"` tras 10 minutos sin heartbeat, pero
   solo se ejecuta de forma perezosa: hay que **abrir el panel** (`sources/`,
   `runs/`) o intentar lanzar otro run para que corra `reap_zombie_runs`
   (`runner.py:80-104`, `api.py:116,123,142,452`).
6. **¿`launch/` devuelve 409?** Ya hay un run `pending`/`running` de esa fuente
   (`api.py:454-460`). Cancelarlo o esperar; la cancelación se aplica en el
   siguiente checkpoint, cada 10 anuncios.
7. **¿El paquete no importa nada?** `ingesta_import` valida antes de escribir:
   correr con `--validate-only` da el error exacto (manifiesto ilegible, total
   descuadrado, línea JSON inválida, `external_id` faltante o repetido)
   (`packaging.py:103-129`).
8. **¿Se importó pero no se ve en el sitio?** Es caché/revalidación, no ingesta.
   Comprobar que `NEXT_REVALIDATE_URL` y `REVALIDATE_SECRET` estén puestos
   (`settings.py:499-503`) y que el worker de Celery esté vivo; sin ellos, la
   invalidación de Redis sí ocurre pero la página de Next espera a su TTL.

### Señales de salud

- `GET /api/admin/ingesta/sources/` calcula `health` por fuente: `stale` cuando
  `last_import_at` tiene más de 2 días (`api.py:36-45`).
- `docker exec estatemap_backend python manage.py ingesta_stats` da el desglose
  de calidad (con precio / con área / con imágenes / con inmobiliaria).
- Un `Fuente.disponibles` muy por encima del total importado indica que quedan
  anuncios por traer; se refresca al inicio de cada run `load`/`refresh`
  (`runner.py:137-146`, `plusvalia.py:548-558`).

### Ritmo esperado

`request_delay = 1.5 s` con jitter de ±30 % (`plusvalia.py:234`, `base.py:165-171`).
Ante 403/429 el backoff es exponencial de 15 s a 300 s, respetando `Retry-After`
(`plusvalia.py:239-240, 452-480`). El histórico del runbook registró lotes de 100
anuncios entre 7,5 min y ~57 min según el throttling del portal: **un run lento
no es un run colgado** mientras el `heartbeat_at` avance.

---

## 10. Reglas que confirman los tests

Los tests viven en `backend/ingesta/tests/`. Se ejecutan con
`docker compose exec backend pytest ingesta/tests/ -q`.

**`test_plusvalia.py`** — parseo offline contra fixtures del HTML real:
- Las coordenadas salen de `postingGeolocation` sin geocodificar, y **las del
  listado tienen prioridad sobre las de la ficha** (`:74-78, :165-174`).
- Sin coordenadas de ninguna fuente, `_parse_detail` devuelve `None`: no se
  inventa la ubicación (`:138-145`).
- Un clasificado sí entra si el listado aporta coords + ciudad + provincia
  (`:147-163`).
- El WhatsApp del anunciante se captura y se normaliza a dígitos (`:80-82`).
- Venta + alquiler: `status="for_sale"`, `price` = venta y `rent_price` =
  alquiler, **de forma determinista venga de la búsqueda que venga** (`:210-219`);
  solo alquiler → `for_rent` con `rent_price=None` (`:221-230`).
- Baños = `CFT3` + `CFT4` (baños + medios baños) (`:133-136`).
- De cada imagen se conserva la variante de mayor resolución (`:100-115`).
- El CTA "Leer descripción completa" se elimina de la descripción (`:117-131`).
- Un 429 aplica el `Retry-After` y reintenta; tres 403 seguidos lanzan
  `ScraperBlocked` tras esperar 15 s y 30 s (`:277-300`).
- El incremental compara por **ID**, no por URL, y corta la categoría al alcanzar
  la racha de conocidos (`:303-325`).
- Un 410 y un redirect fuera de `/propiedades/` notifican `on_gone` y cuentan para
  el corte histórico (`:328-372`).

**`test_incremental_state.py`** — un anuncio retirado es "conocido" para el
siguiente run incremental (`:13-39`), pero una retirada de más de 30 días vuelve
a comprobarse (`:42-62`).

**`test_retirement.py`** — la retirada borra la `Property` y sus imágenes pero
deja la fila de auditoría con su `http_status` (`:19-42`); un anuncio nunca
importado solo deja el registro pequeño (`:45-56`); **una publicación de usuario
(`is_imported=False`) nunca se borra ni pierde imágenes** (`:59-69`).

**`test_verify_runner.py`** — el modo `verify` borra los caducados y sella
`last_seen_at` en los vivos (`:72-86`); visita primero los más antiguos y respeta
`limit`, dejando intactos los recientes (`:88-105`); ante un bloqueo enfría,
resetea la racha del scraper y reanuda (`:108-123`); tras agotar los enfriamientos
termina en `error` **conservando el progreso**, con el cursor ya avanzado
(`:125-146`).

**`test_upsert_images.py`** — si ninguna imagen se puede adjuntar, la propiedad
recién creada se revierte y no queda nada en base (`:34-51`); lo mismo si se
exigían imágenes y el scraper no entregó ninguna (`:54-69`); y si las descargas
fallan, **las imágenes existentes se conservan** (`:72-106`).

**`test_packaging.py`** — `validate()` acepta un paquete completo y rechaza el
total descuadrado, la línea JSON inválida (indicando el número de línea) y el
`external_id` duplicado (`:25-46`).

**`test_maintenance.py`** — la previsualización cuenta solo candidatos importados
(`:25-41`); la limpieza exige la confirmación literal `ELIMINAR IMPORTADAS` y
nunca borra una propiedad de usuario, aunque tenga `is_duplicate=True`
(`:44-76`).

**`test_source_dates.py`** — las fechas Schema.org se extraen del HTML, y un texto
no parseable como "publicado recientemente" devuelve `None`: **no se fabrican
fechas** (`:4-16`).

**`test_remax.py`** — cubre `RemaxScraper._parse` offline (coordenadas
`[lng, lat]`, teléfono y email del agente, exclusión de las fotos 360°, ciudad y
provincia del `addressInfo` del listado, y descarte del anuncio sin coordenadas).
Estos tests pasan, pero **el scraper no está registrado**: `remax` no aparece en
`available_scrapers()` porque su `import` está comentado
(`backend/ingesta/scrapers/__init__.py:9-12`). Es código en conservación, no una
fuente operativa.
