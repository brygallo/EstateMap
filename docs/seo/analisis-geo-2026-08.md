# Análisis GEO: cómo ven el portal los buscadores con IA

Auditoría de `geopropiedadesecuador.com` frente a AI Overviews, AI Mode,
ChatGPT, Perplexity y Copilot. Fecha: 19 de agosto de 2026.

Todo lo que sigue está medido sobre el HTML que devuelve producción, sobre
`robots.txt`, `llms.txt`, `sitemap.xml` y sobre el código de este repositorio.
Lo que es estimación va marcado como tal.

## Puntuación: 72/100

| Criterio | Peso | Puntos | Estado |
| --- | --- | --- | --- |
| Accesibilidad técnica | 20 | 19 | Casi perfecto |
| Legibilidad estructural | 20 | 18 | Muy bien |
| Citabilidad de pasajes | 25 | 19 | Bien, con respuestas demasiado cortas |
| Contenido multimodal | 15 | 9 | Imágenes y tablas sí, vídeo no |
| Autoridad y señales de marca | 20 | 7 | **El cuello de botella** |

La parte que depende del código está prácticamente resuelta. Lo que falta casi
todo vive fuera del dominio, y eso no se arregla programando.

### Estimación por plataforma

Son estimaciones derivadas de los criterios anteriores y de dónde cita cada
motor, **no** mediciones de citas reales. Medirlas requiere consultar cada motor
con las preguntas objetivo o contratar datos (DataForSEO).

| Plataforma | Estimación | Por qué |
| --- | --- | --- |
| Google AI Overviews | 78 | Cita lo que ya posiciona; el esquema y el SSR están completos |
| Google AI Mode | 70 | Pesa frescura y autoridad de entidad; la frescura tiene fallos |
| Bing Copilot | 72 | IndexNow ya avisa a Bing (`backend/real_estate/services/indexnow.py`) |
| ChatGPT | 58 | Casi la mitad de sus citas salen de Wikipedia; la marca no existe ahí |
| Perplexity | 52 | Casi la mitad de sus citas salen de Reddit; la marca no existe ahí |

## Lo que ya está bien hecho

No hace falta volver sobre esto:

- **Los 22 rastreadores de IA relevantes están permitidos explícitamente** en
  `robots.txt`: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot,
  Claude-User, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended,
  GoogleOther, Applebot, Applebot-Extended, meta-externalagent, DuckAssistBot,
  MistralAI-User, Amazonbot, Bytespider, cohere-ai y FacebookBot. Ninguno está
  bloqueado; solo se les cierran rutas privadas (`/api/`, cuenta, admin).
- **`llms.txt` y `llms-full.txt` existen y son buenos**: 16 KB y 33 KB con
  inventario real (15.731 propiedades, rango de precios), directorio por ciudad
  y provincia, precios del m², una sección «Cómo citar o responder sobre el
  sitio» y otra de «Limitaciones». Google ha dicho que este archivo no es hoy
  una palanca de citación, así que no le atribuyo puntos, pero está bien hecho.
- **Todo el contenido citable se renderiza en el servidor.** Los rastreadores de
  IA no ejecutan JavaScript, y aquí no lo necesitan: la home trae 873 palabras
  en el HTML, la ficha 639, el artículo del m² 1.402, la estadística de Quito
  697. Los títulos de las propiedades destacadas viajan como `h3` en el HTML.
- **Esquema completo y correcto**: `Organization` + `WebSite` + `Service` en
  todas las páginas; `Dataset` con `variableMeasured` y `dateModified` en las
  estadísticas; `FAQPage`, `BreadcrumbList`, `ItemList`, `Article` y
  `RealEstateListing` donde corresponde.
- **Encabezados en forma de pregunta** en lo que más se puede citar: «¿Cuánto
  cuesta el metro cuadrado en Quito?» como `h1`, y tres `h3` de preguntas.
