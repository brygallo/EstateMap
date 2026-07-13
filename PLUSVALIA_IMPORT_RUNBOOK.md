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

## Estado actual (2026-07-09, reconciliado en vivo)

- Principio operativo: **produccion es la fuente de verdad**. Local se puede
  resetear/replicar sin miedo para que coincida con produccion.
- **Produccion tiene 1689 propiedades plusvalia**, TODAS con imagenes
  (CON_IMG=1689), 0 duplicados por `external_id`. Verificado por SSH el
  2026-07-09.
- **Local replica exacto**: `ListingCruda` (plusvalia) = 1689 crudas (todas
  scraped 2026-07-08), = 1689 en prod. `PROD_CRUDAS=0` es normal: las crudas
  solo viven en local; el scrape es local-only.
- La marca "248" de versiones previas de este runbook era un snapshot viejo del
  lote 001. Despues corrio el pipeline builder/uploader (`paquetes/.pipeline/`)
  que llevo prod de 248 -> 1689 en lotes de 100 con `--skip-known`.
- No quedan paquetes locales listos (`backend/paquetes/` solo tiene `.pipeline/`),
  ni marcadores `builder.done`. El pipeline esta **idle**; retomar =
  seguir scrapeando con `--skip-known` (salta los 1689) hasta agotar la fuente.
- La opcion `--skip-known` **ya esta implementada** en `ingesta_scrape.py`
  (lee `ListingCruda.source_url` y salta lo conocido).

### Pipeline builder/uploader (`backend/paquetes/.pipeline/`)

- `builder.sh [START]`: productor. Scrapea lotes (BATCH=100) con `--skip-known`,
  deja paquetes con `manifest.json`. Backpressure: max 3 paquetes listos sin
  importar. Al scrapear 0 nuevos => fuente agotada, `touch builder.done`, para.
- `uploader.sh`: consumidor. Toma el paquete listo mas viejo, lo empaqueta,
  sube por scp a Contabo (`root@212.47.65.135`), importa en
  `estatemap_backend`, verifica prod, limpia temporales server+local, borra el
  paquete. Repite hasta `builder.done` + 0 paquetes.
- Los numeros de paquete son solo etiquetas; el dedup real en prod es por
  `(source, external_id)`, asi que reusar un nombre no duplica.

### Progreso de la reanudacion (2026-07-09)

- Punto de partida: prod=1689, local=1689 crudas.
- **Probe (08:38-08:46)**: scrape `--skip-known --limit 100` -> 100 nuevos
  validos, 500 imagenes, 0 sin ubicacion. => la fuente NO esta agotada, hay mas
  alla de 1689. Paquete listo: `paquetes/plusvalia-probe` (aun sin importar).
  Ritmo observado: ~7.5 min por lote de 100.
- Reanudado pipeline en background:
  - `uploader.sh` -> log `backend/paquetes/.pipeline/uploader.log`
  - `builder.sh 2` -> log `backend/paquetes/.pipeline/builder.log`
- Contador prod objetivo: subir desde 1689 hasta agotar. (se actualiza abajo)

