# Historial de cambios

## 2026-08-15 — Arco de inteligencia artificial de Aents

- Nuevo `remotion/src/aents-ia-simulations.tsx` con catorce animaciones para la
  clase sobre construir software con inteligencia artificial:
  `sim:aents-ia-funciona`, `sim:aents-ia-contexto`, `sim:aents-ia-partes`,
  `sim:aents-ia-reglas`, `sim:aents-ia-camino-feliz`, `sim:aents-ia-revision`,
  `sim:aents-ia-dependencias`, `sim:aents-ia-seguridad`,
  `sim:aents-ia-secretos`, `sim:aents-ia-pruebas`, `sim:aents-ia-git`,
  `sim:aents-ia-orden`, `sim:aents-ia-criterio` y `sim:aents-ia-cierre`. El
  fondo, el panel, el texto contenido y el vocabulario de movimiento vienen de
  `system-kit`; lo propio del archivo es el argumento.
- Cada consejo se demuestra fallando antes de darse: el rastro del error se
  pierde dos veces entre los archivos generados, el recorrido perfecto se repite
  sin conexión y sin permiso, y la petición entra al servidor después de
  esconder el botón. Un acierto sin intento previo no se lee como respuesta.
- Ninguna herramienta de inteligencia artificial se nombra, se compara ni se
  recomienda: el pedido se dibuja como un campo de mensaje genérico. Un test lo
  comprueba sobre el archivo, con «copiloto» y el componente `Cursor` excluidos
  por ser metáfora y pieza de interfaz, no marcas.
- `sim:aents-ia-cierre` carga el bloque de marca completo porque `scene.tsx` no
  dibuja el outro sobre una simulación en la escena final; sin eso la pieza
  terminaría con un CTA que nadie puede accionar. Un test lo verifica.
- Nueva portada `aents-ia` en `cover.tsx`: la pantalla que ya funciona junto a
  la columna de capas que nadie marcó, con el rótulo «SI PROGRAMAS CON IA».

## 2026-08-15 — Arco móvil de Aents

- Nuevo `remotion/src/aents-mobile-simulations.tsx` con trece animaciones para
  la clase sobre responsive y mobile first: `sim:aents-encoge`,
  `sim:aents-sintomas`, `sim:aents-dos-caminos`, `sim:aents-cabe`,
  `sim:aents-pregunta`, `sim:aents-portal-escritorio`, `sim:aents-portal-movil`,
  `sim:aents-dedo`, `sim:aents-tarjetas`, `sim:aents-gestos`, `sim:aents-peso`,
  `sim:aents-hacia-arriba` y `sim:aents-usala`. El fondo, el panel y el texto
  contenido vienen de `system-kit`; lo propio del archivo es el argumento.
- `sim:aents-portal-movil` no idealiza el producto: dibuja los estados que
  implementa `frontend/components/map/MobilePropertyDrawer.tsx` —botón flotante
  que abre buscador y filtros, ficha a media altura, ficha completa con fondo
  atenuado y arrastre hacia abajo para cerrar—. Un test comprueba que esos
  estados sigan nombrados en la composición.
- Nueva portada `aents-movil` en `cover.tsx`: un solo teléfono partido por la
  mitad, con la página de escritorio reducida a un lado y la versión pensada
  para el dedo al otro, y un disco del tamaño de una yema sobre el botón.
- `sim:aents-encoge` usa un marco que se transforma en vez de cambiar de
  componente a mitad del recorrido. Alternar `Desktop` y `Phone` según el ancho
  producía un salto de barra de navegación a bisel justo en el segundo en que la
  escena tiene que leerse como una sola reducción continua.

## 2026-08-15 — Formato clase y números reclamables

- Nuevo formato **clase**, de 121 a 240 segundos: hasta catorce escenas y hasta
  25 segundos antes de mostrar el producto (`quality.MAX_LESSON_SCENES`,
  `quality.LESSON_PRODUCT_REVEAL_DEADLINE_SECONDS`). Debajo, la historia y el
  formato corto conservan exactamente sus límites: `quality.is_story` pasa a
  cerrar en 120 en vez de quedar abierta hacia arriba.
- `video new` acepta `--duration` de 8 a 240, el esquema del planificador admite
  las catorce escenas y la revisión del máster comprueba ese mismo rango
  (`duration_8_to_240_seconds`). Un tope de escenas que no crecía convertía
  cualquier pieza larga en cinco animaciones sostenidas medio minuto cada una.
