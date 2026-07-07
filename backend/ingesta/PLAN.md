# Proyecto de Ingesta de Propiedades (Agregador tipo "buscador")

> Objetivo: **poblar el mapa con la mayor cantidad de propiedades de Ecuador**
> recopiladas de otros portales, para que la plataforma se vea activa y famosa,
> y así los usuarios reales quieran publicar. **No es robar: somos un buscador**
> que muestra la propiedad y enlaza de vuelta a la fuente original.

---

## 1. Principios (reglas del juego)

1. **La ubicación es obligatoria y debe venir en la fuente.** Solo se importan
   anuncios que **ya traen lat/lng** válidas dentro de Ecuador. **No geocodificamos**
   direcciones: si el anuncio no trae coordenadas, se descarta. (Decisión tomada:
   evita imprecisión y costo; Properati ya trae ubicación.)
2. **Somos buscador, no dueños.** Siempre guardamos y mostramos:
   - la **fuente** (portal de origen) y
   - el **enlace al anuncio original** (`source_url`).
3. **Contacto en cascada:** teléfono → email → si no hay ninguno, se muestra
   el botón *"Ver en \<portal\>"* que abre `source_url`.
4. **Nunca duplicar.** Dedup por `(fuente, id_externo)` y por **cercanía
   geográfica** entre fuentes distintas.
5. **Idempotente y re-ejecutable.** Correr el comando N veces no crea basura:
   actualiza lo existente, agrega lo nuevo, marca inactivo lo que desapareció.
6. **Adaptable a datos incompletos.** Muchos anuncios no traen precio ni área.
   El sistema acepta esos vacíos ("Precio a consultar") en lugar de descartarlos.
7. **Respetuoso / legal:** respetar `robots.txt`, rate-limit, User-Agent
   identificable, atribución + backlink, no rehostear imágenes masivamente.

---

## 2. Arquitectura (nueva app Django `ingesta`)

```
backend/ingesta/
├── PLAN.md                     # este documento
├── __init__.py
├── apps.py
├── models.py                   # Fuente, ListingCruda, GeocodeCache
├── admin.py                    # panel para ver/gestionar fuentes y crudos
├── scrapers/
│   ├── base.py                 # BaseScraper: contrato común
│   ├── properati.py            # dataset abierto / API
│   ├── plusvalia.py            # HTML / Playwright
│   ├── icasas.py
│   ├── olx.py
│   └── ...                     # 1 archivo por portal
├── pipeline/
│   ├── normalize.py            # crudo -> dict canónico
│   ├── location.py             # valida lat/lng con geo.py; descarta sin coords
│   ├── images.py              # descarga, optimiza y guarda; borra huérfanas
│   ├── dedup.py                # (fuente,id) + cercanía geográfica
│   └── upsert.py               # crea/actualiza Property de forma idempotente
└── management/commands/
    ├── ingesta_scrape.py       # 🖥️ LOCAL: scrapea portales -> genera paquete
    ├── ingesta_import.py       # ⭐ PRODUCCIÓN: solo carga el paquete (sin scraping)
    ├── ingesta_sources.py      # listar/activar/desactivar fuentes
    └── ingesta_stats.py        # cuántas propiedades por fuente, etc.
```

### ⚠️ Separación local vs. producción (decisión tomada)

**El scraping NUNCA corre en producción.** Se corre en local/staging y produce
un **paquete de datos portátil**; producción solo lo **importa**.

```
┌─ LOCAL / máquina de scraping ─────────────┐     ┌─ PRODUCCIÓN ──────────────┐
│  ingesta_scrape                            │     │  ingesta_import           │
│   - visita los portales (httpx/Playwright) │     │   - lee el paquete        │
│   - normaliza + valida ubicación           │ ──▶ │   - dedup + upsert en BD  │
│   - descarga y optimiza imágenes           │paq. │   - sube imágenes a MinIO │
│   - escribe el paquete (JSONL + imágenes)  │     │   - NO toca los portales  │
└────────────────────────────────────────────┘     └───────────────────────────┘
```

- **Ventaja:** producción no necesita `playwright`, ni internet hacia los
  portales, ni sortear bloqueos. Es rápido, repetible y seguro.
- El paquete es versionado/fechado y se transfiere a prod (archivo/almacenamiento).

### Flujo del pipeline
```
[Scraper por portal]  →  crudo (JSON tal cual)  →  ListingCruda (auditoría)
        │
        ▼
[normalize]  →  dict canónico { titulo, precio?, area?, lat, lng, direccion,
                                 telefono?, email?, imagenes[], source_url, external_id }
        │
        ▼
[location]   →  ¿trae lat/lng?  NO → descartar
                ¿cae dentro de Ecuador? (geo.coord_in_ecuador)  NO → descartar
        │
        ▼
[dedup]      →  ¿ya existe por (fuente,id)?  → update
                ¿hay otra a < 25 m con área/precio similar? → es la misma, enlaza
        │
        ▼
[upsert]     →  crea/actualiza Property (owner=NULL, is_imported=True)
        │        descarga+optimiza imágenes nuevas; borra las que ya no están
        ▼
[caducidad]  →  marca last_seen_at; lo no visto en N corridas → inactive
                y se BORRAN sus imágenes de MinIO para liberar espacio
```

