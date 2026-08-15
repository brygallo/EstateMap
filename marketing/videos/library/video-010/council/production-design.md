# Dirección de producción — video-010

CONTRACT: VIDEO_COUNCIL_V1 · Rol 4 (visual, movimiento, voz y audio) · Auditoría, sin
modificar renderer ni animaciones.

**Pregunta a cerrar:** ¿cada animación es una secuencia terminada según
`animation-standard.md`, y la pieza tiene una sola voz, música y efectos con licencia y
zonas seguras respetadas?

**Veredicto:** **No se puede firmar.** El MP4 de `exports/` no corresponde al código
actual (hallazgo B1), la portada está rota (B2), la escena 6 no demuestra su propia voz
(B3) y la escena 4 nunca llega a ser una secuencia (B4). Voz: correcta y única, pero sin
declarar. Música: descrita en el plan, ausente en el máster.

Se aplica la regla de dato de ejemplo de `CLAUDE.md`: un precio o un área ilustrativos son
válidos si la pieza los marca `EJEMPLO` en pantalla, son verosímiles para su sujeto y la
voz no los convierte en dato. Por eso ninguna cifra de esta pieza se reporta como hallazgo
por ser inventada; sí se reportan las dos condiciones que fallan (verosimilitud en la
escena 6, marcador ausente en la portada).

Datos de referencia: 30 fps, 1080 × 1920, `sideCrop = 120` (`remotion/src/theme.ts:35`),
`safe.top = 205` (`theme.ts:48`), `textFloor = 1440` (`theme.ts:79`), banda de despeje de
las simulaciones `CLEAR = 940` (`simulations.tsx:26`).

---

## 1. Tabla por escena

Los fotogramas críticos van en tiempo global y en fotograma local de la escena (base 0).

| # | Recurso | Visual | Movimiento | Perfil de voz | Música | Efectos | Riesgos | Fotogramas críticos |
|---|---|---|---|---|---|---|---|---|
| 1 | `sim:que-compras` → `WhatYouBuySim` (`simulations.tsx:2583`) | Edificio desde la vereda sobre fondo propio, **sin** `FieldShell`; rótulo y título propios a `top:305` entre `sideCrop` | `climb` 92 → −30 (`:2586`), `single` 0.16–0.34, `sweep` 0.38–0.70, `shaft` 0.60–0.76, `tank` 0.68–0.84, tres etiquetas 0.50/0.68/0.80 | `draft-dora` (kokoro `ef_dora`, speed 1.04) | ninguna | ninguno | Cámara **baja**, no sube (`climb` positivo = cámara alta); cisterna y etiqueta «Sus deudas» quedan fuera del `viewBox`; «Sus deudas» invade el margen lateral derecho; cornisa del edificio sube hasta la caja de línea del título | 00:08.0 / local 240 (`tank` al máximo: la cisterna debería verse); 00:08.7 / local 260 (tres etiquetas puestas); 00:09.3 / local 280 (estado final + colisión título/cornisa) |
| 2 | `sim:propiedad-horizontal` → `HorizontalPropertySim` (`:2715`) | `FieldShell` papel; página 1 = corte del edificio con trama de área común y globos «Tuyo»/«Común»; página 2 = renglones Parqueadero Nº 12 / Bodega Nº 7 + pizarra de tiza «P-12» que se borra | `paint` 0.10–0.30, `label` 0.24–0.38, `turn` (rotateY −116°) 0.42–0.58, `lines` 0.58–0.72, `wipe` 0.74–0.90 | idem | ninguna | ninguno | La hoja que gira desaparece de golpe al cruzar −90° (`backfaceVisibility:'hidden'`, `:2772`); el borrador va por detrás de la zona que se borra; la página 2 se enciende con un `opacity` binario (`turn > 0.05 ? 1 : 0`, `:2729`) | 00:15.0 / local 165 (giro a media rotación); 00:16.5 / local 210 (página 2 asentada); 00:19.4 / local 300 (borrado a la mitad); 00:21.0 / local 345 (estado resuelto) |
| 3 | `sim:alicuota` → `ServiceChargeSim` (`:2830`) | `FieldShell` papel; recibo grande con monto **tapado** (bloque tramado, no cifra) y qué cubre; pila mensual; certificado con sello «AL DÍA» | `covers` 0.08–0.40, `settle` 0.30–0.46, llegada de recibos 0.34–0.71, `cert` 0.62–0.76, `stamp` 0.78–0.87, `ring` 0.85–0.97 | idem | ninguna | sello (visual, sin sonido) | El estado resuelto tras el `ring` dura ~9 fotogramas (mínimo del estándar: 6); el certificado se superpone al borde derecho de la pila; el mes en cabecera cambia mientras la pila crece (dos focos) | 00:24.6 / local 90 (recibo único legible); 00:27.9 / local 190 (certificado entrando); 00:30.3 / local 260 (sello al posarse); 00:31.3 / local 290 (reposo) |
| 4 | `sim:edificio` → `BuildingStateSim` (`:2954`) | `FieldShell` papel; mitad 1 = acta con bloque rojo «DERRAMA APROBADA»; mitad 2 = rejilla 2×2 de tarjetas con iconos (Ascensor, Bomba, Cisterna, Humedades) | `levy` spring a 0.30, `walk` 0.52–0.68 (crossfade), tarjetas spring 0.58/0.65/0.72/0.79 | idem | ninguna | ninguno | **No es la escena descrita:** no hay recorrido, ni corte lateral, ni continuidad con la escena 1; queda ~260 px de tarjeta en blanco durante el 40 % final; el título `FieldShell` sigue diciendo «Lo que ya se decidió» cuando la imagen ya cambió de asunto | 00:38.2 / local 200 (inicio del crossfade, dos mitades compitiendo); 00:40.0 / local 255 (vacío evidente, 2 de 4 tarjetas); 00:41.8 / local 310 (4 tarjetas); 00:44.0 / local 375 (reposo con hueco) |
| 5 | `sim:gravamenes` → `EncumbrancesSim` (`:3041`) | `FieldShell` papel; cuatro filas leídas con barra de progreso + bloque «Un abogado te dice qué significa» | `read` escalonado 0.08–0.76, `lawyer` spring a 0.72 | idem | ninguna | ninguno | El título en pantalla dice **«¿Debe algo el terreno?»** (`:3049`) en una pieza sobre un departamento; hueco grande antes de que entre el bloque del abogado | 00:50.0 / local 171 (título «terreno» + hueco); 00:51.4 / local 213 (bloque abogado); 00:53.6 / local 279 (reposo) |
| 6 | `sim:dividir` → `PlotUnitPriceSim` (`:3457`) | `FieldShell` papel; $122.000 ÷ 400 m² = $/m², y dos fichas de comparación 400 m² / 800 m² | `divide` spring a 0.16, contador `result` 0.34–0.58, `compare` spring a 0.66 | idem | ninguna | ninguno | **No demuestra la voz**: nada distingue metros útiles de áreas comunes; el ejemplo no es verosímil para el sujeto (un departamento no mide 400 m²); el rótulo `EJEMPLO` que autoriza el ejemplo mide 19 px | 01:00.7 / local 200 (bloque verde solo, mitad inferior vacía); 01:02.4 / local 250 (fichas comparadas); 01:05.5 / local 345 (reposo) |
| 7 | `sim:alrededor` → `PlotSurroundingsSim` (`:3241`) | `PublishShell` (panel de producto, **no** papel); mapa con polígono de lote, casitas, etiquetas «Vía principal», «Calle lateral», «Quebrada» | `zoom` 2.1 → 1 (0.05–0.62), `route` 0.50–0.88, etiquetas spring 0.42/0.52/0.62 | idem | ninguna | ninguno | Dibuja un **lote**, no un edificio ni su manzana; «Quebrada» es vocabulario de terreno; la cámara se aleja en vez de asentarse sobre la manzana; cambia de contenedor visual respecto a 2–6 sin transición espacial | 01:11.0 / local 154 (polígono de lote y etiquetas); 01:14.0 / local 244 (ruta trazada); 01:16.9 / local 331 (reposo) |
| 8 | ninguno (`Outro`) | Tarjeta de cierre: tile, marca, dominio, CTA, firma Aents | Aparición por opacidad + anillos | idem | ninguna | ninguno | Ninguno. Es el único plano de la pieza que llega limpio | 01:20.0 / local 82 |

