# Decisiones vigentes

## 2026-08-14 — La serie «Publicar cuesta cero», y qué separa una pieza de venta de un tutorial

- **Serie nueva para propietario: «Publicar cuesta cero».** Lidera con la oferta en vez de enseñar el procedimiento. El video 003 ya es el tutorial del formulario; repetirlo con otro gancho habría sido la misma pieza dos veces.
- **La oferta se enuncia con lo que `frontend/lib/help-faqs.ts` promete, palabra por palabra:** publicar es gratis, no hay comisión por ventas ni arriendos, no hay límite de publicaciones, se empieza sin cuenta y el borrador se guarda, y el interesado llama o escribe directo. Si esas FAQ cambian, la pieza deja de ser cierta y no se vuelve a publicar.
- **De la skill `$ad-copy` se toma la estructura, no las técnicas que piden hechos inventados.** Sirven liderar con el trato, escribir en segunda persona, decir *lo que no es* —«no es una suscripción ni una prueba gratis»— y bajar la cadena del «¿y qué?» hasta el dinero: sin comisión significa que lo acordado queda completo para el dueño. Quedan fuera cifras de usuarios, testimonios, autoridades, urgencia y escasez, que es lo que ya prohíbe el contrato.
- **La portada elige su ilustración por `cover_art` del plan, no por una palabra del titular.** El heurístico por palabras sigue como respaldo para las portadas anteriores, pero una pieza nueva nombra su composición y así no puede cargar la equivocada.

## 2026-08-13 — El máster se entrega al máximo, siempre

- **El máster es la fuente de una recompresión ajena, no el archivo que ve nadie.** TikTok y Reels vuelven a codificar todo lo que reciben. Lo que se pierde en la exportación se pierde otra vez abajo, y los gráficos planos de marca son lo primero que muestra bandeado.
- **`crf 16`, `preset slow`, `yuv420p`, 1080 × 1920**, fijado en `renderer.py`. Antes era `crf 18` sin preset ni formato de píxel declarados.
- **Nunca se recomprime el máster para caber en un límite de subida.** El puente del navegador admite 10 MB y un máster de 60 s pesa más; la salida es arrastrar el archivo a mano, no bajarle el bitrate. Se hizo una vez con el video-007 —de 1,61 a 1,05 Mbps— y se descartó esa copia.
- **«Cargas en alta calidad» va activado en TikTok** en cada publicación.

## 2026-08-13 — El formato historia, y la duración medida en vez de supuesta

- **Una pieza es corta o es historia, y las reglas cambian con ella.** Hasta 45 segundos rige lo de siempre: una promesa, su demostración, cinco escenas y el producto en pantalla antes del segundo 3. Por encima de 45 segundos la pieza es una historia: hasta nueve escenas y hasta 10 segundos para plantear antes de mostrar el producto. Motivo: los dos formatos fallan al revés. Una demostración de quince segundos se arruina gastando su tiempo en el dolor; una historia de noventa se arruina metiendo nueve momentos en cinco escenas y sosteniendo cada animación dieciocho segundos.
- **Lo que no cambia.** Un público, una idea, un CTA, el gancho en los dos primeros segundos, el cierre de marca común y las zonas seguras. La historia gana aire para explicar, no permiso para prometer más.
- **El estimador de duración se calibró contra los renders, no contra una intuición.** Suponía 15 caracteres por segundo más un cuarto de segundo de pausa por subtítulo, y sobrepredecía en torno a un tercio en los siete videos medidos: un guion escrito para 90 segundos salió en 69. Ahora estima 16,2 caracteres por segundo y nada más, con un error dentro del ±9 % en todos ellos. Motivo: la estimación es lo único que hay antes de gastar un render, y una que se equivoca un tercio no sirve para decidir cuánto guion escribir.
- **La revisión automática admite el rango que la fábrica acepta.** Comprobaba que el máster durase entre 8 y 60 segundos, así que habría reprobado una historia de 90 por durar 90.
- **El estimador mide la voz de borrador, y la de producción es más lenta.** El mismo guion salió en 84,8 s con Kokoro y en 101,8 s con la voz pagada, un 20 % más. La estimación sirve para decidir cuánto guion escribir; la duración real de la pieza publicada la fija el máster final, y conviene contar con ese margen al elegir el objetivo.

## 2026-08-13 — Ninguna animación inventa cifras

- **Las burbujas del mapa no llevan totales de inventario.** `sim:mapa`, `sim:llegada` y `sim:zona` pintaban 8719 propiedades en Quito, 3779 en Guayaquil, 2233 en Cumbayá y 1915 en Nayón, escritas a mano en `simulations.tsx` y sin ninguna fuente. Motivo: es exactamente lo que el contrato prohíbe —cantidades de anuncios sin una fuente fechada— y además un video congela el número para siempre, mientras que el conteo real por zona cambia a diario. Ahora la burbuja muestra solo el nombre de la ciudad o la parroquia.
- **Lo que sí puede ser ilustrativo.** El precio de un anuncio, sus fotos y sus características: son el ejemplo de una propiedad, no una afirmación sobre el tamaño de la plataforma. Los videos 001 y 002 salieron con las cifras y quedan congelados como están.

## 2026-08-13 — El margen lateral lo dicta el teléfono

