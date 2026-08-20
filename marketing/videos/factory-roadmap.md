# Diagnóstico y plan de la fábrica de videos

Revisión del estado real de `marketing/videos/` el 2026-08-12, con evidencia
ejecutada (no leída) y un plan por fases para convertirlo en una fábrica capaz
de sostener publicaciones semanales en TikTok e Instagram Reels.

> **Estado: fases 0 a 4 implementadas el 2026-08-12.** Lo que sigue es el
> diagnóstico original, conservado porque explica por qué el sistema es como es.
> Al final hay un registro de lo que se construyó y de los defectos que
> aparecieron al ejecutarlo. La fase 5 (videos por propiedad) queda descartada
> por ahora: la fábrica vende la plataforma.

---

## 1. Qué hay hoy

La documentación es la parte más sólida del proyecto: `product-context.md`,
`strategy.md`, `creative-system.md` y `production-guide.md` forman una base
editorial honesta, con límites de veracidad explícitos y fuentes citadas. Eso no
suele existir y no hay que tocarlo.

La máquina es otra cosa. El flujo declarado es
`new → approve → render → review → results → learn`, con Claude planificando,
Kokoro poniendo la voz y Remotion montando.

**El entorno está instalado y funciona**: `ffmpeg`, `ffprobe`, `node`, `claude`,
`espeak-ng`, `.venv` con Kokoro importable, `remotion/node_modules` con el
binario y 313 MB de pesos en `.cache`.

**Pero la fábrica nunca ha producido nada.** `library/` no existe,
`memory/catalog.json` tiene `videos: []`, `memory/video-catalog.jsonl` está
vacío y `content-gaps.json` marca `video_count: 0`. Todo lo escrito sobre cómo
se comporta el sistema es hipótesis sin una sola pieza que la respalde.

---

## 2. Hallazgos

### 2.1 Dos motores solapados y dos memorias

`video_factory.py` es el prototipo completo (plan + FFmpeg `drawtext` + catálogo
propio) y `factory.py` es el sistema con estado que lo sustituye. El segundo
importa del primero solo `create_plan` y `generate_voice`,
`write_srt`, `run`, `FONT` y `FPS`. Todo lo demás es código muerto que sigue
ejecutable y sigue leyéndose:

- `video_factory.py:345` `render_scene` y `video_factory.py:380` `assemble_video`: el
  pipeline FFmpeg antiguo, con una estética distinta a la de Remotion.
- `video_factory.py:244` `next_video_number` y `video_factory.py:251` `append_catalog`:
  numeración y catálogo paralelos a `memory/catalog.json`.
- `video_factory.py:130` `append_run_log`: tercer registro de ejecución.

La memoria está igual de duplicada: `video-feedback` escribe en
`memory/lessons.md`, `video learn` escribe en `memory/lessons.json`, y
`read_context()` lee los dos. Dos formatos para el mismo concepto es la forma
más segura de que las lecciones se contradigan sin que nadie lo note.

### 2.2 El render no tiene formato de TikTok/Reels

Rendericé dos fotogramas reales con `remotion still` para no opinar a ciegas:

```bash
cd marketing/videos/remotion
node_modules/.bin/remotion still src/index.ts EstateMapVideo /tmp/frame.png \
  --props /tmp/props.json --frame 45
```

Lo que se ve:

- **Una escena es una diapositiva.** Cada escena muestra un titular fijo y la
  frase completa de la locución en un bloque inferior, inmóvil durante los 4–6
  segundos que dura la voz. Es exactamente lo que `CLAUDE.md` prohíbe
  («Evita presentaciones de diapositivas estáticas») y lo que hunde la
  retención en los primeros segundos.
- **Los subtítulos no son subtítulos de red social.** La frase entera aparece de
  golpe. El estándar de TikTok e Instagram es texto sincronizado palabra a
  palabra o en grupos de 2–4 palabras.