Notas transversales de la tabla:

- **Marca:** `scene.tsx:285` pinta el `Wordmark` en **todas** las escenas 1–7, no solo en la
  7 como afirma `plan.json:93`. El requisito de marca reconocible antes del segundo 3 se
  cumple; la descripción del plan es la que está desactualizada.
- **Doble titular:** cada escena muestra a la vez el título interno de la animación
  (`FieldShell`, `simulations.tsx:2561`) y el `headline` de escena abajo
  (`scene.tsx:300`). Es la convención de la serie y se respeta, pero en las escenas 5 y 7
  los dos textos dicen cosas distintas («¿Debe algo el terreno?» vs «Léelo con abogado»).

---

## 2. Las cuatro animaciones nuevas, una por una

Evaluadas contra §1 del estándar (una idea, arco completo, jerarquía, causalidad,
acabado, legibilidad móvil, determinismo) y contra los segundos reales de
`production.json`.

### 2.1 `sim:que-compras` — 9,53 s (286 f)

- **Una idea:** sí. Un departamento dentro de un edificio entero.
- **Arco:** ventana única → barrido de fachada → ascensor → cisterna → tres etiquetas.
  Termina con estado resuelto de ~28 fotogramas. Correcto en estructura.
- **Causalidad:** rota en la cisterna. `tank` sube su opacidad entre `progress` 0.68 y
  0.84 (`simulations.tsx:2619`), pero `climb` ya está fijado en −30 desde `progress` 0.5
  (`:2586`): el tanque vive en `y = −8…48` del `viewBox` y con esa traslación queda en
  `−38…18`, es decir prácticamente **fuera del lienzo**. Aparece un elemento que nadie ve.
- **Acabado:** la etiqueta «Sus deudas» (`:2596`, `y = 46`) dibuja su caja en `y = 12…58`;
  con `climb = −30` queda en `−18…28` y su línea base de texto cae en `y ≈ 14`, con el
  alto de mayúscula de una fuente de 26 px por encima del borde superior del `viewBox`.
  **Se corta.** Es la etiqueta que carga la palabra «deudas», una de las tres del gancho.
