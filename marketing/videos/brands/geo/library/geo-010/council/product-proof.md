# Perímetro de verdad — video 010

Rol: Verificador de producto y negocio. Contrato `VIDEO_COUNCIL_V1`.
Pieza: `library/geo-010` (renderizada, `review.json` `passed: true`, sin firma humana).
Pregunta cerrada: ¿toda afirmación verificable está respaldada por specs y código vigentes,
y ninguna promete algo que el producto no hace?

Alcance de este informe: la voz, el caption, los rótulos que sí se renderizan
(`render-props.json`) y las animaciones que los ilustran. No reescribo guion, no propongo
ganchos y no toco otro archivo.

---

## Hechos permitidos

Cada uno con implementación citable hoy.

1. **Las propiedades del portal se ven sobre un mapa.**
   - `frontend/components/maps/MapLibreMap.tsx:350-469` — fuentes y capas `properties`,
     `property-polygons`, `selected-property`, `selected-polygon`, `user-location`.
   - `backend/real_estate/services/map_payload.py:7-18` — `POINT_FIELDS` lleva
     `latitude`, `longitude` y `polygon`; `map_payload.py:139-141` los materializa.
   - `specs/ui/visibility-rules.yaml:75-96` (VIS-002, `implemented`).

2. **El mapa base es de calles, así que se ven las vías y el entorno.**
   - `frontend/components/maps/maplibre-style.ts:11-35` — raster Carto Voyager
     (`carto-base`) más capa satelital Esri opcional (`esri-base`, oculta por defecto).
   - `frontend/components/maps/MapLibreMap.tsx:871` — el conmutador `streets` / `satellite`.

3. **«Ver dónde está y cómo llegar» ya es copy publicado del portal.**
   - `frontend/app/help/page.tsx:185-187`: «quien busca no solo ve tu propiedad, entiende
     dónde está y cómo llegar». La escena 7 mantiene *message match* con la página viva.

4. **Un anuncio sin ubicación no llega al mapa; el formulario lo detiene antes.**
   - `frontend/app/add-property/page.tsx:1077` — `blockPublication('missing_location', …)`.
   - `specs/workflows/publish-property.yaml:702-703` (WFP-016, `implemented`).
   - `backend/real_estate/services/map_payload.py:197-202` — `_row_has_valid_point` descarta
     filas sin punto válido.
   - `specs/domains/properties.yaml:1075-1100` (PROP-027, `implemented`) — la posición sale
     del par lat/lng o del centroide del polígono.

5. **El mapa no publica contadores de visitas.**
   - `specs/ui/visibility-rules.yaml:15-72` (VIS-001, `partial`): el payload del mapa no
     lleva `views_count`; las fugas conocidas están en el detalle público y en
     `intelligence`, no en el mapa. La pieza no menciona visitas en ninguna escena.

6. **El precio por metro cuadrado es una división real que el portal ya hace.**
   - `specs/calculations/pricing.yaml:71-102` (PRC-002, `implemented`), `price / area`.
   - Eso respalda **el método**. Las cifras concretas de la escena 6 no necesitan fuente:
     son dato de ejemplo permitido por `marketing/videos/brands/geo/memory/decisions.md:51` y
     `marketing/videos/CLAUDE.md:16`, y van rotuladas `EJEMPLO` en la propia tarjeta
     (`simulations.tsx:2559`). Lo que sí falla es su verosimilitud: ver IMPORTANTE-4.

7. **Las siete animaciones existen y están registradas** (contra lo que dice
   `plan.json:17`): `marketing/videos/planner.py:190-202` y
   `marketing/videos/remotion/src/simulations.tsx:3585-3597`. La pieza se renderizó con
   las ocho escenas (`production.json`, `render-props.json`).

---

## Matices obligatorios

1. **La afirmación de producto termina en «se ve».** El mapa muestra la propiedad sobre un
   callejero; no calcula rutas, no da indicaciones paso a paso y no integra ningún servicio
   de direcciones. Búsqueda en `frontend/` sin resultados para `directions`, `google.com/maps`
   o `waze` fuera del texto de ayuda. «Por dónde se llega» solo puede significar «ves las
   vías que llegan».