- **Bloques de respuesta directa ya colocados arriba**: «Respuesta rápida para
  buscadores e IA» al 21 % de la home, «Respuesta rápida» al 16 % de la página
  de Quito, «Actualizado el 19 de agosto de 2026» al 8 % de la estadística.
- **Dato propio y verificable**: el precio del m² calculado sobre inventario
  activo, con método declarado (IQR) y tamaño de muestra. Es el activo más
  citable que tiene el portal y ya existe en 65 páginas de ciudad.

## Hallazgos

### 1. La marca no existe fuera de su propio dominio — 20 puntos en juego

Buscando la marca en la web abierta no aparece **ninguna** presencia en
Wikipedia, Wikidata, Reddit, YouTube ni LinkedIn. El `sameAs` de `Organization`
declara solo Facebook y TikTok.

Esto importa más que cualquier otra cosa de esta lista. Según el estudio de
Ahrefs de diciembre de 2025 sobre 75.000 marcas, las menciones de marca
correlacionan unas 3 veces más con las citas de IA que los backlinks, y YouTube
es la señal más fuerte (~0,737 frente a ~0,266 del Domain Rating). ChatGPT toma
el 47,9 % de sus citas de Wikipedia y Perplexity el 46,7 % de Reddit: en las dos
plataformas donde el portal puntúa peor, la fuente dominante es exactamente
aquella donde no tiene presencia.

Hay una ventaja aprovechable: `marketing/videos/` ya es una fábrica de vídeo que
produce piezas verticales. Publicarlas también en un canal de YouTube y añadirlo
a `sameAs` es la acción de mayor retorno por esfuerzo de todo el informe.

### 2. La marca compite con otras cuatro que se llaman igual

«Geo Propiedades» también es `geopropiedades.com` (inversiones y minería),
`@geo.propiedades_` y `@geo_propiedades_pm` en Instagram, y «Chile Geo
Propiedades» en Facebook. Además, GeoBienes ocupa resultados para consultas de
marca parecidas. Un motor que recibe «¿qué es Geo Propiedades?» no tiene con qué
desambiguar, y una respuesta que mezcle las dos empresas es peor que ninguna.

Se corrige con entidad, no con contenido: un ítem en Wikidata, `alternateName`
en el esquema, nombre consistente «Geo Propiedades Ecuador» en todas partes y un
`sameAs` que enlace todos los perfiles propios.

### 3. `dateModified` es anterior a `datePublished` en 8 de 15 artículos

> **Arreglado el 19 de agosto de 2026**, pendiente de desplegar. La fecha
> declarada es ahora la más tardía entre modificación y publicación
> (`articleModifiedAt`, regla BLOG-012).

Los artículos del lote programado declaran que se modificaron antes de
publicarse:

| Artículo | Publicado | Modificado |
| --- | --- | --- |
| cuanto-cuesta-el-metro-cuadrado-en-ecuador-ciudad-por-ciudad | 2026-08-12 | 2026-08-11 |
| mejores-zonas-para-vivir-en-guayaquil | 2026-08-13 | 2026-08-11 |
| alcabala-y-utilidad-que-se-paga-al-transferir-un-inmueble | 2026-08-14 | 2026-08-11 |
| biess-o-banco-privado-como-elegir-el-credito-hipotecario | 2026-08-15 | 2026-08-11 |
| vivir-en-los-valles-de-quito-cumbaya-tumbaco-y-puembo | 2026-08-16 | 2026-08-11 |
| cuanto-vale-mi-casa-como-estimar-el-precio-real | 2026-08-17 | 2026-08-11 |
| escrituracion-paso-a-paso-de-la-promesa-al-registro | 2026-08-18 | 2026-08-11 |
| cuanto-necesitas-de-entrada-para-comprar-una-vivienda | 2026-08-19 | 2026-08-11 |