- **Dirección de cámara:** el `docstring` (`:2576`) y `plan.json:39` dicen que la cámara
  *sube*. `translate(0, +92)` sitúa la vista arriba y `translate(0, −30)` la sitúa abajo:
  el movimiento implementado **desciende** del tejado a la vereda. Es coherente consigo
  mismo, pero contradice la dirección escrita y explica por qué la cisterna se revela
  justo cuando la cámara ya la dejó atrás.
- **Zonas seguras:** el bloque de texto está entre `sideCrop` (`:2601`). La etiqueta «Sus
  deudas» llega a `x = 796 + 184 = 980`, dentro de los 120 px reservados del lado derecho
  (límite 960).
- **Duraciones:** todos los hitos son proporciones de `span`, así que el arco se completa
  igual a 6 s o a 18 s. Robusto.
- **Determinismo:** puro `frame`/`total`; no usa `fps` ni `spring`. Correcto.
- **Familia:** es la única de las siete que abandona la tarjeta de papel. El `docstring` lo
  justifica (la afirmación es sobre un lugar, no sobre un papel) y `plan.json:39` lo pide.
  Lo acepto como excepción declarada, pero deja al gancho sin el rótulo «EJEMPLO» que sí
  llevan las demás.

### 2.2 `sim:propiedad-horizontal` — 12,03 s (361 f)

La mejor construida de las cuatro. Una idea, dos beats claros (qué es tuyo / qué debe
constar), la acción principal es el giro de página, y el borrado de la pizarra es la
prueba. Jerarquía correcta: nunca hay dos focos.

Defectos de acabado, ninguno bloqueante:

- La hoja que gira desaparece de golpe al pasar de −90° por `backfaceVisibility: 'hidden'`
  (`:2772`); el estándar pide entradas y salidas resueltas, no un objeto que se evapora a
  media rotación.
- El borrador (`:2752`, `left: 8 % → 82 %`) y el recorte del texto (`:2749`,
  `inset(0 wipe*100% 0 0)`, que borra desde la derecha) no coinciden: cuando el texto
  «P-12» empieza a desaparecer, el borrador va unos 35 puntos porcentuales por detrás. Es
  la clase de causalidad que §3 pide conservar.
- `opacity: turn > 0.05 ? 1 : 0` (`:2729`) es un salto binario. No se ve porque la página
  de arriba lo tapa, pero es un valor no derivado de una curva.
- La animación cumple `plan.json:48` salvo en un punto: el plan pedía «un juego de
  documentos… entrando escalonados» y aquí hay una sola hoja. Simplificación aceptable.

### 2.3 `sim:alicuota` — 9,93 s (298 f)

- **Una idea:** sí, y bien resuelta: el mismo recibo pasa de objeto legible a primera hoja
  de una pila.
- **Verdad:** el monto es un bloque tramado (`:2877`), no una cifra. Es exactamente lo que
  pide `CLAUDE.md` sobre no inventar precios y es la decisión más limpia de la pieza.
- **Ritmo:** el remate (`ring`, `:2842`) termina en `progress` 0.97 → quedan ~9 fotogramas
  de estado resuelto en los 9,93 s reales. Cumple el mínimo de 6 por poco. Si la locución
  se acorta en un rerender, cae por debajo. Recomiendo mover `ring` a 0.80–0.90.
- **Jerarquía:** entre `progress` 0.34 y 0.62 compiten dos cosas: los recibos que llegan
  por la derecha y el indicador de mes que cuenta en la cabecera (`:2873`). Son el mismo
  hecho contado dos veces; el contador es prescindible.
- **Geometría:** la pila (`left:0`, ancho 400, desplazamientos de hasta +55 px) y el
  certificado (`right:0`, ancho 336) conviven en un contenedor de 756 px. Se solapan por
  unos 40 px, atenuados por el `scale(0.8)` de `settle`. Hay que mirarlo en el fotograma
  local 190.
- **Duraciones y determinismo:** hitos proporcionales, sin aleatoriedad. `Math.min` protege
  el índice de `months` (`:2873`). Ningún valor sale de rango: `ring*(1-ring)*3.4` topa en
  0.85 y `scale(2.4 - stamp*1.4)` nunca baja de 1.

### 2.4 `sim:edificio` — 12,8 s (384 f) · **la que no está terminada**

- **No cumple el arco.** Es un crossfade entre dos láminas: un acta y una rejilla 2×2 de
  tarjetas con icono y palabra (`:2985`–`:2995`). No hay estado inicial, acción causal ni
  respuesta: hay una lámina que se va y otra que llega. Es justo lo que §13 llama
  «presentación de diapositivas».
- **Contradice su dirección.** `plan.json:66` y `storyboard.md` piden que la cámara entre
  al edificio en corte lateral, **con la misma línea de suelo y el mismo punto de vista de
  la escena 1**, y baje sin parar del tanque al hall. Esa continuidad —lo que uniría la
  escena 4 con el gancho— no existe en el código. Además la voz dice «camina el edificio» y
  la imagen no camina.