- `EditorialFormat.classify` etiqueta `lesson` por encima de dos minutos: a esa
  duración nadie mira por el arco narrativo, mira porque está aprendiendo.
- Nuevo `video new --number N`: reclama un número que el catálogo saltó.
  `next_number` solo cuenta hacia adelante, así que un plan descartado dejaba un
  hueco que ninguna pieza podía volver a ocupar. El catálogo se guarda ordenado
  por número para que el planificador siga leyendo el final como lo más reciente,
  y un número ya ocupado se rechaza antes de crear la carpeta.
- `catalog.save` ya no borra el trabajo de otra sesión. Cada comando cargaba el
  catálogo entero, cambiaba una entrada y lo escribía completo, así que dos
  agentes trabajando a la vez se pisaban: `aents-003` desapareció del catálogo
  mientras su carpeta, su aprobación y su voz sintetizada seguían en disco, y el
  siguiente comando ya no encontraba un video que estaba entero. Ahora se
  relee el archivo justo antes de escribir y se conservan las entradas que no
  estaban en la copia cargada. No lo vuelve atómico; convierte el caso normal
  —dos sesiones separadas por minutos— en una fusión en vez de una pérdida.
- El render escribe su progreso en `exports/<id>.pending.render.log` mientras
  avanza. Antes se capturaba toda la salida de Remotion y no se veía una línea
  hasta que el proceso terminaba: aguantable en treinta segundos, pero una clase
  son casi 6.000 fotogramas, y durante más de una hora un render que iba bien y
  uno cuyas pestañas habían muerto se veían exactamente igual.
- Nuevo `video render --concurrency N` y `VIDEO_RENDER_CONCURRENCY`. Remotion
  abre una pestaña por núcleo y cada una sostiene un fotograma entero, que a
  `--scale 2` mide 2160 × 3840. Una clase son casi 6.000 fotogramas: en una
  máquina de 16 GB con otro render en marcha las pestañas mueren una tras otra
  con `target closed`, que parece un defecto de la composición y no lo es. Por
  defecto no se pasa nada y Remotion sigue eligiendo.
- `test_planner_context_reads_only_the_selected_brand_memory` comprobaba que
  Aents no tuviera aprendizajes. Falló el día que registró el primero; ahora
  comprueba de qué marca sale la memoria, que es lo que la prueba defiende.

## 2026-08-15 — La duración deja de ser una regla

- La duración de una pieza es una decisión editorial, no una comprobación. Se
  retiran las dos reglas que la vigilaban: `duration_close_to_target` en la
  revisión del máster y `duration` en el lint del plan.
- Un guion cuya locución estimada supere el objetivo declarado ya no se rechaza
  antes de renderizar, y un máster que dure más o menos de lo previsto ya no
  falla la revisión. `target_duration_seconds` sigue registrándose en el brief,
  el catálogo y `review.json` como referencia.
- Se mantiene `duration_8_to_120_seconds`: es el límite del formato vertical,
  no una comparación contra el objetivo.
- El índice `system/quality-rules.json` decía `duration_8_to_60_seconds` cuando
  el código aceptaba 120 desde que existen las historias; queda corregido.
- Motivo: el video-013 pasaba la revisión con objetivo 40 s y la fallaba con
  objetivo 33 s sin que el máster hubiera cambiado. La regla medía el brief, no
  la pieza.

## 2026-08-14 — Texto de publicación listo para copiar

- `pack` genera globalmente `texto-para-publicar.txt` con caption y hashtags en
  el orden exacto de publicación, y registra ambos en `publish.json`.
- Los planes nuevos admiten entre uno y cinco hashtags propios. Los planes
  anteriores reciben los defaults seguros del perfil Geo o Aents.
- Los hashtags permanecen fuera de locución, subtítulos y `caption.txt` para no
  contaminar los artefactos editoriales existentes.

## 2026-08-14 — Un motor, dos espacios editoriales

- La CLI incorpora `--brand geo|aents`; Geo sigue siendo el default y conserva
  catálogo, biblioteca y comandos históricos sin migraciones.
- Aents recibe catálogo, numeración, biblioteca, publicaciones, brechas,
  decisiones y aprendizajes independientes bajo `brands/aents/`.
- `brand.py` concentra identidad, dominio, rutas, audiencias, CTA y simulaciones
  permitidas. El planificador carga únicamente el contexto y memoria del perfil.
