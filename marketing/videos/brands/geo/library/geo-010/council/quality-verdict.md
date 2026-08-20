# Control de calidad independiente — geo-010

## PASS — reverificación del 2026-08-14 (19:16)

CONTRACT: VIDEO_COUNCIL_V1 · rol 5 · **reverificación acotada del expediente**. No se
volvió a abrir el máster: `exports/geo-010.mp4` conserva su mtime `19:01:56`, el mismo que
audité en el veredicto FAIL de más abajo, igual que `cover.png` (`19:02:02`),
`render-props.json` (`18:56`), `production.json` (`19:02`) y `subtitles.srt` (`18:56`).
Nada de lo que verifiqué obliga a reabrirlo, y lo digo explícitamente porque el contrato
me pide decirlo si ocurriera: no ocurrió.

**El BLOQUEANTE-1 está cerrado.** `script.md` y `storyboard.md` describen ahora la pieza
que existe. Queda un residuo del mismo defecto, en el campo que la regeneración no podía
tocar porque vive en el origen: cuatro `visual_direction` de `plan.json` siguen escritas en
futuro y dicen que la animación aún no existe. Lo clasifico **importante**, no bloqueante,
y explico abajo por qué la frontera cae ahí.

### Los cuatro puntos declarados por el editor jefe

| # | Declarado | Estado | Evidencia |
|---|---|---|---|
| 1 | `python3 factory.py docs geo-010` | **verificado** | `script.md`, `storyboard.md` y `caption.txt` con mtime `19:15:31`, posterior a `plan.json` (`18:52:53`). `caption.txt` es idéntico carácter a carácter a `plan.json:14` |
| 2 | Dos descripciones de `renderer.py` corregidas | **parcial** | `renderer.py:32` ya dice «El acta de asamblea con su **cuota extraordinaria** aprobada…» y `:29` reescribe `sim:que-compras` como recorrido de cámara. Pero `renderer.py:30` **sigue igual** (ver IMPORTANTE-2) |
| 3 | `.render.lock` ignorado | **verificado** | `/Users/usuario/gad/EstateMap/.gitignore:78` → `marketing/videos/brands/*/library/**/.render.lock`; `git status --porcelain brands/geo/library/geo-010/` ya no lo lista |
| 4 | `lint` y `review` relanzados | **verificado** | `lint.json` `checked_at 19:15:51`, `passed true`, `0 errores`, `0 avisos`; `review.json` `reviewed_at 19:15:51`, `passed true`, nueve comprobaciones en verde, `measured_duration_seconds 83.179` |

Reejecutados por mí, no leídos del archivo: `python3 factory.py lint geo-010` → `lint OK ·
0 errores, 0 avisos · locución estimada 84.9 s / objetivo 90 s`. `python3 -m unittest
tests.test_factory` → `Ran 103 tests · OK`.

### Los tres cierres que quedaron abiertos en el FAIL

| # | Cierre | Ahora | Evidencia |
|---|---|---|---|
| 8 | «derramas» → «cuota extraordinaria» | **cerrado** | `grep` de «derrama» sobre todo el expediente devuelve exactamente dos apariciones vivas, y ninguna describe la pieza: `plan.json:25` y `script.md:50`, que son la nota de verificación que dice que **no** se usa el término. `storyboard.md:37-39` dice «Actas y cuotas extra» y «las cuotas extraordinarias»; `script.md:26` igual; `renderer.py:32` corregido. Las otras dos apariciones están en `brief.json:2` y `approval.json:4`, que son registros fechados de un encargo y de una aprobación, no descripciones de la pieza; no se reescriben |
| 9 | Rótulo escena 1 «Parte de un edificio» | **cerrado** | `storyboard.md:7` y `script.md:23` dicen «Parte de un edificio». «Compras el edificio» no aparece en ningún archivo del expediente |
| 11 | Notas de verificación | **cerrado** | `script.md:42-53` reproduce las doce notas vigentes de `plan.json:16-28`. La nota 1 ahora afirma lo contrario de lo refutado: «Las siete animaciones existen, están registradas en simulations.tsx, planner.py y renderer.py, y se renderizaron». No queda ninguna frase que diga que el render no se lanza |

