# Panel de la fábrica de videos

Una interfaz local para ver en qué estado está cada video de cada marca, leer
todo lo que la fábrica ha producido para él, y abrirle **una terminal** donde
pedirle cambios a Claude Code o a Codex con tu propia cuenta.

```bash
./run.sh            # http://127.0.0.1:8765
PANEL_PORT=9000 ./run.sh
```

## Qué muestra

Arriba se elige la marca (`geo` o `aents`, leídas de `brands/*/profile.json`).
A la izquierda va la lista completa de videos de esa marca con su estado y su
avance; a la derecha, la pieza seleccionada en cinco pestañas:

| Pestaña        | Qué contiene                                                        |
| -------------- | ------------------------------------------------------------------- |
| **Ficha**      | Recorrido por el pipeline, datos del catálogo, concepto, y el MP4 y la portada ya renderizados |
| **Guion**      | `script.md`, `storyboard.md`, `caption.txt` y `subtitles.srt`        |
| **Artefactos** | Escenas de `plan.json` en tabla, y el resto de JSON y CSV de la carpeta |
| **Proceso**    | Lo que el agente de esa terminal está haciendo, paso a paso          |
| **Terminal**   | La terminal viva del video                                           |

## Una terminal por video

Es la regla que sostiene todo lo demás: si dos agentes editaran la misma pieza
a la vez se pisarían. El panel guarda un registro por `(marca, video)` y, si ya
hay una terminal abierta, reabre esa en vez de crear otra.

El agente **no corre dentro del navegador**. Corre en una sesión de `tmux`
llamada `videopanel_<cli>_<marca>_<video>`, y `ttyd` solo le engancha una vista.
De ahí salen tres cosas:

- Cerrar la pestaña, refrescar o **reiniciar el panel no mata al agente**. Al
  volver, el panel encuentra la sesión y la readopta.
- «Cerrar vista» suelta la pantalla y deja al agente trabajando.
- «Terminar agente» sí mata la sesión de tmux.

La terminal abre en `marketing/videos`, con un mensaje inicial que le dice al
agente sobre qué pieza trabaja, en qué estado está y qué reglas respetar. Desde
ahí se le pide lo que sea: corregir el guion, replanificar escenas o tocar el
código de la fábrica.

## De dónde sale «Proceso»

Ni Claude Code ni Codex necesitan instrumentación: los dos ya escriben su sesión
en JSONL, en `~/.claude/projects/<slug>/` y en `~/.codex/sessions/<fecha>/`. El
panel lee la cola de ese archivo y la traduce a pasos. Por eso el proceso que ves
es el que ocurrió de verdad, no un resumen que alguien tenga que mantener.

Si el panel se lanza desde dentro de una sesión de Claude Code, el CLI hijo
heredaría el marcador de sesión anidada y dejaría de guardar transcripción. El
panel limpia esas variables antes de arrancar la terminal.

## Requisitos

`ttyd` y `tmux` (`brew install ttyd tmux`), más `claude` o `codex` en el PATH.
El panel avisa en la pestaña Terminal si falta alguno.

## Decisiones

- **No tiene base de datos.** Todo se lee de `brands/*/` en cada petición, así
  que el panel no puede contradecir al catálogo. Lo único que vive en memoria es
  qué terminales están abiertas, y eso se reconstruye desde `tmux`.
- **No escribe nada.** Es un mirador: quien cambia las cosas es el agente que
  abres en la terminal, con las mismas reglas y permisos de siempre.
- **Solo escucha en loopback**, y `run.sh` usa `--noreload` a propósito: un
  reinicio automático de Django dejaría vistas huérfanas.