- Las props de Remotion llevan marca, nombre, dominio, tagline y símbolo
  explícitos. Portada, wordmark y cierre dejan de inferir la cuenta desde el
  título o un identificador `sim:*`.
- Aents consume los PNG canónicos de `../Aents/packages/brand/exports`; el
  repositorio Aents permanece de solo lectura.
- El staging de Remotion se prefija por marca, de modo que dos `video-001` no
  comparten archivos transitorios.

## 2026-08-14 — Dos piezas hermanas desde un guion de dos públicos

- El guion entregado por la persona responsable hablaba al vendedor y al comprador en la misma pieza, con dos CTA y 46 s. El contrato lo prohíbe, así que se produce como dos videos con el mismo sistema visual: video-013 para propietarios (33 s) y video-014 para compradores (25 s).
- Animaciones nuevas: `sim:donde-queda` y `sim:ya-lo-saben` son el mismo componente en sus dos estados —el anuncio publicado con la fila de ubicación vacía y los mensajes que preguntan dónde queda, y ese mismo anuncio con su punto en el mapa y mensajes que ya preguntan por la propiedad—. La pieza abre en la pregunta y cierra en su respuesta, y dibujar el remate como otra imagen habría escondido que es el mismo anuncio. `sim:elige-zona` invierte el orden de la búsqueda: una mano arrastra el mapa hasta la zona, se traza el círculo y las tarjetas sueltas caen dentro convertidas en precios ubicados.
- `cover.tsx` gana los ramales `pregunta` (el anuncio sin ubicación y los mensajes encima) y `zona` (el círculo de la zona con sus precios dentro y los de fuera apagados). Ninguno cuenta inventario.
- Las tres animaciones cuentan como mostrar el producto (`quality.PRODUCT_ASSETS`): las dos primeras son el anuncio publicado y la tercera es el mapa.
- `PublishShell` acepta `camera`, como ya hacía `FieldShell`. El primer máster del 013 salió quieto entre el 55 % y el 85 % por escena; con el empuje lento, la foto de la tarjeta desplazándose durante toda la toma y `sim:ubicacion-publicacion` dibujando su polígono esquina por esquina en vez de conmutar en el segundo 1,55, la revisión no deja ni un aviso de movimiento. Las composiciones que no pasan `camera` no cambian.

## 2026-08-14 — Los seis pasos de una compraventa

- Video-012 desde un guion entregado por la persona responsable: qué pasa después de encontrar la propiedad, en formato educativo de 48 s y nueve escenas.
- Animaciones nuevas: `sim:verificar` (la lupa recorre propietario, documentos y gravámenes y cada fila se lee mientras pasa), `sim:negociar` (el precio publicado se tacha, entra la oferta y aparece el acuerdo), `sim:promesa` (la firman comprador y vendedor, en ese orden), `sim:escritura-publica` (el sello de la notaría es el sujeto), `sim:inscripcion` (la escritura entra al registro y el propietario inscrito deja de ser el vendedor) y `sim:pasos-compra` (los seis pasos en orden). Ninguna cuenta como mostrar el producto: nada de eso ocurre dentro del portal, y el test lo fija.
- `cover.tsx` gana el ramal `proceso` con la escalera de seis pasos.
- `simulations.tsx` añade `pace`: progreso a ritmo constante para un movimiento que el ojo debe seguir. La curva de la casa está adelantada por diseño —gasta el 90 % de su distancia en el primer tercio—, así que una lupa que recorre una lista resolvía la escena en el primer segundo y el resto era una fotografía. El primer máster del 012 salió con 83–89 % de quietud por esa razón; `sim:filtros` arrastraba el mismo defecto y también se corrigió.
- `FieldShell` acepta `camera`: un empuje lento y de una sola dirección durante toda la escena. Las composiciones anteriores no lo pasan y no cambian.
- `sim:ficha` queda limpia para poder reutilizarse: el precio se imprime en vez de contar desde cero —su línea sale de `FROZEN_LINES`—, la tarjeta lleva `EJEMPLO` y el bloque de inteligencia pierde «La zona va de $511 a $905 · 2120 comparables» y el sello «dentro del rango». Eran cifras de mercado inventadas, y además se contradecían: $305 no está entre $511 y $905. Queda el precio dividido para el área declarada, que cualquiera puede rehacer.