- **Las zonas seguras son irreales.** `production-guide.md` pide reservar 120 px
  arriba, 220 px abajo y 140 px a la derecha; el render ni siquiera respeta eso,
  y esas cifras se quedan cortas frente a la interfaz real:
  - `remotion/src/video.tsx:72` pone «GEO PROPIEDADES» en `top: 78`, debajo de
    las pestañas *Siguiendo / Para ti* de TikTok.
  - `remotion/src/video.tsx:85` pone la barra de progreso en `bottom: 94`,
    debajo del nombre de usuario y el caption de Reels.
  - `remotion/src/video.tsx:82` extiende el bloque de voz hasta `x = 1008`,
    debajo de la columna de acciones de TikTok (≈ 260 px de ancho).
- **La tipografía no se ajusta.** «Buscar a ciegas cansa» ya toca el margen
  derecho a 96 px. Un titular una palabra más largo rompe la composición, y no
  hay medición ni reducción automática.
- **El «mapa» no es un mapa.** Es una línea discontinua decorativa sobre una
  cuadrícula. Es agradable, pero no demuestra el producto, y el mensaje rector
  de la marca es literalmente «la propiedad se entiende mejor cuando puedes
  verla en el mapa». Sin material real, cada video es una lámina tipográfica.
- **La marca no aparece.** `assets/brand/aents-brand-tile-1024.png` y
  `aents-symbol-negative.png` están en el repo y no se usan en ningún sitio.
- **El cierre pierde información.** `remotion/src/video.tsx:79` descarta el
  `on_screen_text` de la última escena y muestra solo el CTA; el dominio nunca
  se ve escrito, solo se pronuncia.

### 2.3 La duración pedida no se cumple

`create_plan` pide escenas que sumen ≈ N segundos, pero
`factory.py:308` descarta esa duración y usa la de la voz sintetizada más
0,35 s. Con Kokoro en español a velocidad 1.04 (~14–16 caracteres/segundo), un
plan de 20 s con seis frases largas sale en 35–45 s. Nadie reconcilia esa
diferencia: `cmd_review` solo comprueba el rango 8–60 s, así que un video que
mide el doble de lo pedido pasa el control.

### 2.4 El audio resta

- La música por defecto (`video_factory.py:322`) son dos senoidales de 110 Hz y
  220 Hz con trémolo. No es música: es un zumbido. En TikTok es peor que el
  silencio.
- Los efectos (`factory.py:198`) se sintetizan con `sine`/`anoisesrc` y se mezclan
  con `amix` desde el segundo 0, es decir, encima de la primera sílaba de la
  locución de cada escena.

### 2.5 El control de calidad llega tarde y caro

`video review` corre **después** del render. Todo lo barato de detectar —una
afirmación no verificable, un CTA que no corresponde al público, un rótulo de
doce palabras, una duración imposible, un `asset` que Claude inventó— se podría
comprobar sobre `plan.json` antes de gastar síntesis de voz y un render de
Chrome. `system/quality-rules.json` describe esas reglas y nadie las ejecuta.

Además la revisión humana no se puede cerrar: `review.json` escribe siempre
`human_review_required: true` y no hay comando para firmarla, mientras
`factory.py:367` ya deja el video en estado `reviewed`.

### 2.6 Es un taller de una pieza, no una fábrica

`strategy.md` exige tres ganchos por concepto, cuatro publicaciones semanales y
una sola variable por experimento. La CLI solo sabe hacer un video, de uno en
uno, con una aprobación manual cada vez. No existe:

- generación de variantes de gancho sobre el mismo cuerpo,
- lote semanal,
- exportación de portada (`cover_text` se planifica y nunca se renderiza a
  imagen, aunque `VIDEO-SCHEMA.md` la exige y Reels la necesita),
- paquete de publicación listo para pasar al teléfono,
- regeneración parcial (cada render re-sintetiza toda la voz desde cero).

### 2.7 El cuello de botella real es la materia prima

