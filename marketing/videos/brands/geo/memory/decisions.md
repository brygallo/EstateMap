# Decisiones vigentes

## 2026-08-14 — La revisión mira el movimiento, no un instante quieto

- **Un fotograma por escena no puede ver un defecto que solo existe mientras algo se mueve.** El geo-010 salió con las cifras contando desde cero: `$0/m²` en pantalla casi un segundo y después `$906/m²`, valores que nunca fueron ciertos. El contacto automático tomaba el fotograma del medio de cada escena, justo cuando el conteo ya había terminado, y Calidad revisó 47 fotogramas sin verlo.
- **Ahora la revisión guarda una tira por escena**, muestreada cada medio segundo, y la página de revisión la muestra junto a los fotogramas críticos.
- **Ninguna cifra se interpola hasta su valor.** Un número que sube afirma un dato falso en cada fotograma menos el último. `AnimatedFigureAudit` lee el código en vez de los píxeles: detecta que se redondee o formatee un valor animado y se imprima. Es una comprobación dura de `video review`, no un aviso, y `ExampleFigureTests` la fija en la suite. Las cifras que ya salieron en piezas firmadas quedan en una lista de congelados, documentada, y no se reutilizan.
- **La máquina también busca lo que un ojo llama «se ve raro»:** `freezedetect` para las escenas detenidas y el detector de cambio de plano para los saltos bruscos lejos de un corte. Los umbrales se calibraron contra defectos ya vistos a ojo, no contra una intuición: con `n=0.0025` no aparecía nada, y con `n=0.01` caen exactamente los momentos que una persona llama vacíos.
- **Lo que ese detector destapó importa más que el defecto que lo motivó.** El máster del 010 está quieto entre el 53 % y el 92 % de cada escena: las animaciones cierran su arco en el primer tercio y se paran. Empeora al pasar a la voz de producción, un 20 % más lenta que la de borrador. Una animación tiene que sostener la duración que le toca, y la duración real solo se conoce después de sintetizar.

## 2026-08-14 — Una pieza no hereda una animación que habla de otro sujeto

- **El geo-010 salió del planificador con tres animaciones de la pieza de terrenos.** Rotulaban «¿Debe algo el terreno?», comparaban lotes de 400 y 800 m² y dibujaban un solar con casitas, en una historia sobre departamentos. El consejo lo levantó por tres carriles distintos y a la vez. Reusar una `sim:*` está bien cuando demuestra lo mismo; cuando cambia el sujeto, no es reutilización, es otra pieza diciendo otra cosa.
- **Cuando el sujeto es lo único que cambia, se parametriza; cuando cambia la demostración, se escribe una animación nueva.** `sim:gravamenes` recibió una prop de sujeto cuyo valor por defecto reproduce exactamente lo que el geo-009 firmó, y `sim:gravamenes-departamento` la envuelve. En cambio la escena de metros y la del entorno necesitaban demostrar otra cosa, así que nacieron `sim:metros-utiles` y `sim:entorno-mapa`; las heredadas quedan intactas para el 009.
- **Una pieza firmada es inmutable, pero eso no obliga a heredar su defecto.** El 009 se queda como está; el 010 no arrastra su sujeto.
- **Una portada nombrada que no existe cae al respaldo genérico sin avisar.** `cover_art: "terreno"` no tenía ramal en `cover.tsx`, así que una historia sobre departamentos se publicaba con una casa, un precio y 400 m² en la miniatura. Ahora `quality.py` lo trata como error de lint (`cover_art_missing`) leyendo los ramales del propio `cover.tsx`: el respaldo sigue siendo legítimo para un plan que no nombra ilustración, y por eso nada aguas abajo podía detectarlo.

## 2026-08-14 — Un dato de ejemplo no es una cifra inventada

