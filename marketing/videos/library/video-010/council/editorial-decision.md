# Decisión editorial — video-010

**Pieza:** «Antes de comprar un departamento, revisa esto». Historia educativa,
comprador, consideración, pilar Educación inmobiliaria, serie «Antes de
comprar», CTA «Encuentra tu futuro hogar».

**Encargo del consejo:** revisar una pieza ya renderizada y en estado
`reviewed`, pendiente de firma humana, y decidir si cumple el contrato.

**Editor jefe:** Claude. **Fecha:** 2026-08-14.

## Objetivo y perímetro

Que el comprador de departamento reconozca qué revisar antes de decidir, y que
entre al mapa para ver el entorno del edificio antes de ir. Un público, una
idea, un CTA. Las siete primeras escenas enseñan comprobaciones que ocurren
**fuera** de cualquier portal; solo la séptima nombra el producto, y su única
afirmación es que las propiedades están sobre el mapa y ahí se ve la zona, las
vías y por dónde se llega.

## Veredicto de la primera vuelta: FAIL

Los tres carriles entregaron por separado y coincidieron en el diagnóstico de
fondo: **el argumento era nuevo y disciplinado; la superficie no**. La pieza
heredaba de la pieza de terrenos (video-009) su portada y tres de sus siete
animaciones, y esas piezas heredadas demostraban otro sujeto.

| # | Defecto | Levantado por | Puerta |
|---|---------|---------------|--------|
| 1 | El máster no incluía los últimos cambios del renderer: se renderizó antes de que `scene.tsx` y `simulations.tsx` cambiaran | Producción | 3 |
| 2 | `cover_art: "terreno"` no existe como ramal en `cover.tsx`; la portada caía al genérico y mostraba una casa, un precio y 400 m² en una pieza de departamentos, sin rótulo de ejemplo | Estrategia y Producción | 2 |
| 3 | Escena 6: la animación dividía precio para área total y nunca separaba metros útiles de áreas comunes, que es exactamente lo que dice la voz | los tres | 2 |
| 4 | Escena 7: bajo el rótulo «EN GEO PROPIEDADES» se dibujaban etiquetas de vías y una ruta de acceso que el producto no tiene, sobre un lote con casitas | Producto y Producción | 1 |
| 5 | Escena 5: «¿Debe algo el terreno?» en una pieza de departamentos | los tres | 2 |
| 6 | Escena 4: `sim:edificio` era un crossfade y una rejilla, sin arco ni causalidad, con el 40 % final medio vacío | Producción | 2 |
| 7 | Escena 1: cisterna y etiqueta recortadas fuera del `viewBox`; «No compras solo el piso» en registro de España | Producción y Estrategia | 2 |
| 8 | «derramas» es término peninsular; en Ecuador son cuotas extraordinarias | Estrategia | 2 |
| 9 | Rótulo «Compras el edificio»: sin sonido es falso en propiedad horizontal | Producto | 2 |
| 10 | Las notas de verificación del plan afirmaban que cuatro animaciones no existían y que no se podía renderizar, cuando estaban registradas y el máster existía | Producto | 2 |
| 11 | El subtítulo del cierre partía la marca en «…en Geo» / «Propiedades Ecuador» | Estrategia | 3 |
| 12 | El plan describía música y el máster salió mudo | Producción | 3 |

## Desacuerdo resuelto: las cifras de ejemplo

**Anulado el bloqueante de Producto sobre las cifras de `sim:dividir`.** El
carril las trató como cifras inventadas prohibidas. La decisión del 2026-08-13
prohíbe las cantidades sobre el mercado o sobre la plataforma sin fuente
fechada, y en el mismo apartado autoriza el precio y las características de una
propiedad ilustrativa. Además su premisa de hecho era falsa: la tarjeta lleva el
rótulo `EJEMPLO`, visible en el fotograma del segundo 60 del máster anterior.

De ese hallazgo sobrevivió lo que se sostiene solo, reclasificado como
importante: 400 y 800 m² no son magnitudes de departamento, y la animación no
demostraba su propia voz.

**Consecuencia estructural, para que no vuelva a pasar:** el contrato ahora
separa las dos cosas por escrito en `CLAUDE.md`, `animation-standard.md` y
`council.md`; la decisión queda fechada en `memory/decisions.md`; y
`tests/test_factory.py` fija la frontera en la máquina. Al escribir ese test
apareció un defecto real: `NUMBER_CLAIM` terminaba en `\b`, así que «3,4 %» no
podía coincidir nunca. El porcentaje —la cifra inventada más peligrosa— llevaba
desde siempre sin detectarse mientras el criterio humano bloqueaba ejemplos
inofensivos.

## Correcciones aplicadas

- **Portada:** ramal `departamento` en `cover.tsx` —edificio en corte, la misma
  lectura que las animaciones—, datos de ejemplo rotulados a 22 px y título en
  dos líneas. La causa del desborde no era el `maxLines`: la medición usaba
  900 px contra una columna real de 840.
