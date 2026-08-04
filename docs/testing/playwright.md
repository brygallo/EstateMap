# Playwright y pruebas de extremo a extremo

Verificado contra el código el 2026-08-04.

> **Estado: no hay suite de Playwright en la aplicación.**

Ni el frontend (Next.js) ni el backend (Django) tienen tests de extremo a extremo escritos con
Playwright. No hay fichero de configuración, ni directorio `e2e/`, ni ficheros `.spec.*`, ni la
dependencia declarada. Playwright **sí** existe en el repo, pero en un sitio distinto y con otro
propósito: es una herramienta de una auditoría SEO del sitio en producción, no un arnés de pruebas
de la aplicación. Este documento registra la verificación y describe lo que sí existe hoy.

---

## 1. Evidencia de la verificación

Comandos ejecutados desde la raíz del repo (`/Users/usuario/gad/EstateMap`) el 2026-08-04:

```bash
# 1) ¿Existe una configuración de Playwright?
find . -name "playwright.config.*" -not -path "*/node_modules/*"
# -> sin resultados

# 2) ¿Existe algún directorio de e2e o de Playwright?
find . -type d \( -name "e2e" -o -name "tests-e2e" -o -name "playwright" \) \
     -not -path "*/node_modules/*" -not -path "*/.venv/*"
# -> sin resultados

# 3) ¿Está declarado como dependencia del frontend?
grep -c "playwright" frontend/package.json
# -> 0

# 4) ¿Hay ficheros de spec fuera de node_modules?
find . \( -name "*.spec.ts" -o -name "*.spec.js" -o -name "*.spec.tsx" \) \
     -not -path "*/node_modules/*" -not -path "*/.venv/*"
# -> sin resultados
```

### Las únicas menciones a Playwright en el repo, y qué son

| Ubicación | Qué es | ¿Es una suite de tests? |
|---|---|---|
| `frontend/package-lock.json:9429` | `"@playwright/test": "^1.51.1"` aparece dentro del bloque `peerDependencies` de **`next@16.2.12`**, y en `peerDependenciesMeta` está marcado `"optional": true` (`frontend/package-lock.json:9439-9441`). Es metadato de Next.js, no una dependencia instalada del proyecto. | No |
| `frontend/lib/analytics.ts:15` | La palabra `playwright` es una entrada más de la regex `CRAWLER_UA` que detecta *user agents* automatizados en el cliente. | No |
| `backend/real_estate/bot_detection.py:127` | `r"playwright"` es un patrón de la detección de bots del servidor. | No |
| `backend/ingesta/PLAN.md:44,69,76,221,244,279` | Documento de planificación del scraper: discute usar Playwright para portales con JS. `PLAN.md:279` lo lista como dependencia *solo del entorno de scraping*. La decisión final fue **no usarlo**: `backend/ingesta/scrapers/plusvalia.py:39` dice explícitamente "No hace falta Playwright", y `backend/ingesta/management/commands/ingesta_import.py:3` confirma que producción "no requiere httpx/Playwright". | No |
| `geopropiedadesecuador.com-audit/.venv/` | Un *virtualenv* de Python 3.10 con `playwright-1.61.0` instalado. Ver sección 3. | No — es una auditoría del sitio |

**Conclusión:** cero cobertura de extremo a extremo automatizada mediante navegador para esta
aplicación.

### Trabajo en curso, aún sin materializar

En el árbol de trabajo (sin commitear en el momento de esta verificación) hay un generador de tests
a partir de especificaciones: `tools/specs/gen_tests.py`, con entrypoint `./scripts/specs.sh`. Su
docstring (`tools/specs/gen_tests.py:11-12`) anuncia dos salidas, y una de ellas es Playwright:

> `tests/generated/` — Playwright. Rules with a route and a `data-testid` become a visibility
> assertion in the browser.

**Nada de eso existe todavía**: `tests/` no está creado, `specs/` solo contiene
`specs/schemas/rule.schema.json` (ninguna regla), y `frontend/package.json` sigue sin
`@playwright/test`. Si esa vía prospera, este documento habrá que reescribirlo; hasta entonces, lo
descrito arriba sigue siendo el estado real.

### Qué pruebas automatizadas sí hay hoy

- **Backend:** pytest — 25 ficheros entre `backend/real_estate/tests/` y `backend/ingesta/tests/`.
  Documentado en `docs/testing/pytest.md`.
- **Frontend:** Vitest en entorno `jsdom` (`frontend/vitest.config.mjs`), lanzado con
  `npm test` → `vitest run` (`frontend/package.json:11`). Solo hay **dos** ficheros de test, ambos
  de utilidades puras: `frontend/lib/form-errors.test.ts` y `frontend/lib/phone-detect.test.ts`.
  No hay tests de componentes ni de páginas.