2. **No hay exactitud topográfica ni información del edificio.** `specs/ui/visibility-rules.yaml:104-131`
   (VIS-003, `implemented`) y `:132-145` (VIS-004, `proposed`): el polígono viaja exacto y
   `show_measurements` solo cambia etiquetas. El portal no tiene ascensor, cisterna, actas,
   alícuota ni estado del edificio en ningún campo; la pieza tampoco lo insinúa, y no debe
   hacerlo en una variante.
3. **«Las propiedades están sobre el mapa» es cierto de todo lo que el mapa dibuja, pero el
   backend no lo garantiza.** `backend/real_estate/serializers.py:377-378, 430, 462` no marca
   `latitude` como obligatoria; el bloqueo vive en el frontend, que no es frontera de
   seguridad (`agents/CLAUDE.md`). No extender la frase a «todas las propiedades del Ecuador».
4. **Por debajo de zoom 9.2 el mapa agrupa en clústeres.**
   `backend/real_estate/services/map_payload.py:20` (`MAX_CLUSTER_ZOOM = 9.2`). La escena 7
   baja hasta la manzana, así que el matiz se respeta; ninguna burbuja de cantidad aparece.
5. **Un dato de ejemplo en pantalla no es una afirmación de mercado, pero tiene tres
   condiciones.** `marketing/videos/CLAUDE.md:16` y `memory/decisions.md:51`: va rotulado
   `EJEMPLO`, es verosímil para el sujeto de la pieza y la voz no lo pronuncia como dato.
   Prohibido sigue siendo lo otro: inventario, demanda, porcentajes o un «el metro cuadrado
   está en $X» sin fuente fechada (`CLAUDE.md:15`). El portal tampoco publica precios de
   referencia por m² por ciudad en la superficie que este video usa.
6. **El descargo legal solo existe en el caption.** Si el video circula descargado o
   reposteado, viaja sin él.

---

## Afirmaciones prohibidas

Lista de control aplicada literalmente sobre `plan.json` (`narration`, `caption`, `voice`,
`on_screen_text`), `script.md`, `caption.txt`, `subtitles.srt` y los rótulos realmente
renderizados en `render-props.json`.

| Prohibición | ¿Aparece? | Comprobación |
| --- | --- | --- |
| Lenguaje de propietario: publicar, gratis, sin comisión, sin límite | No | `grep -icE "gratis\|sin comisión\|publica\|…"` sobre `caption.txt` y `subtitles.srt` → 0 |
| Cifras de inventario, demanda o cobertura | No | Ninguna en voz ni caption |
| Precios de mercado o plusvalía en la voz | No | La voz nunca dice un monto: no hay ningún «el metro cuadrado está en $X» |
| Precios y áreas de ejemplo en pantalla | Permitido | Escena 6, rotulada `EJEMPLO` (`simulations.tsx:2559`, `FieldShell`). No es afirmación de mercado: `decisions.md:51`, `CLAUDE.md:16`. Su verosimilitud sí falla — IMPORTANTE-4 |
| Contadores de visitas | No | Nada en la pieza; VIS-001 protege además el payload |
| Datos privados, contacto, panel administrativo | No | Ninguna escena muestra ficha ni panel |
| Juicios de zona: buena, segura, rentable | No | La escena 7 enumera qué se ve (zona, vías, acceso), no cómo juzgarlo |
| Kit social, láminas, QR, publicación automática, video automático | No | No se nombran; `specs/proposals/social-kit.yaml` queda fuera |
| Asesoría legal o requisito legal taxativo en la voz | No | Todo va en imperativo de procedimiento: «pide», «pregunta», «revisa», «que los lea un abogado» |
| **Afirmación jurídica taxativa en un rótulo** | **Sí** | Escena 1 — ver IMPORTANTE-1 |
| Escasez, urgencia, prueba social, testimonios | No | No hay ninguna |

Citas literales de lo que sí cruza una línea (con su escena) en **Hallazgos**.

Lo que sí resiste el criterio del punto 3 del encargo (procedimiento, no sentencia jurídica):

- Escena 2: «Pide la declaratoria de propiedad horizontal y el reglamento interno. Ahí dice
  qué es tuyo y qué es común.» — describe la función del documento, no impone un requisito.