## 2026-08-14 — La revisión aprende a mirar el movimiento

- `review_tools.MotionStripExtractor`: cada escena se muestrea cada medio segundo y se arma una tira de contacto en `review/strips/`, visible en la página de revisión junto a los fotogramas críticos.
- `review_tools.AnimatedFigureAudit`: detecta en el código las cifras que se interpolan hasta su valor —redondear o formatear un valor animado y imprimirlo— y `video review` lo convierte en la comprobación dura `no_interpolated_figures`. Las cifras de piezas ya firmadas quedan en una lista de congelados explícita.
- `review_tools.MotionDefectAudit`: `freezedetect` para escenas detenidas, proporción de quietud por escena y detección de saltos bruscos lejos de un corte. Umbrales calibrados contra defectos verificados a ojo en el video-010.
- Ese detector reveló que el máster del 010 está quieto entre el 53 % y el 92 % de cada escena.

## 2026-08-14 — Primera revisión del consejo sobre una pieza real

- El video-010 pasó por los cinco roles. Los tres carriles coincidieron en que el argumento era nuevo y la superficie no: portada, escena 5, escena 6 y escena 7 venían de la pieza de terrenos y demostraban otro sujeto.
- Animaciones nuevas: `sim:metros-utiles` separa metros útiles de áreas comunes y recalcula el precio por metro con magnitudes de departamento; `sim:entorno-mapa` muestra el marcador del edificio sobre el callejero base sin rotular vías ni trazar rutas, porque el mapa del portal no tiene capa de anotación ni ruteo. `sim:edificio` se rehízo como recorrido con cuatro paradas y respuesta causal.
- `sim:gravamenes` recibe una prop de sujeto con el texto del 009 por defecto, y `sim:gravamenes-departamento` la envuelve para esta pieza.
- `cover.tsx` gana el ramal `departamento` y rotula `EJEMPLO` a 22 px también en la tarjeta genérica; el título medía contra 900 px una columna de 840, que era la causa real de las cuatro líneas.
- `quality.py` valida `cover_art` contra los ramales implementados en `cover.tsx` (`cover_art_missing`), y `voice.py` impide que «Geo Propiedades Ecuador» se parta entre dos subtítulos.

## 2026-08-14 — El dato de ejemplo queda escrito como permitido

- `CLAUDE.md` parte la regla en dos: la cifra que afirma un hecho de mercado o de plataforma exige fuente fechada; el precio, el área y las características de una propiedad ilustrativa se inventan a propósito para enseñar un cálculo, con rótulo `EJEMPLO` en pantalla, magnitudes verosímiles para el sujeto de la pieza y una voz que no las convierta en dato.
- `animation-standard.md` lo incorpora al apartado de producto e interfaces, y `council.md` lo lleva al rol que revisa la verdad comercial: un ejemplo marcado no se reporta como hallazgo, y una magnitud imposible es un defecto de coherencia, no de invención.
- `council.md` añade que un hallazgo sobre lo que se ve en pantalla se comprueba antes en un fotograma o en el componente; afirmar «no se dice en pantalla» sin mirarlo es un hallazgo inválido que el editor devuelve.
- `tests/test_factory.py` fija la frontera en la máquina: el linter avisa de porcentajes y de conteos de propiedades sin nota, y no del precio ni del área de un ejemplo.
- Ese test destapó un defecto de `NUMBER_CLAIM` en `quality.py`: el `\b` final impedía que «3,4 %» coincidiera nunca, porque después de `%` no hay frontera de palabra. El porcentaje era la única cifra que la máquina no podía ver. Ahora el límite solo se exige a las unidades escritas.

## 2026-08-14 — Consejo multiagente compartido

- Nuevo `council.md`: editor jefe, verificación de producto/negocio, estrategia/guion, dirección visual/voz/audio y control de calidad independiente, con dueños, entregables, bloqueos y cinco puertas.
- Nuevo `marketing/videos/AGENTS.md`: Codex debe leer el mismo `CLAUDE.md`, sistema creativo y estándar de animación que Claude. Ambos documentos comparten `CONTRACT: VIDEO_COUNCIL_V1` y el planner carga los dos.
- La paralelización se limita a tres carriles independientes; un editor integra un único plan y Calidad revisa sin modificarlo. Gasto, firma, publicación y pauta siguen siendo decisiones humanas separadas.

## 2026-08-14 — Catálogo multivoz