- **Animaciones nuevas:** `sim:metros-utiles` (separa útiles de comunes con
  magnitudes de departamento y recalcula el precio por metro) y
  `sim:entorno-mapa` (el marcador del edificio sobre el callejero base, sin
  rotular vías ni trazar rutas). `sim:edificio` rehecha como recorrido con
  cuatro paradas y respuesta causal en cada una. `sim:que-compras` recompuesta
  sin recortes.
- **`sim:gravamenes-departamento`:** el sujeto pasa a ser una prop cuyo valor por
  defecto reproduce el texto que el video-009 firmó, así que su máster no cambia.
- **Terminología y rótulos:** «cuota extraordinaria», «No compras solo el
  departamento», «Parte de un edificio».
- **Subtítulos:** `voice.py` enlaza «Geo Propiedades Ecuador» antes de aplicar
  las reglas de longitud y lo desenlaza al salir, de modo que la marca no puede
  partirse entre dos subtítulos.
- **Plan:** notas de verificación reescritas para describir la realidad,
  `voice_profile` declarado, escenas 5, 6 y 7 apuntando a las animaciones
  correctas.
- **Máster nuevo:** rerenderizado con voz de borrador gratuita y música Mixkit
  con sidecar válido. 83,2 s medidos.

## Segunda vuelta: el expediente, no el máster

Calidad revisó el máster nuevo y lo dio por limpio —47 fotogramas propios, zonas
seguras, tamaños, voz, música, subtítulos y afirmaciones— pero reprobó la pieza
por un defecto del editor: `script.md` y `storyboard.md` son documentos
generados, se cerraron las contradicciones en `plan.json` y no se regeneraron.
Seguían diciendo que cuatro animaciones no existían y nombrando las tres
heredadas. Es el mismo hallazgo de la primera vuelta, cerrado en un archivo y no
en el otro.

Corregido sin tocar el máster: `video docs`, dos descripciones desactualizadas
de `renderer.py`, y `.render.lock` al `.gitignore`. En la reverificación Calidad
encontró que el propio `plan.json` seguía describiendo las escenas 1 a 4 como
«animación nueva a construir… mientras no exista», y las escenas 6 y 7 como las
animaciones heredadas. Reescritas las siete direcciones visuales para describir
lo que el máster muestra; el plan se reaprobó y los documentos se regeneraron.
Ningún cambio de voz, rótulo o recurso, así que el MP4 no se rehizo.

### Recomendaciones diferidas, con su razón

| Recomendación | Decisión |
|---|---|
| Descargo legal también en pantalla, no solo en el caption | Al próximo brief: cambia la pieza y hoy vive donde el contrato lo exige |
| Unificar el nombre de la serie entre 009 y 010 | Al próximo brief: es una decisión de catálogo, no de esta pieza |
| «filtraciones» en vez de «las humedades» | Rechazada: «humedades» es como se dice en Ecuador y la voz es coloquial |
| El producto aparece en el segundo 66, tarde frente a los 10 s del contrato | Aceptado como formato: la excepción educativa está escrita en el linter y el 009 se firmó igual |
| `review.json` informa un suelo de 18 px de animaciones que esta pieza no usa | Defecto de la herramienta, no de la pieza: va a su propio arreglo |
| El plan declara un rótulo que el `Outro` descarta | Igual: defecto de herramienta |
| El subtítulo baja 26 px bajo `textFloor` durante 0,2 s de entrada | Anotado como defecto real del renderer para la próxima pieza |
| «Estado: planificado» es un literal de `documents.py` | Defecto de la plantilla de documentos |
| La tabla de tiempos del guion es la planificada (89 s), no la medida (83,2 s) | Igual: el documento debería leer `production.json` |

## Puertas de esta pieza

| Puerta | Estado |
|--------|--------|
| 0 · Encargo legible | cerrada |
| 1 · Promesa demostrable | cerrada: la única afirmación de producto está respaldada y su demostración ya no promete capas que el mapa no tiene |
| 2 · Plan integrado | cerrada: `lint` en 0 errores y 0 avisos |
| 3 · Borrador gratuito | cerrada: máster con Kokoro y música licenciada |
| 4 · Revisión independiente | cerrada: `FAIL` por el expediente, corregido, y `PASS` en la reverificación del 2026-08-14 19:16 |
| 5 · Decisiones humanas | **abierta y de una persona, no del consejo**: aprobar el borrador, elegir y pagar la voz final, firmar el máster y autorizar la publicación |

## Lo que el consejo no decide

El gasto de la voz de producción, la firma del MP4 y la publicación siguen
siendo aprobaciones humanas separadas. Con la voz final la pieza durará
alrededor de un 20 % más, cerca de 99 s, que sigue dentro del formato historia.