### Coherencia plan ↔ guion ↔ storyboard ↔ render-props

Comparadas las ocho escenas campo por campo, programáticamente, no a ojo:

| Escena | `asset` | Rótulo | Voz |
|---|---|---|---|
| 1 | `sim:que-compras` | Parte de un edificio | ✓ |
| 2 | `sim:propiedad-horizontal` | Qué dice la escritura | ✓ |
| 3 | `sim:alicuota` | Alícuota al día | ✓ |
| 4 | `sim:edificio` | Actas y cuotas extra | ✓ |
| 5 | `sim:gravamenes-departamento` | Léelo con abogado | ✓ |
| 6 | `sim:metros-utiles` | Compara metros útiles | ✓ |
| 7 | `sim:entorno-mapa` | Ve el entorno primero | ✓ |
| 8 | `null` / «Fondo de marca» | Tu futuro hogar | ✓ |

Las cuatro fuentes coinciden en las ocho escenas: `plan.json:37,46,55,64,73,82,91,100` con
`render-props.json` (`asset`), `headline` con `on_screen_text`, y el texto concatenado de
`captions` con `voice` palabra por palabra. Las tres animaciones que el consejo descartó
—`sim:gravamenes`, `sim:dividir`, `sim:alrededor`— **ya no aparecen en ningún documento
derivado**; siguen en el catálogo de `renderer.py` porque las usa el geo-009, que está
firmado. Y siguen en `brief.json:2`, que es el encargo original del 15:07 y no se toca.

---

## Hallazgos nuevos de esta reverificación

### IMPORTANTE-1 — Cuatro escenas se describen todavía como «a construir»

`plan.json:38, 47, 56, 65` conservan el `visual_direction` con el que se encargaron las
animaciones: «Animación nueva a construir y registrar como `sim:que-compras`. Escena
tipográfica de marca sobre el fondo claro de la serie **mientras la animación no exista**.
Cuando se construya: …». Las cuatro se propagan literalmente a `script.md:23-26` (columna
Visual) y a `storyboard.md:5, 15, 25, 35`.

Es el mismo defecto que el BLOQUEANTE-1, un campo más allá, y `factory.py docs` no podía
corregirlo: regenera fielmente lo que el plan dice. El resultado es que `script.md` se
contradice a sí mismo — la línea 42 afirma que las siete animaciones existen y se
renderizaron, y la línea 23 anuncia una escena tipográfica de reemplazo para una animación
que aún no existiría.

**Por qué no lo subo a bloqueante**, y quiero que quede el razonamiento y no solo el
resultado: lo que un firmante usa para cotejar el máster —`asset`, rótulo, voz y
subtítulos— coincide en las cuatro fuentes; y el texto que sigue a «Cuando se construya:»
describe con exactitud lo que sí está en pantalla (el edificio desde la vereda, la ventana
que se separa, la cisterna, el acta con el punto resaltado, el recorrido hasta el hall).
El documento no miente sobre el contenido: lo fecha mal. Un bloqueante detiene una puerta;
esto pide una edición.

**Corrección:** reescribir en pasado los cuatro `visual_direction` de `plan.json` y volver
a lanzar `factory.py docs`. **Ojo con la consecuencia**, que no es gratis: `approval.json`
guarda `plan_sha 0cf71a0f…`, que hoy coincide con el hash real del plan, y `factory.py:363`
niega el render si dejan de coincidir. Tocar el plan obliga a reaprobarlo antes de
cualquier render futuro. Para **esta** pieza no cambia nada —el máster ya existe y no se
vuelve a renderizar—, pero es una decisión del editor jefe, no un retoque de trámite, y por
eso no la ejecuto yo. **Dueño:** editor jefe. **Puerta a repetir:** ninguna de esta pieza.

### IMPORTANTE-2 — `renderer.py:30` describe una animación que ya no se dibuja así