- **El lienzo miente sobre lo que se ve.** Un 1080 × 1920 se revisa entero en el escritorio, pero TikTok lo escala a la altura de la pantalla del móvil y esconde los lados. La cuenta es `(1080 - 1920 / ratio) / 2`: 97 px por lado en 19.5:9, 108 px en 20:9. Se descubrió con el video-003 ya publicado, cuando el dominio se leía «opropiedadesecuador.com» en un iPhone.
- **Una sola constante manda.** `sideCrop = 120` en `remotion/src/theme.ts`, y `safe.left` cuelga de ella. Antes había tres márgenes laterales distintos —70 px para el texto, 24 px para el dominio, 90 px para el tile— y los tres se decidieron mirando el lienzo completo, que es donde el defecto es invisible.
- **Los fondos siguen a sangre.** Solo se mete el contenido legible. Estrechar también los fondos deja franjas del color de escenario en los bordes, que es el defecto contrario.
- **La prueba vive en Python, no en el ojo.** `SafeAreaTests` en `tests/test_factory.py` lee los archivos del renderer y falla si el margen baja del recorte de 20:9 o si la marca vuelve a anclarse dentro de él. La composición `SafeAreas` pinta las dos columnas para revisarlo a ojo antes de renderizar.
- **Las piezas publicadas no se rehacen.** Los videos 001 a 003 salieron con la marca cortada y se quedan así; el arreglo aplica del 004 en adelante.

## 2026-08-13 — Música siempre gratuita

- La fábrica no compone ni compra música. Solo acepta pistas externas gratuitas para uso comercial cuando un sidecar conserva título, autor, URL, licencia y declara `paid: false`; sin evidencia, el video sale sin música.

Registro de decisiones estructurales de la fábrica.

## 2026-08-12 — Reescritura del motor

- **Motor único.** `factory.py` es la única CLI; el prototipo `video_factory.py` y `video_feedback.py` se eliminan y quedan módulos de responsabilidad única (`planner`, `voice`, `subtitles`, `quality`, `renderer`, `media`, `lessons`). Motivo: dos motores ejecutables y dos memorias de lecciones garantizaban que catálogo y aprendizajes se contradijeran sin que nadie lo notara.
- **Una toma por escena; subtítulos derivados.** La locución se sintetiza como una toma completa por escena para conservar la cadencia de preguntas, comas y conectores. Los grupos de 2 a 6 palabras existen solo para la lectura y el resaltado visual, y se distribuyen sobre la duración medida de la toma. Motivo: los cortes de síntesis convertían las comas en pausas artificiales.
- **Zonas seguras reales.** Definidas una sola vez en `remotion/src/theme.ts` (240 px arriba, 460 px abajo, 240 px a la derecha por debajo de y = 820, 64 px a la izquierda) y verificables con la composición `SafeAreas`. Motivo: las cifras anteriores de la guía (120/220/140) eran una plantilla que la interfaz real de TikTok y Reels desbordaba; con la fuente en el tema, renderer y documentación no pueden divergir.
- **Control de calidad antes del render.** `video lint` corre sobre `plan.json`; `new` lo ejecuta y `approve` lo exige (`--force` deja constancia en `approval.json`). Motivo: un CTA equivocado, un rótulo largo o una afirmación prohibida se detectan gratis sobre el plan y cuestan una síntesis de voz y un render completo si se detectan después.
- **Sin música sintética.** Por defecto las piezas salen sin música; `video render --music` acepta una pista con licencia. Motivo: las senoidales generadas no eran música y restaban frente al silencio.
- **Captura automatizada de material.** `capture-screens` graba con Playwright flujos guionados del portal público en 9:16 y escribe un manifiesto con lo que demuestra cada clip; las rutas privadas se rechazan y los clips de una propiedad concreta exigen nota de autorización en el linter. Motivo: la materia prima manual era el cuello de botella real del ritmo semanal, y el manifiesto deja que Claude elija recursos por significado.
- **Firma humana explícita.** `video sign` cierra la revisión humana del MP4 final y `pack` y `results` la exigen. Motivo: antes la revisión humana quedaba como un flag imposible de cerrar y el estado avanzaba sin que nadie hubiera visto el archivo.

## 2026-08-12 — Arquitectura inicial

- La CLI de Claude ya autenticada genera planes JSON estructurados, sin API adicional.
- Kokoro genera la voz local en español sin costo por generación.
- El proveedor TTS es intercambiable; ElevenLabs es una opción futura mediante variables de entorno.
- Remotion es el renderer visual compartido; FFmpeg queda para inspección y audio auxiliar.
- Remotion exporta el MP4 1080 × 1920; FFmpeg mide, convierte y mezcla recursos auxiliares.
- Los recursos reales suministrados por `--assets` tienen prioridad sobre fondos tipográficos.
- La publicación desde el producto queda fuera (`SOC-010`). En la fábrica editorial, una persona revisa y aprueba el MP4 final; después Claude abre TikTok con `agent-browser`, carga la pieza aprobada y la publica. El inicio de sesión, CAPTCHA o 2FA siguen siendo intervenciones humanas y las sesiones del navegador se cierran al terminar.
- Cada generación conserva sus intermedios para poder corregir una capa sin repetir todo.
