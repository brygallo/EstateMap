# Gestión editorial y backlinks

Operativa de los puntos 7 y 11–14 de [`SEO-STRATEGY.md`](../../SEO-STRATEGY.md):
quién escribe, con qué cadencia, y a quién se le pide el enlace.

Estado del blog a 2026-08-11: el CMS está construido y **no desplegado**.
Producción sigue sirviendo `/guias` (200) y `/blog` responde 404. Nada de lo que
sigue rinde hasta que ese despliegue ocurra, porque los redirects
`/guias → /blog` viajan en el mismo build.

## Lo que el CMS ya resuelve

No hay que construir nada para empezar a publicar. `blog.urls` en el backend y
`frontend/lib/blog.ts` ya entregan:

| Señal E-E-A-T | Dónde vive |
| --- | --- |
| Autor con nombre y cargo | `author_name`, `author_role` en cada post |
| Página de autor indexable | `/blog/autor/[autor]`, con `Person` en JSON-LD |
| Fechas reales de publicación y revisión | `published_at`, `updated_at` |
| FAQ estructurada por artículo | `faqs[]` → `FAQPage` |
| Enlazado interno editorial | `related_links[]` |
| Categoría y ciudad | `category`, `city` |
| Publicación inmediata | Django hace POST a `/api/revalidate` con `blog` y `blog-<slug>` |

Consecuencia práctica: **un artículo sin autor y sin cargo desperdicia la mitad
del valor del sistema.** Los campos existen; dejarlos vacíos es una decisión, no
un límite.

## Gobierno editorial

**Cadencia:** 2–4 artículos al mes. Por debajo de 2 el blog no acumula
autoridad temática; por encima de 4 sin equipo, la calidad cae y aparece
contenido fino, que es exactamente lo que `SEO-001` evita en las landings.

**Firma:** cada artículo lleva un autor real con cargo verificable. Para temas
legales o financieros (crédito VIP/VIS, ley de inquilinato, impuestos), el autor
debe ser alguien con esa credencial o el artículo debe citar y enlazar la fuente
oficial. Google trata mal el consejo financiero anónimo, y los motores de IA
citan preferentemente lo que tiene autoría atribuible.

**Brief mínimo antes de escribir:**

1. La consulta exacta a la que responde el artículo y por qué el sitio puede
   responderla mejor que Plusvalía (casi siempre: porque tenemos el dato de m²).
2. Al menos una cifra propia sacada de `/api/market-stats/`. Un artículo sin
   dato propio es replicable por cualquiera y no atrae enlaces.
3. Tres FAQs redactadas para ser citadas sueltas: pregunta literal, respuesta
   autocontenida en 2–3 frases. Es la unidad que extraen AI Overviews y
   Perplexity.
4. Dos `related_links`: uno a la página de precios de la ciudad tratada, otro a
   un artículo hermano.