| hora | evento | prod count |
|---|---|---|
| 08:36 | reconciliado | 1689 |
| 08:46 | probe listo (100 nuevos, sin importar) | 1689 |
| 08:49 | probe importado (Creadas 100, 0 dup) | 1789 |
| 08:56 | pipeline en marcha | 1804 |
| 09:01 | | 1887 |
| 09:06 | | 1973 |
| 09:11 | ritmo ~+550/h, 0 dup, daemons sanos | 1973 |
| 09:27 | | 2082 |
| 10:00 | | 2180 |
| 10:35 | 0 dup, daemons sanos; SSH a prod intermitente | 2180 |
| 10:17-11:06 | **INCIDENTE**: scp de plusvalia-006 colgado (stall de red); prod clavado en 2180, cola llego a 3 y builder se freno | 2180 |
| 11:08 | fix aplicado + uploader reiniciado (retoma 006) | 2180 |
| 11:11 | 006 importado OK con fix (Creadas 98, scp en segundos) | 2278 |
| 11:16 | recuperado, sin cuelgues | 2475 |
| 11:27 | | 2572 |
| 11:37 | 0 dup, daemons sanos | 2572 |
| 11:47 | | 2738 |
| 11:58 | | 2767 |
| 12:03 | 0 dup, estable | 2767 |
| 12:13 | | 2930 |
| 12:29 | builder en lote 013+, fuente no agotada | 2956 |
| 12:44 | paso los 3000 | 3150 |
| 12:54 | 0 dup, estable | 3150 |
| 13:00 | | 3245 |
| 13:56 | scrape de 017 tardo ~57min (Plusvalia throttlea al profundizar) | 3340 |
| 14:28 | 018 entro | 3385 |
| 14:44 | 019 entro, throttling aflojo, 0 dup | 3436 |
| 14:49 | | 3531 |
| 15:15 | 0 dup, estable | 3582 |
| 15:31 | | 3638 |
| 15:46 | builder en lote 022, fuente no agotada, 0 dup | 3720 |
| 15:57 | | 3772 |
| 16:17 | 0 dup, estable (ritmo mas lento por throttling) | 3815 |
| 16:26 | 023 importado (Creadas 95) | 3910 |
| 16:2x | **PAUSA para continuar manana** (apagado limpio) | 3910 |

### PAUSA 2026-07-09 ~16:30 — como REANUDAR manana

Estado congelado al pausar:
- **Prod = 3910** plusvalia, todas con imagen, 0 duplicados.
- **Local crudas = 3910** (== prod). Esto gobierna `--skip-known`: manana saltara
  estos 3910 y traera solo nuevos.
- Ultimo lote scrapeado e importado: `plusvalia-023`. El parcial `plusvalia-024`
  (scrape a medias, sin manifest) se borro.
- Apagado limpio: daemons `builder.sh`/`uploader.sh` detenidos, sin scp/ssh
  colgados, **sin paquetes pendientes** en `backend/paquetes/`, sin `.tgz` local,
  `/tmp/plusvalia-*` del server y del contenedor limpios.
- La fuente NO estaba agotada (el lote 023 trajo 99 nuevos), asi que hay mas por
  traer mas alla de 3910.

**Comandos para reanudar** (desde `/Users/usuario/gad/EstateMap`, Docker arriba):

```bash
# 1) uploader (consumidor): importa paquetes listos y verifica en prod
nohup bash backend/paquetes/.pipeline/uploader.sh \
  >> backend/paquetes/.pipeline/uploader.log 2>&1 & disown

# 2) builder (productor): siguiente numero de lote es 24
nohup bash backend/paquetes/.pipeline/builder.sh 24 \
  >> backend/paquetes/.pipeline/builder.log 2>&1 & disown

# 3) monitor en pantalla (30 min por vuelta; con keepalive)
bash backend/paquetes/.pipeline/monitor.sh 30
```

Notas de reanudacion:
- El numero `24` es solo etiqueta; el dedup real en prod es por
  `(source, external_id)`, pero empezar en 24 evita colisionar con nombres ya
  usados.
- `uploader.sh` ya tiene el fix anti-cuelgue (keepalive + `timeout` en scp/ssh);
  `monitor.sh` tambien lleva keepalive en su SSH a prod.
- Credenciales server (en `uploader.sh`/`monitor.sh`): `root@212.47.65.135`.
- Cuando un lote traiga 0 nuevos, el builder hace `touch builder.done` y para; el
  uploader termina la cola y sale. Ahi la fuente quedo agotada.

### REANUDADO 2026-07-10 08:10

- Al reanudar aparecio un residuo: `plusvalia-024` con `manifest.json` (total=31)
  + 150 imagenes pero **sin `listings.jsonl`** (se perdio en la carrera entre mi
    limpieza de ayer y el proceso hijo `docker exec ingesta_scrape` que sobrevivio
    al `pkill builder.sh` y termino el scrape a las 16:40). Paquete inservible.