- **Hueco permanente.** Cuatro tarjetas de ~86 px en un área de 452 px dejan ~260 px en
  blanco durante todo el segundo beat. Verificado en el fotograma de 00:40.0 del MP4
  actual: más de la mitad de la tarjeta está vacía.
- **Título que deja de ser cierto.** `FieldShell` recibe la cadena fija «Lo que ya se
  decidió» (`:2969`) mientras el contenido pasa a «Y CAMINA EL EDIFICIO». Es exactamente el
  problema que el comentario nuevo de `FieldShell` (`:2531`–`:2534`) dice haber resuelto
  ampliando `title` a `React.ReactNode`… pero **ninguna simulación pasa un nodo**. El tipo
  se amplió y el uso quedó pendiente: código de intención sin terminar.
- **Iconografía:** los cuatro `path` (`:2963`–`:2966`) son de la misma familia lineal, pero
  el de «Bomba» es una onda genérica que no lee como bomba a tamaño móvil.
- **Duraciones:** el último `spring` arranca en `0.79·span`; con 12,8 s asienta ~50
  fotogramas antes del final. A duraciones cortas (< 7 s) el margen de reposo se acerca al
  mínimo, porque los hitos son proporcionales pero el `spring` tarda un tiempo absoluto.

---

## 3. Legibilidad móvil

- **Texto por debajo de 22 px — incumplido en cinco escenas:**
  - `simulations.tsx:2559` — rótulo «EJEMPLO» a **19 px** en `FieldShell`, presente en las
    escenas 2, 3, 4, 5 y 6. Agrava el hallazgo I5: el único aviso de que las cifras son
    ilustrativas es el texto más pequeño del cuadro.
  - `simulations.tsx:2973` — «ACTA DE ASAMBLEA» a **21 px** (escena 4).
  - `simulations.tsx:3477` y `:3495` — «PRECIO TOTAL», «ÁREA DECLARADA», «PRECIO POR METRO
    CUADRADO» a **20 px**; `:3502` — el precio de cada ficha a **21 px** (escena 6).
- **Margen lateral:** `FieldShell` (`:2543`–`:2544`) y el bloque de texto de
  `WhatYouBuySim` (`:2601`) cuelgan de `sideCrop`. Correcto. La única excepción es la
  etiqueta «Sus deudas» de la escena 1, que termina en `x = 980` (20 px dentro del margen).
- **Zona inferior:** todas las tarjetas cierran por encima de `CLEAR = 940`; los rótulos y
  subtítulos viven bajo `textFloor = 1440`. Verificado en los fotogramas extraídos: no hay
  texto crítico bajo la reserva de interfaz.
- **Sin audio:** las escenas 2, 3 y 5 se entienden solas. La 1 se entiende salvo por la
  etiqueta cortada. La 4 y la 6 **no** transmiten su afirmación sin la locución.

## 4. Determinismo

Limpio. `grep` sobre `simulations.tsx`, `scene.tsx`, `captions.tsx` y `outro.tsx` no
encuentra `Math.random`, `Date.now`, `new Date`, `setTimeout`, `setInterval`,
`performance.now`, `useState` ni `useEffect`; la única aparición de `Math.random` es la
palabra dentro de un comentario (`simulations.tsx:2288`). Las siete animaciones son
funciones puras de `frame`, `total` y `accent`. `span = Math.max(1, total ?? frame + 1)`
protege la duración cero en las cuatro nuevas. Todos los `interpolate` pasan por el helper
`ease` (`:18`–`:23`), que fija `clamp` en los dos extremos.

Único apunte: `WhatYouBuySim` aplica `ease()` sobre valores ya suavizados (`ease(sweep, …)`
en `:2639`, `ease(shaft, …)` en `:2627`). Es determinista, pero encadena dos bézier y hace
el escalonado más perezoso de lo que sugiere el código.

## 5. Coherencia de serie

Comparadas con `sim:gravamenes` (`:3041`), `sim:dividir` (`:3457`) y `sim:alrededor`
(`:3241`):

- **Misma familia:** escenas 2, 3 y 4 usan `FieldShell`, la misma tarjeta de papel, la
  misma pastilla de sección, la misma tipografía y los mismos radios que `sim:gravamenes` y
  `sim:dividir`. Correcto.
- **Ruptura declarada:** escena 1 abandona `FieldShell` por un lienzo propio. Está
  justificada por `plan.json:39` y por el `docstring`, pero pierde el marcador «EJEMPLO».
- **Ruptura no declarada, y es de la serie vieja:** `sim:alrededor` (escena 7) usa
  `PublishShell` —el panel de producto— mientras 2–6 usan papel. El corte 6 → 7 salta de
  papel a interfaz sin transición espacial, algo que §5 pide evitar.