- Escena 2: «revisa que el parqueadero y la bodega consten en la escritura, no que te los
  hayan asignado de palabra» — comprobación, no dictamen.
- Escena 3: «pide por escrito, firmado por la administración, que el vendedor esté al día» —
  petición documental.
- Escena 5: «Que los lea un abogado, línea por línea, antes de firmar cualquier cosa» — es
  la frase que sostiene todo el bloque documental y remite explícitamente al profesional.

---

## Evidencia visual disponible

Qué puede demostrar cada afirmación, y con qué se demostró de hecho.

| Escena | Afirmación | Recurso usado | ¿Demuestra lo que dice? |
| --- | --- | --- | --- |
| 1 | Compras una parte de un edificio | `sim:que-compras` (`simulations.tsx:2583-2714`); el propio panel rotula «No compras solo el piso» (`:2603`) | Sí en el panel; el rótulo de la fábrica dice otra cosa (IMPORTANTE-1) |
| 2 | Declaratoria, reglamento, parqueadero y bodega en la escritura | `sim:propiedad-horizontal` (`:2715-2829`): «EN LA ESCRITURA», «Parqueadero Nº 12», «Bodega Nº 7», «De palabra se borra / La escritura no» | Sí |
| 3 | Alícuota mensual y certificado de estar al día | `sim:alicuota` (`:2830-2953`): recibos por mes, «El vendedor está al día», «Firmado por la administración». El monto es una barra tramada tras el «$» (`:2874-2876`), sin cifra inventada | Sí, y es el tratamiento correcto de una cifra que no se puede sostener |
| 4 | Actas y estado del edificio | `sim:edificio` (`:2954-3040`): «Lo que ya se decidió», «Cuota extra para el arreglo» (`:2979`), Ascensor, Bomba, Cisterna, Humedades | Sí |
| 5 | Escrituras, gravámenes y predial leídos por un abogado | `sim:gravamenes` = `EncumbrancesSim` (`:3041-3088`): Hipoteca, Embargo, Demanda, Impuesto predial, estados «LEYENDO/LEÍDO» | Parcial: el encabezado dice «¿Debe algo el **terreno**?» (`:3049`) — IMPORTANTE-2 |
| 6 | Comparar metros útiles | `sim:dividir` = `PlotUnitPriceSim` (`:3457-3520`), tarjeta rotulada `EJEMPLO` | No: compara dos superficies totales de tamaño de **lote** y rotula «ÁREA DECLARADA»; no distingue útil de común — IMPORTANTE-4 |
| 7 | El entorno se ve antes de ir | `sim:alrededor` = `PlotSurroundingsSim` (`:3241-3340`) | Parcial: la idea sí; las etiquetas y la ruta trazada no salen del producto — IMPORTANTE-3 |
| 8 | CTA de marca | Tarjeta de cierre, `asset: null` | Sí |

Evidencia disponible y **no usada** que sí sostendría la escena 7 sin inventar interfaz: el
callejero real (`maplibre-style.ts:11-35`) y el conmutador calles/satélite
(`MapLibreMap.tsx:871`), sin etiquetas añadidas ni ruta dibujada.

---

## Hallazgos

### BLOQUEANTE-1 — ANULADO por el editor jefe (queda IMPORTANTE-4)

Este hallazgo sostenía que las cifras de la escena 6 eran «cifras inventadas prohibidas». El
editor jefe lo anuló por el protocolo de desacuerdo de `council.md:207-217`, con dos razones
que verifiqué una por una y que son correctas:

1. **La regla no prohíbe una cifra de ejemplo.** `marketing/videos/brands/geo/memory/decisions.md:48-51`,
   decisión del 2026-08-13 «Ninguna animación inventa cifras», prohíbe *afirmaciones sobre el
   mundo o sobre la plataforma sin fuente fechada* —los totales de inventario borrados de
   `sim:mapa`, `sim:llegada` y `sim:zona`— y en el mismo apartado autoriza lo contrario
   (`decisions.md:51`): «Lo que sí puede ser ilustrativo. El precio de un anuncio, sus fotos y
   sus características: son el ejemplo de una propiedad, no una afirmación sobre el tamaño de
   la plataforma.» Un precio y un área que solo existen para enseñar una división caen en el
   caso permitido, no en el prohibido.
