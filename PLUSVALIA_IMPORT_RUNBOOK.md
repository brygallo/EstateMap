# Plusvalia import runbook

Fecha: 2026-07-08

## Contexto

Plusvalia funciona desde la maquina local, pero Cloudflare bloquea la IP de
produccion en Contabo. En produccion se verifico que `curl_cffi` si esta
instalado y actualizado (`0.15.0`), pero la URL de Plusvalia devuelve
`403 Just a moment...` desde el contenedor `estatemap_backend`.

Decision operativa: scrapear Plusvalia localmente, generar paquetes con datos e
imagenes, subirlos temporalmente al servidor e importarlos en produccion. El
servidor no debe llamar a Plusvalia.

## Estado actual (2026-07-08, actualizado)

- Principio operativo: **produccion es la fuente de verdad**. Local se puede
  resetear/replicar sin miedo para que coincida con produccion.
- **Lote 001 ya esta importado en produccion**: 248 propiedades plusvalia, todas
  con imagenes. Sus temporales del servidor/contenedor ya fueron borrados.
- La opcion `--skip-known` **ya esta implementada** en `ingesta_scrape.py`
  (lee `ListingCruda.source_url` y salta lo conocido). La seccion final de este
  runbook que la proponia como TODO quedo obsoleta.
- Se reseteo el estado local para que replique produccion:
  - `ListingCruda` (plusvalia) local recortado a exactamente los 248
    `external_id` que existen en produccion (0 faltantes). Esto es lo que gobierna
    `--skip-known`.
  - Tabla `Property` local recortada (no afecta el pipeline: el scrape lee
    `ListingCruda`, no `Property`; el import corre en produccion).
  - Borrados los artefactos locales huerfanos: `paquetes/plusvalia-full-import`
    (sin manifest), `paquetes/plusvalia-001` (ya en prod) y
    `/private/tmp/plusvalia-001.tgz`.

## Validacion de no-duplicados (comprobado)

Dos candados independientes, el mismo codigo en local y produccion:

1. **Crudo (`ListingCruda`)**: `update_or_create(fuente, external_id)` en
   `ingesta_scrape.py`. Local: 0 `external_id` duplicados, 0 `source_url`
   duplicados.
2. **Property (candado definitivo, corre al importar en produccion)**:
   `upsert_property` con clave logica `(source, external_id)` (`upsert.py`).
   Reimportar el mismo paquete => `updated`, nunca crea otra fila. Ademas
   `find_duplicate` (misma imagen / cercania / area+precio) para cruces entre
   portales. Produccion: 0 `external_id` duplicados.

La consulta de verificacion es agrupar por `external_id` y contar `> 1`; da 0 en
local y en produccion. Los `dedup_key` repetidos NO son bug: `dedup_key` es solo
lat,lng redondeado; el dedup real usa `find_duplicate`.

## Cambios locales relevantes

Hay cambios locales para evitar propiedades sin imagenes:

- `backend/ingesta/pipeline/images.py`
  - Ya no borra imagenes existentes antes de confirmar que pudo descargar al
    menos una imagen nueva.
- `backend/ingesta/pipeline/upsert.py`
  - Si se exige imagen y no queda ninguna adjunta, revierte una propiedad recien
    creada.
- `backend/ingesta/runner.py`
  - Cuenta como error individual los anuncios omitidos por imagenes faltantes.
- `backend/ingesta/tests/test_upsert_images.py`
  - Pruebas de rollback y preservacion de imagenes existentes.

Prueba ejecutada correctamente:

```bash
docker compose exec backend pytest ingesta/tests/test_upsert_images.py ingesta/tests/test_plusvalia.py -q
```

Resultado: `17 passed`.

## Objetivo

Importar Plusvalia en produccion en paquetes de 250 anuncios, sin dejar archivos
temporales en el servidor.

## Flujo por lote

### 1. Limpiar paquete parcial local

```bash
rm -rf backend/paquetes/plusvalia-full-import
```

### 2. Generar paquete local de 250

Para el primer lote:

```bash
docker compose exec backend python manage.py ingesta_scrape \
  --source plusvalia \
  --limit 250 \
  --out paquetes/plusvalia-001
```

El paquete debe contener:

```text
backend/paquetes/plusvalia-001/
  manifest.json
  listings.jsonl
  images/<external_id>/0.jpg ...
```

Verificar:

```bash
wc -l backend/paquetes/plusvalia-001/listings.jsonl
find backend/paquetes/plusvalia-001/images -type f | wc -l
```

### 3. Empaquetar localmente

```bash
tar -czf /private/tmp/plusvalia-001.tgz -C backend/paquetes plusvalia-001
```

### 4. Subir temporal al servidor

```bash
scp /private/tmp/plusvalia-001.tgz root@212.47.65.135:/tmp/plusvalia-001.tgz
```

### 5. En el servidor: extraer, copiar al contenedor e importar

Con SSH:

```bash
ssh root@212.47.65.135
```

Dentro del servidor:

```bash
rm -rf /tmp/plusvalia-001
mkdir -p /tmp/plusvalia-001
tar -xzf /tmp/plusvalia-001.tgz -C /tmp/plusvalia-001 --strip-components=1

docker cp /tmp/plusvalia-001 estatemap_backend:/tmp/plusvalia-001
docker exec estatemap_backend python manage.py ingesta_import /tmp/plusvalia-001
```

### 6. Verificar importacion

Ejemplo:

```bash
docker exec estatemap_backend python manage.py shell -c \
"from real_estate.models import Property; qs=Property.objects.filter(source__slug='plusvalia'); print(qs.count(), qs.filter(images__isnull=False).distinct().count())"
```

### 7. Limpiar temporales del servidor y contenedor

```bash
docker exec estatemap_backend rm -rf /tmp/plusvalia-001
rm -rf /tmp/plusvalia-001 /tmp/plusvalia-001.tgz
docker exec estatemap_backend test ! -e /tmp/plusvalia-001
test ! -e /tmp/plusvalia-001
test ! -e /tmp/plusvalia-001.tgz
```

### 8. Limpiar temporal local

```bash
rm -rf /private/tmp/plusvalia-001.tgz
```

Mantener o borrar `backend/paquetes/plusvalia-001` segun se quiera conservar
auditoria local. Si no se quiere dejar residuo local:

```bash
rm -rf backend/paquetes/plusvalia-001
```

## Para continuar con lotes 002, 003, ...

`--skip-known` **ya esta implementado** (`ingesta_scrape.py`): lee
`ListingCruda.source_url` de la fuente y pasa ese set al scraper como `skip_url`,
de modo que cada lote nuevo no repite lo ya conocido en local.

Como local replica produccion (`ListingCruda` recortado a lo que hay en prod),
cada lote sucesivo trae anuncios genuinamente nuevos:

```bash
docker compose exec backend python manage.py ingesta_scrape \
  --source plusvalia \
  --limit 250 \
  --skip-known \
  --out paquetes/plusvalia-002
```

Cada lote sube el contador de conocidos, asi que el 003 salta 001+002, etc. Se
repite el flujo por lote (empaquetar -> subir -> importar en prod -> verificar ->
limpiar) hasta agotar la fuente.

## Notas

- No ejecutar la carga directa desde el admin de produccion para Plusvalia,
  porque Contabo esta bloqueado por Cloudflare.
- No usar `--no-images`; el objetivo es importar con imagenes.
- No usar `--expire` con lotes parciales de 250. `--expire` solo sirve con un
  snapshot completo de toda la fuente.
- No dejar paquetes en `/tmp` del servidor despues de importar.