La R4 del veredicto anterior señalaba dos líneas. Se corrigió una (`:32`, «derrama») y se
mejoró otra que no estaba en la lista (`:29`, `sim:que-compras`). La que sigue abierta es
`renderer.py:30`: `sim:propiedad-horizontal` se registra como «La lista de lo que consta en
la escritura: el departamento sí, el parqueadero y la bodega **con signo de
interrogación**, y las áreas comunes». La animación reescrita no dibuja ningún signo de
interrogación: `HorizontalPropertySim` (`remotion/src/simulations.tsx:2751`) rotula
«LO QUE DEBE CONSTAR» y marca Parqueadero Nº 12 y Bodega Nº 7 con la insignia
**«EN LA ESCRITURA»** (`:2778`), y el contraste lo hace borrando un cartel de tiza, no un
interrogante. §10 del estándar de animación exige que el registro coincida con lo que se
dibuja. No se ve en pantalla y no afecta al render. **Dueño:** producción.

### RECOMENDACIÓN nueva

**R10 · `Estado: planificado` es un literal, no un estado.** `script.md:3` lo dice mientras
`memory/catalog.json` declara `"state": "reviewed"`. No es descuido del editor:
`documents.py:48` lo escribe fijo en la plantilla, así que **todos** los guiones de la
fábrica afirman lo mismo, estén rendidos, revisados o firmados. Es la última fila que
quedaba viva de la tabla del BLOQUEANTE-1, y su arreglo es de una línea en el generador.
Dueño: producción.

**R11 · La tabla de tiempos del guion es la planificada, no la medida.** `script.md` y
`storyboard.md` numeran las escenas de 0,0 a 89,0 s porque `documents.py:40` acumula las
`duration` del plan; el máster mide 83,179 s y la escena 8 va de 77,6 a 83,1 s (frames
2329–2494 de `render-props.json`), no de 83,0 a 89,0 s. Con la voz pagada la pieza se acercará a los 99 s y la separación crecerá. No es
una contradicción de contenido —son objetivos, y `lint` los trata como tales: «locución
estimada 84.9 s / objetivo 90 s»—, pero convendría que la columna dijera de dónde sale.
Dueño: producción.

---

## Estado de las nueve recomendaciones del FAIL

Ninguna se borra. Verificada una por una contra el árbol de trabajo:

| # | Recomendación | Estado | Evidencia |
|---|---|---|---|
| R1 | El subtítulo baja 26 px durante su entrada | **abierta** | `captions.tsx:30` sigue con `interpolate(local, [0, 0.22], [26, 0], …)` |
| R2 | El descargo legal no está en el video | **abierta** | Sigue solo en `caption.txt` y `plan.json:14` |
| R3 | «humedades» en vez de «filtraciones» | **abierta** | `plan.json:62` sin cambios |
| R4 | Dos descripciones de `renderer.py` | **mitad aplicada** | `:32` corregida; `:30` intacta → reabierta como IMPORTANTE-2 |
| R5 | La serie no se llama igual en el catálogo | **abierta** | `memory/catalog.json`: geo-009 `"Antes de comprar un terreno"`, geo-010 `"Antes de comprar"` |
| R6 | `review.json` informa un suelo de texto ajeno | **abierta** | `review.json` de las `19:15:51` conserva `simulation_minimum_literal_px: 18` y `simulation_small_literal_count: 21` |
| R7 | La escena 8 declara un rótulo que no se dibuja | **abierta** | `plan.json:99` `"on_screen_text": "Tu futuro hogar"` |
| R8 | Definir por escrito qué cuenta como «producto» | **abierta** | `CLAUDE.md` sin cambios en ese punto |
| R9 | `.render.lock` sin seguimiento | **aplicada** | `.gitignore:78`; ya no aparece en `git status` |