- **Sujeto roto en tres escenas:** la pieza es sobre departamentos y en pantalla se
  lee «¿Debe algo el terreno?» (`:3049`), «Quebrada» (`:3252`), y una división de
  400 m² / 800 m² con polígono de lote (`:3273`, `:3467`). No es un problema de cifras
  —`CLAUDE.md` permite el dato de ejemplo marcado como `EJEMPLO`, y lo está— sino de
  verosimilitud del sujeto: la misma regla dice literalmente «un departamento no mide
  400 m²». Los propios registros lo
  admiten: `renderer.py:38` describe `sim:alrededor` como «El mapa se aleja desde el
  **terreno**» y `planner.py:202` describe `sim:dividir` como «dos **terrenos** de distinto
  tamaño comparados». Se reutilizaron tres animaciones de la guía de terrenos sin
  adaptarlas, que es lo que `CLAUDE.md` prohíbe explícitamente («No sustituyas una escena
  necesaria por otra existente que solo se parezca»).

## 6. Voz

- **Una sola voz en toda la pieza: confirmado por construcción.** `factory.py:213`–`:216`
  (`scene_providers`) resuelve **un** proveedor y lo repite para todas las escenas; es
  imposible alternar voces dentro de un video.
- **Qué voz es:** `plan.json` **no** declara `voice_profile`, así que
  `tts.select(None, final_master=False)` cae en `catalog["defaults"]["draft"]`
  (`tts.py:339`) = **`draft-dora`** (`system/voice-profiles.json:4`): Kokoro, voz
  `ef_dora`, `speed 1.04`. El perfil **existe** en el catálogo. Coincide con
  `production.json:13-14` (`tts_provider: kokoro`, `is_final_voice: false`).
- **Lo que falta:** el perfil llegó por defecto, no por decisión de dirección. `plan.json`
  admite el campo `voice_profile` (`planner.py:58`) y esta pieza lo dejó vacío.
- **Para el máster final** hacen falta, en este orden:
  1. Aprobación humana explícita del borrador (Puerta 5). No la hay: `review.json`
     registra `human_review: null`.
  2. Elegir **un** perfil final por intención, no por defecto. El default actual,
     `final-main`, resuelve su voz desde `ELEVENLABS_VOICE_ID`
     (`voice-profiles.json:31`): la voz del máster dependería de una variable de entorno,
     no de una decisión registrada. Los perfiles `voice-01` … `voice-07` siguen
     «pendiente de audición y clasificación creativa».
  3. `video voice-cost video-010` y autorización explícita del gasto.
  4. `video render video-010 --final`, que escribirá `voice-lock.json` (hoy no existe en
     `library/video-010/`) y fijará perfil y ajustes para siempre.
  5. Volver a medir la duración: `plan.json:28` avisa de que la voz de producción suele
     salir ~20 % más lenta; 82,8 s × 1,2 ≈ 99 s, todavía dentro del límite de 120 s de
     historia, pero cambia todos los `span` y hay que revisar de nuevo los remates.

## 7. Música y efectos

- **Discrepancia confirmada.** `plan.json:31` describe una pista concreta (piano
  eléctrico, bajo sostenido, cuerda larga, ~80 bpm, sereno, siempre bajo la voz).
  `production.json:15-16` registra `music: null` y `music_license: null`, y
  `render-props.json:8` lleva `musicFile: null`. **El máster salió en silencio.** No es un
  fallo del sistema: `--music` no se pasó al render (`factory.py:388`).
- **Sí existe una pista que encaja y está licenciada:**
  `assets/music/mixkit-piano-reflections.mp3` con su sidecar
  `mixkit-piano-reflections.mp3.license.json` (Ahjay Stelino, Mixkit Stock Music Free
  License, `commercial_use: true`, `paid: false`). Pasa la validación de
  `factory.py:308`–`:320`. Es la única de las siete de la biblioteca que responde al brief
  del plan.
- **Decisión de dirección:** o se renderiza con `--music assets/music/mixkit-piano-reflections.mp3`,
  o se corrige `plan.json:31` a `null`. Un plan que promete música y un máster mudo no
  pueden convivir en la firma.
- **Efectos:** la pieza no usa ninguno, y hace bien. El único gesto que pediría sonido es
  el sello de la escena 3, y §4 del rol dice que los efectos solo entran cuando explican
  una acción visible. El sello ya se explica solo. **Sin hallazgos.**

---

## 8. Hallazgos

### BLOQUEANTE

**B1 · El MP4 de `exports/` es anterior al código y ya no representa la pieza.**

Cronología verificada (hora local, `-05:00`):

| Hora | Hecho | Evidencia |
|---|---|---|
| 17:34:03 | `video lint` pasa | `library/video-010/lint.json:7` |
| 17:34:27 | se lanza `./video render video-010` | transcripción de sesión `73f76f66-8efe-4b7c-a746-c7ba7cf63b90.jsonl`, `2026-08-14T22:34:27Z` |
| 17:42:57 | se escribe `exports/video.mp4` | `mtime` del archivo |
| 17:43:03 | se escribe `production.json` | `production.json:2` (`rendered_at`) |
| 17:46:59 | `video review` pasa | `library/video-010/review.json:2` |
| **17:54:36** | **se edita `remotion/src/scene.tsx`** | transcripción, `22:54:36Z` |
| **17:55:21 – 17:57:38** | **cuatro ediciones a `remotion/src/simulations.tsx`** | transcripción, `22:55:21Z`, `22:56:22Z`, `22:57:14Z`, `22:57:38Z` |

