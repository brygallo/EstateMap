# Fábrica automática de videos de Geo Propiedades Ecuador

CLI que convierte una idea en un MP4 vertical completo: Claude crea concepto, guion y storyboard; Kokoro produce la voz local en español; Remotion monta escenas, animaciones, recursos, subtítulos y audio. ElevenLabs queda como proveedor intercambiable futuro. Está pensado para vender la plataforma —no propiedades específicas— a propietarios, compradores/inquilinos y profesionales inmobiliarios.

## Instalación

Requiere Python 3.10+, Node, FFmpeg, `espeak-ng` y la CLI `claude` con sesión iniciada. La instalación inicial local es:

```bash
brew install espeak-ng
marketing/videos/setup
```

Kokoro descarga sus pesos abiertos la primera vez y luego trabaja localmente. Para cambiar en el futuro:

```bash
export TTS_PROVIDER=elevenlabs
export ELEVENLABS_API_KEY='...'
export ELEVENLABS_VOICE_ID='...'
```

No guardes claves reales en el repositorio; `.env.example` documenta las variables.

## Entorno aislado

La fábrica no usa `frontend/node_modules`, el Python del backend ni los recursos compilados de la aplicación. Todo vive aquí:

- `.venv/`: Kokoro y dependencias Python.
- `.cache/`: pesos de Kokoro/Hugging Face.
- `remotion/node_modules/`: renderer y navegador propios.
- `assets/fonts/` y `assets/brand/`: tipografías y marca propias.
- `library/`: producciones y resultados.

Únicamente consume la CLI de Claude, Node, Python, FFmpeg y `espeak-ng` instalados en el sistema.

Remotion tiene licencia propia. Antes de usar esta automatización comercialmente, confirma que el tamaño del equipo y el volumen encajen en el nivel de licencia correspondiente: <https://www.remotion.dev/>.

## Flujo recomendado

### 1. Crear el siguiente plan

```bash
# Claude estudia catálogo, cobertura y aprendizajes, y elige qué falta.
marketing/videos/video new

# O recibe una dirección concreta y copia recursos al proyecto.
marketing/videos/video new \
  "Vender a propietarios el kit social que reciben después de publicar" \
  --assets /ruta/a/capturas-y-clips --duration 20
```

`new-video` sigue disponible como alias de `video new`.

### 2. Revisar y aprobar el plan

```bash
marketing/videos/video approve video-001 --by "nombre" --notes "Guion y afirmaciones revisados"
```

### 3. Renderizar

```bash
marketing/videos/video render video-001
```

La voz Kokoro se genera por escena, se mide su duración real y Remotion ajusta la composición antes del montaje. Los subtítulos quedan quemados en el MP4 y también se conserva `subtitles.srt`.

### 4. Revisar técnicamente

```bash
marketing/videos/video review video-001 --notes "Revisión visual humana completada"
```

El control automático verifica dimensiones, duración, aprobación y recursos. La revisión humana sigue siendo obligatoria antes de publicar.

### 5. Aprobar el MP4 final y publicarlo en TikTok

Cuando la persona responsable aprueba explícitamente el MP4 final, Claude abre
TikTok, carga `exports/video.mp4`, coloca el contenido de `caption.txt`, verifica
la cuenta y publica. La aprobación del plan del paso 2 no sirve como aprobación
de publicación: debe haberse revisado el archivo renderizado.

La sesión de TikTok se maneja con `agent-browser` y se cierra al terminar. Si la
plataforma exige login, CAPTCHA o 2FA, Claude deja el navegador visible para esa
intervención sin pedir ni almacenar credenciales. Este flujo publica las piezas
editoriales de Geo Propiedades; no cambia la regla `SOC-010` del producto ni
publica por cuenta de los usuarios del portal.

### 6. Registrar resultados y aprender

```bash
marketing/videos/video results video-001 /ruta/resultados.csv
marketing/videos/video learn
```

`learn` actualiza cobertura, genera aprendizajes prudentes desde métricas y los incorpora al contexto del siguiente video.

### Consultar estados

```bash
marketing/videos/video status
```

Estados: `planned → approved → rendered → reviewed → published → learned`.

Cada video recibe un número estable, crea `brief.json`, `plan.json`, `script.md`, `storyboard.md`, archivos de producción y resultados. El catálogo canónico es `memory/catalog.json`.

La definición completa de carpetas y datos de cada pieza está en `VIDEO-SCHEMA.md`.

Sin recursos, el render es una pieza tipográfica de marca. No simula pantallas inexistentes.

## Corregir y enseñar a la máquina

Cuando algo no quede bien, registra el problema y la regla concreta para la próxima generación:

```bash
marketing/videos/video-feedback \
  video-001 \
  --problem "La voz suena demasiado española y el CTA aparece tarde" \
  --fix "Usar la voz ecuatoriana aprobada y comenzar el CTA antes del segundo 17" \
  --scope global
```

El comando actualiza `memory/lessons.md`, que Claude lee en todos los videos siguientes. Usa `--scope audience`, `series` o `one-off` cuando la corrección no deba aplicarse a todo.

Documentos vivos:

- `memory/lessons.md`: correcciones y aprendizajes activos.
- `memory/decisions.md`: decisiones estructurales y su motivo.
- `memory/backlog.md`: mejoras pendientes.
- `memory/catalog.json`: catálogo y estado actual de cada pieza.
- `memory/content-gaps.json`: cobertura y huecos editoriales.
- `memory/run-log.jsonl`: registro técnico heredado del prototipo.
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
- 3 ganchos por concepto; el cuerpo puede ser el mismo.
- 4 publicaciones semanales: 2 educativas, 1 demostración, 1 historia/objeción.
- Revisión a las 24 horas y a los 7 días.
- El ganador es el que acerca al objetivo del brief, no el que obtiene más reproducciones.

Consulta [strategy.md](strategy.md) para los pilares, [production-guide.md](production-guide.md) para especificaciones y [examples/first-12-videos.md](examples/first-12-videos.md) para arrancar.
