# Fábrica automática de videos de Geo Propiedades Ecuador

CLI que convierte una idea en un MP4 vertical completo: la suscripción ya autenticada de Claude crea el concepto, guion y storyboard; la voz local de macOS y FFmpeg producen el audio sin costo por generación; FFmpeg monta escenas, rótulos y mezcla final. ElevenLabs queda como mejora opcional. Está pensado para vender la plataforma —no propiedades específicas— a propietarios, compradores/inquilinos y profesionales inmobiliarios.

## Instalación

Requiere Python 3.10+, FFmpeg, macOS `say` y la CLI `claude` con la sesión iniciada. En este equipo todo está disponible. No hace falta configurar una API:

```bash
claude --version
marketing/videos/new-video
```

Opcionalmente, configura `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID` para sustituir la voz y música locales por audio premium. No guardes claves reales en el repositorio; `.env.example` documenta las variables.

## Crear un video completo

Con material propio (recomendado):

```bash
marketing/videos/video-factory \
  "Vender a propietarios el kit social que reciben después de publicar" \
  --assets /ruta/a/capturas-y-clips \
  --duration 20
```

La forma cotidiana es más corta:

```bash
# Da una dirección concreta:
marketing/videos/new-video "Video para propietarios sobre el kit social" --duration 20

# O deja que Claude revise lo ya producido y cubra el siguiente hueco:
marketing/videos/new-video
```

Cada ejecución recibe el siguiente número (`Video 001`, `Video 002`…), crea un Markdown con guion y escenas, y se registra en `memory/video-catalog.jsonl`. Antes del próximo video, Claude estudia ese catálogo y la base compartida de `creative-system.md`.

La definición completa de carpetas y datos de cada pieza está en `VIDEO-SCHEMA.md`.

Sin recursos, la máquina crea un video cinético de marca con voz, música y textos:

```bash
marketing/videos/video-factory \
  "Mostrar a compradores por qué buscar una propiedad en el mapa da más contexto" \
  --duration 15
```

Para revisar el guion antes de gastar créditos de voz y música:

```bash
marketing/videos/video-factory "IDEA" --duration 20 --plan-only
```

El comando imprime la ruta final y conserva `plan.json`, `caption.txt`, voz, música, subtítulos, escenas y `video.mp4` bajo `marketing/videos/output/`.

## Corregir y enseñar a la máquina

Cuando algo no quede bien, registra el problema y la regla concreta para la próxima generación:

```bash
marketing/videos/video-feedback \
  marketing/videos/output/20260812-153000 \
  --problem "La voz suena demasiado española y el CTA aparece tarde" \
  --fix "Usar la voz ecuatoriana aprobada y comenzar el CTA antes del segundo 17" \
  --scope global
```

El comando actualiza `memory/lessons.md`, que Claude lee en todos los videos siguientes. Usa `--scope audience`, `series` o `one-off` cuando la corrección no deba aplicarse a todo.

Documentos vivos:

- `memory/lessons.md`: correcciones y aprendizajes activos.
- `memory/decisions.md`: decisiones estructurales y su motivo.
- `memory/backlog.md`: mejoras pendientes.
- `memory/run-log.jsonl`: historial automático de planes, éxitos y errores.
- `CHANGELOG.md`: versiones de la fábrica.

## Flujo editorial opcional

1. Lee [CLAUDE.md](CLAUDE.md) y [product-context.md](product-context.md).
2. Copia [templates/creative-brief.md](templates/creative-brief.md) a `campaigns/AAAA-MM-DD-nombre/brief.md` y complétalo.
3. Pega el contenido de [prompts/01-brief-to-concepts.md](prompts/01-brief-to-concepts.md) en Claude junto con el brief.
4. Elige un concepto y usa [prompts/02-concept-to-script.md](prompts/02-concept-to-script.md).
5. Graba o captura los recursos indicados. Para el montaje, usa [prompts/03-production-pack.md](prompts/03-production-pack.md).
6. Pasa el borrador por [prompts/04-quality-review.md](prompts/04-quality-review.md).
7. Publica tres variantes que cambien una sola variable y registra resultados en [templates/experiment-log.csv](templates/experiment-log.csv).
8. Una vez por semana usa [prompts/05-results-to-next-batch.md](prompts/05-results-to-next-batch.md).

## Qué produce cada campaña

```text
campaigns/AAAA-MM-DD-slug/
├── brief.md
├── concepts.md
├── script-a.md
├── script-b.md
├── script-c.md
├── shot-list.md
├── captions.md
├── review.md
└── results.csv
```

`campaigns/` está reservado para material futuro. No se incluyen datos privados, tokens, teléfonos de clientes ni archivos de propiedades sin autorización.

## Ritmo inicial recomendado

- 3 conceptos por semana.
- 3 ganchos por concepto; el cuerpo puede ser el mismo.
- 4 publicaciones semanales: 2 educativas, 1 demostración, 1 historia/objeción.
- Revisión a las 24 horas y a los 7 días.
- El ganador es el que acerca al objetivo del brief, no el que obtiene más reproducciones.

Consulta [strategy.md](strategy.md) para los pilares, [production-guide.md](production-guide.md) para especificaciones y [examples/first-12-videos.md](examples/first-12-videos.md) para arrancar.
