# Historial de cambios

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