5. Fuente oficial enlazada cuando se cite normativa o cifra ajena
   (INEC vía [ecuadorencifras.gob.ec](https://www.ecuadorencifras.gob.ec),
   [BIESS](https://www.biess.fin.ec), MIDUVI, SRI).

**Revisión:** `updated_at` es una señal real, no cosmética. Revisar los
artículos de normativa cada vez que cambie la norma, y los de precios cada
trimestre junto al informe. Tocar la fecha sin tocar el contenido es
exactamente el vicio que `SEO-002` corrige en el dataset.

## Cola editorial priorizada

Ordenada por intención transaccional y por hueco competitivo, no por facilidad.

| # | Tema | Consulta objetivo | Por qué gana |
| --- | --- | --- | --- |
| 1 | Crédito VIP y VIS 2026: requisitos y montos | `credito vip ecuador requisitos` | Alto volumen, respuestas dispersas en PDFs oficiales |
| 2 | Cuánto cuesta comprar una casa: notaría, registro e impuestos | `gastos comprar casa ecuador` | Ya rinde como guía; migrarla y ampliarla con cifras por ciudad |
| 3 | Ley de inquilinato: qué puede y qué no puede hacer el arrendador | `ley de inquilinato ecuador` | Consulta perenne, competencia legalista y mal escrita |
| 4 | Plusvalía municipal y alcabalas al vender | `impuesto alcabala ecuador` | Nadie lo explica con ejemplos numéricos |
| 5 | Trámites en el Registro de la Propiedad, paso a paso | `registro de la propiedad tramite` | Long-tail informacional que alimenta el resto |
| 6 | Precio del m² por sector: Quito / Guayaquil / Cuenca | `precio metro cuadrado quito` | Dato propio; ancla de todo el cluster |
| 7 | Dónde conviene invertir en 2026 según el m² | `donde invertir bienes raices ecuador` | Formato citable por IA y por prensa |
| 8 | Mejores zonas para vivir: Ambato, Manta, Loja, Riobamba | `mejores zonas para vivir <ciudad>` | Ciudades con inventario propio y sin cobertura decente |

Los temas 6 y 7 son además el material de la nota de prensa: escríbanse primero
si el objetivo del trimestre son enlaces y no tráfico.

## Backlinks: el activo y el argumento

El foso es el **índice de precios m²**. Ningún portal ecuatoriano publica uno
abierto con metodología. Un medio no enlaza un portal inmobiliario porque se lo
pidan; enlaza una fuente de datos porque la necesita para su nota.

Por eso la secuencia es: primero existe el informe trimestral con metodología
pública, después se contacta. Al revés no funciona y quema el contacto.

**El pitch, en una frase:** «Publicamos el precio del m² por ciudad y sector en
Ecuador, con metodología abierta y actualización continua; aquí está el informe
del trimestre y los datos en bruto por si quieren graficarlos.»

### Objetivos por prioridad

**Nivel 1 — gremios y sectorial.** Enlazan más fácil, son temáticamente
relevantes y su enlace vale más de lo que sugiere su tráfico.

| Organización | Sitio | Ángulo |
| --- | --- | --- |
| CAMICON — Cámara de la Industria de la Construcción | [camicon.ec](https://camicon.ec) | Datos de m² para sus boletines a agremiados |
| ACBIR — corredores de bienes raíces | [acbir.com](https://acbir.com) | Herramienta gratuita para sus afiliados; ficha en su directorio |
| Revista Clave! Bienes Raíces | [clave.com.ec](https://clave.com.ec) | Medio sectorial de referencia; colaboración de columna con datos |
| APIVE — promotores de vivienda | verificar sitio vigente | Interés directo en series de precio de vivienda nueva |
| Cámara de la Construcción de Guayaquil | verificar sitio vigente | Mismo ángulo que CAMICON, plaza costa |

**Nivel 2 — prensa económica.** Publican datos y citan fuente con enlace.

| Medio | Sitio | Ángulo |
| --- | --- | --- |
| Primicias | [primicias.ec](https://primicias.ec) | Sección económica, receptiva a datos originales |
| Revista Gestión | [revistagestion.ec](https://revistagestion.ec) | Análisis largo; encaja el informe trimestral completo |
| Ekos | [ekosnegocios.com](https://ekosnegocios.com) | Negocios e inversión; ángulo «dónde invertir» |
| Expreso | [expreso.ec](https://expreso.ec) | Plaza Guayaquil, datos de la costa |

**Nivel 3 — diarios generalistas.** Mayor autoridad, más difíciles. Van después
de tener una o dos citas de Nivel 2 que sirvan de prueba.

| Medio | Sitio |
| --- | --- |
| El Comercio | [elcomercio.com](https://elcomercio.com) |
| El Universo | [eluniverso.com](https://eluniverso.com) |

Los contactos nominales no se guardan en el repositorio: rotan y son datos
personales. Cada medio publica su contacto de redacción en su propia web; el
seguimiento va en la hoja de prensa del equipo, no aquí.

### Táctica que no depende de que nadie conteste

Estas producen enlaces sin gestión, y conviene tenerlas antes de escribir el
primer correo:

1. **Widget embebible del precio m²** con atribución enlazada. Quien lo usa,
   enlaza. Multiplica cada contacto exitoso.
2. **Datos en bruto descargables** (CSV) junto al informe. Un periodista que
   grafica tus datos cita la fuente.
3. **Ficha en directorios sectoriales** de ACBIR y cámaras: enlace estable y
   temáticamente exacto.
4. **Google Business Profile** + citaciones NAP básicas, coherentes con el
   `contactPoint` que ya declara el `Organization`.

### Qué medir

En Search Console, no en la analítica interna: está inflada ~5x por bots.
Dominios de referencia en el informe de enlaces de GSC, trimestralmente. La meta
de `SEO-STRATEGY.md` es +5 a los 3 meses, +15 a los 6 (con prensa) y +40 al año.

## Bloqueo actual

Nada de esto se mide hasta que Bing Webmaster Tools esté verificado: IndexNow ya
envía, pero su informe es invisible, y Bing es lo que alimenta a ChatGPT y
Copilot. El código para la etiqueta ya está (`NEXT_PUBLIC_BING_SITE_VERIFICATION`,
regla `SEO-004`); falta el alta de la cuenta.
