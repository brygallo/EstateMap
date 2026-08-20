# Fábrica multimarca de videos de Aents

Un solo motor convierte una idea en un MP4 vertical listo para publicar. Geo
Propiedades es el perfil predeterminado por compatibilidad; Aents usa el mismo
motor con verdad de producto, catálogo, memoria, publicaciones y biblioteca
independientes. La marca nunca se deduce del guion o de una animación.

```bash
marketing/videos/video status                 # Geo Propiedades, compatible
marketing/videos/video --brand geo status     # selección explícita equivalente
marketing/videos/video --brand aents status   # espacio editorial de Aents
marketing/videos/video --brand aents new "Presentar Geo Propiedades como producto de Aents"
```

Las opciones globales, como `--brand`, se escriben antes del comando. El motor,
Remotion, perfiles de voz, caché técnica y controles de calidad se comparten. No
se comparten numeración, resultados ni aprendizajes editoriales.

Claude y Codex trabajan bajo el mismo contrato. [AGENTS.md](AGENTS.md) obliga a
Codex a leer las reglas normativas de [CLAUDE.md](CLAUDE.md), y
[council.md](council.md) organiza la producción en carriles paralelos con un
editor jefe, cuatro responsabilidades y cinco puertas verificables.

El motor se apoya en módulos de responsabilidad única:

- `catalog.py`: el catálogo de videos, sus estados y la escritura atómica en disco.
- `planner.py`: todas las llamadas a Claude (planes, ganchos alternativos, lecciones).
- `quality.py`: linter del plan, antes de aprobar y renderizar.
- `tts.py`: los proveedores de voz, una clase cada uno (Kokoro, macOS, ElevenLabs).
- `voice.py`: síntesis por escena completa, división visual de subtítulos, caché y tiempos medidos del audio.
- `elevenlabs.py`: la única llamada HTTP al proveedor de pago.
- `subtitles.py`: escritura del SRT desde esos tiempos.
- `renderer.py`: preparación e invocación de Remotion.
- `media.py`: utilidades ffmpeg/ffprobe.
- `lessons.py`: memoria de aprendizajes (`memory/lessons.json` como fuente, `memory/lessons.md` como vista).

`video_factory.py` y `video_feedback.py` ya no existen. `new-video` y `video-factory` siguen como alias obsoletos que avisan por stderr; `video-feedback` ejecuta `video feedback`.

## Instalación

Requiere Python 3.10+, Node, FFmpeg, `espeak-ng` y la CLI `claude` con sesión iniciada. La instalación inicial local es:

```bash
brew install espeak-ng
marketing/videos/setup
```

Kokoro descarga sus pesos abiertos la primera vez y luego trabaja localmente.

### Voz de borrador y voz de producción

El guion se reescribe muchas veces y esas vueltas no cuestan nada:

```bash
video render geo-001            # borrador: Kokoro local, gratis, ilimitado
video voice-cost geo-001        # qué compraría el máster, sin comprarlo
video render geo-001 --final    # producción: compra la voz de ElevenLabs
```

`--final` es la única puerta al gasto: sin él, `render` usa la voz gratis aunque `.env` tenga ElevenLabs configurado. Antes de comprar muestra el importe y pide confirmación; si no hay terminal donde preguntar se niega, salvo que `--yes` lo autorice por adelantado.

Cada frase comprada queda en `.cache/voice/paid/` bajo el hash de su texto exacto, así que re-renderizar un guion sin cambios no cuesta nada y editar una línea solo compra esa línea. La copia pagada se guarda intacta: un recorte fallido o un render interrumpido nunca obligan a pagarla otra vez. `ELEVENLABS_MAX_CHARS_PER_RUN` corta la tirada que se salga de lo previsto y `.cache/voice/elevenlabs-usage.jsonl` lleva la cuenta.

Cada proveedor y perfil firma su propio caché (`tts.py`), de modo que los ajustes de Kokoro no pueden invalidar lo pagado a ElevenLabs y dos voces del mismo proveedor nunca comparten por accidente una toma. Cambiar la voz, el modelo o los ajustes de pago sí vuelve a comprar las líneas asignadas a ese perfil.

### Catálogo y selección de voces

Los perfiles viven en `system/voice-profiles.json`. Cada uno declara proveedor,
nombre humano, descripción y ajustes de síntesis. Cuando llegue una nueva lista
de voces se añade allí; las claves y secretos permanecen en `.env`.