- Nuevo `system/voice-profiles.json` con perfiles estables, defaults de borrador y máster, descripciones y ajustes por proveedor.
- `plan.json` admite un único `voice_profile` para el narrador completo. `render` y `voice-cost` aceptan `--voice-profile` como override global.
- El render rechaza perfiles pagados en borradores y registra el perfil exacto en `production.json`. La primera generación final escribe `voice-lock.json`; otra voz o ajustes distintos se rechazan antes del gasto.
- Se conserva compatibilidad con las variables antiguas `DRAFT_TTS_PROVIDER` y `FINAL_TTS_PROVIDER` en la ruta que usa el render: nombran un proveedor y se traducen al perfil de esa etapa que ya habla con él, así que `DRAFT_TTS_PROVIDER=macos` sigue cayendo en `draft-paulina`. Las nuevas `DRAFT_VOICE_PROFILE` y `FINAL_VOICE_PROFILE` tienen prioridad.
- El linter valida el `voice_profile` del plan contra el catálogo: un identificador inventado es error antes de aprobar, y un perfil de pago avisa de que los borradores lo rechazan.
- Se registran siete perfiles finales de ElevenLabs (`voice-01` a `voice-07`) con los identificadores entregados. Sus etiquetas creativas quedan pendientes de audición para no inventar características de voz.

## 2026-08-14 — Estándar profesional de animación

- Se incorpora `animation-standard.md` como contrato global para toda composición: definición de acabado, jerarquía visual, gramática de movimiento, ritmo, cámara, profundidad, recreaciones del producto, efectos, transiciones, arquitectura Remotion, rendimiento, accesibilidad y revisión.
- El planner carga el estándar y exige que cada dirección visual describa estado inicial, acción, respuesta y prueba resuelta; ya no acepta placeholders o entradas decorativas como demostración.
- `creative-system.md` y el README enlazan el estándar para que crear una animación nueva implique cumplirlo, registrarla en ambos motores y probarla en duraciones mínima, nominal y larga.

## 2026-08-14 — Animaciones de propietario y portada elegida por el plan

- Cuatro animaciones nuevas para la pieza de oferta: `sim:vender` (el terreno y la casa con su letrero), `sim:cero-comision` (lo que cuesta publicar, y lo que no es), `sim:anuncio-en-mapa` (el anuncio viaja del formulario al mapa y se dibuja la Forma del terreno) y `sim:te-contactan` (entra la llamada del interesado y después su mensaje).
- La portada acepta `cover_art` en el plan y dibuja la composición que ese campo nombra. Antes la deducía de palabras sueltas del titular, que es como una portada acabó cargando una ilustración que tapaba su propio título. El heurístico por palabras queda como respaldo de las portadas ya escritas.
- Dos composiciones de portada nuevas: `origen` (el anuncio sin lugar frente a la propiedad en el mapa) y `oferta` (el precio de publicar y las tres condiciones).

## 2026-08-13 — Formato historia y duración calibrada

- `video new` acepta de 8 a 120 segundos. Por encima de 45 la pieza es una historia: el control de calidad le concede hasta nueve escenas y hasta 10 segundos antes de mostrar el producto, y por debajo mantiene las cinco escenas y los 3 segundos de siempre (`quality.scene_budget`, `quality.product_reveal_deadline`).
- `voice.estimate_seconds` se calibró contra la duración medida de los siete videos renderizados: pasa de 15 caracteres por segundo más un cuarto de segundo por subtítulo a 16,2 caracteres por segundo, con un error dentro del ±9 %. Antes sobrepredecía cerca de un tercio, y un guion escrito para 90 segundos salía en 69.
- La revisión automática comprueba el mismo rango que acepta `new` (8–120 s) en vez de 8–60.
- Nuevo `video docs <id>`: reescribe `script.md`, `storyboard.md` y `caption.txt` desde `plan.json`. Los planes se editan a mano entre linteos y el guion que revisa una persona se quedaba describiendo otro video.
- Se incorpora `sim:contacto`, basada en el bloque de contacto real de la ficha (`PropertyModal`, `PropertyContactActions`): «Publicado por», el teléfono que se revela al pedirlo, el par Llamar y WhatsApp, y el mensaje que el producto deja escrito. El número va enmascarado para que no se lea como el de un anunciante real.
- El control de audiencia distinguía mal: cualquier aparición del verbo «publica» reprobaba una pieza de comprador, incluida «escribes a quien publica el anuncio». Ahora busca la segunda persona («publica tu», «sube tu propiedad»), que es donde ocurre el cambio de público de verdad.
- Kokoro escribe su manifiesto con el pid en el nombre. Dos renders simultáneos compartían `.cache/voice/manifest.json`, se lo borraban entre ellos y el fallo aparecía mucho después como un `.raw.wav` inexistente.
- Un subtítulo ya no termina en la palabra que sostiene a la siguiente. La regla de no *abrir* grupo tras un determinante existía desde el video 002; faltaba la simétrica, y en pantalla quedaban líneas como «que nadie me contestaba era la» o «No es un plano legal ni». Cuando el corte lo fuerza la longitud, esa palabra se lleva al grupo siguiente.
- Las burbujas del mapa dejan de pintar totales de inventario. `sim:mapa`, `sim:llegada` y `sim:zona` llevaban 8719 en Quito, 3779 en Guayaquil, 2233 en Cumbayá y compañía: cifras sin fuente que además quedaban congeladas en la pieza. Ahora las burbujas de ciudad y parroquia muestran solo el nombre; los precios de los pines siguen, que son ilustrativos de un anuncio y no una afirmación sobre el inventario.