- **La línea no está en el número, está en lo que el número afirma.** «El 3,4 % de las casas», «8719 propiedades en Quito» o «el metro cuadrado está en $303» son afirmaciones sobre el mercado o sobre la plataforma y exigen fuente fechada. Un precio y un área que solo existen para enseñar una división no afirman nada: son el ejemplo de un anuncio, igual que la foto de una casa que no existe.
- **Motivo: la regla del 2026-08-13 se leyó al revés.** El consejo revisó el geo-010 y bloqueó `sim:dividir` por pintar $122.000 y 400 m², citando «ninguna animación inventa cifras». Esa decisión prohíbe los totales de inventario que se borraron de `sim:mapa` y en el mismo apartado autoriza el precio y las características de una propiedad ilustrativa. Prohibir el ejemplo deja a la fábrica sin forma de enseñar un cálculo, que es justo lo que la pieza educativa tiene que hacer.
- **Tres condiciones para el ejemplo:** rótulo `EJEMPLO` visible mientras la cifra esté en pantalla, magnitudes verosímiles para el sujeto de la pieza —un departamento no mide 400 m²— y una voz que no convierta el ejemplo en dato.
- **Un hallazgo sobre lo que se ve se comprueba mirando.** El bloqueo se sostenía en que «nada en pantalla lo dice» cuando la tarjeta lleva el rótulo `EJEMPLO` arriba a la derecha en todas las escenas. Antes de emitir un hallazgo visual hay que extraer el fotograma o leer el componente.
- **El linter tenía la frontera bien puesta y el porcentaje roto.** `NUMBER_CLAIM` en `quality.py` solo persigue porcentajes, miles, millones, usuarios, visitas, propiedades y anuncios, así que un precio o un área de ejemplo nunca fueron un hallazgo de la máquina; el defecto de criterio estaba en la prosa del contrato, que decía «no inventes cifras… ni precios» sin la distinción. Pero el test que fija esa frontera destapó que el `\b` final de la expresión hacía imposible que «3,4 %» coincidiera: el porcentaje, la cifra inventada más peligrosa, llevaba desde siempre sin detectarse.
- **La frontera se prueba, no se recuerda.** `ExampleFigureTests` en `tests/test_factory.py` comprueba las dos direcciones: el precio y el área de un ejemplo no producen hallazgo, y el porcentaje y el conteo de propiedades sin nota sí.

## 2026-08-14 — Un consejo multiagente, un solo contrato y un solo editor

- **Claude y Codex obedecen las mismas reglas.** `marketing/videos/AGENTS.md` remite al contrato normativo de `CLAUDE.md` y ambos comparten `VIDEO_COUNCIL_V1`; el planner carga además el consejo y el estándar de animación.
- **Tres carriles trabajan en paralelo:** verdad de producto/negocio, estrategia/guion y producción audiovisual. Sus tareas no se duplican y cada decisión tiene un dueño.
- **Un editor jefe integra una sola pieza.** No se vota ni se mezclan versiones incompatibles. La evidencia decide; un conflicto entre specs y código bloquea la afirmación.
- **Calidad es independiente y no corrige archivos.** Emite `PASS` o `FAIL`, asigna el defecto a su dueño y repite solo las puertas afectadas.
- **Los agentes aceleran decisiones reversibles.** Gasto de voz final, firma, publicación y pauta conservan puertas humanas explícitas y separadas.

## 2026-08-14 — Perfiles de voz por video y por escena

- **Las voces se configuran como perfiles versionados.** `system/voice-profiles.json` relaciona un identificador estable con proveedor, descripción y ajustes; claves y secretos siguen fuera del repositorio.
- **La unidad obligatoria es una voz por video.** Todas las escenas conservan el mismo narrador. La CLI puede forzar un perfil en toda la pieza antes de generar el máster.
- **La primera generación final bloquea voz y ajustes.** `voice-lock.json` conserva perfil, proveedor y firma; cualquier intento posterior de usar otra voz falla antes de comprar. Una voz distinta exige una variante o video nuevo.
- **Los borradores siguen siendo gratuitos.** La selección rechaza cualquier perfil pagado antes de sintetizar; incorporar más voces no abre una ruta nueva de gasto.
- **La música continúa entrando solo con licencia individual.** Descargar un lote o clasificarlo por estilo no convierte las pistas en utilizables si falta autor, fuente o permiso comercial gratuito.

## 2026-08-14 — Las animaciones se aprueban como secuencias terminadas

- **`animation-standard.md` es el contrato global de dirección de movimiento.** Una composición demuestra una idea mediante estado inicial, acción causal, respuesta y prueba resuelta; un animatic, placeholder o entrada genérica no se registra como `sim:*` disponible.
- **La complejidad de código no tiene un techo estético.** Se permite cuando construye jerarquía, profundidad, continuidad, detalle o una demostración más clara. Partículas, transiciones y cantidad de elementos no sustituyen una composición legible.
- **El acabado se revisa en movimiento y en móvil.** La composición debe completar su arco con duraciones mínima, nominal y larga, respetar zonas seguras, producir fotogramas deterministas y sostener un foco dominante por beat.
- **El planner recibe el estándar como contexto.** Cada dirección visual nueva debe especificar estado inicial, acción, respuesta visible y resultado, para que el plan ya nazca como una secuencia realizable y no como una indicación vaga.

## 2026-08-14 — La serie «Publicar cuesta cero», y qué separa una pieza de venta de un tutorial

