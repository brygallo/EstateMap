# Base técnica y creativa compartida

Este documento es la “biblia” común de la serie. Claude debe variar el concepto, no la identidad. Cualquier cambio global se registra también en `memory/decisions.md` y `CHANGELOG.md`.

## Formato invariable

- Máster vertical 1080 × 1920, 30 fps, MP4 H.264 y audio AAC.
- **Formato corto** hasta 45 s: una promesa y su demostración, máximo cinco escenas, y en piezas de comprador el producto en pantalla antes del segundo 3. La duración ordinaria es de 18 a 45 s según lo que haya que enseñar.
- **Formato historia** por encima de 45 s y hasta 120 s: una pieza que cuenta de dónde viene algo antes de demostrarlo. Hasta nueve escenas y hasta 10 s para plantear antes de mostrar el producto. Se usa cuando hay un relato real que sostener —el origen del producto, un caso completo—, nunca para estirar una demostración. El brief declara la duración y por qué.
- Ninguno de los dos formatos se rellena. Si el guion se acaba antes, el video dura menos.
- Gancho en 0–2 s, prueba/demostración en el cuerpo y un CTA al final.
- Subtítulos en todas las piezas, máximo dos líneas, sincronizados con el audio medido.
- Por defecto sin música. Si se añade, debe ser gratuita para uso comercial, con autor, URL y licencia archivados; nunca se compra ni se genera música con créditos.
- Una idea, un público y un CTA por video.

## Firma visual

- Tipografía única: Plus Jakarta Sans ExtraBold para rótulos.
- Base navy `#0F1020`; acentos verde `#22C55E`, teal `#14B8A6`, violeta `#6B5CF6` y lavanda `#A78BFA`.
- Blanco para texto principal, alto contraste y caja oscura cuando haya imagen.
- Movimiento de mapa, cursor, toque o rostro desde el primer cuadro.
- Logo al cierre o integrado después del gancho; nunca una intro animada vacía.
- Animaciones nativas de Remotion por encima de recursos genéricos. Claude crea las composiciones nuevas que el guion necesite, pero conserva los componentes y la firma visual de la serie.
- Toda composición nueva cumple [`animation-standard.md`](animation-standard.md): arco completo, jerarquía por fotograma, causalidad, movimiento dirigido por `frame`, acabado en las duraciones mínima, nominal y larga, y revisión en móvil. Un animatic, placeholder o bloque con una entrada genérica no cuenta como animación implementada.
- Cada composición parte de los componentes reales de EstateMap: conserva la jerarquía, las etiquetas y la transición entre estados relevantes, y simplifica solo lo necesario para que se lea en video vertical.
- Una animación propuesta no existe hasta estar implementada y registrada tanto en Python como en Remotion; el linter debe bloquear los identificadores `sim:*` desconocidos.
- La portada comparte identidad y CTA con la serie, pero cambia su composición central para representar el concepto concreto de cada video.

## Firma verbal

- Español natural de Ecuador, directo y útil.
- Frases breves, verbos activos, sin superlativos no demostrables.
- Tensión concreta → demostración real → resultado → CTA.
- Decir “Geo Propiedades Ecuador” al menos una vez cuando no sea visible en pantalla.
- Evitar “revolucionario”, “la plataforma líder”, “garantizado”, “vende rápido” y urgencia falsa.

## Familias de CTA

- Comprador/inquilino: “Explora el mapa” o “Encuentra tu futuro hogar”.
- Propietario: “Publica tu propiedad”.
- Agente/inmobiliaria: “Prueba el flujo” o un CTA comercial definido en el brief.
- Educación: “Guarda este consejo”.

No intercambiar CTAs entre públicos por variedad estética. Las familias de CTA y el vocabulario prohibido están codificados en `quality.py`; `video lint` los aplica sobre cada plan antes de aprobar.

## Continuidad entre videos

Antes de crear el Video N, revisar `memory/catalog.json` y `memory/lessons.md`:

1. Identificar qué público, etapa, pilar y objeción ya se cubrieron.
2. Elegir un hueco o una continuación lógica.
3. No repetir el mismo gancho, demostración y CTA. El linter bloquea un gancho idéntico al de otro video del catálogo y avisa si se parece demasiado.
4. Si se repite un tema ganador, declarar qué variable cambia y qué aprendizaje prueba (`video variants` aísla el gancho como única variable).
5. Mantener esta base técnica para que la cuadrícula y el feed se reconozcan como una serie.
6. Una pieza publicada queda congelada. Los cambios del sistema solo afectan al video en producción y a los posteriores; una corrección de una publicación se trabaja como variante nueva.