Un máster final no elige su voz igual que un borrador. El orden es:
`voice-lock.json` si la pieza ya compró su voz —y entonces esa es su voz para
siempre—, después `--voice-profile`, y si nadie dijo nada, el turno que le toca
en la rotación (`workflow.FinalVoiceRotation`): los perfiles pagados que
declaran su propio `voice_id`, repartidos por número de video. Elijas lo que
elijas, comprar la voz del video anterior se rechaza antes de gastar. El
`voice_profile` del plan es el narrador del borrador y no decide el máster.

En un borrador, el perfil puede elegirse en estos niveles, de mayor a menor prioridad:

1. `video render geo-001 --voice-profile perfil`: fuerza una voz para todas las escenas.
2. `voice_profile` en la raíz del plan: narrador del video completo.
3. `DRAFT_VOICE_PROFILE` o `FINAL_VOICE_PROFILE`: valor global de la etapa.
4. `DRAFT_TTS_PROVIDER` o `FINAL_TTS_PROVIDER`: las variables antiguas, que
   nombran un proveedor y no un perfil. Se traducen al perfil de esa etapa que ya
   habla con ese proveedor, así que `DRAFT_TTS_PROVIDER=macos` sigue siendo el
   respaldo cuando Kokoro no está instalado y resuelve a `draft-paulina`.
5. Los defaults del catálogo.

Si el plan no declara nada, los defaults conservan el comportamiento anterior. El
linter rechaza un `voice_profile` que no exista en el catálogo, de modo que una
voz inventada se detiene antes de la aprobación y no en mitad del render. Un
borrador rechaza perfiles pagados. Todas las escenas usan la misma voz. La primera
generación final crea `voice-lock.json` con el perfil y la firma exacta de sus
ajustes; desde ese momento intentar cambiarla falla antes de gastar.

```bash
marketing/videos/video voice-cost geo-001 --voice-profile final-main
marketing/videos/video render geo-001 --voice-profile draft-paulina
marketing/videos/video voices
```

`production.json` conserva el perfil usado y cada entrada de `scene_timings`
registra ese mismo perfil y proveedor.

Las credenciales van en `.env`, ignorado por git; `.env.example` documenta las variables sin valores. El plan gratuito de ElevenLabs no permite uso comercial ni voces de biblioteca por API.

### Música

Por defecto una pieza sale sin música. Solo se admite música gratuita para uso comercial de un autor identificable; nunca se compra ni se genera con créditos.

```bash
video render geo-001 --music /ruta/pista-gratuita.mp3
```

Junto al archivo debe existir `pista-gratuita.mp3.license.json` con `title`, `author`, `source_url`, `license`, `commercial_use: true` y `paid: false`. Sin esa evidencia el render se niega, y si no hay licencia verificable se usa silencio.

## Entorno aislado

La fábrica no usa `frontend/node_modules`, el Python del backend ni los recursos compilados de la aplicación. Todo vive aquí:

- `.venv/`: Kokoro y dependencias Python.
- `.cache/`: pesos de Kokoro/Hugging Face y caché de voz por hash.
- `remotion/node_modules/`: renderer y navegador propios.
- `assets/fonts/`, `assets/brand/` y `assets/screens/`: tipografías, marca y capturas del producto.
- `library/`: producciones y resultados.

Únicamente consume la CLI de Claude, Node, Python, FFmpeg y `espeak-ng` instalados en el sistema. La captura de pantallas reutiliza el Playwright ya instalado en `tests/` para no descargar un segundo navegador.

Remotion tiene licencia propia. Antes de usar esta automatización comercialmente, confirma que el tamaño del equipo y el volumen encajen en el nivel de licencia correspondiente: <https://www.remotion.dev/>.

## Capturar material real del producto

```bash
marketing/videos/capture-screens                 # graba todos los flujos
marketing/videos/capture-screens mapa-explorar   # o solo los indicados
```

`capture/capture.mjs` graba con Playwright flujos guionados del portal público (definidos en `capture/flows.json`) en un viewport móvil de 540 × 960 a densidad 2, con cursor visible y locale de Ecuador. El grabador captura al tamaño CSS del viewport y solo escala hacia abajo, así que el clip se graba a 540 × 960 y ffmpeg lo lleva a 1080 × 1920; pedir el máster directamente dejaría la página en una esquina de un lienzo gris. Las coordenadas de los pasos van en el espacio de 540 × 960. Escribe `assets/screens/<flujo>.mp4` y un `manifest.json` con la descripción de cada clip, qué demuestra y si requiere autorización. Rechaza cualquier ruta privada (admin, mis-propiedades, cuenta, login, registro…).