## 2026-08-13 — Animaciones para agentes y portada con su propio CTA

- Se incorporan `sim:chat-agente`, `sim:inventario-agente` y `sim:enlace-corto`, basadas en el hilo de fotos sin ubicación, en la rejilla de «Mis propiedades» y en el enlace corto del kit (`PromotionKit`).
- Las tres se sincronizan con la duración real de su escena en vez de con segundos fijos: la voz decide cuánto dura una escena, y un arco escrito en segundos se quedaba a medias o nunca llegaba a su remate.
- Una prueba compara el registro de Python con el de Remotion: una animación registrada en un solo lado pasaba el control de calidad y luego renderizaba un escenario vacío.
- La portada recibe el CTA y el público del plan. Antes los deducía del texto de portada, y una pieza para agentes salía ofreciendo «Encuentra tu futuro hogar», el CTA de comprador.

## 2026-08-13 — Producción asistida por IA

- La voz se sintetiza como una sola toma por escena; los subtítulos ya no cortan la locución en comas o conectores.
- Dan queda como voz final recomendada con estabilidad 0.62, similitud 0.55 y velocidad 1.02; los borradores continúan usando Kokoro local.
- Claude crea animaciones nuevas cuando el guion lo requiere, tomando como referencia los componentes reales de EstateMap y conservando la firma visual de la serie.
- El linter bloquea identificadores `sim:*` que todavía no estén implementados y registrados.
- Se incorpora `sim:filtros`, basada en `MapFilters`, `RangeSlider` y `MapActiveFilters` del producto.

## 2026-08-13 — Orden interno

- Los proveedores de voz pasan a ser una clase cada uno en `tts.py` (`KokoroVoice`, `MacOSVoice`, `ElevenLabsVoice`). Antes la lista de proveedores estaba repartida por cinco puntos de `voice.py`, que es de donde salió el fallo de firma de caché; ahora cada proveedor es dueño de sus ajustes, su firma y su síntesis.
- Se elimina el estado global: el proveedor se pasa explícito en vez de escribirse en `TTS_PROVIDER` del entorno del proceso. Las pruebas ya no parchean variables de entorno para elegirlo.
- Nuevos módulos: `catalog.py` (catálogo, estados y escritura atómica), `assets.py` (material y manifiesto) y `documents.py` (guion y storyboard en Markdown). `factory.py` baja de 854 a 691 líneas y queda como CLI y orquestación.
- `create_video` recibe `VideoRequest` y `Slot` en lugar de diez parámetros sueltos.
- `renderer.build_props` se parte en `AssetTimeline`, `stage_asset` y `scene_props`: la cuenta de fotogramas ya reproducidos vive en un objeto en vez de en dos diccionarios sueltos dentro de un bucle de 78 líneas.

## 2026-08-13 — Guiones concentrados y música gratuita

- El linter limita los planes a cinco escenas, exige mostrar el mapa antes del segundo 3 en piezas para compradores y bloquea CTA o mensajes de otra audiencia.
- Se avisa cuando rótulo y voz duplican casi el mismo mensaje.
- Se elimina la composición y compra de música; solo se aceptan pistas gratuitas para uso comercial con autor, fuente y licencia verificables.

