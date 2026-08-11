# Estrategia SEO — Geo Propiedades Ecuador

Objetivo: portal inmobiliario #1 de Ecuador en Google y en respuestas de IA (ChatGPT, Perplexity, Gemini, Claude).

Fecha: 2026-08-03. Estado verificado contra el código actual.

## Diagnóstico

### Ya implementado (base top-decile)
- Sitemap dinámico con lastmod real + image-sitemap.
- `llms.txt` / `llms-full.txt` dinámicos; robots.ts con roster completo de AI crawlers.
- JSON-LD en grafo: Organization/WebSite (layout), RealEstateListing (fichas), CollectionPage + AggregateOffer + FAQPage (landings).
- Landings programáticas ciudad/provincia/combo (`lib/seo-combos.ts`) con ISR y AVIF.
- OG images dinámicas (`opengraph-image.tsx` en home, combos, ciudades, provincias).
- IndexNow en backend (`real_estate/services/indexnow.py` + signals).
- 7 guías en `/guias` (comprar, hipotecas, impuestos, vender, zonas Quito/Cuenca, arrendar).
- Página `/estadisticas-inmobiliarias` con precios m².

### Brechas detectadas
1. **`/estadisticas-inmobiliarias` es client-side** (`MarketStatsClient` con `useEffect` + fetch). Googlebot la renderiza tarde y con menor prioridad; los crawlers de IA (GPTBot, ClaudeBot, PerplexityBot) **no ejecutan JS**: ven una página vacía. El activo más citable del sitio es invisible justo para el canal GEO.
2. No hay páginas de precio m² **por ciudad** (`precio metro cuadrado quito` es la query citable por excelencia y hoy no tiene URL propia).
3. `sameAs` ausente en Organization (no hay grep hits en app/lib).
4. Sin señales E-E-A-T en guías: no hay autor, credenciales ni `Article` schema con `author`.
5. Verificación GSC/Bing no visible en el código (si está por DNS, confirmar; sin GSC no hay medición fiable — recordar que la analítica interna está inflada ~5x por bots).
6. Sin estrategia de backlinks: dominio joven compitiendo contra Plusvalía/Remax/InfoCasas sin autoridad externa.

## Ventaja competitiva

Ningún portal ecuatoriano publica un **índice de precios m² abierto, con metodología y actualización continua**. Plusvalía domina inventario pero no publica datos citables. Ese índice es el foso: atrae backlinks de prensa (El Comercio, Primicias, El Universo, revistas del sector), citas de IA y consultas long-tail de precios.

## Roadmap priorizado

### P0 — Datos citables (✅ implementado 2026-08-03)
1. ✅ `/estadisticas-inmobiliarias` server-renderizado (Server Component + ISR 1800s); las cifras van en el HTML con `Dataset` + `FAQPage` + `BreadcrumbList` JSON-LD y FAQ visible.
2. ✅ `/estadisticas-inmobiliarias/[ciudad]` — precio m² por sector y tipo, evolución, FAQ y metodología. Gate anti-thin-content: noindex bajo 3 anuncios comparables; sitemap/enlaces solo promocionan desde 5.
3. ✅ Sitemap (19 ciudades al lanzar), `llms.txt` y `llms-full.txt` con sección de precios con cifras reales; IndexNow ahora también avisa de las páginas de estadísticas afectadas al cambiar inventario.
4. ✅ Enlazado interno: landing de ciudad → página de precios → guías, y viceversa. Backend acepta `?city=` en `/api/market-stats/` (con test).

### P1 — E-E-A-T y máquina de contenido (semanas 2–6)
5. ✅ `sameAs` en Organization (2026-08-11). Perfiles reales localizados: Facebook
   (`GEO-Propiedades-Ecuador/61584860667586`) y TikTok (`@geopropiedadesecuador`).
   No hay Instagram, LinkedIn ni YouTube, así que no se declaran. La lista vive en
   `frontend/lib/constants.ts` y alimenta a la vez el grafo y los iconos del footer,
   que hasta ahora enlazaban a las portadas genéricas de Facebook e Instagram
   (regla `SEO-003`).
6. Verificación en buscadores. Google **ya está verificado** como propiedad de
   dominio (`sc-domain:geopropiedadesecuador.com`, por DNS), así que no necesita
   etiqueta. Bing sigue **sin verificar**: el código
   se lee de `NEXT_PUBLIC_BING_SITE_VERIFICATION` y solo falta dar de alta la
   cuenta en Bing Webmaster Tools (regla `SEO-004`). Bing alimenta a ChatGPT y
   Copilot, e IndexNow solo rinde medible con Bing verificado.
7. ✅ Infraestructura editorial construida: el blog reemplaza a `/guias` con autor,
   cargo, página de autor indexable, fechas reales, FAQ por artículo y revalidación
   al publicar. **Pendiente de despliegue**: producción sigue sirviendo `/guias`.
   La operativa — cadencia, brief mínimo y cola de temas — está en
   [`docs/seo/editorial-y-backlinks.md`](docs/seo/editorial-y-backlinks.md).
8. `BreadcrumbList` schema en fichas y landings si aún falta.

### P2 — Escala programática con control de calidad (semanas 4–8)
9. Landings por **sector/barrio** ("departamentos en venta en Cumbayá") solo donde el inventario supere un umbral mínimo (p. ej. ≥5 listados); por debajo, noindex — evitar thin content e index bloat.
10. Páginas comparativas de datos: "Quito vs Guayaquil: precio m²", "¿Dónde conviene invertir en 2026?" — generadas desde el mismo API de stats.

### P3 — Autoridad y backlinks (continuo, meses 2–6)
11. **Índice trimestral de precios** publicado como informe (página + PDF) con nota de prensa a medios ecuatorianos y gremios (APIVE, cámaras de la construcción). El objetivo es que citen "según Geo Propiedades Ecuador" con enlace.
12. Widgets/gráficos embebibles del precio m² con atribución con enlace.
13. Google Business Profile + citaciones locales básicas.
14. Data stories mensuales: "las 10 zonas que más subieron", "cuánto tarda en venderse una casa en Cuenca".

## Medición (usar GSC, no analítica interna — está inflada por bots)

| Métrica | Baseline | 3 meses | 6 meses | 12 meses |
|---|---|---|---|---|
| Clics orgánicos/mes (GSC) | medir | +100% | +300% | top-3 en queries de precios |
| Páginas indexadas | medir en GSC | +páginas de precios y sectores | — | — |
| Citas en IA (probar mensualmente "precio m² Quito" en ChatGPT/Perplexity) | 0 | primeras citas | citación consistente | fuente por defecto |
| Dominios de referencia | medir | +5 | +15 (prensa) | +40 |

## Dependencias del usuario
- ~~URLs de redes sociales para `sameAs`.~~ Resueltas 2026-08-11 desde los
  perfiles públicos de la marca.
- ~~Acceso/confirmación de Google Search Console.~~ Verificado por DNS.
- **Alta en Bing Webmaster Tools** (crear la cuenta y copiar el código a
  `NEXT_PUBLIC_BING_SITE_VERIFICATION`). Único bloqueo que queda de este bloque.
- Despliegue del blog: sin él, `/guias` sigue en producción y la máquina
  editorial no existe de cara a Google.
- Decisión sobre umbral mínimo de listados para landings de sector.
