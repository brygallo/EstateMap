---
name: guion-video
description: Escribe guiones de video vertical para TikTok e Instagram Reels de Geo Propiedades Ecuador, listos para la fábrica de marketing/videos. Úsala cuando pidan un guion, un video corto, un reel, una pieza para redes, variantes de gancho, o un lote semanal de contenido del portal inmobiliario.
---

# Guion de video corto para Geo Propiedades Ecuador

Un guion aquí no es un texto libre: es la entrada de una fábrica que lo va a
sintetizar y renderizar sin intervención humana. Si el guion incumple una regla,
el control de calidad lo rechaza antes de gastar un render, así que conviene
escribirlo bien la primera vez.

## Antes de escribir

Lee estos archivos de `marketing/videos/`. No son contexto opcional: contienen lo
que se puede afirmar y lo que ya se ha aprendido.

| Archivo | Qué te da |
| --- | --- |
| `product-context.md` | Lo que el producto hace de verdad y lo que no se puede prometer |
| `strategy.md` | Públicos, pilares, series y la arquitectura de una pieza |
| `creative-system.md` | Identidad visual y verbal, familias de CTA |
| `memory/lessons.md` | Correcciones ya aprobadas. Tienen prioridad sobre tu criterio |
| `memory/catalog.json` | Qué se ha hecho ya, para no repetir gancho ni concepto |

## Las reglas que rechazan un guion

El linter (`marketing/videos/quality.py`) las comprueba una por una:

1. **Una pieza, un público, una idea, un CTA.** El público es `comprador`,
   `propietario` o `profesional`. No mezcles «buscar», «publicar» y
   «contáctanos» en el mismo video.
2. **El CTA pertenece a su público.** Comprador: explora, mira, busca, abre.
   Propietario: publica, sube, comparte. Profesional: prueba, escríbenos,
   solicita. No se intercambian por variedad.
3. **La primera escena es `gancho` y la última es `cta`.** Las intermedias son
   `problema`, `prueba` o `resultado`. Solo puede haber una escena de CTA.
4. **El rótulo (`on_screen_text`) va en una sola fila: máximo 4 palabras y 22
   caracteres.** No es una frase, es un letrero.
5. **La duración responde a lo que hay que explicar.** Elige normalmente entre
   18 y 45 segundos: 18 s para una demostración simple, 20–30 s para varios
   pasos, mecanismo, objeciones o contexto, y 31–45 s para un tutorial
   específico con una secuencia completa. Cuenta unos 14 caracteres hablados
   por segundo: 18 s admiten unos 250 caracteres y 45 s unos 630. Si te pasas
   del 20 % del objetivo elegido, el guion se rechaza.
6. **La locución se escribe para una voz sintética.** Sin emoji, sin hashtags,
   sin URLs escritas como URL: «geopropiedadesecuador punto com». Nada de
   indicaciones de edición dentro del texto hablado.
7. **Sin afirmaciones que el código no respalde.** Prohibido: plusvalía, zona
   segura, rentable, garantizado, vende rápido, el mejor, líder,
   revolucionario, publicación automática en redes, video automático de la
   propiedad, última oportunidad, solo por hoy.
8. **Toda cifra necesita una nota de verificación** en `verification_notes` que
   diga de dónde sale y con qué fecha.
9. **El gancho no se repite.** Compáralo con los ganchos del catálogo.
10. **Si usas un clip que muestra una propiedad concreta**, la nota de
    verificación debe nombrar el archivo y dejar constancia de la autorización
    del anunciante.

## Recursos: qué se puede poner en pantalla

El visual por defecto es **animación nativa**, no grabación de pantalla. Elige
`asset` entre:

| Valor | Qué se ve |
| --- | --- |
| `sim:anuncios` | Anuncios cayendo en pila: cada uno con foto y precio, y donde iría la dirección una ✕ y «¿dónde?» |
| `sim:llegada` | Los anuncios se apartan y entra el mapa con la chapa de la marca. Úsala en la escena donde se nombra Geo Propiedades |
| `sim:mapa` | Del mapa del país a una zona: las burbujas de ciudad se abren en barrios y luego en casas con su precio |
| `sim:ficha` | Una ficha entra en cuadro con su precio y sus características |
| `sim:precio` | El precio por m² sube y se sitúa dentro del rango habitual de la zona, con el número de comparables |
| `sim:publicar` | Los cinco pasos de publicar se marcan uno a uno |
| `null` | Fondo de marca tipográfico |
| nombre de archivo | Solo si existe en `assets/screens/` y su manifiesto lo describe |