Cada flujo lleva un paso `mark` que indica dónde empieza el clip útil: la grabación arranca al crear el contexto del navegador, antes de que cargue la página, y todo lo anterior a la marca se recorta. Los flujos que muestran una propiedad concreta llevan `requiresAuthorization`; el linter exige entonces una nota de verificación sobre la autorización del anunciante antes de aprobar el plan.

El manifiesto se pasa al planificador, así que Claude elige recursos por lo que demuestran y no por nombre de archivo.

## Flujo recomendado

### 1. Crear el siguiente plan

```bash
# Claude estudia catálogo, cobertura y aprendizajes, y elige qué falta.
marketing/videos/video new --assets marketing/videos/assets/screens

# O recibe una dirección concreta.
marketing/videos/video new \
  "Vender a propietarios el kit social que reciben después de publicar" \
  --assets marketing/videos/assets/screens --duration 20
```

`new` crea la carpeta del video, copia los recursos a `assets/input/` y ejecuta el linter automáticamente. También existe `video batch lote.json` para planificar varias piezas de una vez desde una lista JSON de `{brief, duration, assets}`.

La duración editorial normal varía entre 18 y 45 segundos. Usa 18 s para una promesa y demostración simples, 20–30 s para un flujo con varios pasos, mecanismo, objeciones o contexto, y 31–45 s para un tutorial específico que enseñe una secuencia completa. El valor se fija con `--duration`; la fábrica valida el resultado contra ese objetivo y no exige que todas las piezas duren lo mismo. No se admiten pausas o repeticiones usadas como relleno.

Por encima de 45 segundos y hasta 120 la pieza pasa a **formato historia**, para un relato que haya que sostener: el origen del producto, un caso completo. El control de calidad le concede hasta veinte escenas en vez de ocho y hasta 10 segundos antes de mostrar el producto en vez de 3 (`quality.scene_budget` y `quality.product_reveal_deadline`). Todo lo demás sigue igual: un público, una idea y un CTA.

Por encima de 120 y hasta 240 la pieza es una **clase**: hasta cuarenta escenas y 25 segundos antes del producto. Ese techo permite cubrir 240 segundos sin superar seis segundos por toma; no obliga a agotarlo. Es el formato de una materia que se enseña por pasos, no el de una historia que se alargó. Sigue teniendo un público, una idea y un CTA, y ninguna cifra entra sin fuente por durar más.

Un número que el catálogo saltó puede reclamarse con `--number`, porque `next_number` solo cuenta hacia adelante y un plan descartado deja un hueco que nada más podría ocupar:

```bash
marketing/videos/video --brand aents new "…" --duration 210 --number 3
```

### 2. Lintar y aprobar el plan

```bash
marketing/videos/video lint geo-001
marketing/videos/video approve geo-001 --by "nombre" --notes "Guion y afirmaciones revisados"
```

`lint` corre sobre `plan.json`, antes de gastar síntesis de voz y render. Verifica: primera escena `gancho` y última `cta`, un solo CTA, rótulos de máximo 5 palabras y 28 caracteres, locución sin emoji/hashtags/URLs, vocabulario prohibido, cifras sin nota de verificación, CTA de la familia del público, recursos que existan en `assets/input/`, ganchos no repetidos frente al catálogo y clips que requieren autorización del anunciante. `approve` lo vuelve a ejecutar y lo exige; se puede saltar con `--force`, y esa decisión queda registrada en `approval.json`.

### 3. Renderizar

```bash
marketing/videos/video render geo-001
marketing/videos/video render geo-001 --music /ruta/pista-gratuita.mp3
```

Cada escena se sintetiza como una sola toma para que preguntas, comas y conectores conserven una entonación natural. Después, sin cortar el audio, el texto se divide en grupos legibles de 2 a 6 palabras y los tiempos se distribuyen sobre la duración medida de la toma; dentro de cada grupo el resaltado se reparte por peso de caracteres. Hay caché por hash en `.cache/voice`: re-renderizar sin cambiar el texto no vuelve a sintetizar. Los subtítulos quedan quemados en el MP4 y también en `subtitles.srt`.

Por defecto no hay música; `--music` exige una pista gratuita para uso comercial y un sidecar con autor y licencia. El render exporta `exports/geo-001.mp4` y `exports/geo-001-cover.png`; `video cover geo-001` regenera solo la portada. Aents usa el mismo patrón con el prefijo `aents-`.

