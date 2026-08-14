# Fábrica automática de videos de Geo Propiedades Ecuador

Un solo motor convierte una idea en un MP4 vertical listo para publicar. La CLI es `factory.py`, invocada siempre a través del script `video`: Claude crea concepto, guion y storyboard; un linter revisa el plan antes de gastar voz o render; Kokoro sintetiza cada escena completa y mide su duración real; Remotion monta escenas, subtítulos karaoke, portada y audio. Está pensada para vender la plataforma —no propiedades específicas— a propietarios, compradores/inquilinos y profesionales inmobiliarios.

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
video render video-001            # borrador: Kokoro local, gratis, ilimitado
video voice-cost video-001        # qué compraría el máster, sin comprarlo
video render video-001 --final    # producción: compra la voz de ElevenLabs
```

`--final` es la única puerta al gasto: sin él, `render` usa la voz gratis aunque `.env` tenga ElevenLabs configurado. Antes de comprar muestra el importe y pide confirmación; si no hay terminal donde preguntar se niega, salvo que `--yes` lo autorice por adelantado.

Cada frase comprada queda en `.cache/voice/paid/` bajo el hash de su texto exacto, así que re-renderizar un guion sin cambios no cuesta nada y editar una línea solo compra esa línea. La copia pagada se guarda intacta: un recorte fallido o un render interrumpido nunca obligan a pagarla otra vez. `ELEVENLABS_MAX_CHARS_PER_RUN` corta la tirada que se salga de lo previsto y `.cache/voice/elevenlabs-usage.jsonl` lleva la cuenta.

Cada proveedor firma su propio caché (`tts.py`), de modo que los ajustes de Kokoro no pueden invalidar lo pagado a ElevenLabs. Cambiar la voz, el modelo o los ajustes de pago sí vuelve a comprar el guion entero.

Las credenciales van en `.env`, ignorado por git; `.env.example` documenta las variables sin valores. El plan gratuito de ElevenLabs no permite uso comercial ni voces de biblioteca por API.

### Música

Por defecto una pieza sale sin música. Solo se admite música gratuita para uso comercial de un autor identificable; nunca se compra ni se genera con créditos.

```bash
video render video-001 --music /ruta/pista-gratuita.mp3
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

Por encima de 45 segundos y hasta 120 la pieza pasa a **formato historia**, para un relato que haya que sostener: el origen del producto, un caso completo. El control de calidad le concede hasta nueve escenas en vez de cinco y hasta 10 segundos antes de mostrar el producto en vez de 3 (`quality.scene_budget` y `quality.product_reveal_deadline`). Todo lo demás sigue igual: un público, una idea y un CTA.

### 2. Lintar y aprobar el plan

```bash
marketing/videos/video lint video-001
marketing/videos/video approve video-001 --by "nombre" --notes "Guion y afirmaciones revisados"
```

`lint` corre sobre `plan.json`, antes de gastar síntesis de voz y render. Verifica: primera escena `gancho` y última `cta`, un solo CTA, rótulos de máximo 5 palabras y 28 caracteres, locución sin emoji/hashtags/URLs, duración estimada que no supere el objetivo en más del 20 %, vocabulario prohibido, cifras sin nota de verificación, CTA de la familia del público, recursos que existan en `assets/input/`, ganchos no repetidos frente al catálogo y clips que requieren autorización del anunciante. `approve` lo vuelve a ejecutar y lo exige; se puede saltar con `--force`, y esa decisión queda registrada en `approval.json`.

### 3. Renderizar

```bash
marketing/videos/video render video-001
marketing/videos/video render video-001 --music /ruta/pista-gratuita.mp3
```

Cada escena se sintetiza como una sola toma para que preguntas, comas y conectores conserven una entonación natural. Después, sin cortar el audio, el texto se divide en grupos legibles de 2 a 6 palabras y los tiempos se distribuyen sobre la duración medida de la toma; dentro de cada grupo el resaltado se reparte por peso de caracteres. Hay caché por hash en `.cache/voice`: re-renderizar sin cambiar el texto no vuelve a sintetizar. Los subtítulos quedan quemados en el MP4 y también en `subtitles.srt`.

Por defecto no hay música; `--music` exige una pista gratuita para uso comercial y un sidecar con autor y licencia. El render exporta `exports/video.mp4` y también `exports/cover.png`; `video cover video-001` regenera solo la portada.

### 4. Revisar técnicamente y firmar

