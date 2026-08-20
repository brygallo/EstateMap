# Contrato para Codex y otros agentes

Antes de planificar, editar, renderizar, revisar o publicar un video, lee
completos y aplica en este orden:

1. [`CLAUDE.md`](CLAUDE.md): contrato de producto, gasto, publicación y producción.
2. [`creative-system.md`](creative-system.md): identidad compartida de la serie.
3. [`animation-standard.md`](animation-standard.md): acabado y dirección de movimiento.
4. [`council.md`](council.md): roles, paralelización, entregables y puertas del consejo.

`CLAUDE.md` es normativo también para Codex; su nombre no limita su alcance.
Claude y Codex obedecen el mismo contrato y no mantienen variantes propias.

Dos reglas de ese contrato se repiten aquí porque son las que más cuestan
cuando se saltan, y las dos se aplican igual a Codex:

- **Una pieza se revisa en Remotion Studio, no renderizando.** `video --brand
  <marca> studio <id>` levanta el video entero con su voz de borrador. El render
  se hace **una sola vez**, después de que una persona apruebe lo que vio ahí y
  con la voz ya comprada: `render --final`. Sin `--final`, el render se niega.
- **La voz pagada nunca se lanza por iniciativa propia.** Es la única puerta al
  gasto y espera una orden explícita.
- **Cada marca dibuja su interfaz con su kit.** `estatemap-ui.tsx` para Geo,
  `interface-kit.tsx` para Aents; sus valores se miden del producto en marcha,
  no se aproximan.
- **Una propiedad se dibuja con `property-art.tsx`**, nunca con un marcador de
  posición ni una caja de color.
- **Todo lo que pueda ser un icono sale de `lucide-react`**, el mismo paquete
  que usa el producto, a través de `EmGlyph`. Solo se dibuja a mano lo que un
  icono no puede representar.
Si uno de estos documentos se contradice con las reglas de `specs/` o con el
código, se detiene la promesa afectada y se registra el hallazgo; no se elige la
versión más conveniente.

CONTRACT: VIDEO_COUNCIL_V1