La futura biblioteca de fondos no admitirá archivos huérfanos: cada pista debe
traer título, autor, URL de origen, licencia, `commercial_use: true` y
`paid: false`. La selección por energía o tipo de video se construirá sobre ese
catálogo, sin debilitar esta validación.

### 4. Revisar técnicamente y firmar

```bash
marketing/videos/video review geo-001
marketing/videos/video sign geo-001 --by "nombre" --notes "MP4 revisado"
```

`review` verifica dimensiones 1080 × 1920, duración dentro de 8–240 s y cercana al objetivo, lint del plan, portada, subtítulos, recursos y aprobación. También extrae el fotograma central de cada escena y genera `review/index.html`: una consola local con el máster, checks, advertencias de legibilidad y overlays de TikTok/Reels y del recorte lateral del teléfono. `sign` registra la revisión humana explícita del MP4 final; sin firma no se puede empaquetar.

Para corregir una escena sin montar el video completo ni tocar el máster:

```bash
marketing/videos/video preview geo-010 --scene 3
marketing/videos/video preview geo-010 --scene 3 --overlay
```

Preview reutiliza la voz y las props del último borrador y escribe únicamente en
`previews/`. Un render completo se construye con artefactos `pending` y solo
reemplaza el máster cuando video, portada, subtítulos y props terminaron.

### 5. Empaquetar y publicar

```bash
marketing/videos/video pack geo-001
```

`pack` crea el outbox de la marca con el MP4, la portada en JPG, el caption, el
SRT y `publish.json`, con la convención
`AAAA-MM-DD_audience_pillar_concept_hook-v01`. También genera
`texto-para-publicar.txt`: contiene el caption, una línea en blanco y los
hashtags en un solo bloque listo para copiar y pegar. Los planes nuevos pueden
declarar de uno a cinco `hashtags`; los anteriores usan los defaults del perfil.

Cuando la persona responsable aprueba explícitamente el MP4 final, Claude abre
TikTok, carga `exports/<marca>-NNN.mp4`, coloca el contenido de
`texto-para-publicar.txt`, verifica la cuenta y publica. La aprobación del plan
del paso 2 no sirve como aprobación de publicación: debe haberse revisado el
archivo renderizado.

La sesión de TikTok se maneja con `agent-browser` y se cierra al terminar. Si la plataforma exige login, CAPTCHA o 2FA, Claude deja el navegador visible para esa intervención sin pedir ni almacenar credenciales. Este flujo publica las piezas editoriales de Geo Propiedades; no cambia la regla `SOC-010` del producto ni publica por cuenta de los usuarios del portal.

### 6. Experimentar con ganchos

```bash
marketing/videos/video variants geo-001 --hooks 3
```

Crea videos hermanos con el mismo cuerpo y ganchos distintos (voz, rótulo y portada de la primera escena), registrados con `experiment: hook` y su video padre, para aislar una sola variable por experimento.

### 7. Registrar resultados y aprender

Publicación y medición son hechos distintos. Primero sincroniza la confirmación
externa desde una lista JSON de `{video, platform, published_at, url, status}`:

```bash
marketing/videos/video sync /ruta/publicaciones.json --dry-run
marketing/videos/video sync /ruta/publicaciones.json
marketing/videos/video results geo-001 /ruta/resultados.csv
marketing/videos/video learn
```

`results.csv` se limita a campos que las plataformas exportan y exige declarar
una métrica primaria. `learn` actualiza cobertura, genera aprendizajes prudentes
desde métricas y los incorpora al contexto del siguiente video. Para resolver
un experimento de gancho con muestra mínima:

```bash
marketing/videos/video experiment geo-001 --metric views_3s --minimum-views 100
```

La decisión queda como `inconclusive` hasta que control y variantes alcancen la
muestra. Las piezas se clasifican como `demonstration`, `tutorial`, `story`,
`lesson` o `education`; educación extensa ya no se etiqueta automáticamente como
historia, y por encima de dos minutos la clasificación es `lesson`.

### Consultar estados

```bash
marketing/videos/video status
```

Estados: `planned → approved → rendered → reviewed → signed → published → learned`, más `archived`.

Cada video recibe un número estable dentro de su marca. Geo usa
`brands/geo/library/` y `brands/geo/memory/catalog.json`; Aents usa
`brands/aents/library/` y `brands/aents/memory/catalog.json`. La definición completa está en
`VIDEO-SCHEMA.md`.