- **CI** (`.github/workflows/deploy.yml`, disparado por `push` a `main`): ejecuta `pytest -q` en el
  backend y `lint` + `typecheck` + `npm test` + `build` en el frontend
  (`.github/workflows/deploy.yml:44`, `:57-61`). **No hay ningún paso de e2e ni de navegador.**

---

## 2. `backend/e2e_test.py` — lo más parecido a un e2e que existe

Es un **script suelto de 42 líneas**, no un test. Lo introdujo el commit `f6e9132`
*"Move image optimization off the upload request onto a Celery worker"* como comprobación manual de
ese cambio.

**Qué prueba** (`backend/e2e_test.py`):

1. Genera en memoria un JPEG de 3000×2000 al 98 % de calidad y reporta su peso
   (`e2e_test.py:10-13`).
2. Crea (o recupera) el usuario `e2e_tester` y una `Property` de prueba (`e2e_test.py:15-17`).
3. Llama a `stage_property_image(prop, up, 0, is_main=True)` midiendo cuánto tarda, e imprime el
   tiempo, el `status` de la imagen y si el fichero quedó realmente en *staging*
   (`e2e_test.py:19-23`). Esto es lo que valida la promesa del cambio: **el POST responde antes de
   optimizar**.
4. Hace *polling* de la fila durante hasta 60 segundos, refrescando desde la base de datos hasta
   que el estado deja de ser `PENDING` (`e2e_test.py:25-29`) — es decir, espera a que un **worker
   de Celery real** procese la tarea.
5. Si termina en `READY`, imprime el nombre del master y la miniatura, la URL pública, las
   dimensiones finales, si el temporal de `/app/tmp/pending-images` se borró, y el porcentaje de
   ahorro de peso (`e2e_test.py:32-39`). Si no, imprime `optimization_error`.
6. Borra la propiedad creada (`e2e_test.py:42`).

**Cómo se ejecuta.** No lo recoge pytest: `python_files` en `backend/pytest.ini:3` acepta
`tests.py`, `test_*.py` y `*_tests.py`, y `e2e_test.py` no coincide con ninguno. No tiene función
`main()` ni bloque `if __name__ == "__main__"`; es código a nivel de módulo que asume un contexto
Django ya inicializado. Se ejecuta como script de shell de Django contra un entorno **con Celery,
Redis y MinIO levantados de verdad** — que es precisamente lo que lo hace "de extremo a extremo" y
lo que impide convertirlo en un test de la suite:

```bash
docker-compose run --rm backend python manage.py shell < e2e_test.py
```

No hay ningún fichero del repo (script, workflow o documento) que lo invoque; su uso es manual y
puntual. La cobertura *automatizada* de ese mismo pipeline vive en
`backend/real_estate/tests/test_async_image_pipeline.py`, que hace lo mismo pero con Celery en modo
*eager* y almacenamiento local (ver `docs/testing/pytest.md`, secciones 3.7 y 3.8).

---

## 3. `geopropiedadesecuador.com-audit/` — Playwright, pero para auditar el sitio

Es el **artefacto de una auditoría SEO** de `https://geopropiedadesecuador.com` ejecutada el
2026-07-13 (con un plan añadido el 2026-08-03). No contiene tests de la aplicación: contiene HTML
descargado, capturas, informes y datos.

### Contenido

| Ruta | Qué es |
|---|---|
| `CONTEXT.md` | Contexto compartido de la auditoría: objetivo, stack detectado, hechos ya recogidos y un bug confirmado de doble barra `//` en la construcción de URLs. |
| `FULL-AUDIT-REPORT.md`, `ACTION-PLAN.md`, `PLAN-SEO-2026-08.md` | Informe completo, plan de acción y plan SEO. |
| `findings/` | Nueve informes por especialidad: `content.md`, `geo.md`, `local.md`, `performance.md`, `schema.md`, `sitemap.md`, `sxo.md`, `technical.md`, `visual.md`. |
| `screenshots/` | Capturas de cuatro páginas de **producción** (`homepage`, `category-casas`, `city-quito`, `property-detail`) en desktop, laptop, tablet, mobile-fold y mobile-full. |
| `charts/` | Directorio vacío. |
| `*.html`, `sitemap.xml`, `image-sitemap.xml`, `*.json`, `*.txt`, `*.log` | Datos crudos descargados: HTML de las páginas auditadas, los dos sitemaps, volcados de render, logs de builds y de errores. |
| `Google-SEO-Report-...pdf` | El informe exportado a PDF. |
| `.venv/` | Virtualenv Python 3.10 con `playwright-1.61.0` (`.venv/lib/python3.10/site-packages/playwright/`) y el binario `.venv/bin/playwright`. |

### Cómo se usa de verdad