La causa es la programación editorial: `published_at` es la fecha futura de
publicación y `updated_at` es cuándo se escribió. El esquema se arma con esos
dos campos tal cual en `frontend/app/blog/[slug]/page.tsx:110-111`. Los doce
artículos restantes del lote (20–31 de agosto) caerán en lo mismo al publicarse.

Es contradictorio justo en la señal que más pesa en AI Mode: el contenido de
menos de tres meses tiene alrededor del triple de probabilidad de ser citado.
La corrección es emitir `dateModified` como el máximo entre ambas fechas.

### 4. El `lastmod` del sitemap es la hora de renderizado, no una fecha real

> **Arreglado el 19 de agosto de 2026**, pendiente de desplegar. El listado ya
> entrega `updated_at` y el sitemap omite el campo si algún día deja de
> llegar, en vez de volver a declarar la hora actual (regla SEO-006).

Las 16.337 URL del sitemap declaran el mismo `lastmod`. El código pretende
justo lo contrario — `frontend/app/sitemap.ts:43-45` dice que declarar «ahora»
en cada petición hace que Google ignore el campo — pero el dato nunca llega:

- `frontend/app/sitemap.ts:20` lee `p.updated_at || p.created_at`.
- El listado `/properties/` responde con `MapPropertySerializer`
  (`backend/real_estate/views.py:338-341`), cuyo `fields`
  (`backend/real_estate/serializers.py:455-476`) **no incluye ninguno de los dos
  campos**. Verificado en producción: la respuesta trae 21 campos y ninguno es
  una fecha.
- Con todas las fechas nulas, `latestDate()` devuelve su `fallback`, que es
  `now` (`frontend/app/sitemap.ts:32`).

Resultado: el portal pide recrawlear 15.861 fichas cada hora con la misma
prioridad y sin distinguir la que cambió de las que no.

### 5. Las respuestas de las FAQ son demasiado cortas para ser citadas enteras

El pasaje óptimo para citación ronda las 134-167 palabras. Las respuestas
actuales miden entre 14 y 41:

| Página | Pregunta | Palabras |
| --- | --- | --- |
| Estadísticas Quito | ¿Cuánto cuesta el metro cuadrado en Quito en 2026? | 41 |
| Estadísticas Quito | ¿Cuál es el sector más caro de Quito? | 22 |
| Home | ¿Dónde puedo encontrar propiedades en Ecuador? | 37 |
| Home | ¿Qué tipos de propiedades puedo encontrar? | 14 |

Son correctas y no engañan, pero se citan como una línea suelta sin el dato que
haría que valga la pena nombrar la fuente. Una respuesta de ~150 palabras que
incluya la cifra, el tamaño de muestra, el método y una comparación se cita
completa y arrastra la marca con ella.

### 6. Las 65 páginas de estadísticas por ciudad no se declaran en `llms.txt`

`llms.txt` y `llms-full.txt` mencionan 15 URL de `estadisticas-inmobiliarias/`,
pero el sitemap publica 65. La causa no es el generador: el endpoint de
estadísticas devuelve `by_city` con `limit=15`
(`backend/real_estate/views.py:2106`), así que `llms.txt` solo puede listar las
quince ciudades que recibe.

Ojo con la corrección evidente. Las cincuenta restantes tienen menos inventario,
y publicar su precio por m² junto al de Quito las pondría al mismo nivel: es
justo lo que evita el umbral de promoción de BLOG-009. La forma honesta es
listarlas como enlaces sin cifra, o subir el límite solo para el consumidor que
no publica precios.

### 7. El autor es genérico

El esquema `Article` declara `author: Person "Equipo Geo Propiedades Ecuador"`,
`jobTitle: "Redacción inmobiliaria"`, sin `sameAs` ni credenciales. La página de
autor existe y responde 200, así que la corrección es de contenido: una persona
real con perfil verificable, o al menos una descripción de la organización que
explique por qué sus cifras son fiables (se calculan sobre su propio inventario,
que es un argumento fuerte y hoy no se usa como credencial).

