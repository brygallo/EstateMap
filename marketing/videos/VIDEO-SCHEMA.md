# Estructura profesional de cada video

Cada video es una unidad autosuficiente, numerada y auditable. La máquina crea esta estructura:

```text
library/video-001/
├── brief.json            # intención original y duración solicitada
├── plan.json             # fuente estructurada para la máquina
├── lint.json             # resultado del control de calidad del plan
├── script.md             # estrategia y guion en vista humana
├── storyboard.md         # escena por escena con tiempos
├── approval.json         # aprobación humana y hash del plan aprobado
├── caption.txt           # texto listo para la red
├── subtitles.srt         # subtítulos con tiempos medidos del audio
├── assets/
│   ├── input/            # capturas, clips y fotos aprobados
│   └── generated/        # recursos creados para esta pieza
├── audio/
│   └── voice-NN.mp3      # locución medida de cada escena
├── exports/
│   ├── video.mp4         # máster vertical final
│   └── cover.png         # portada 1080 × 1920
├── render-props.json     # props exactas entregadas a Remotion
├── cover-props.json      # props de la portada
├── production.json       # tiempos reales y configuración usada
├── review.json           # controles automáticos y firma humana
├── learning.json         # evidencia usada por el ciclo de aprendizaje
└── results.csv           # se rellena al publicar y medir
```

Ya no existen `scenes/`, `video-NNN.md`, `memory/video-catalog.jsonl` ni `memory/run-log.jsonl`. El catálogo canónico es `memory/catalog.json`.

## Datos obligatorios

### 1. Identidad y estado

- Número y título.
- Estado: `planned`, `approved`, `rendered`, `reviewed`, `signed`, `published`, `learned` o `archived`.
- Fecha, responsable y notas cuando exista trabajo humano (`approval.json`, `review.json`).

### 2. Estrategia

- Público único.
- Etapa: descubrimiento, consideración o conversión.
- Objetivo de negocio y evento que demuestra conversión.
- Pilar y serie editorial.
- Problema/tensión, concepto y promesa comprobable.
- Hipótesis de por qué debería funcionar.
- CTA único.

### 3. Guion

- Voz exacta completa, lista para TTS.
- Gancho hablado en los primeros dos segundos.
- Rótulos exactos; no simples indicaciones.
- Portada de 3–6 palabras.
- Caption.

### 4. Escena por escena

Cada escena registra:

- Función narrativa: gancho, problema, prueba, resultado o CTA.
- Acción visual y encuadre.
- Voz exacta.
- Texto exacto en pantalla.
- Archivo de recurso o fondo de marca.
- Transición de entrada (`cut` o `fade`).

Los tiempos definitivos no salen del plan: se miden del audio sintetizado y quedan en `production.json` y `subtitles.srt`.

### 5. Producción

- Proveedor de voz, voz y velocidad usados (`production.json`).
- Música: por defecto ninguna; si se añade, debe ser gratuita para uso comercial y guardar título, autor, fuente y licencia en el sidecar. Nunca música pagada.
- Lista de recursos y permiso de uso; los clips que muestran una propiedad concreta exigen nota de autorización del anunciante.
- Especificación técnica heredada de `creative-system.md`.

### 6. Control

- `lint.json`: hallazgos del linter sobre el plan, antes de gastar voz y render.
- Afirmaciones que deben verificarse (`verification_notes` del plan).
- Privacidad y derechos.
- `review.json`: controles automáticos del MP4 y firma humana (`video sign`) antes de publicar.

### 7. Resultado y aprendizaje

- Plataforma, fecha, orgánico/pagado y ventana de medición.
- Alcance, vistas 2/3/6 s, finalizaciones, guardados, compartidos, clics y conversiones cuando estén disponibles.
- Decisión: escalar, iterar, reutilizar, retirar.
- Aprendizaje que alimenta `memory/lessons.json`.

## Principio de continuidad

`plan.json` es la fuente técnica de cada pieza; `script.md` y `storyboard.md` son su vista humana. `memory/catalog.json` resume todos los videos para que Claude pueda responder “qué falta” antes de crear el siguiente.