**No hay scripts en este directorio.** `CONTEXT.md` documenta el mecanismo real: el venv sirve de
entorno de ejecución para scripts que viven **fuera del repo**, en la caché de plugins de Claude
Code:

```
venv:              geopropiedadesecuador.com-audit/.venv/bin/activate
plugin scripts:    ~/.claude/plugins/cache/agricidaniel-claude-seo/claude-seo/2.2.0/scripts
```

Verificado: ese directorio existe y contiene, entre otros, `capture_screenshot.py`,
`render_page.py`, `fetch_page.py`, `analyze_visual.py` y `pagespeed_check.py`. Los navegadores de
Playwright están instalados en la caché del usuario (`~/Library/Caches/ms-playwright/`, con
`chromium-1223` y `chromium-1228`).

El papel concreto de Playwright en esa auditoría, según los propios informes:

- `findings/visual.md:6` — capturas multi-viewport con `capture_screenshot.py` más un script propio
  de *bounding boxes* / `scrollWidth`.
- `findings/performance.md:5,17` — estimaciones de LCP/INP/CLS en laboratorio con un Chromium
  *headless* de Playwright contra la URL de producción, ante la falta de credenciales de
  PageSpeed/CrUX.
- `findings/performance.md:39` — sondas propias con `PerformanceObserver` (long tasks, LCP, CLS) y
  la constatación de que `render_page.py --mode always` con `wait_until="networkidle"` agota los
  15 s sin alcanzar el reposo de red.
- `findings/geo.md:101` — `render_page.py` en modo automático **no necesitó** levantar Playwright
  para `/propiedad/6416` ni `/casas-en-venta` (`mode_used: "raw"`), lo que confirmó que esas páginas
  son SSR y no cascarones SPA.
- `home-mobile-render.json:25` — `"render_engine": "playwright-chromium"` es el registro del render
  móvil de la home. En cambio, `home-render.json:25` y `property_render.json:24` traen
  `"render_engine": null`: la mayoría de las páginas se leyeron directamente con `curl`, sin
  navegador.

En resumen: Playwright se usó aquí como **navegador de medición sobre producción**, con
herramientas de un plugin externo, para una auditoría puntual. Reproducir esa auditoría depende de
tener el plugin `claude-seo` instalado; no es parte del ciclo de desarrollo ni del CI, y estos
ficheros no se ejecutan ni se validan nunca.

---

## 4. PROPUESTA / NO IMPLEMENTADO — flujos candidatos a cubrir primero

> Nada de esta sección existe en el repo. Es una lista de prioridades deducida de las rutas reales
> de `frontend/app/` (44 ficheros `page.tsx`) y de lo que la suite de pytest **no** puede alcanzar:
> el navegador, el mapa y la hidratación.

Cuatro candidatos, en orden de valor:

1. **Publicar una propiedad** — `frontend/app/publicar-propiedad/page.tsx` (y su alias
   `frontend/app/add-property/page.tsx`, más el flujo asistido
   `frontend/app/publicar-asistido/page.tsx`). Es el flujo con más superficie: formulario largo,
   dibujo del polígono en el mapa y subida de imágenes. El pipeline de imágenes ya tiene cobertura
   en el backend, pero nadie prueba el formulario real.
2. **Buscar en el mapa** — `frontend/app/page.tsx` y `frontend/app/propiedades/page.tsx`. El mapa
   MapLibre solo existe en el cliente: filtros, clústeres y recarga por cambio de *bounds* son
   invisibles para pytest y para Vitest en `jsdom`. `findings/performance.md:39` ya señaló trabajo
   pesado de hidratación aquí, así que además es la zona más frágil.
3. **Ver el detalle de una propiedad** — `frontend/app/propiedad/[id]/page.tsx`. Página SSR de la
   que dependen ~2000 URLs del sitemap; la comprobación mínima es que renderiza sin errores de
   cliente y que el modal de contacto crea el lead.
4. **Registro e inicio de sesión** — `frontend/app/registro/page.tsx`,
   `frontend/app/iniciar-sesion/page.tsx`, `frontend/app/verificar-correo/page.tsx`,
   `frontend/app/recuperar-contrasena/page.tsx`. El backend ya cubre estos flujos a fondo
   (`test_registration.py`, `test_authentication.py`, `test_password_reset.py`); lo que falta
   verificar es la capa de navegador: persistencia del token, redirecciones y rutas protegidas.

Requisito común, y la razón por la que esto no es trivial: un e2e real necesita backend, Postgres,
Redis y frontend levantados a la vez, con datos sembrados y un usuario de prueba —
`backend/populate_test_data.py` y `backend/populate_200_properties.py` existen y podrían servir de
punto de partida. Decidir eso queda fuera de este documento.