Las animaciones son **ilustraciones del producto, nunca capturas**. Describe lo
que muestran sin decir que el espectador está viendo una grabación.

**La regla que gobierna la elección:** cada escena lleva la animación que
muestra *literalmente* lo que dice su frase. Si la voz habla de anuncios sin
ubicación, se ven anuncios sin ubicación; cuando se nombra el producto, el
producto entra en cuadro apartando el problema. Una animación que no ilustra su
frase sobra: el video tiene que entenderse sin sonido.

Y el arco funciona mejor cuando hay un giro: problema visible → «esto está mal»
→ aparece la solución → resultado. `sim:anuncios` y `sim:llegada` existen para
eso; si varias escenas comparten animación, la fábrica la encadena sola en vez
de reiniciarla.

## Fortalezas verificadas en las que apoyarse

Ordenadas por fuerza demostrable, con su límite honesto al lado:

1. **El mapa jerárquico.** Las burbujas se dibujan sobre inventario real, no
   sobre el centro oficial del cantón. Se demuestra en tres toques.
   *Límite:* no existe búsqueda dibujando tu zona ni comparador de zonas.
2. **Publicar y salir con la publicidad hecha.** Cinco pasos, sin cuenta para
   empezar, borrador guardado solo, y al terminar recibes láminas, QR, URL corta
   y textos por red.
   *Límite:* el portal no publica en redes por ti; el usuario comparte el archivo.
3. **La Inteligencia del anuncio.** Cada ficha pública compara precio por m²
   contra el inventario activo de su ciudad, con rango P25–P75 y número de
   comparables.
   *Límite:* solo venta, no alquiler; no hay evolución histórica de precios.

Lo que **nunca** se afirma: portal más grande o número uno, contadores públicos
de visitas, exactitud topográfica de la Forma del terreno.

## Forma del entregable

La forma canónica es el `plan.json` de la fábrica. Lo más fiable es dejar que la
fábrica lo genere y validarlo:

```bash
cd marketing/videos
./video new "<brief con público, ángulo, duración y qué animación usar>" --duration 18
./video lint video-00N          # falla si alguna regla se incumple
```

Si escribes el plan a mano, respeta estos campos:

```json
{
  "title": "...", "audience": "comprador|propietario|profesional",
  "funnel_stage": "descubrimiento|consideración|conversión",
  "objective": "...", "conversion_event": "...",
  "pillar": "...", "series": "...", "concept": "...", "promise": "...",
  "cta": "...", "hypothesis": "...", "cover_text": "...", "caption": "...",
  "narration": "la suma exacta de todas las voces, en orden",
  "verification_notes": ["..."],
  "scenes": [
    {
      "purpose": "gancho", "duration": 3,
      "voice": "lo que se dice, exacto",
      "on_screen_text": "máx 4 palabras",
      "asset": "sim:mapa", "visual_direction": "...",
      "transition": "cut|fade"
    }
  ]
}
```

Tras escribirlo a mano, `./video lint` es obligatorio: es la única forma de
saber si el guion es válido.

`--duration` no es una constante editorial. Usa un valor de 18 a 45 según la
carga explicativa y deja la razón en el brief. No alargues silencios ni repitas
la promesa solo para ocupar segundos.

## Cómo se ve el resultado

Para que escribas sabiendo qué va a pasar con tu texto:

- La animación ocupa el cuadro; su cuarto inferior está oscurecido a propósito.
- El **rótulo** va abajo, en una sola fila grande, y **debajo, a 72 px**, el
  **subtítulo karaoke**: tu locución troceada en grupos de 2 a 6 palabras que se
  van iluminando al ritmo de la voz medida. Escribe frases que se troceen bien.
- Arriba a la izquierda, la dirección del portal; arriba a la derecha, la marca.
- El **cierre es siempre la misma tarjeta**: marca, «Geo Propiedades Ecuador»,
  dominio, tu CTA y la firma de Aents. No lo describas ni lo cambies; tu última
  escena solo aporta la locución y el CTA.

## Variantes y lotes

- Tres ganchos sobre el mismo cuerpo: `./video variants video-00N --hooks 3`.
  Cada gancho debe usar un mecanismo distinto (pregunta, error común, resultado
  primero, contradicción) para que el experimento aísle una variable.
- Lote semanal: un JSON con una lista de `{brief, duration}` y
  `./video batch lote.json`.
- Una corrección que deba valer para todos los videos siguientes se registra con
  `./video feedback`, no se arregla solo en la pieza.