Sin grabaciones de pantalla del producto, la fábrica solo puede producir
tipografía sobre fondo navy. `--assets` es una carpeta manual: alguien tiene que
grabar, recortar y nombrar los clips a mano antes de cada pieza. Ese trabajo
manual es el que va a matar el ritmo semanal, no la generación del guion.

---

## 3. Plan por fases

Orden pensado para que cada fase deje algo publicable, no para llegar al final
antes de tener el primer video.

### Fase 0 — Demostrar que la cadena funciona (medio día)

Producir `video-001` de punta a punta con el sistema tal como está, sin arreglar
nada primero. Objetivo: convertir la hipótesis en hechos y medir tiempos reales
(cuánto tarda Claude, cuánto Kokoro por escena, cuánto Remotion). Todo lo que se
rompa entra en la Fase 1 con evidencia en vez de intuición.

### Fase 1 — Un motor, una memoria (1 día)

1. Borrar de `video_factory.py` el pipeline FFmpeg, el catálogo `jsonl`, el
   `run-log` y su `main()`. Partir lo que queda en `planner.py` (Claude),
   `voice.py` (TTS) y `subtitles.py`; `factory.py` se queda como única CLI.
2. Una sola memoria de lecciones: `memory/lessons.json` como fuente y
   `memory/lessons.md` regenerado desde ella para lectura humana.
   `video-feedback` escribe en el JSON.
3. Retirar `new-video` y `video-factory` como alias, o documentarlos como
   compatibilidad; hoy son tres puertas a lo mismo.
4. Caché de voz: hash del texto de cada escena → si no cambió, no se
   re-sintetiza. Habilita corregir una escena sin repetir el video.

### Fase 2 — El render que retiene (2–3 días) · **máximo impacto**

Es la fase que decide si los videos funcionan o no.

1. **Subtítulos karaoke sin dependencias nuevas.** En vez de sintetizar una
   escena entera, trocear la locución en frases de 2–4 palabras y sintetizar
   cada trozo con Kokoro. La duración medida de cada trozo *es* su tiempo en
   pantalla: se obtiene sincronía exacta gratis, sin alineador forzado ni
   Whisper. Cada trozo se convierte en una `Sequence` de Remotion y en una
   entrada del `.srt`.
2. **Ritmo por beats.** Cada escena se subdivide en unidades de 1–2,5 s con un
   cambio visual por unidad (empuje de cámara, revelado por máscara, resalte de
   un elemento, corte a otro recurso). Regla dura: ningún fotograma idéntico
   durante más de 2,5 s.
3. **Zonas seguras reales y verificables.** Definirlas en un módulo compartido
   (arriba 220 px, abajo 500 px para TikTok / 380 px para Reels, derecha 280 px)
   y añadir una composición `SafeAreas` en Remotion Studio que las dibuje
   encima. Actualizar `production-guide.md` con las cifras nuevas.
4. **Tipografía que se ajusta sola:** `fitText` de `@remotion/layout-utils` para
   que el titular baje de cuerpo antes que desbordar; máximo tres líneas.
5. **Cierre de marca:** usar el tile de `assets/brand/`, mostrar el dominio
   escrito y conservar el `on_screen_text` de la última escena junto al CTA.
6. **Música:** quitar la síntesis de senoidales. Por defecto, sin música —el
   audio de tendencia se añade al publicar— y una carpeta `assets/music/` con
   pistas gratuitas para uso comercial, autor y licencia archivados. Los efectos, si
   se mantienen, con retardo para no pisar la primera sílaba.
7. **Control de duración:** estimar la duración a partir del texto antes de
   sintetizar; si supera el objetivo en más de un 15 %, pedir a Claude una
   versión más corta en vez de aceptar un video del doble de largo.

### Fase 3 — Materia prima real, automatizada (2 días)

Un arnés de captura con Playwright (ya está en el repo, en `tests/`) que abre
`geopropiedadesecuador.com` en un viewport 1080 × 1920 y graba flujos guionados:
mapa desplazándose sobre una ciudad, aplicación de filtros, apertura de una
ficha, formulario de publicación, kit social.