De las nueve, **una está aplicada (R9) y una a medias (R4)**. Las siete restantes siguen
como estaban. **No encontré en el expediente ninguna nota que las difiera ni que explique
por qué**: `council/editorial-decision.md` conserva su mtime `19:04`, anterior a mi
veredicto de las `19:14`, así que no registra ninguna decisión sobre estas
recomendaciones. Lo dejo dicho tal cual, sin suponerle razones al editor jefe: si la
intención fue diferirlas a la próxima pieza, esa decisión todavía no está escrita en
ninguna parte, y una recomendación sin dueño ni fecha se pierde. Es la única tarea de
registro que esta puerta deja pendiente.

---

## Resumen para la puerta

- **PASS.** El único bloqueante del veredicto anterior está cerrado y verificado en los
  archivos regenerados, no en la declaración de quien los regeneró.
- **El máster no se tocó y no había por qué tocarlo.** Mismo archivo, mismo mtime, misma
  revisión de las `19:14` que sigue valiendo íntegra más abajo.
- Quedan **dos importantes y once recomendaciones**, ninguna de ellas en pantalla y ninguna
  capaz de detener esta puerta: el tiempo verbal de cuatro `visual_direction`, una
  descripción de `renderer.py:30`, y las siete recomendaciones que siguen sin dueño escrito.
- La Puerta 5 sigue siendo humana y entera: aprobar el borrador, autorizar el gasto de la
  voz final, firmar el máster y autorizar la publicación. Un `PASS` de Calidad no adelanta
  ninguna de esas cuatro cosas.

*Reverificación realizada sin modificar ningún archivo del proyecto salvo este informe.*

---
---

# Histórico — veredicto FAIL del 2026-08-14 (19:14)

Se conserva íntegro. Lo que sigue describe el estado del expediente **antes** de las
correcciones verificadas arriba.

FAIL

CONTRACT: VIDEO_COUNCIL_V1 · rol 5 · revisión del máster `exports/geo-010.mp4` (83,179 s,
1080 × 1920, 30 fps, `rendered_at 2026-08-14T19:02:02-05:00`).

**El máster está limpio. El expediente no.** Revisé el video entero fotograma a fotograma en
los ocho arcos, las zonas seguras, los tamaños de texto, la voz, la música, los subtítulos y
las afirmaciones, y no encontré ningún defecto en pantalla que justifique rehacer el render.
El único bloqueante está en los documentos derivados: `script.md` y `storyboard.md` siguen
describiendo la pieza anterior, con el texto exacto que `product-proof.md` declaró bloqueante
y que solo se corrigió en `plan.json`. Se arregla con un comando y sin volver a renderizar.

---

## Verificación de los once cierres declarados