- Efecto colateral: 26 crudas quedaron registradas en local pero NO en prod
  (3936 local vs 3910 prod). `--skip-known` las habria saltado para siempre =>
  hueco. **Fix:** se borraron esas 26 crudas huerfanas (las que estaban en local
  y no en prod; verificado `prod - local = 0`), dejando **local = 3910 = prod**.
  Asi el proximo scrape las vuelve a traer.
- Borrado el `plusvalia-024` roto. Daemons relanzados (`builder.sh 24`,
  `uploader.sh`). Punto de partida hoy: **prod = 3910**.
- LECCION: al pausar, matar tambien el hijo del scrape dentro del contenedor
  (`docker compose exec backend pkill -f ingesta_scrape`), no solo `builder.sh`
  en el host.

| hora | evento | prod count |
|---|---|---|
| 08:10 | reanudado tras reconciliar (local=prod=3910) | 3910 |
| 08:31 | 024 entro (26 huerfanos + nuevos) | 3955 |
| 08:41 | paso los 4000, 0 dup | 4003 |
| 09:12 | 0 dup, estable | 4096 |
| 09:33 | | 4251 |
| 09:43 | 0 dup, estable | 4285 |
| 09:54 | | 4341 |
| 10:14 | builder en lote 028, 0 dup | 4378 |
| 10:46 | 0 dup, estable | 4471 |
| 11:12 | | 4656 |
| 11:48 | 0 dup, estable | 4751 |
| 12:19 | 0 dup, estable | 4844 |
| 12:51 | 0 dup, estable | 4937 |
| 12:56 | **paso los 5000** | 5029 |
| 13:22 | 0 dup, estable | 5029 |
| 13:28 | | 5121 |
| 13:23-14:24 | scrape de 037 tardo ~1h (throttling fuerte, NO cuelgue); 037 quedo listo | 5121 |
| 14:30 | | 5215 |
| 15:44 | | 5401 |

### PAUSA 2026-07-10 ~16:10 — continuar el LUNES

Estado congelado al pausar:
- **Pipeline plusvalia: prod = 5401** plusvalia (total prod = 6408), 0 dup.
- **Local crudas = 5401 == prod** (reconciliado: se borraron 33 crudas huerfanas
  del scrape de 040 que se mato al pausar).
- Apagado limpio: `builder.sh`/`uploader.sh` muertos, **hijo `ingesta_scrape`
  dentro del contenedor tambien matado** (via /proc, no hay procps) — se aplico
  la leccion del viernes. Sin paquetes pendientes (parcial 040 borrado), sin
  `.tgz` local, `/tmp/plusvalia-*` server+contenedor limpios.
- Ultimo lote scrapeado e importado: `plusvalia-039`. **Lunes: builder arranca en 40.**

**Reanudar el lunes** (desde `/Users/usuario/gad/EstateMap`, Docker arriba):

```bash
nohup bash backend/paquetes/.pipeline/uploader.sh \
  >> backend/paquetes/.pipeline/uploader.log 2>&1 & disown
nohup bash backend/paquetes/.pipeline/builder.sh 40 \
  >> backend/paquetes/.pipeline/builder.log 2>&1 & disown
bash backend/paquetes/.pipeline/monitor.sh 30
```

- OJO al pausar: matar SIEMPRE tambien el hijo del scrape en el contenedor, si no
  quedan crudas huerfanas (paso de reconciliacion documentado abajo). Comando de
  kill del hijo:
  `docker compose exec -T backend sh -c 'for p in /proc/[0-9]*; do grep -qa ingesta_scrape "$p/cmdline" 2>/dev/null && kill -9 "${p##*/}"; done'`
  (el `grep ingesta_scrape` da un falso positivo: matchea el propio comando; el
  proceso real es `python manage.py ingesta_scrape`).

### REANUDADO 2026-07-13 09:48 (lunes)

- Reconciliacion previa OK: **prod = 5401** plusvalia, 0 dup, todas con imagen;
  **local crudas = 5401 == prod**. Estado identico al de la pausa del viernes.