Prueba independiente de que las ediciones son posteriores y no anteriores: la instantánea
de `file-history` de `scene.tsx` tomada a las 17:54:37 es **byte a byte idéntica** a
`HEAD:marketing/videos/remotion/src/scene.tsx`, y la última instantánea de
`simulations.tsx` (15:13:54) también es idéntica a `HEAD`. Es decir, **todo** el
`git diff` actual de esos dos archivos (348 inserciones, 122 borrados) se produjo después
del render.

Qué cambió y a qué afecta:

1. `scene.tsx:35` — la simulación deja de recibir `palette.green` fijo y pasa a recibir
   `scene.accent`. **Afecta a las siete escenas con animación.** En el MP4 actual el
   interior de cada tarjeta está pintado de verde mientras el titular, los subtítulos y la
   barra de progreso alternan violeta, teal y lavanda: dos acentos peleando en el mismo
   fotograma. Verificado en los fotogramas extraídos de 00:20.5 (tarjeta verde / titular
   violeta), 00:40.0 (verde / lavanda), 01:00.7 (verde / violeta) y 01:11.0 (verde / teal).
2. `simulations.tsx:2583`–`:2703` — `WhatYouBuySim` está **reescrita entera**. El MP4
   muestra la versión vieja (rejilla plana dentro de `FieldShell` + tres tarjetas «Sus
   reglas / Sus vecinos / Sus deudas»); el código actual dibuja un edificio desde la vereda
   con ascensor, cisterna y etiquetas conectadas. **Escena 1.**
3. `simulations.tsx:2715`–`:2819` — `HorizontalPropertySim` reescrita entera. El MP4
   muestra la lista de cuatro filas con interrogantes; el código actual hace corte del
   edificio + giro de página + pizarra que se borra. **Escena 2.**
4. `simulations.tsx:2830`–`:2951` — `ServiceChargeSim` reescrita entera. El MP4 muestra un
   gráfico de barras de meses; el código actual muestra el recibo, la pila y el sello.
   **Escena 3.**
5. `simulations.tsx:2531`–`:2534` — `FieldShell.title` pasa de `string` a `React.ReactNode`.
   Afecta al contrato de las escenas 2, 3, 4, 5 y 6.

`BuildingStateSim` (escena 4) y las tres animaciones preexistentes no cambiaron, pero
todas reciben ahora un acento distinto por el punto 1.

**Acción:** volver a renderizar con `./video render video-010` (borrador, Kokoro, sin
`--final`) antes de cualquier firma, y repetir `video review`. La revisión de calidad de
las 17:46 se hizo sobre un archivo que ya no existe conceptualmente y debe repetirse.

---

**B2 · La portada está rota: el título se desborda y la ilustración lo tapa.**

`exports/cover.png` (inspeccionada): «Antes de comprar un departamento» se parte en cuatro
líneas y la ilustración central se superpone sobre la tercera y la cuarta, dejando
«departamento» ilegible detrás de la casa y el pin. `CLAUDE.md` exige «al menos 48 px
libres entre el límite inferior del título de portada y la ilustración central; ningún
visual puede tocar, tapar o competir con el texto».

Causa: `cover.tsx:234` llama a `fit(coverText, {maxLines: 2, min: 72})`; con 32 caracteres
el texto no cabe en dos líneas ni al mínimo, y el bloque crece hacia abajo sin que la
ilustración se aparte.

Agravante en el mismo archivo: `cover-props.json:3` declara `coverArt: "terreno"`, y
`cover.tsx:225`–`:232` solo reconoce `origen`, `oferta`, `agente` y `aents`. El valor cae
al ramal por defecto, así que la portada de una pieza sobre departamentos muestra la ficha
genérica **«CASA EN CUMBAYÁ · $122.000 · 3 hab. · 2 baños · 400 m²»**, la insignia
«UBICACIÓN PRIMERO» y el pie «Fotos, precio y detalles en un solo lugar». Es la portada
reciclada del catálogo con otro título —lo que `CLAUDE.md` prohíbe— y muestra una casa
donde la pieza habla de un departamento.

Sobre la ficha de ejemplo de la portada: la regla de dato de ejemplo la permitiría, pero
aquí incumple dos de sus tres condiciones. **No hay rótulo `EJEMPLO` en ninguna parte de
`cover.png`** —la portada no usa `FieldShell` y `cover.tsx` no pinta ese marcador—, y el
sujeto no corresponde: una casa de 400 m² en una pieza sobre comprar un departamento.

**Dueño:** dirección de producción (ilustración) + editor jefe (`cover_art` en
`plan.json:106`). **Puerta a repetir:** 3.

---

**B3 · La escena 6 no demuestra la afirmación que dice la voz.**

Voz (`plan.json:81`): «fíjate qué metros te están contando: hay anuncios que suman áreas
comunes. Compara metros útiles con metros útiles». Rótulo: «Compara metros útiles».

`PlotUnitPriceSim` (`simulations.tsx:3457`–`:3509`) divide un precio total para un «ÁREA
DECLARADA» y compara dos inmuebles de 400 m² y 800 m². **En ningún fotograma distingue
superficie útil de área común**, que es literalmente la idea de la escena; su título en
pantalla es «Saca tu propio número». `plan.json:84` afirma que «el acento de la escena está
en qué área entra en la división: la superficie útil se destaca frente al área que
incluiría espacios comunes» — eso no está implementado.