| # | Cierre declarado | Estado | Evidencia |
|---|---|---|---|
| 1 | Máster rerenderizado hoy, con música con licencia | **cerrado** | `video.mp4` mtime `19:01:56` posterior a `simulations.tsx` (`18:52:22`), `cover.tsx` (`19:00:04`) y `scene.tsx` (`17:54:37`); `production.json:15-27` declara la pista y su licencia; la música se oye en el máster (cola sin voz 82,85–83,15 s: `mean_volume −37,6 dB`, `max −27,7 dB`) |
| 2 | Portada: ramal `departamento`, `EJEMPLO` a 22 px, título en dos líneas | **cerrado** | `exports/geo-010-cover.png`: «Antes de comprar / un departamento» en dos líneas, ilustración de edificio, insignia `EJEMPLO`; `cover.tsx:179` y `:399` fijan `fontSize: 22`; `cover-props.json` `coverArt: "departamento"`, `accent #6B5CF6`; hueco título→ilustración ≈ 105 px (mínimo 48) |
| 3 | Escena 6 `sim:metros-utiles` separa útiles de comunes con magnitudes de departamento | **cerrado** | Fotogramas 60,5 s y 65,5 s: «ANUNCIO A $95.000 · 68 útiles + 27 comunes · POR M² DECLARADO $1.000/m²» → «POR M² ÚTIL $1.397/m²» frente a «ANUNCIO B $92.000 · 68 útiles · $1.353/m²», remate «Metros útiles con metros útiles». Aritmética correcta (95000/95, 95000/68, 92000/68) y magnitudes de departamento |
| 4 | Escena 7 `sim:entorno-mapa` sin rotular vías ni trazar rutas | **cerrado** | Fotogramas 70,0 s, 72,5 s y 77,4 s: callejero, manzanas, parque y marcador con burbuja «Seleccionada»; `simulations.tsx:3514-3600` no dibuja etiquetas de vía, ruta de acceso ni contadores. «Seleccionada» es vocabulario real del producto (`frontend/components/maps/MapLibreMap.tsx:780`) |
| 5 | Escena 5 dice «¿Debe algo el departamento?» | **cerrado** | Fotograma 50,5 s; `simulations.tsx:3651` con `subject` parametrizado y `FlatEncumbrancesSim` en `:4187` / `:4200` |
| 6 | Escena 4 `sim:edificio` rehecha como secuencia con arco | **cerrado** | Fotogramas 33,0 s (acta en blanco), 36,0 s (punto 3 resaltado + recuadro «CUOTA EXTRAORDINARIA · Aprobada por la asamblea»), 39,0 s (ascensor), 42,0 s (bomba), 44,4 s (humedades y llegada al hall). Estado inicial, acción, respuesta y prueba presentes |
| 7 | Escena 1 sin recortes fuera del `viewBox`, rótulo «No compras solo el departamento» | **cerrado** | Fotograma 7,5 s: cisterna de azotea completa dentro del cuadro y etiquetas «Sus vecinos» / «Sus deudas» íntegras; recorte lateral medido: la píldora derecha termina en x ≈ 955 (< 960) y la izquierda empieza en x ≈ 122 (> 120). Rótulo verificado en el fotograma 2,0 s (`simulations.tsx:2635`) |
| 8 | «derramas» → «cuota extraordinaria» en voz, rótulo y animación | **parcial** | Cerrado en el máster: voz (`plan.json:62`), rótulo «Actas y cuotas extra» y animación (fotogramas 36,0 s y 39,0 s, `simulations.tsx:3254`, `:3293`). **Sigue diciendo «derrama»** en `storyboard.md:37-39`, `script.md:26` y `renderer.py:32` |
| 9 | Rótulo de la escena 1 en el plan: «Parte de un edificio» | **parcial** | `plan.json:36` ✓ y en pantalla ✓. `storyboard.md:7` y `script.md:23` conservan «Compras el edificio», el rótulo que `product-proof.md` IMPORTANTE-1 calificó de jurídicamente falso |
| 10 | Los subtítulos ya no parten la marca | **cerrado** | `subtitles.srt` cues 54 («en Geo Propiedades Ecuador») y 61 («en Geo Propiedades Ecuador.») íntegros; ningún corte parte el nombre propio |
| 11 | `plan.json`: notas de verificación reescritas y `voice_profile` declarado | **parcial** | `plan.json:16-28` reescritas y `:106 "voice_profile": "draft-dora"` ✓. **`script.md:42-43` conserva el texto refutado palabra por palabra** |

---

## Hallazgos

### BLOQUEANTE-1 — `script.md` y `storyboard.md` describen una pieza que ya no existe

`plan.json` se corrigió; los dos documentos que se generan a partir de él, no. Quien firme
leyendo el guion y el storyboard recibe instrucciones que contradicen el máster que tiene
delante.

Contradicciones verificadas una por una contra `plan.json` y contra el máster:

| Documento | Dice | El máster dice |
|---|---|---|
| `script.md:42` | «Cuatro escenas quedan con asset null a propósito… esas animaciones todavía no existen ni están registradas en Python y Remotion… el render no se lanza hasta que las cuatro estén implementadas» | Las cuatro existen (`planner.py:190-193`, `simulations.tsx:4192-4195`) y la pieza se renderizó con ellas (`render-props.json`, escenas 1-4) |
| `script.md:43` | «sim:gravamenes, sim:dividir y sim:alrededor ya existen en el catálogo aprobado y demuestran literalmente la voz de las escenas 5, 6 y 7» | Las escenas 5, 6 y 7 usan `sim:gravamenes-departamento`, `sim:metros-utiles` y `sim:entorno-mapa` (`plan.json:73, 82, 91`; `render-props.json`). Las tres nombradas en la nota son las que el consejo descartó |
| `script.md:23`, `storyboard.md:7` | Rótulo escena 1: «Compras el edificio» | «Parte de un edificio» (`plan.json:36`, fotograma 2,0 s) |
| `script.md:26`, `storyboard.md:37-39` | «Ahí aparecen las derramas: las cuotas extras…», rótulo «Actas y derramas» | «Ahí aparecen las cuotas extraordinarias…», rótulo «Actas y cuotas extra» (fotograma 39,0 s) |
| `script.md:27-29`, `storyboard.md:56, 66` | Recursos `sim:gravamenes`, `sim:dividir`, `sim:alrededor` | `sim:gravamenes-departamento`, `sim:metros-utiles`, `sim:entorno-mapa` |
| `script.md:3` | `Estado: planificado` | `memory/catalog.json`: `"state": "rendered"` |

Es exactamente el texto que `product-proof.md` BLOQUEANTE-2 citó como «(`plan.json:17`,
repetida en `script.md:42`)» y que `strategy-script.md` I4 repitió; se cerró en el primer
archivo y no en el segundo. Su razón sigue valiendo íntegra: *un registro que contradice el
artefacto no puede sostener una firma*. Y la Puerta 4 exige comparar «brief, evidencia, plan,
guion, storyboard, render y portada» (`council.md:149`): guion y storyboard contradicen el
render.

**Clasificación:** BLOQUEANTE. **Dueño:** editor jefe.
**Puerta a repetir:** Puerta 2 (documentos canónicos) y después esta Puerta 4.
**Corrección:** `python3 factory.py docs geo-010`, que reescribe `script.md`,
`storyboard.md` y `caption.txt` desde `plan.json` (`factory.py:191-194`). **No requiere
rerender, ni nueva aprobación, ni tocar el máster**: `plan.json`, `render-props.json`,
`subtitles.srt`, el MP4 y la portada ya son correctos. Después hay que releer los dos
documentos regenerados antes de firmar.

---

### IMPORTANTE

Ninguno. Busqué en pantalla, en el audio y en los artefactos de render, y no encontré ningún
defecto de esa categoría. Lo dejo dicho explícitamente para que no se lea como omisión.

---

### RECOMENDACIÓN

**R1 · El subtítulo baja 26 px por debajo del suelo de texto durante su entrada.**
`captions.tsx:30` anima `rise` de 26 → 0 px en 0,22 s, y el bloque está anclado a
`textFloor = 1440` (`theme.ts`). Durante esos ~6 fotogramas la última línea de un subtítulo
de dos renglones llega a y ≈ 1466 y cruza la barra de progreso; TikTok reserva desde y = 1460
(`safe.bottom = 460`). Verificado en los fotogramas 2,00 s («compras solo el departamento.»)
y 36,00 s («aprueban»). Son 6 px, a opacidad parcial y con la propia barra de la pieza, no con
contenido; por eso no lo subo de categoría. Se corrige animando `opacity` sin `translateY`, o
bajando `rise` a ~12 px. Dueño: producción. No obliga a repetir ninguna puerta de esta pieza.

**R2 · El descargo legal no está en el video.** El contrato solo exige el caption, y ahí está
(`caption.txt`, `plan.json:14`). Pero la pieza dedica 83 s a nombrar documentos y trámites y
un video descargado circula sin caption; lo más cercano en pantalla es «Un abogado te dice qué
significa / Antes de que firmes nada» (fotograma 53,0 s), que mitiga y no es un descargo.
Cabría una línea de 22 px en la tarjeta de cierre. Dueño: estrategia. (Ya lo había planteado
`product-proof.md` RECOMENDACIÓN-2; sigue abierto.)

**R3 · «las humedades» sigue en voz y en rótulo** (`plan.json:62`; fotograma 44,4 s
«Humedades / En los pasillos»). El brief pedía «filtraciones», que es la palabra ecuatoriana.
No estaba entre los once cierres. Dueño: estrategia.