- Docker estaba apagado: se levanto Docker Desktop ("Docker 2.app") y los
  contenedores (`db`, `minio`, `backend`) que estaban `exited (255)`.
- Sin residuos: 0 paquetes pendientes, sin `builder.done`, sin `.tgz` local,
  sin procesos colgados.
- Daemons relanzados segun runbook: `uploader.sh` + `builder.sh 40`. Builder
  arranco el scrape de `plusvalia-040` saltando las 5401 URLs conocidas.
- NOTA SSH: el acceso a prod (`root@212.47.65.135`) es por **password** via
  `sshpass` (embebido en `uploader.sh`/`monitor.sh`, `SSHPASS='h55SKQe5Z'`), NO
  por llave publica. Un `ssh` manual sin sshpass da "Permission denied".
- NOTA modelos: `Fuente` y `ListingCruda` viven en `ingesta.models` (no en
  `real_estate.models`). `Property` en `real_estate.models` con `source__slug`.

| hora | evento | prod count |
|---|---|---|
| 09:48 | reanudado tras reconciliar (local=prod=5401) | 5401 |
| 10:22 | 040 importado (Creadas 87, act 12, 0 dup) | 5488 |
| 11:01 | 041 importado (Creadas 92, act 7, 0 dup) | 5580 |

**Replica prod->local: COMPLETADA y verificada (2026-07-10).**
- Local BD: 6302 importadas (5307 plusvalia + 995 properati), 30994 imagenes.
- MinIO local: espejo de prod, 92616 objetos copiados (bucket prod 2.4GiB/94k obj).
- Verificacion: 5/5 imagenes plusvalia cargan por HTTP en local MinIO.
- Local == prod al snapshot (~5307 plusvalia). Como el pipeline siguio subiendo
  prod (5401 al pausar), para re-sincronizar se repite: `replica_export.py` en
  prod -> traer json -> `replica_import.py` en local -> `mc mirror --overwrite`.
  Ambos scripts remapean PK y mapean Fuente por slug; son idempotentes.

---

**Replica prod->local (2026-07-10 ~15:40):** a peticion del usuario se replico
prod->local COMPLETO. BD: exportadas las importadas de prod (6302 = 5307
plusvalia + 995 properati, las 12 de usuarios quedan fuera), importadas en local
remapeando PK (los ids de Fuente y los PK chocaban), preservando `duplicate_of`
(90) y timestamps. Imagenes: espejo del bucket MinIO prod->local con
`mc mirror --overwrite` (2.4GiB / 93k objetos). Scripts en
`backend/paquetes/.pipeline/replica_export.py` y `replica_import.py`. Local
queda == prod al momento del snapshot; el pipeline sigue subiendo prod, asi que
para re-sincronizar se repite export/import + mirror.

**Nota throttling (13:xx):** el scrape se ralentizo de ~7.5min a ~57min por lote
de 100. NO es cuelgue: el uploader queda ocioso esperando que el builder termine
el paquete. Ahora el cuello de botella es el scrape, no el import. Tambien se
parcheo `monitor.sh` para que su SSH a prod use keepalive
(`ServerAliveInterval=15`), porque sin el las lecturas se colgaban y mostraban
prod "congelado" cuando en realidad avanzaba.

**Incidente scp colgado (resuelto 11:08):** el `scp` no tenia timeout de
transferencia (`ConnectTimeout` solo cubre el handshake), asi que un stall de red
dejo el proceso pegado ~50 min sin retornar, y `process_with_retry` nunca
disparo. Fix en `uploader.sh`: (1) `SSHOPTS` ahora lleva
`ServerAliveInterval=15 ServerAliveCountMax=4` (mata la conexion si se estanca
~60s); (2) `scp` envuelto en `timeout 600` y el `ssh` de import en `timeout 900`.
Se mato el scp colgado, se borro el `.tgz` local a medias y se reinicio el
uploader (retoma el paquete listo mas viejo; re-import es idempotente por
`(source, external_id)`, no duplica).

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