Sin recursos, el render es una pieza tipográfica de marca. No simula pantallas inexistentes.

### Animaciones asistidas por IA

Las animaciones no son una lista cerrada que obligue a repetir videos. Para cada
pieza Claude decide si una simulación existente demuestra literalmente la frase;
si no, crea una nueva en `remotion/src/simulations.tsx` con los componentes y la
firma visual compartidos, la registra en `renderer.py` y `planner.py`, y añade una
prueba. El linter rechaza cualquier identificador `sim:*` que el plan mencione
pero que todavía no esté implementado. La IA ayuda a diseñar y programar cada
pieza; ninguna animación se inventa o publica sin revisión humana del borrador.
El nivel de acabado, la gramática de movimiento, la arquitectura y el checklist
obligatorio están definidos en [animation-standard.md](animation-standard.md).

## Corregir y enseñar a la máquina

Cuando algo no quede bien, registra el problema y la regla concreta para la próxima generación:

```bash
marketing/videos/video --brand geo feedback \
  geo-001 \
  --problem "La voz suena demasiado española y el CTA aparece tarde" \
  --fix "Usar la voz ecuatoriana aprobada y comenzar el CTA antes del segundo 17" \
  --scope global
```

El comando escribe en la memoria de la marca seleccionada y el planificador solo
la lee para los videos siguientes de esa misma marca. Usa `--scope audience`,
`series` o `one-off` cuando la corrección no deba aplicarse a todo.

Los documentos vivos de cada marca están en `brands/<marca>/memory/`:

- `memory/lessons.json`: fuente de correcciones y aprendizajes; `memory/lessons.md` es su vista legible y no se edita a mano.
- `memory/decisions.md`: decisiones estructurales y su motivo.
- `memory/backlog.md`: mejoras pendientes.
- `memory/catalog.json`: catálogo y estado actual de cada pieza.
- `memory/publications.md`: qué pieza está terminada, dónde se publicó y con qué enlace.
- `memory/content-gaps.json`: cobertura y huecos editoriales.
- `CHANGELOG.md`: versiones de la fábrica.

Y en `brands/<marca>/ideas/` viven las piezas todavía no producidas: guiones y
ángulos guardados mientras falta algo para construirlos. No tienen entrada en el
catálogo ni carpeta en `library/`, y la fábrica no las conoce hasta que alguien
las lanza con `video new`.

## Material editorial auxiliar

1. Lee [CLAUDE.md](CLAUDE.md) y [product-context.md](product-context.md).
2. Copia [templates/creative-brief.md](templates/creative-brief.md) a `campaigns/AAAA-MM-DD-nombre/brief.md` y complétalo.
3. Pega el contenido de [prompts/01-brief-to-concepts.md](prompts/01-brief-to-concepts.md) en Claude junto con el brief.
4. Elige un concepto y usa [prompts/02-concept-to-script.md](prompts/02-concept-to-script.md).
5. Graba o captura los recursos indicados. Para el montaje, usa [prompts/03-production-pack.md](prompts/03-production-pack.md).
6. Pasa el borrador por [prompts/04-quality-review.md](prompts/04-quality-review.md).
7. Publica tres variantes que cambien una sola variable y registra resultados en [templates/experiment-log.csv](templates/experiment-log.csv).
8. Una vez por semana usa [prompts/05-results-to-next-batch.md](prompts/05-results-to-next-batch.md).

Los prompts manuales siguen disponibles para explorar conceptos fuera de la CLI. La fuente operativa de una producción es siempre su `plan.json`.

## Git

Se versiona todo lo textual y estructural, incluido el renderer Remotion. `.gitignore` excluye medios binarios dentro de `library/`, dependencias, modelos, cachés y trabajos temporales de Remotion. Los planes, guiones, catálogos, aprobaciones, revisiones, resultados y aprendizajes sí se suben.

## Ritmo inicial recomendado

- 3 conceptos por semana.
- 3 ganchos por concepto; el cuerpo puede ser el mismo (`video variants`).
- 4 publicaciones semanales: 2 educativas, 1 demostración, 1 historia/objeción.
- Revisión a las 24 horas y a los 7 días.
- El ganador es el que acerca al objetivo del brief, no el que obtiene más reproducciones.

Consulta [strategy.md](strategy.md) para los pilares, [production-guide.md](production-guide.md) para especificaciones, [animation-standard.md](animation-standard.md) para dirección de movimiento y [examples/first-12-videos.md](examples/first-12-videos.md) para arrancar.