2. **Mi premisa de hecho era falsa.** Escribí que «nada en pantalla lo dice». Sí lo dice: la
   tarjeta lleva el rótulo `EJEMPLO` arriba a la derecha, y no está en la escena sino en el
   marco compartido —`marketing/videos/remotion/src/simulations.tsx:2559`, dentro de
   `FieldShell` (`:2527-2566`)—, que es el que usa `PlotUnitPriceSim` (`:3474`). Está, por
   tanto, en todas las escenas de tarjeta de la pieza. Comprobado en el código, no en el plan.

Doy el fundamento por caído y no lo defiendo. Lo que sobrevive por sí mismo baja a
IMPORTANTE-4. No hay ningún otro BLOQUEANTE-1: el único bloqueante de este informe es el
BLOQUEANTE-2 de abajo.

### BLOQUEANTE-2 — El registro de verificación de la pieza ya no describe la realidad

Cita (`plan.json:17`, repetida en `script.md:42`): «Cuatro escenas quedan con asset null a
propósito: el brief pide sim:que-compras, sim:propiedad-horizontal, sim:alicuota y
sim:edificio, y esas animaciones todavía no existen ni están registradas en Python y
Remotion […] el render no se lanza hasta que las cuatro estén implementadas.»

Refutado: las cuatro existen y están registradas —`marketing/videos/planner.py:190-193` y
`marketing/videos/remotion/src/simulations.tsx:3585-3588`—, las escenas 1 a 4 llevan esos
`asset` en `plan.json:38, 47, 56, 65`, y la pieza se renderizó con ellas
(`render-props.json`, escenas 1-4; `production.json`, `rendered_at 2026-08-14T17:43`).

Bloquea porque `verification_notes` es el documento que una persona lee antes de firmar. Un
registro que contradice el artefacto no puede sostener una firma, aunque el desfase sea a
favor (las animaciones sí se construyeron). Dueño: editor jefe.

### IMPORTANTE-1 — Rótulo de la escena 1 taxativo y jurídicamente falso sin sonido

Cita (rótulo renderizado, `render-props.json` escena 1 `headline`, y `plan.json:37`):
«**Compras el edificio**».

La voz es correcta: «Compras una parte de un edificio» (`plan.json:36`). El panel de la
animación también: «No compras solo el piso» (`simulations.tsx:2603`). El rótulo, leído sin
sonido —requisito explícito de `marketing/videos/CLAUDE.md`, «La pieza debe entenderse sin
sonido»—, afirma algo que no es cierto en propiedad horizontal: se compra una unidad más una
alícuota sobre bienes comunes. Es el único texto de la pieza que cruza de procedimiento a
sentencia. No lo reescribo: dueño Estrategia.

### IMPORTANTE-2 — La escena 5 muestra «terreno» en una pieza sobre departamentos

Cita (voz, `plan.json:72`): «Las escrituras, el certificado de gravámenes y el predial al día
no los revisas por encima.» Rótulo: «Léelo con abogado».

`sim:gravamenes` es `EncumbrancesSim`, cuyo encabezado fijo es
`title="¿Debe algo el terreno?"` (`simulations.tsx:3049`). El bloque de documentos sí coincide
con la voz (Hipoteca, Embargo, Demanda, Impuesto predial), pero la palabra «terreno» en
pantalla contradice al sujeto del video. Además, `plan.json:18` afirma que
`sim:gravamenes`, `sim:dividir` y `sim:alrededor` «demuestran literalmente la voz de las
escenas 5, 6 y 7»: es falso para la 5 y para la 6. Dueño: Producción.

### IMPORTANTE-3 — La escena 7 atribuye al producto anotaciones que el mapa no dibuja

Cita (voz, `plan.json:90`): «en Geo Propiedades Ecuador las propiedades están sobre el mapa,
así que ves la zona, las vías y por dónde se llega.»

La afirmación en sí **está respaldada** (ver Hechos 1-3). El problema es la demostración:
`PlotSurroundingsSim` usa el marco de producto `PublishShell` con `eyebrow="EN GEO PROPIEDADES"`
(`simulations.tsx:3255`) y sobre él dibuja etiquetas propias «Vía principal», «Calle lateral»,
«Quebrada» (`:3250-3252`), una ruta de acceso animada desde la vía hasta el predio
(`:3274-3283`) y el sello «Por dónde se llega» (`:3327`).

