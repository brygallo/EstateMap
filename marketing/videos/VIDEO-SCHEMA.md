# Estructura profesional de cada video

Cada video es una unidad autosuficiente, numerada y auditable dentro de una
marca. Geo usa `brands/geo/library/`; Aents usa `brands/aents/library/` con la misma
estructura. El identificador y la carpeta incluyen siempre la marca: `geo-001`
o `aents-001`.

```text
brands/geo/library/geo-001/
├── brief.json            # intención original y duración solicitada
├── plan.json             # fuente estructurada para la máquina
├── lint.json             # resultado del control de calidad del plan
├── script.md             # estrategia y guion en vista humana
├── storyboard.md         # escena por escena con tiempos
├── approval.json         # aprobación humana y hash del plan aprobado
├── caption.txt           # texto listo para la red
├── texto-para-publicar.txt # caption + hashtags, generado dentro del paquete
├── subtitles.srt         # subtítulos con tiempos medidos del audio
├── assets/
│   ├── input/            # capturas, clips y fotos aprobados
│   └── generated/        # recursos creados para esta pieza
├── voice-lock.json       # voz final inmutable después de autorizar el gasto
├── audio/
│   └── voice-NN.mp3      # locución medida de cada escena
├── exports/
│   ├── video.mp4         # máster vertical final
│   └── cover.png         # portada 1080 × 1920
├── render-props.json     # props exactas entregadas a Remotion
├── cover-props.json      # props de la portada
├── production.json       # tiempos reales y configuración usada
├── review.json           # controles automáticos y firma humana
├── review/               # consola HTML y fotogramas críticos por escena
├── .cache/scenes/        # escenas ya renderizadas, por huella; desechable
├── previews/             # renders parciales que no alteran el máster
├── experiment-decision.json # decisión determinista de una familia de variantes
├── learning.json         # evidencia usada por el ciclo de aprendizaje
└── results.csv           # se rellena al publicar y medir
```

Cuando el consejo multiagente participa, sus entregables viven bajo
`council/`: `product-proof.md`, `strategy-script.md`,
`production-design.md`, `editorial-decision.md` y `quality-verdict.md`. Son
evidencia de proceso; no reemplazan `plan.json`, `approval.json`, `review.json`
ni los demás registros autoritativos de la máquina.

Ya no existen `scenes/`, `geo-NNN.md`, `memory/video-catalog.jsonl` ni
`memory/run-log.jsonl`. Geo usa `memory/catalog.json`; cada perfil adicional
usa su propio `brands/<marca>/memory/catalog.json`.

## Datos obligatorios

### 1. Identidad y estado

- Marca explícita (`geo` o `aents`) en `brief.json` y en el catálogo. Los
  planes antiguos sin ese campo pertenecen a Geo por compatibilidad.
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
- Perfil de voz opcional para todo el video. Todas sus escenas comparten el mismo narrador.
- Gancho hablado en los primeros dos segundos.
- Rótulos exactos; no simples indicaciones.
- Portada de 3–6 palabras.
- Caption.
- Entre uno y cinco hashtags de publicación, sin espacios ni afirmaciones
  nuevas. No forman parte de la voz ni de los subtítulos.

### 4. Escena por escena

Cada escena registra:

- Función narrativa: gancho, problema, prueba, resultado o CTA.
- Acción visual y encuadre.
- Voz exacta.
- Texto exacto en pantalla.
- Archivo de recurso o fondo de marca.
- Transición de entrada (`cut` o `fade`).

Los tiempos definitivos no salen del plan: se miden del audio sintetizado y quedan en `production.json` y `subtitles.srt`.

El máster se arma escena por escena. Cada toma se renderiza como su propio rango
de fotogramas de la misma composición —con el plan completo en las props, para
que la barra de progreso, el índice de escena y una animación que cruza un corte
salgan idénticos a un render de una sola pasada— y se guarda en `.cache/scenes/`
bajo la huella de todo lo que podría cambiar sus píxeles: sus props, el resto de
la pieza, su posición en la línea de tiempo, el código que la dibuja y los ajustes
del codificador. Corregir una toma cuesta esa toma. El audio no se ensambla aquí:
sale de un único render de la composición entera, así que ni la voz ni la música
pueden desalinearse en una costura. Antes de aceptar el máster se comprueba que
su duración coincida con el plan, y `production.json` registra qué escenas se
volvieron a dibujar y cuáles se reutilizaron. `video render --fresh` ignora la
caché.

### 5. Producción

- Proveedor, perfil, voz y velocidad usados (`production.json`). El primer
  máster final bloquea su firma en `voice-lock.json`; cambiarla exige una pieza nueva.
- Música: por defecto ninguna; si se añade, debe ser gratuita para uso comercial y guardar título, autor, fuente y licencia en el sidecar. Nunca música pagada.
- Lista de recursos y permiso de uso; los clips que muestran una propiedad concreta exigen nota de autorización del anunciante.
- Especificación técnica heredada de `creative-system.md`.

### 6. Control

- `lint.json`: hallazgos del linter sobre el plan, antes de gastar voz y render.
- Afirmaciones que deben verificarse (`verification_notes` del plan).
- Privacidad y derechos.
- `review.json`: controles automáticos del MP4 y firma humana (`video sign`) antes de publicar.

### 7. Resultado y aprendizaje

- Plataforma, fecha y ventana de medición.
- Vistas, vistas a 3 s, finalizaciones, guardados, compartidos, visitas al perfil, clics y conversiones cuando estén disponibles.
- Una métrica primaria explícita para interpretar el resultado.
- Decisión: escalar, iterar, reutilizar, retirar.
- Aprendizaje que alimenta exclusivamente el `memory/lessons.json` de la marca.

## Principio de continuidad

`plan.json` es la fuente técnica de cada pieza; `script.md` y `storyboard.md` son
su vista humana. El catálogo de la marca activa resume únicamente sus videos
para que el planificador responda “qué falta” sin aprender de otra cuenta.