Sobre las cifras, con la regla de dato de ejemplo de `CLAUDE.md` en la mano: el ejemplo
está marcado `EJEMPLO` en pantalla (`simulations.tsx:2559`) y la voz **no** convierte el
resultado en dato —dice «divide el precio para los metros», que la propia regla cita como
válido—. Eso no es un hallazgo. Lo que sí falla es la segunda condición, la verosimilitud
para el sujeto: 400 m² y 800 m² (`:3467`–`:3468`) no son departamentos, y la regla lo
nombra con esas palabras. El registro confirma el origen: `planner.py:202` describe este
`sim` como «dos **terrenos** de distinto tamaño comparados».

Esto incumple §13 («la acción demuestra literalmente la afirmación aprobada») y la regla de
`CLAUDE.md` de no sustituir una escena necesaria por otra que solo se parece. Se necesita
una animación propia o un cambio de guion decidido por el editor jefe; no lo resuelvo yo.

---

**B4 · La escena 4 no es una secuencia terminada.**

`BuildingStateSim` (`simulations.tsx:2954`–`:3000`) es un crossfade entre dos láminas y una
rejilla 2×2 de tarjetas con icono y palabra. No tiene estado inicial, acción causal ni
respuesta: §1.2 y §1.5 del estándar no se cumplen, y §13 lo describe como «presentación de
diapositivas». Contradice punto por punto `plan.json:66` (corte lateral del edificio, misma
línea de suelo y punto de vista que la escena 1, recorrido continuo del tanque al hall) y
deja ~260 px de tarjeta en blanco durante el 40 % final —verificable en el fotograma de
00:40.0—. Es, además, la escena más larga de la pieza (12,8 s).

Síntoma asociado: `FieldShell.title` se amplió a `React.ReactNode` (`:2531`–`:2534`)
justamente para que una escena que cambia de asunto pueda cruzar su título, pero
`BuildingStateSim` sigue pasando la cadena fija «Lo que ya se decidió» (`:2969`). El tipo
está ampliado y el uso quedó pendiente: es código de intención sin terminar, no un acabado.

---

### IMPORTANTE

**I1 · La cisterna y la etiqueta «Sus deudas» quedan cortadas en la escena 1.**
`simulations.tsx:2586` fija `climb = −30` desde `progress` 0.5. El grupo del tanque
(`:2619`–`:2623`, `y = −8…48`) queda en `−38…18` y la caja de «Sus deudas» (`:2596`,
`y = 12…58`) queda en `−18…28`, con la línea base del texto en `y ≈ 14`: por encima del
borde del `viewBox`. Ambos elementos se revelan cuando ya no se pueden ver. La cisterna es
uno de los tres elementos que `plan.json:39` pide iluminar; «deudas» es una de las tres
palabras del gancho.

**I2 · «Sus deudas» invade el margen lateral reservado.**
`simulations.tsx:2596` la sitúa en `x = 796`; con el ancho calculado en `:2675`
(`10 × 15 + 34 = 184`) llega a `x = 980`. El límite es `1080 − sideCrop = 960`
(`theme.ts:35`). En un teléfono 20:9 se le come el borde.

**I3 · Tres de las siete escenas hablan de terrenos en una pieza sobre departamentos.**
`simulations.tsx:3049` («¿Debe algo el terreno?», escena 5, visible en el fotograma de
00:50.0), `:3252` («Quebrada») y `:3273` (polígono de lote) en la escena 7, y `:3467`
(400/800 m²) en la escena 6. Los registros de la fábrica lo confirman: `renderer.py:38` y
`planner.py:199`, `:202`. Rompe §6 del estándar («las etiquetas esenciales usan las
palabras reales del producto») y la coherencia de serie que se me pidió auditar.

**I4 · La escena 7 cambia de sistema visual sin transición.**
`PlotSurroundingsSim` usa `PublishShell` (`simulations.tsx:3255`) mientras 2–6 usan
`FieldShell`. El corte 6 → 7 pasa de papel a panel de producto sin match cut ni continuidad
de objeto (§5, §9). Además la cámara se **aleja** (`zoom` 2.1 → 1, `:3247`), mientras
`plan.json:93` dice que «la cámara termina asentada sobre la manzana del edificio».

**I5 · Texto por debajo de 22 px en cinco escenas.**
`simulations.tsx:2559` (19 px, «EJEMPLO», escenas 2–6), `:2973` (21 px, escena 4),
`:3477` y `:3495` (20 px, escena 6), `:3502` (21 px, escena 6). El caso de `:2559` es el
más serio: con la regla de dato de ejemplo de `CLAUDE.md`, el rótulo `EJEMPLO` es
precisamente **la condición que autoriza** mostrar un precio y un área ilustrativos. Es el
texto más pequeño del cuadro y está por debajo del suelo de legibilidad: la condición se
cumple en el código y no en la pantalla de un teléfono. Subirlo a 22 px o más no es una
cuestión de estilo, es lo que sostiene el permiso.