El mapa real no produce nada de eso: el estilo solo monta dos rásteres,
`carto-base` y `esri-base` (`frontend/components/maps/maplibre-style.ts:34-35`), y el
componente solo añade capas de propiedades, polígonos, selección y ubicación del usuario
(`frontend/components/maps/MapLibreMap.tsx:350-469`). No hay capa de anotación, ni etiquetas
de vías propias, ni trazado de acceso. Las vías y los cursos de agua que se ven son los del
callejero Carto, con su propia tipografía.

Bajo la regla de `marketing/videos/CLAUDE.md` la animación debe ser «explícitamente
ilustrativa» y no «fingir una captura»; con el rótulo «EN GEO PROPIEDADES» encima, estas
anotaciones se leen como interfaz. Añadido: el polígono dibujado (`:3273`) es un lote, no un
edificio, mientras la voz habla del entorno del edificio. Dueño: Producción; si se conserva
el marco de producto tal cual, para mí pasa a BLOQUEANTE.

### IMPORTANTE-4 — La escena 6 usa magnitudes de lote y no demuestra lo que dice la voz

Lo que queda en pie de BLOQUEANTE-1 una vez caído su fundamento de «cifra inventada».
El contrato vigente (`marketing/videos/CLAUDE.md:16`) admite el dato de ejemplo con tres
condiciones: rótulo `EJEMPLO` en pantalla, verosimilitud para el sujeto de la pieza y que la
voz no lo convierta en dato. La primera y la tercera se cumplen; falla la segunda.

Cita (voz, `plan.json:81`): «Divide el precio para los metros y compara. Pero fíjate qué
metros te están contando: hay anuncios que suman áreas comunes. Compara metros útiles con
metros útiles, del mismo tipo y en la misma ciudad.» Rótulo: «Compara metros útiles».

**a) Magnitudes que no son de departamento.** En pantalla:
`{label: '400 m²', price: '$122.000', unit: '$305/m²'}` y
`{label: '800 m²', price: '$248.000', unit: '$310/m²'}`
(`marketing/videos/remotion/src/simulations.tsx:3466-3468`), más
`['PRECIO TOTAL', '$122.000']` y `['ÁREA DECLARADA', '400 m²']` (`:3496`). Son tamaños de
lote: `PlotUnitPriceSim` nació para la guía de terrenos y su comentario lo dice —«two plots
of different size» (`:3464`)—. El contrato lo nombra con esas palabras:
«un departamento no mide 400 m²» (`marketing/videos/CLAUDE.md:16`). El defecto no es que la
cifra exista, es que no es verosímil para el bien del que habla la pieza, y una cifra
inverosímil desmiente al narrador aunque esté marcada como ejemplo.

*Corrección mínima dentro de mi responsabilidad* (magnitudes, no estética): que las dos
tarjetas usen áreas propias de un departamento —del orden de dos plantas comparables, por
ejemplo 65 m² y 95 m²— y que el precio de cada una se elija de modo que la división que la
animación ya hace siga cuadrando en pantalla. No fijo un precio por metro: no puedo citar
fuente fechada para un valor de mercado, y no la necesito mientras el número siga siendo un
ejemplo rotulado y la voz no lo pronuncie —hoy no lo hace, y no debe empezar a hacerlo—.
Si Producción prefiere no elegir cifras, existe el patrón ya aprobado en la misma pieza:
`sim:alicuota` deja el monto como barra tramada tras el «$» (`simulations.tsx:2874-2876`).

**b) La animación no demuestra la afirmación.** Este punto es independiente de las cifras.
La voz opone metros útiles a áreas que suman espacios comunes; la tarjeta rotula
«ÁREA DECLARADA» y compara dos superficies totales por tamaño, sin distinguir útil de común
en ningún fotograma. La afirmación central de la escena se queda sin demostrar, y
`plan.json:84` promete lo contrario («la superficie útil se destaca frente al área que
incluiría espacios comunes»), igual que `plan.json:18` («demuestran literalmente la voz de
las escenas 5, 6 y 7»). Dueño: Producción, con el editor jefe decidiendo si la escena cambia
de animación o la animación gana ese estado.