---

## 3. Cambios en el modelo `Property`

Se agregan campos (migración nueva) y se **relajan restricciones** para importados:

| Campo | Tipo | Motivo |
|---|---|---|
| `source` | FK a `ingesta.Fuente`, null | de qué portal vino |
| `source_url` | URLField, blank | enlace al anuncio original (contacto fallback) |
| `external_id` | CharField, blank | id del anuncio en el portal de origen |
| `is_imported` | Bool, default False | distingue agregado vs. publicado por usuario |
| `contact_email` | EmailField, blank | hoy solo existe `contact_phone` |
| `imported_at` | DateTime, null | primera importación |
| `last_seen_at` | DateTime, null | última vez visto en la fuente (para caducar) |
| `dedup_key` | CharField index, blank | huella para acelerar dedup |

**Relajar obligatorios (solo afecta importados, no rompe el flujo actual):**
- `price` → `null=True, blank=True`  → UI muestra "Precio a consultar".
- `area`  → `null=True, blank=True`  → UI oculta el área si falta.

Restricción de unicidad: `unique_together = (source, external_id)`.

---

## 4. Deduplicación (nunca repetir ubicaciones)

Dos niveles:

1. **Misma fuente:** clave `(source, external_id)`. Re-scrapear el mismo
   anuncio hace *update*, no duplica.
2. **Entre fuentes distintas** (el mismo terreno anunciado en 2 portales):
   - Prefiltro por *bounding box* (~25 m alrededor de la nueva coordenada).
   - Confirmación por **haversine < 25 m** + área dentro de ±10 % (si ambas
     tienen área) + precio compatible.
   - Si coincide: se conserva la primera y la segunda fuente se **anexa como
     fuente alternativa** (no se crea Property nueva).
   - Sin PostGIS: el prefiltro se hace con rango sobre `latitude`/`longitude`
     (índices B-tree) y el haversine en Python. Suficiente al volumen esperado.

---

## 5. Ubicación (sin geocodificar — decisión tomada)

- **No usamos ningún servicio de geocodificación.** Solo importamos anuncios
  que **ya traen lat/lng** en la fuente.
- Validación: `geo.coord_in_ecuador(lat, lng)`. Fuera de Ecuador → descartado.
- Si el anuncio no trae coordenadas → descartado (se cuenta en el reporte para
  saber cuánto perdemos por cada fuente).
- Ventaja: cero costo, cero imprecisión, cero rate-limit externo. Properati ya
  incluye ubicación, así que la cobertura inicial es buena.

## 5-bis. Imágenes (descargar, optimizar, guardar y limpiar)

- Se **descargan** las imágenes del anuncio y se guardan como `PropertyImage`
  en MinIO, **reutilizando** `image_utils.optimize_image` + `create_thumbnail`
  (ya convierten a WEBP y crean thumbnail).
- **Ciclo de vida = limpieza de espacio:**
  - Al re-scrapear, si una imagen ya no aparece en el anuncio → se borra su
    fila `PropertyImage` **y** el objeto en MinIO.
  - Cuando la Property caduca (no vista en N corridas / anuncio eliminado) →
    se borran **todas** sus imágenes de MinIO.
  - Un `post_delete` / rutina de limpieza garantiza que no queden objetos
    huérfanos en el bucket.
- Límite prudente de imágenes por anuncio (p. ej. 5) para controlar espacio.

---

## 6. Los comandos (local vs. producción)

### 6.1. LOCAL — scraping + validación de datos
Aquí ocurre **todo el trabajo pesado y toda la validación de calidad**: visitar
los portales, normalizar, **validar ubicación** (lat/lng dentro de Ecuador),
deduplicar, descargar/optimizar imágenes y escribir un **paquete ya limpio**.

```bash
# Scrapear una fuente y generar el paquete validado:
python manage.py ingesta_scrape --source properati --out paquetes/2026-07-07/

# Opciones:
python manage.py ingesta_scrape --source properati --limit 500  # tope por corrida
python manage.py ingesta_scrape --all                           # todas las fuentes
python manage.py ingesta_scrape --source properati --dry-run    # solo reporta
```

El paquete contiene **solo datos que pasaron la validación**: cada propiedad
trae lat/lng válida, está deduplicada y sus imágenes ya optimizadas.

### 6.2. PRODUCCIÓN — solo subir/importar (⭐ el comando final)
No scrapea, no toca portales, no valida de nuevo desde cero (la data ya viene
limpia); solo carga el paquete de forma **idempotente**.

```bash
python manage.py ingesta_import paquetes/2026-07-07/
```

- Hace **upsert** por `(fuente, id_externo)`: re-importar el mismo paquete no
  duplica; importar uno más nuevo actualiza y agrega.