**I6 · El plan describe música que el máster no tiene.**
`plan.json:31` vs `production.json:15-16` y `render-props.json:8` (`musicFile: null`).
Existe pista con licencia archivada (`assets/music/mixkit-piano-reflections.mp3` +
sidecar). Hay que decidir: renderizar con `--music` o poner `music: null` en el plan.

**I7 · Las descripciones registradas en Python ya no corresponden al código Remotion.**
`renderer.py:30` describe `sim:propiedad-horizontal` como «La lista de lo que consta en la
escritura: el departamento sí, el parqueadero y la bodega con signo de interrogación» — esa
lista ya no existe: `simulations.tsx:2715` dibuja un corte del edificio, un giro de página
y una pizarra. Igual `renderer.py:31` para `sim:alicuota` («Los meses de alícuota
pagados»), que describe el gráfico de barras eliminado. §10 exige que los registros
coincidan. `tests/test_factory.py:491`–`:503` solo compara el **conjunto de identificadores**,
así que la suite pasa (73 tests OK) sin detectar la divergencia semántica.

**I8 · La pieza no declara su perfil de voz.**
`plan.json` no lleva `voice_profile` aunque el esquema lo admite (`planner.py:58`). Hoy
funciona porque el defecto es `draft-dora` (`voice-profiles.json:4`), pero la elección de
voz es una decisión de este rol y debe quedar escrita antes del máster. Para el final, el
defecto `final-main` resuelve la voz desde `ELEVENLABS_VOICE_ID`
(`voice-profiles.json:31`): no es un perfil elegido, es una variable de entorno.

---

### RECOMENDACIÓN

**R1 · Escena 3: mover el remate `ring` de 0.85–0.97 a ~0.80–0.90** (`simulations.tsx:2842`).
Con los 9,93 s reales quedan ~9 fotogramas de estado resuelto; el mínimo del estándar es 6
y no sobra margen para un rerender con voz más rápida.

**R2 · Escena 3: quitar el contador de mes de la cabecera** (`simulations.tsx:2873`).
Cuenta el mismo hecho que la pila de recibos y crea un segundo foco entre `progress` 0.34 y
0.62.

**R3 · Escena 2: alinear el borrador con la zona borrada.**
`simulations.tsx:2749` recorta el texto desde la derecha y `:2752` mueve el borrador de
izquierda a derecha; el borrado va por delante del objeto que lo causa.

**R4 · Escena 2: resolver la salida de la hoja que gira.**
`backfaceVisibility: 'hidden'` (`:2772`) la hace desaparecer al cruzar −90°. Un reverso de
papel o un `turn` que se detenga antes de −90° cierran el movimiento.

**R5 · Escena 1: revisar la colisión entre el título y la cornisa del edificio.**
Con `climb = −30` la cornisa (`:2618`, `y = 46…66`) se sitúa hacia `y ≈ 404` en pantalla,
dentro de la caja de línea del título de 44 px que ocupa aproximadamente `365…418`
(`:2603`). Inspeccionar el fotograma local 280 del rerender antes de dar la escena por
buena.

**R6 · Escena 1: la dirección de cámara no coincide con lo escrito.**
El `docstring` (`:2576`) y `plan.json:39` dicen «sube»; `climb` 92 → −30 desciende. Elegir
una de las dos y hacer que el código y la prosa digan lo mismo, porque de esa decisión
depende si la cisterna se ve (I1).

**R7 · Escena 4: cambiar el icono de «Bomba»** (`simulations.tsx:2964`). La onda genérica no
se lee como una bomba a tamaño de teléfono.

**R8 · Simplificar el doble suavizado en la escena 1.**
`ease(sweep, …)` (`:2639`) y `ease(shaft, …)` (`:2627`) aplican una segunda bézier sobre un
valor ya suavizado. Determinista, pero hace el escalonado más lento de lo que aparenta.

**R9 · Escena 1: añadir el marcador `EJEMPLO`.** Es la única de las siete que no lo lleva,
porque es la única que no usa `FieldShell`. No muestra cifras, así que hoy no lo necesita
para autorizar nada; se pide por coherencia de serie, para decir que la ilustración no es
una captura. En la portada (B2) el mismo marcador sí es obligatorio, porque allí sí hay
una ficha con precio y área.

---

## 9. Qué falta para poder firmar

1. Rerender del borrador con el código actual (**B1**) y `video review` nuevo.
2. Portada rehecha para este concepto y con el título dentro de su caja (**B2**).
3. Decisión del editor jefe sobre la escena 6: animación propia o cambio de guion (**B3**).
4. Reescritura de `sim:edificio` conforme a `plan.json:66`, o cambio declarado de la
   dirección de esa escena (**B4**).
5. Decisión sobre música: renderizar con `mixkit-piano-reflections.mp3` o poner
   `music: null` en el plan (**I6**).
6. Declarar `voice_profile` en `plan.json` (**I8**).
7. Solo después: aprobación humana del borrador, elección explícita del perfil final,
   `voice-cost`, autorización del gasto y `--final` con su `voice-lock.json`.

Ningún punto de esta lista lo ejecuto yo en esta fase: es auditoría. No se tocó ninguna
animación ni ningún archivo del renderer, no se reescribió la promesa ni el guion, y no se
gastó voz final.