*Observación menor, sin categoría de hallazgo:* el rótulo `EJEMPLO` se dibuja a 19 px
(`simulations.tsx:2559`), por debajo del mínimo de 22 px que la propia pieza se fija en
`plan.json:29`. Lo dejo anotado para Calidad; no lo convierto en hallazgo porque el rótulo
cumple su función y su tamaño es materia de revisión visual, no de perímetro de verdad.

### RECOMENDACIÓN-1 — «Derrama» no es la palabra ecuatoriana

Cita (voz, `plan.json:63`): «Ahí aparecen las derramas: las cuotas extras que se aprueban
cuando hay algo grande que arreglar.» Rótulo renderizado: «Actas y derramas».

La voz la define en el momento, así que no engaña. El rótulo viaja solo y sin definición, y
en Ecuador lo corriente es «cuota extraordinaria» o «contribución extraordinaria». La propia
animación ya usa la formulación buena: «Cuota extra para el arreglo»
(`simulations.tsx:2979`). `marketing/videos/CLAUDE.md` exige «español claro y natural» para
Ecuador. No es un problema de veracidad; lo dejo para Estrategia.

### RECOMENDACIÓN-2 — El descargo legal no está en el video

`plan.json:14` y `caption.txt` cierran con «Esto es información general, no asesoría legal.»
—requisito cumplido—. La voz y los rótulos no lo dicen en ningún momento; lo más cercano es
«Que los lea un abogado» (escena 5), que mitiga pero no es un descargo. Un video descargado o
reposteado circula sin caption.

### RECOMENDACIÓN-3 — La portada ilustra un terreno

`cover-props.json`: `"coverArt": "terreno"` con `coverText` «Antes de comprar un
departamento». El acento violeta sí cumple la alternancia declarada en `plan.json:27`
(`"accent": "#6B5CF6"`). La ilustración no corresponde al sujeto de la pieza; es el mismo
arrastre desde la serie de terrenos que produce IMPORTANTE-2 e IMPORTANTE-3. Dueño:
Producción.

### RECOMENDACIÓN-4 — «Hay anuncios que suman áreas comunes»

Cita (voz, `plan.json:81`). Es una afirmación sobre prácticas de terceros, no sobre el
producto, y va en forma no cuantificada («hay anuncios que…»), así que no la bloqueo. Solo
conviene tenerla presente: se pronuncia sobre un panel de la propia marca, y el portal
también publica anuncios importados cuyo campo `area` no distingue superficie útil de área
con espacios comunes —`backend/real_estate/services/map_payload.py:7-18` no lleva `area`, y
`specs/calculations/pricing.yaml:71-102` divide por `area` sin más—. La frase, por tanto,
también aplica a lo que se ve en Geo Propiedades. Es honesta; no debe convertirse nunca en
«en Geo Propiedades sí sabes qué metros son útiles», que sería falso.

---

## Resumen para la puerta

- Afirmación de producto (escena 7 y caption): **verdadera y suficientemente acotada** en su
  redacción; el problema está en cómo se ilustra, no en lo que dice.
- Ninguna promesa de propietario, cifra de inventario, contador de visitas, dato privado ni
  juicio de zona en el texto de la pieza.
- El bloque documental se enuncia como procedimiento y remite a un abogado; el único texto
  taxativo es el rótulo «Compras el edificio».
- Las cifras de la escena 6 **no son un hallazgo**: son dato de ejemplo permitido y rotulado.
  Mi BLOQUEANTE-1 partía de una premisa falsa y quedó anulado por el editor jefe; lo que
  sobrevive es la verosimilitud de las magnitudes y la demostración que no corresponde a la
  voz, ahora IMPORTANTE-4.
- **No firmable como está**: queda un solo bloqueante, BLOQUEANTE-2 —`verification_notes`
  afirma que cuatro animaciones no existen cuando la pieza se renderizó con ellas—. Los
  cuatro IMPORTANTES no impiden la firma por sí solos, pero sí describen una pieza que
  todavía arrastra la serie de terrenos dentro de un video de departamentos.