- Salida en `assets/screens/<flujo>.mp4` más un `manifest.json` con descripción,
  duración y qué demuestra cada clip.
- Ese manifiesto se pasa a `create_plan`, de modo que Claude elige recursos por
  significado en vez de recibir una lista de nombres de archivo sueltos.
- Privacidad, según `CLAUDE.md`: datos sembrados o propiedades autorizadas,
  nunca contacto real, ni paneles administrativos, ni contadores de visitas.

Esto es lo que convierte las láminas tipográficas en demostración de producto, y
es la diferencia entre una cuenta que enseña algo y una que decora frases.

### Fase 4 — Volumen y experimentación (2 días)

Comandos nuevos, todos sobre la estructura que ya existe:

| Comando | Qué hace |
| --- | --- |
| `video lint <id>` | Ejecuta `quality-rules.json` sobre `plan.json` **antes** de aprobar: CTA dentro de la familia del público, rótulos ≤ 5 palabras, recursos existentes, vocabulario prohibido, gancho no repetido frente al catálogo. |
| `video variants <id> --hooks 3` | Mismo cuerpo, tres ganchos; registra los tres como hermanos con `experiment: hook`. Es lo que `strategy.md` pide y hoy no existe. |
| `video batch <lote.yaml>` | Planifica y lintea las cuatro piezas de la semana con una sola aprobación. |
| `video cover <id>` | Exporta la portada 1080 × 1920 que `VIDEO-SCHEMA.md` exige y Reels necesita. |
| `video pack <id>` | Carpeta lista para el teléfono: MP4, portada, caption, hashtags, nombre según la convención `AAAA-MM-DD_audience_pillar_concept_hook-v01.mp4`. |
| `video sign <id> --by X` | Cierra la revisión humana explícitamente; `results` la exige. |

Y simplificar el bucle de medición: `results.csv` tiene veinte columnas que
nadie va a rellenar a mano cada semana. Reducirlo a lo que TikTok e Instagram
exportan de verdad y fijar por escrito la regla de ganador (por ejemplo,
retención a 3 s y clics al perfil, no reproducciones).

### Fase 5 — Opcional: videos por propiedad

La fábrica actual vende la plataforma. La palanca de volumen de un portal
inmobiliario en TikTok es el otro tipo de pieza: un Reel por propiedad
destacada, generado desde los datos y las fotos que ya están en la base y en
MinIO (`video property <id>`).

Es viable con la misma cadena y multiplicaría el catálogo, pero tiene dos
condiciones innegociables:

1. Solo propiedades con autorización explícita del anunciante, sin datos de
   contacto en pantalla.
2. `specs/proposals/social-kit.yaml` marca el video automático como
   **propuesta**, no como función. Se puede usar como material de marketing
   propio; no se puede insinuar que el usuario lo recibe al publicar.

---

## 4. Prioridad

| # | Acción | Impacto | Esfuerzo |
| --- | --- | --- | --- |
| 1 | Fase 0: producir `video-001` real | Alto | Bajo |
| 2 | Subtítulos karaoke + ritmo por beats | Muy alto | Medio |
| 3 | Zonas seguras reales + ajuste tipográfico | Alto | Bajo |
| 4 | `video lint` antes de aprobar | Alto | Bajo |
| 5 | Control de duración | Medio | Bajo |
| 6 | Captura Playwright del producto | Muy alto | Medio |
| 7 | Quitar la música sintética | Medio | Muy bajo |
| 8 | `variants` + `batch` + `pack` + `cover` | Alto | Medio |
| 9 | Un motor, una memoria | Medio | Medio |
| 10 | Videos por propiedad | Alto | Alto |

---

## 5. Lo que se construyó y lo que se rompió al hacerlo

Registro de la ejecución del plan, el 2026-08-12. Vale la pena conservarlo
porque cada defecto apareció al ejecutar el sistema, no al leerlo.