```bash
marketing/videos/video review video-001
marketing/videos/video sign video-001 --by "nombre" --notes "MP4 revisado"
```

`review` verifica dimensiones 1080 × 1920, duración dentro de 8–120 s y cercana al objetivo, lint del plan, portada, subtítulos, recursos y aprobación. `sign` registra la revisión humana explícita del MP4 final; sin firma no se puede empaquetar ni registrar resultados.

### 5. Empaquetar y publicar

```bash
marketing/videos/video pack video-001
```

`pack` crea `library/_outbox/<nombre>/` con el MP4, la portada en JPG, el caption, el SRT y `publish.json`, con la convención de nombres `AAAA-MM-DD_audience_pillar_concept_hook-v01`.

Cuando la persona responsable aprueba explícitamente el MP4 final, Claude abre TikTok, carga `exports/video.mp4`, coloca el contenido de `caption.txt`, verifica la cuenta y publica. La aprobación del plan del paso 2 no sirve como aprobación de publicación: debe haberse revisado el archivo renderizado.

La sesión de TikTok se maneja con `agent-browser` y se cierra al terminar. Si la plataforma exige login, CAPTCHA o 2FA, Claude deja el navegador visible para esa intervención sin pedir ni almacenar credenciales. Este flujo publica las piezas editoriales de Geo Propiedades; no cambia la regla `SOC-010` del producto ni publica por cuenta de los usuarios del portal.

### 6. Experimentar con ganchos

```bash
marketing/videos/video variants video-001 --hooks 3
```

Crea videos hermanos con el mismo cuerpo y ganchos distintos (voz, rótulo y portada de la primera escena), registrados con `experiment: hook` y su video padre, para aislar una sola variable por experimento.

### 7. Registrar resultados y aprender

```bash
marketing/videos/video results video-001 /ruta/resultados.csv
marketing/videos/video learn
```

`learn` actualiza cobertura, genera aprendizajes prudentes desde métricas y los incorpora al contexto del siguiente video.

### Consultar estados

```bash
marketing/videos/video status
```

Estados: `planned → approved → rendered → reviewed → signed → published → learned`, más `archived`.

Cada video recibe un número estable y una carpeta autosuficiente en `library/`. El catálogo canónico es `memory/catalog.json`. La definición completa de carpetas y datos de cada pieza está en `VIDEO-SCHEMA.md`.

Sin recursos, el render es una pieza tipográfica de marca. No simula pantallas inexistentes.

### Animaciones asistidas por IA

Las animaciones no son una lista cerrada que obligue a repetir videos. Para cada
pieza Claude decide si una simulación existente demuestra literalmente la frase;
si no, crea una nueva en `remotion/src/simulations.tsx` con los componentes y la
firma visual compartidos, la registra en `renderer.py` y `planner.py`, y añade una
prueba. El linter rechaza cualquier identificador `sim:*` que el plan mencione
pero que todavía no esté implementado. La IA ayuda a diseñar y programar cada
pieza; ninguna animación se inventa o publica sin revisión humana del borrador.

## Corregir y enseñar a la máquina

Cuando algo no quede bien, registra el problema y la regla concreta para la próxima generación:

```bash
marketing/videos/video feedback \
  video-001 \
  --problem "La voz suena demasiado española y el CTA aparece tarde" \
  --fix "Usar la voz ecuatoriana aprobada y comenzar el CTA antes del segundo 17" \
  --scope global
```

El comando escribe en `memory/lessons.json` y regenera `memory/lessons.md`, que Claude lee en todos los videos siguientes. Usa `--scope audience`, `series` o `one-off` cuando la corrección no deba aplicarse a todo. El script `video-feedback` sigue funcionando y ejecuta este mismo comando.

Documentos vivos:

- `memory/lessons.json`: fuente de correcciones y aprendizajes; `memory/lessons.md` es su vista legible y no se edita a mano.
- `memory/decisions.md`: decisiones estructurales y su motivo.
- `memory/backlog.md`: mejoras pendientes.
- `memory/catalog.json`: catálogo y estado actual de cada pieza.
- `memory/publications.md`: qué pieza está terminada, dónde se publicó y con qué enlace.
- `memory/content-gaps.json`: cobertura y huecos editoriales.
- `CHANGELOG.md`: versiones de la fábrica.

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

Consulta [strategy.md](strategy.md) para los pilares, [production-guide.md](production-guide.md) para especificaciones y [examples/first-12-videos.md](examples/first-12-videos.md) para arrancar.