**R4 · `renderer.py:32` conserva «derrama»** en la descripción registrada de `sim:edificio`,
y `renderer.py:30` sigue describiendo `sim:propiedad-horizontal` como «la lista… con signo de
interrogación», que la animación reescrita ya no dibuja. No se ve en pantalla, pero §10 del
estándar exige que los registros coincidan. Dueño: producción.

**R5 · La serie no se llama igual en el catálogo.** `memory/catalog.json`: geo-009 declara
`"series": "Antes de comprar un terreno"` y geo-010 `"Antes de comprar"`. Dueño: editor jefe.

**R6 · `review.json` informa un suelo de texto que no es el de esta pieza.**
`"simulation_minimum_literal_px": 18` y `"simulation_small_literal_count": 21` cuentan todo
`simulations.tsx`, incluidos `sim:*` que este video no usa (`:1847`, `:1955`). Comprobé una a
una las siete animaciones de la pieza y **ninguna** baja de 22 px; el dato publicado es
pesimista y, si algún día una animación de esta pieza bajara de 22, el número no cambiaría y
el aviso se perdería. Acotar el recuento a los `asset` del plan. Dueño: producción.

**R7 · La escena 8 declara un rótulo que nunca se dibuja.** `plan.json:99`
`"on_screen_text": "Tu futuro hogar"`; en la escena final `scene.tsx:286-287` sustituye
rótulo y subtítulos por el `Outro`. No es un defecto visible —la tarjeta de cierre está bien
resuelta (fotogramas 80,5 s y 83,0 s)— pero el plan promete un texto que el render descarta.
Dueño: editor jefe.

**R8 · El producto aparece en el segundo 66.** `CLAUDE.md:50` concede a una historia «hasta
10 segundos para plantear antes de mostrar el producto»; aquí la cuña de producto es la escena
7. La marca sí es reconocible antes del segundo 3 (píldora del dominio y tile visibles en el
fotograma 0,20 s), y geo-009 está `signed` con la misma estructura, así que no lo trato como
incumplimiento: lo levanto para que el editor jefe fije por escrito si «producto» significa
marca reconocible o demostración de la interfaz, antes de una tercera pieza igual.

**R9 · Queda `library/geo-010/.render.lock` sin seguimiento en git.** Es inofensivo —el
cerrojo es `flock` advisory y se libera al cerrar (`workflow.py:191-212`)—, pero un `git add .`
lo commitearía. Conviene ignorarlo.

---

## Lo que sí comprobé y está bien

- **Zonas seguras.** `sideCrop = 120` (`theme.ts:35`). Nada legible dentro del recorte: píldora
  del dominio en x = 120 y tile terminando en x = 960 (`scene.tsx:105`, `:130`), tarjetas de
  simulación en 120–960, rótulos y subtítulos desde x = 120. El caso más ajustado es la escena 1
  (etiquetas dibujadas en SVG, no en el marco): medido con recorte de la franja, «Sus deudas»
  termina en x ≈ 955 y «Sus vecinos» empieza en x ≈ 122. Cierra el I2 de `production-design.md`.
- **Texto mínimo de 22 px.** Ninguna de las siete animaciones usadas declara un `fontSize`
  literal por debajo de 22 (revisión programática de los rangos de `WhatYouBuySim`,
  `HorizontalPropertySim`, `ServiceChargeSim`, `BuildingStateSim`, `UsableAreaSim`,
  `BuildingSurroundingsSim` y `FieldShell`). El rótulo `EJEMPLO` está a 22 px en
  `simulations.tsx:2566` y `:2633` y en `cover.tsx:179`, y se lee en los fotogramas de las ocho
  escenas. Cierra el I5 de `production-design.md`.
- **Una sola voz, y de borrador.** `production.json:12-14`: `tts_provider kokoro`,
  `voice_profiles ["draft-dora"]`, `is_final_voice false`; las ocho escenas declaran
  `draft-dora`; coincide con `plan.json:106`. **No existe `voice-lock.json`** y `draft-dora` es
  Kokoro local (`system/voice-profiles.json`). No se gastó voz pagada.