- Sube las imágenes del paquete a MinIO.
- Aplica **caducidad**: propiedades importadas que ya no vienen en el paquete
  se marcan `inactive` y se **borran sus imágenes** de MinIO.
- Mantiene una verificación mínima de seguridad (lat/lng dentro de Ecuador)
  como red de protección, aunque la validación fuerte ya se hizo en local.

### Ejecución periódica (re-cargar/actualizar)
- **Local:** correr `ingesta_scrape` cada cierto tiempo (cron en tu máquina o
  máquina de scraping) → genera un paquete nuevo fechado.
- **Producción:** correr `ingesta_import <paquete>` cuando quieras publicar la
  actualización. Un solo comando, seguro y repetible.

---

## 7. Fuentes candidatas (Ecuador)

| Portal | Tipo | Dificultad | Nota |
|---|---|---|---|
| **Properati EC** | **scraping HTML** | Media | ⭐ FUENTE INICIAL. ~5.282 terrenos, ~22k inmuebles, trae ubicación |
| **Plusvalía** | HTML + JS | Media/Alta | el más grande de EC, requiere Playwright |
| **Icasas.ec** | HTML | Media | buen volumen |
| **Vive1** | HTML | Media | |
| **OLX Ecuador** | HTML | Media | mucho terreno informal |
| **Remax / Century21 EC** | HTML | Media | inmuebles formales |
| **GAD / municipios** | variado | Baja | relevante para terrenos municipales |

**Decisión tomada:** arrancamos por **Properati EC mediante scraping de sus
páginas HTML** (NO usar su API, NO usar dataset — el dataset abierto de Properati
no cubre Ecuador). El sitio en vivo `properati.com.ec` sí tiene volumen y trae
ubicación, así que encaja con la política de "solo lat/lng ya incluida".

### Cómo se scrapea Properati (sin API)
1. Recorrer el listado paginado: `https://www.properati.com.ec/s/terreno/venta`
   (y `/s/venta` para todos los tipos), página por página.
2. De cada tarjeta se saca la URL del anuncio.
3. Se abre cada **página de detalle** y del **HTML** se extrae:
   título, precio (puede faltar), área, dirección, **lat/lng**, teléfono,
   imágenes y `source_url`.
   - **La lat/lng se saca del widget de mapa** ("Ver ubicación") que aparece
     en cada anuncio: las coordenadas viven en el HTML del mapa (data-attrs /
     URL del mapa embebido / bloque de datos de la página). Como Properati
     **siempre** muestra ese mapa, la ubicación es confiable y casi universal.
4. Motor: `httpx + BeautifulSoup` si el HTML ya trae los datos; **Playwright**
   como respaldo si el contenido se pinta por JS. Se respeta rate-limit y
   `robots.txt`, con User-Agent identificable.

---

## 8. Frontend (mínimo para que se vea bien)

- En `PropertyModal` y la página de propiedad: si `is_imported`, mostrar
  chip *"Fuente: \<portal\>"* y botón **"Ver anuncio original"** (`source_url`).
- Si `price` es null → "Precio a consultar". Si `area` null → ocultar área.
- Contacto en cascada: teléfono/WhatsApp → email → enlace a la fuente.

---

## 9. Legal / riesgo (importante)

- Respetar `robots.txt` y términos; identificar el bot por User-Agent.
- **Atribución + backlink obligatorio** (nos posiciona como buscador, no copia).
- No rehostear galerías completas de imágenes: usar 1 miniatura + atribución,
  o hotlink, o ninguna imagen (placeholder por tipo).
- Guardar `ListingCruda` para trazabilidad de qué se tomó y de dónde.

---

## 10. Roadmap de implementación

> **Todas las fuentes se obtienen por scraping HTML.** No se usan APIs ni
> datasets en ningún portal. Cada portal = un scraper que hereda de `BaseScraper`.

- **Fase 0 — Fundaciones** (1 PR): app `ingesta`, modelos (`Fuente`,
  `ListingCruda`), migración de `Property` (campos de origen + relajar
  price/area), `BaseScraper`, pipeline (normalize, location, images, dedup,
  upsert), y los **dos comandos**: `ingesta_scrape` (local) e `ingesta_import`
  (producción), con el formato del **paquete** definido. Requisitos de scraping
  (`httpx`, `beautifulsoup4`, `playwright`) quedan como dependencias **solo de
  local**, no de producción. (Sin geopy: no geocodificamos.)
- **Fase 1 — Primera fuente (Properati EC):** scraper HTML de
  `properati.com.ec` end-to-end (scrape local → paquete → import) → primer
  volumen real en el mapa.
- **Fase 2 — Frontend:** atribución "Ver anuncio original", precio/área
  opcionales, contacto en cascada (tel → email → link).
- **Fase 3 — Programación:** cron/docker que corre `ingesta_run` + caducidad
  de anuncios viejos (y borrado de sus imágenes).
- **Fase 4 — Escala:** un scraper más por portal (Plusvalía, Icasas, OLX,
  Vive1, Remax…), todos por scraping HTML, con monitoreo por fuente.
```