### Defectos encontrados al producir el primer video

1. **El planificador moría siempre.** El system prompt le pide a Claude verificar
   afirmaciones contra `specs/`, así que el Claude anidado intentaba usar Bash,
   se le denegaba el permiso y agotaba su único turno. `--max-turns 1` devolvía
   `error_max_turns` con `stderr` vacío, de modo que el error que veía la
   persona era literalmente `Claude CLI failed:`. Se planifica a libro cerrado
   (`--tools ""`) y los fallos se leen del JSON, donde de verdad están.
2. **`video review` nunca había funcionado.** `ffprobe` con esa plantilla CSV
   devuelve `1080x1920x`, y el `split("x")` esperaba dos valores. La fábrica
   nunca había llegado a revisar nada.
3. **El CTA se salía del cuadro.** Confirmado en el primer MP4 producido:
   «Explora el mapa en geopropiedadesecuador.com» quedaba cortado por el borde
   derecho. De ahí el ajuste tipográfico medido con la fuente real.
4. **Playwright rellena, no escala.** El grabador captura al tamaño CSS del
   viewport y solo reduce; pedirle un lienzo de 1080 × 1920 desde un viewport de
   360 px dejaba la página en una esquina sobre gris. Se graba a 540 × 960 y se
   escala con ffmpeg.
5. **La grabación empezaba antes que la página.** El vídeo arranca al crear el
   contexto del navegador, así que los primeros segundos eran una página en
   blanco y el recorte se quedaba justo con esa parte. De ahí el paso `mark`.
6. **El velo era demasiado suave.** Las capturas del portal son una interfaz
   clara y el texto es blanco; el degradado original no sostenía el contraste.

### Defectos encontrados en la revisión del código nuevo

- `video learn` guardaba el catálogo antes de pedirle las lecciones a Claude: si
  esa llamada fallaba, los videos quedaban en `learned` y su evidencia no
  producía ninguna lección jamás.
- Re-renderizar dejaba vivo el `review.json` anterior, así que se podía firmar y
  empaquetar un máster que nadie había revisado. Ahora el render invalida la
  revisión, `sign` exige el estado `reviewed` y el render comprueba que el plan
  no haya cambiado desde la aprobación.
- El linter reventaba con un traceback si alguien editaba `plan.json` a mano y
  dejaba un campo nulo, justo en el bucle que el propio comando recomienda.
- `video cover` vaciaba la carpeta de trabajo y luego buscaba en ella la imagen
  de portada, generando una portada distinta a la del render.
- Un fallo a mitad de `new` dejaba un directorio huérfano que bloqueaba el
  siguiente número para siempre.
- La clave de caché de voz no incluía la voz de macOS ni el modelo de
  ElevenLabs: cambiarlos servía audio antiguo.

### Verificado en ejecución

- Cadena completa `new → lint → approve → render → review → sign → cover → pack`
  sobre `video-001`, con material real capturado del portal.
- `video variants --hooks 3` produce tres piezas hermanas con el mismo cuerpo y
  distinto gancho, cada una lintada y registrada como experimento.
- Tiempos de máquina: planificar ≈ 90 s, renderizar ≈ 90–180 s según cuánta voz
  haya en caché. Un lote de cuatro piezas cabe en menos de veinte minutos de
  máquina.

## 6. Dos cosas que hay que decidir antes de producir en volumen

- **Licencia de Remotion.** El uso comercial por una empresa requiere licencia
  de pago según el tamaño del equipo. Está anotado en el `README.md` como
  advertencia; antes de la primera campaña tiene que ser una decisión tomada,
  no una nota.
- **Ritmo sostenible.** `strategy.md` fija cuatro publicaciones semanales. Con
  las fases 2 a 4 hechas, eso son unos diez minutos de trabajo humano por pieza
  (aprobar, revisar, publicar). Sin ellas, es una tarde por pieza y el sistema
  se abandona al tercer mes.