### 8. Sin vídeo ni elementos interactivos — 6 puntos de multimodalidad

El contenido con elementos multimodales se selecciona bastante más
(≈156 % según el criterio del sector). Hay fotos y tablas; no hay vídeo
incrustado, ni infografías, ni calculadora. Una calculadora de «cuánto vale mi
m²» sobre datos que ya existen sería a la vez contenido único y activo enlazable.

### 9. Sin licencia legible por máquina (RSL 1.0) — informativo

No hay `/.well-known/rsl.xml` ni `license.xml`. Es un estándar emergente
(diciembre de 2025) sin efecto conocido sobre citación; lo dejo anotado, no
recomendado.

## Los cinco cambios de mayor impacto

1. **Construir presencia de entidad fuera del dominio.** Canal de YouTube con lo
   que ya produce `marketing/videos/`, ítem en Wikidata, perfil de LinkedIn de
   la empresa, y respuestas genuinamente útiles en foros donde se pregunte por
   precios de vivienda en Ecuador. Luego declararlo todo en `sameAs`. Es el
   único de los cinco que no es código, y es el que más pesa.
2. **Arreglar las dos señales de frescura**: `dateModified` como máximo entre
   modificación y publicación, y exponer `updated_at` en el listado para que el
   `lastmod` del sitemap vuelva a ser verdad.
3. **Convertir la respuesta principal de cada página de estadísticas en un
   bloque autónomo de 134-167 palabras**, con cifra, muestra, método y
   comparación con el promedio nacional. Son 65 páginas con dato propio: es la
   vía más corta a ser citado con nombre.
4. **Resolver la ambigüedad de marca**: `alternateName`, nombre consistente y
   `sameAs` completo, para que un motor pueda separar este portal de las otras
   cuatro «Geo Propiedades».
5. **Declarar las 65 páginas de ciudad en `llms.txt` y enlazarlas desde los
   artículos del blog**, que es donde hoy hay tráfico y contexto.

## Reescrituras concretas

Ejemplo para `estadisticas-inmobiliarias/quito`, sustituyendo la respuesta de 41
palabras por uno de ~150 (las cifras son las que ya calcula la página; el bloque
se genera con los mismos datos, no se escribe a mano):

> El metro cuadrado en Quito cuesta en promedio 762 dólares, calculado sobre las
> 8.539 propiedades en venta activas publicadas en Geo Propiedades Ecuador a
> agosto de 2026. Es un 5 % menos que el promedio nacional, que está en 802
> dólares por metro cuadrado sobre 14.851 propiedades. Dentro de la ciudad la
> diferencia entre sectores es mucho mayor que la diferencia entre ciudades: La
> Carolina promedia 1.420 dólares por metro cuadrado, frente a los 762 de la
> ciudad entera. La propiedad promedio en
> venta en Quito pide 373.724 dólares por 2.510 metros cuadrados de área, una
> cifra que arrastran los terrenos: el precio por metro de un departamento y el
> de un lote no son comparables. El cálculo usa solo anuncios activos con precio
> y área válidos, y excluye los extremos con el método de rango intercuartílico.

Qué hace distinto: da la cifra en las primeras 20 palabras, la contextualiza
contra el promedio nacional, advierte de una confusión real (precio medio contra
precio por metro), y cierra con el método. Es autónomo: se puede citar sin el
resto de la página y sigue siendo verdad.

## Cómo medir si esto funciona

Ninguna de las estimaciones por plataforma es una medición. Para tener datos
reales hacen falta consultas periódicas a cada motor con las preguntas objetivo
(«cuánto cuesta el metro cuadrado en Quito», «dónde buscar terrenos en
Ecuador») anotando si el portal aparece citado y con qué URL. Es un trabajo
manual de media hora al mes, o automatizable con datos de pago.