- **Música y licencia.** `assets/music/mixkit-piano-reflections.mp3.license.json` trae título,
  autor, `source_url`, `license`, `license_url`, `allowed_use`, `commercial_use: true` y
  `paid: false`. Se mezcla a `volume 0.1` (`video.tsx:88`). Medido en el máster: voz
  −27,7 a −29,6 dB de media con picos de −6,9 a −10,6 dB, música sola −37,6 dB. La música no
  tapa la voz en ningún punto. Cierra el I6 de `production-design.md`.
- **Subtítulos.** 61 cues, contrastados contra los quemados en los fotogramas 2,0 s, 60,5 s y
  77,4 s: coinciden cue a cue. Ningún corte parte la marca ni una palabra. El último cue cierra
  en 82,677 s y el video en 83,179 s.
- **Afirmaciones.** Ninguna cifra de mercado ni de plataforma: el único bloque numérico es el de
  la escena 6, rotulado `EJEMPLO`, verosímil para un departamento y nunca pronunciado por la voz
  —dice el método, «divide el precio para los metros y compara»—, que es el caso que
  `CLAUDE.md:16` autoriza. Lo mismo en la portada (78 m², 2 hab., 2 baños, con insignia
  `EJEMPLO`). El monto de la alícuota va tramado, sin cifra. Ningún juicio de zona: la escena 7
  dice qué se ve, no cómo juzgarlo. Ninguna capacidad inventada: no hay ruta, ni etiquetas de
  vía, ni contadores, ni kit social, ni publicación automática, ni contadores de visitas, ni
  lenguaje de propietario. Un solo CTA, de comprador, al final. Descargo de «no es asesoría
  legal» presente en `caption.txt` y `plan.json:14`.
- **Formato y disciplina de historia.** 1080 × 1920, 30 fps, `crf 16 / slow / yuv420p`
  (`production.json:5-11`), 83,179 s (dentro de 45–120), 8 escenas (máximo 9).
- **Comandos.** `python3 factory.py lint geo-010` → `lint OK · 0 errores, 0 avisos ·
  locución estimada 84.9 s / objetivo 90 s`. `python3 -m unittest tests.test_factory` →
  `Ran 103 tests · OK`. `review.json` → `passed: true`, nueve comprobaciones en verde,
  duración medida 83,179 s, contacto de ocho fotogramas críticos en `review/frames/`.
- **Fotogramas inspeccionados** (además del contacto automático): 0,00 · 0,20 · 1,00 · 2,00 ·
  3,00 · 4,50 · 6,00 · 7,50 · 9,00 · 9,40 · 9,50 · 10,50 · 13,00 · 15,50 · 18,00 · 20,50 ·
  21,40 · 22,50 · 25,00 · 27,50 · 30,00 · 31,30 · 33,00 · 36,00 · 39,00 · 42,00 · 44,40 ·
  45,50 · 48,00 · 50,50 · 53,00 · 54,30 · 55,50 · 58,00 · 60,50 · 63,00 · 65,50 · 66,10 ·
  67,50 · 70,00 · 72,50 · 75,00 · 77,40 · 78,50 · 80,50 · 82,50 · 83,00 s.

---

## Resumen para la puerta

- **FAIL** por un solo bloqueante, y no está en el video: `script.md` y `storyboard.md` no se
  regeneraron después de corregir `plan.json`.
- El máster, la portada, los subtítulos, la voz, la música y las afirmaciones **pasan**. No hay
  que volver a renderizar ni a gastar nada.
- Vuelve al editor jefe. Un `python3 factory.py docs geo-010`, una relectura de los dos
  documentos y esta puerta se puede cerrar en la misma sesión.
- Nada de esto autoriza publicar ni pautar: eso conserva su aprobación humana propia.

*Revisión realizada sin modificar ningún archivo del proyecto salvo este informe.*