## 2026-08-13 — La voz se paga una sola vez

- Se separa la voz de borrador de la de producción: `video render` usa siempre Kokoro local, y solo `video render --final` compra la voz de ElevenLabs. Ese flag es la única puerta al gasto, y avisa del importe antes de cruzarla.
- `video voice-cost <id>` cotiza el máster sin comprarlo.
- La firma del caché pasa a incluir solo los ajustes del proveedor activo: antes, tocar la velocidad de Kokoro invalidaba clips ya pagados a ElevenLabs.
- Las respuestas de ElevenLabs se guardan intactas en `.cache/voice/paid/` y solo se escriben tras una respuesta completa, así que ningún fallo posterior obliga a volver a pagarlas. Una frase repetida en el guion se compra una sola vez.
- Tope por tirada (`ELEVENLABS_MAX_CHARS_PER_RUN`, 2000 por defecto) y registro de consumo en `.cache/voice/elevenlabs-usage.jsonl`.
- `factory.py` lee `.env` al arrancar; `.env.example` documenta las variables sin valores reales.
- Históricamente se probó música compuesta con ElevenLabs. Esa opción fue retirada: el sistema ya no compra ni genera música y solo admite pistas gratuitas para uso comercial con autor, fuente y licencia verificables.
- Nuevo módulo `elevenlabs.py` con la única llamada HTTP al proveedor, para que voz y música compartan el mismo trato de errores y de red.
- La confirmación de gasto se niega cuando no hay terminal donde preguntar, en vez de darse por concedida. Autorizar por adelantado exige `--yes`.
## 2026-08-12 — Reescritura del motor

- Se unifica todo en un solo motor: `factory.py` como única CLI (script `video`), con módulos de responsabilidad única (`planner.py`, `voice.py`, `subtitles.py`, `quality.py`, `renderer.py`, `media.py`, `lessons.py`). `video_factory.py` y `video_feedback.py` desaparecen; `new-video` y `video-factory` quedan como alias obsoletos que avisan por stderr y `video-feedback` ejecuta `video feedback`.
- Se añade `video lint` sobre `plan.json`, antes de gastar voz y render; `new` lo ejecuta automáticamente y `approve` lo exige (`--force` queda registrado en `approval.json`).
- Subtítulos karaoke con tiempos medidos: la locución se trocea en grupos de respiración de 2 a 6 palabras, cada grupo se sintetiza por separado, se recorta el silencio y su duración real marca su tiempo en pantalla. Caché por hash en `.cache/voice`.
- Zonas seguras reales medidas contra la interfaz de TikTok y Reels, definidas en `remotion/src/theme.ts`, con la composición `SafeAreas` para comprobarlas en Remotion Studio. La tipografía se ajusta midiendo el texto con la fuente real (`remotion/src/layout.ts`).
- Se elimina la música sintetizada con senoidales. Por defecto no hay música; `video render --music` acepta una pista con licencia.
- `video render` exporta también la portada `exports/cover.png`. Comandos nuevos: `lint`, `sign`, `cover`, `pack`, `variants`, `batch`. Estados nuevos: `signed` entre `reviewed` y `published`.
- Captura automatizada de material real: `capture-screens` graba flujos guionados del portal público en 9:16 con Playwright y escribe `assets/screens/*.mp4` más un manifiesto que el planificador usa para elegir recursos por lo que demuestran.
- Memoria única: `memory/lessons.json` como fuente y `memory/lessons.md` como vista regenerada; el catálogo canónico es `memory/catalog.json`. Se eliminan `memory/video-catalog.jsonl` y `memory/run-log.jsonl`.

## 2026-08-12

- Se crea la CLI de generación completa desde consola.
- Se integra Claude para concepto, guion y storyboard estructurado.
- Se integra ElevenLabs para voz y música instrumental.
- Se integra FFmpeg para escenas verticales, mezcla y MP4 final.
- Se añade memoria persistente, registro automático de ejecuciones y comando de feedback.
- Se sustituye la API obligatoria por la CLI de Claude ya autenticada.
- Se añade voz local y base sonora sintetizada para un flujo sin costo por generación.
- Se incorpora Remotion 4.0.509 como renderer React parametrizado.
- Kokoro pasa a ser el proveedor TTS local predeterminado; ElevenLabs queda configurable.