- **Serie nueva para propietario: «Publicar cuesta cero».** Lidera con la oferta en vez de enseñar el procedimiento. El video 003 ya es el tutorial del formulario; repetirlo con otro gancho habría sido la misma pieza dos veces.
- **La oferta se enuncia con lo que `frontend/lib/help-faqs.ts` promete, palabra por palabra:** publicar es gratis, no hay comisión por ventas ni arriendos, no hay límite de publicaciones, se empieza sin cuenta y el borrador se guarda, y el interesado llama o escribe directo. Si esas FAQ cambian, la pieza deja de ser cierta y no se vuelve a publicar.
- **De la skill `$ad-copy` se toma la estructura, no las técnicas que piden hechos inventados.** Sirven liderar con el trato, escribir en segunda persona, decir *lo que no es* —«no es una suscripción ni una prueba gratis»— y bajar la cadena del «¿y qué?» hasta el dinero: sin comisión significa que lo acordado queda completo para el dueño. Quedan fuera cifras de usuarios, testimonios, autoridades, urgencia y escasez, que es lo que ya prohíbe el contrato.
- **La portada elige su ilustración por `cover_art` del plan, no por una palabra del titular.** El heurístico por palabras sigue como respaldo para las portadas anteriores, pero una pieza nueva nombra su composición y así no puede cargar la equivocada.

## 2026-08-13 — El máster se entrega al máximo, siempre

- **El máster es la fuente de una recompresión ajena, no el archivo que ve nadie.** TikTok y Reels vuelven a codificar todo lo que reciben. Lo que se pierde en la exportación se pierde otra vez abajo, y los gráficos planos de marca son lo primero que muestra bandeado.
- **`crf 16`, `preset slow`, `yuv420p`, 1080 × 1920**, fijado en `renderer.py`. Antes era `crf 18` sin preset ni formato de píxel declarados.
- **Nunca se recomprime el máster para caber en un límite de subida.** El puente del navegador admite 10 MB y un máster de 60 s pesa más; la salida es arrastrar el archivo a mano, no bajarle el bitrate. Se hizo una vez con el geo-007 —de 1,61 a 1,05 Mbps— y se descartó esa copia.
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

- **El lienzo miente sobre lo que se ve.** Un 1080 × 1920 se revisa entero en el escritorio, pero TikTok lo escala a la altura de la pantalla del móvil y esconde los lados. La cuenta es `(1080 - 1920 / ratio) / 2`: 97 px por lado en 19.5:9, 108 px en 20:9. Se descubrió con el geo-003 ya publicado, cuando el dominio se leía «opropiedadesecuador.com» en un iPhone.
- **Una sola constante manda.** `sideCrop = 120` en `remotion/src/theme.ts`, y `safe.left` cuelga de ella. Antes había tres márgenes laterales distintos —70 px para el texto, 24 px para el dominio, 90 px para el tile— y los tres se decidieron mirando el lienzo completo, que es donde el defecto es invisible.
- **Los fondos siguen a sangre.** Solo se mete el contenido legible. Estrechar también los fondos deja franjas del color de escenario en los bordes, que es el defecto contrario.
- **La prueba vive en Python, no en el ojo.** `SafeAreaTests` en `tests/test_factory.py` lee los archivos del renderer y falla si el margen baja del recorte de 20:9 o si la marca vuelve a anclarse dentro de él. La composición `SafeAreas` pinta las dos columnas para revisarlo a ojo antes de renderizar.
- **Las piezas publicadas no se rehacen.** Los videos 001 a 003 salieron con la marca cortada y se quedan así; el arreglo aplica del 004 en adelante.

## 2026-08-13 — Música siempre gratuita

- La fábrica no compone ni compra música. Solo acepta pistas externas gratuitas para uso comercial cuando un sidecar conserva título, autor, URL, licencia y declara `paid: false`; sin evidencia, el video sale sin música.

Registro de decisiones estructurales de la fábrica.

## 2026-08-14 — Motor multimarca con estado aislado

- **Perfil predeterminado compatible.** Geo conserva las rutas existentes y no
  se mueve ningún máster. `--brand aents` es siempre explícito.
- **Se comparte la máquina, no la evidencia editorial.** Renderer, voz, caché,
  plantillas y controles son comunes; catálogo, numeración, biblioteca,
  publicaciones, resultados y aprendizajes pertenecen a una marca.
- **Identidad como dato.** La marca viaja hasta Remotion en props y el linter
  restringe las simulaciones. Inferir la cuenta desde una palabra de portada o
  `sim:aents-*` queda prohibido.
- **Aents es fuente externa de solo lectura.** Sus recursos oficiales se
  consumen desde `packages/brand/exports` y sus capacidades se verifican en el
  repositorio Aents; la fábrica no escribe allí ni convierte planes en hechos.

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
