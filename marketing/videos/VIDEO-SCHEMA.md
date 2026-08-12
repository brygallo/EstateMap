# Estructura profesional de cada video

Cada video es una unidad autosuficiente, numerada y auditable. La máquina crea esta estructura:

```text
library/video-001/
├── brief.json            # intención original y duración solicitada
├── script.md             # estrategia y guion humano
├── storyboard.md         # escena por escena
├── plan.json             # fuente estructurada para la máquina
├── approval.json         # aprobación humana y hash del plan
├── caption.txt           # texto listo para la red
├── subtitles.srt         # subtítulos finales
├── assets/
│   ├── input/            # capturas, clips y fotos aprobados
│   └── generated/        # recursos creados para esta pieza
├── audio/
│   ├── voice.mp3         # locución
│   └── music.mp3         # base musical
├── scenes/
│   └── …                 # previsualizaciones opcionales por escena
├── exports/
│   └── video.mp4         # máster vertical final
├── production.json       # tiempos reales y configuración usada
├── review.json           # controles automáticos y revisión humana
├── learning.json         # evidencia usada por el ciclo de aprendizaje
└── results.csv           # se añade al publicar y medir
```

## Datos obligatorios

### 1. Identidad y estado

- Número y título.
- Estado: idea, planificado, en producción, revisión, aprobado, publicado, aprendido o archivado.
- Fecha, responsable y versión cuando exista trabajo humano.

### 2. Estrategia

- Público único.
- Etapa: descubrimiento, consideración o conversión.
- Objetivo de negocio y evento que demuestra conversión.
- Pilar y serie editorial.
- Problema/tensión, concepto y promesa comprobable.
- Hipótesis de por qué debería funcionar.
- CTA único.

### 3. Guion

- Voz exacta completa, lista para TTS o presentador.
- Gancho hablado en los primeros dos segundos.
- Rótulos exactos; no simples indicaciones.
- Portada de 3–6 palabras.
- Caption y hashtags.

### 4. Escena por escena

Cada escena registra:

- Número, inicio, fin y duración.
- Función narrativa: gancho, problema, prueba, resultado o CTA.
- Acción visual y encuadre.
- Voz exacta.
- Texto exacto en pantalla.
- Archivo de recurso o fondo de marca.
- Movimiento/transición y efecto sonoro.

### 5. Producción

- Voz, velocidad y licencia.
- Prompt o fuente musical y licencia.
- Lista de recursos y permiso de uso.
- Especificación técnica heredada de `creative-system.md`.

### 6. Control

- Afirmaciones que deben verificarse.
- Privacidad y derechos.
- Revisión humana antes de publicar.
- Problemas encontrados y corrección aplicada.

### 7. Resultado y aprendizaje

- Plataforma, fecha, orgánico/pagado y ventana de medición.
- Alcance, vistas 2/3/6 s, finalizaciones, guardados, compartidos, clics y conversiones cuando estén disponibles.
- Decisión: escalar, iterar, reutilizar, retirar.
- Aprendizaje que alimenta `memory/lessons.md`.

## Principio de continuidad

`plan.json` es la fuente técnica de cada pieza; `video-NNN.md` es la vista humana. `memory/video-catalog.jsonl` resume todos los videos para que Claude pueda responder “qué falta” antes de crear el siguiente.
