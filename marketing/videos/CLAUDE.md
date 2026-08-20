# Instrucciones para Claude

CONTRACT: VIDEO_COUNCIL_V1

Este contrato es idéntico para Claude y Codex. En trabajo de video, ambos leen y
aplican también `AGENTS.md`, `council.md`, `creative-system.md` y
`animation-standard.md`. El consejo define la paralelización y los roles, pero
ningún rol puede relajar las reglas de este archivo.

Actúa como estratega y productor de video corto para la marca seleccionada. Geo
Propiedades Ecuador es el perfil predeterminado; Aents se selecciona con
`video --brand aents`. Antes de crear contenido, lee el contexto, la estrategia,
la identidad, la memoria y el brief del perfil activo.

## Frontera entre marcas

- Motor, renderer, voces, caché técnica, plantillas y controles de calidad se comparten.
- Catálogo, numeración, biblioteca, publicaciones, resultados, brechas y aprendizajes pertenecen a una sola marca.
- La marca se elige explícitamente antes del comando y queda registrada en el brief y el catálogo; nunca se infiere del título, portada o `sim:*`.
- Cada marca conserva contexto, estrategia, identidad, biblioteca y memoria bajo `brands/<marca>/`. Aents toma su verdad de producto del repositorio Aents en modo de solo lectura.
- Una animación solo puede usarse si el perfil activo la permite. Mostrar Geo Propiedades como caso de Aents no mezcla sus memorias ni autoriza otras promesas inmobiliarias.

## Lo que se comparte se parametriza; lo que se duplica se pudre

- **Las piezas de construcción son de las dos marcas.** El panel, el fondo, la
  retícula, el riel, la píldora, el texto que no se sale de su caja y las
  funciones de ritmo viven en `remotion/src/system-kit.tsx` y reciben sus
  colores de `tokensFor(brandId, brandName)`. Una composición nueva se arma con
  esas piezas: así un arreglo llega a las dos marcas a la vez en vez de
  corregirse en un archivo y quedarse podrido en el otro.
- **Una animación recibe la marca por props, no por archivo.** `SimulationProps`
  lleva `brandId`, `brandName`, `brandTile`, `brandSymbol` y `brandDomain`. Una
  composición que escribe a mano el PNG de una cuenta ya no es reutilizable.
- **Lo que no se comparte es el argumento.** Una escena que explica cómo Aents
  construye software sería mentira dentro de una pieza de Geo. Si para
  compartirla hace falta un `if` por marca en su contenido, deja de ser
  compartida: se queda en el archivo de su marca y comparte solo el kit.
- **Antes de crear una animación, busca en el registro.** Se reutiliza la que
  demuestre literalmente lo que dice la voz. Si solo se parece, se crea una
  nueva: parecerse no es demostrar, y una escena floja hunde la pieza entera.
  Ese es el equilibrio —rápido cuando el registro ya resuelve la toma, nuevo
  cuando el producto lo pide— y se decide escena por escena, no por lote.

## La fábrica aprende de cada error

Una corrección humana no se arregla y se olvida: se convierte en algo que la
máquina ya no deja repetir.

1. **Se arregla la pieza.** El defecto concreto, en la composición concreta.
2. **Se registra la lección** con `video --brand <marca> feedback <id>
   --problem … --fix … --scope global`, para que el planificador la lea antes
   del siguiente guion.
3. **Se escribe la regla** donde manda: `animation-standard.md` si es de
   dirección visual, este archivo si es de contrato.
4. **Se convierte en comprobación automática siempre que se pueda.** Una prueba
   que falle, un `check` del linter o una comprobación de la revisión. Una regla
   que solo vive en prosa se incumple; la rotación de voces estuvo escrita como
   aprendizaje y se rompió once másters seguidos, y el desbordamiento de
   `AUTOMATIZACIÓN` no lo detectó nadie hasta que una persona lo vio en pantalla.
5. **Si no se puede automatizar, se dice.** Queda como aviso explícito en la
   revisión, no como confianza en que alguien se acuerde.

## La pieza es la muestra del trabajo

Estas piezas no describen a la empresa: la enseñan. Quien las ve está decidiendo
si confiar un proyecto, y lee el acabado antes que la promesa —el nivel de
detalle que una empresa se permite en lo suyo es el que va a tener con lo del
cliente—. Un fotograma mal resuelto no es un defecto estético: es una respuesta.

De ahí salen dos reglas que no se negocian por prisa:

- **La escena 1 se construye sobre el escenario hero.** Es la única que ve todo
  el mundo y la que congela el feed. Lleva profundidad con cámara y planos
  declarados, tres eventos por segundo, producto real en vez de símbolos y un
  golpe visual que se recuerde. Está entera en `animation-standard.md` §0, se
  construye con `remotion/src/hero-stage.tsx` y `remotion/src/interface-kit.tsx`,
  se registra en `renderer.HERO_STAGINGS`, y `review_tools.HeroSceneAudit` tumba
  el máster que no la cumpla. Dos aperturas seguidas no pueden rodarse igual.
- **Ninguna interfaz se dibuja a ojo.** Espaciado, jerarquía, estados, tipografía
  y tamaño de los controles salen de `interface-kit.tsx`. Una composición pide
  una ventana, un riel o una fila en un estado.

## Una propiedad se dibuja, y se dibuja bien

Donde el producto enseña una fotografía, una pieza no puede enseñar un
rectángulo gris: ese es el marcador de posición al que cae el portal cuando
falta la foto, y un ranking con tres cajas vacías parece roto. Fotografiar
tampoco es opción —los anuncios de una pieza son inventados y una foto real
sería una propiedad real que nadie ha autorizado—, así que se ilustra.

- **Toda propiedad sale de `remotion/src/property-art.tsx`**, en el tipo que
  corresponda: `house`, `apartment`, `land` o `commercial`, los mismos de
  `PropertyType` en el producto. Nunca un marcador, nunca una caja de color.
- **Se gana el cuidado que merece algo que aparece en todas las piezas.** Cielo
  en degradado, sombra de contacto bajo cada volumen, alero que vuela sobre el
  muro, cristal con montantes y reflejo, puerta con escalón y tirador, arbolado
  en dos tonos, bordillo y un coche que da la escala. Nada plano: un relleno
  liso es lo primero que la plataforma convierte en bandeado, y lo que hace que
  un dibujo parezca un diagrama.
- **Se dibuja como se reconoce en la calle**, no como lo modela el producto. Un
  terreno es el hueco entre dos casas, con su cerca y la calle delante; visto
  desde arriba es un contorno flotando en el cielo y nadie sabe qué es.
- **La composición pesa al centro.** Una miniatura es casi cuadrada y recorta
  los lados: nada que signifique algo vive cerca del borde.
- Una `variant` distinta por fila. Tres anuncios en una columna no pueden
  parecer la misma fotografía tres veces.

## La interfaz de cada marca es la suya

`interface-kit.tsx` dibuja la superficie oscura de cristal sobre la que se
construyen las piezas de Aents. **EstateMap no es eso**: es un producto claro
—tarjeta blanca, borde de un pelo, texto negro y un verde—, y una pieza de Geo
dibujada con el kit oscuro enseña un producto que no existe.

- La interfaz de una pieza de Geo se dibuja con `remotion/src/estatemap-ui.tsx`.
- **Sus valores se miden del producto en marcha**, con `getComputedStyle` sobre
  la página publicada, no se leen del CSS a ojo ni se ajustan a gusto. «Parecido»
  es otro producto: radio 8, borde 1 px `#D1D5DB`, sombra `0 1px 2px
  rgba(0,0,0,.05)`, badge círculo de 44, precio peso 900, título 700,
  metadatos 400, píldora 600. Todo doblado para el lienzo, nada redondeado.
- La tipografía es la del producto y con **sus pesos**. Plus Jakarta Sans en
  variable en el portal; en la fábrica, `Regular` y `ExtraBold` declaradas las
  dos. Con una sola cara, toda la interfaz sale al mismo peso y pierde la
  jerarquía que la hace legible como interfaz.

## Una propiedad en el mapa nunca está sobre la calle

Cuando una pieza pone una propiedad sobre un mapa, el pin y su recuadro caen en
**una manzana, no en una vía**. Un anuncio dibujado encima del asfalto dice que
la casa está en mitad de la calle, y quien conoce la ciudad lo lee así al
instante.

- El mapa se dibuja primero: manzanas con holgura entre ellas y las calles que
  las separan. Después se coloca la propiedad **dentro de una manzana**, con
  espacio a los cuatro lados.
- La zona que se ilumina bajo el pin es la manzana, no un rectángulo cualquiera:
  tiene que encajar con las calles que la rodean.
- El pin con el precio se ancla al borde superior de esa manzana, como en el
  mapa del producto, y nunca tapa una vía completa.
- Si no cabe con holgura, el mapa se dibuja con menos manzanas y más grandes.
  Apretar la propiedad contra una calle para que quepa es el error que esta
  regla existe para impedir.

## Los iconos son los del producto, no dibujos

EstateMap usa `lucide-react`, y la fábrica instala **el mismo paquete en la
misma versión mayor**. Un icono dibujado a mano con polígonos no es el icono del
producto y se nota: parece inventado, porque lo es.

- **Todo lo que pueda ser un icono, es un icono**, y sale de `lucide` a través de
  `EmGlyph`. Un pin, una regla, una etiqueta, un trofeo, un cursor, un visto, un
  descarte, una flecha: todos existen y todos están en el registro.
- **La excepción es lo que un icono no puede representar.** Una propiedad no es
  un glifo: una casa con su lote, su cerca y la calle delante es una escena, y
  eso se dibuja —con `property-art.tsx`—. La prueba es si un icono del set diría
  lo mismo; si lo dice, se usa el icono.
- El producto los dibuja a 16 px con trazo 1,75. En un lienzo del doble, el
  trazo se dobla con `absoluteStrokeWidth` o el icono sale escuálido al lado de
  la tipografía.

## El rótulo dice lo que la voz no dice

Un rótulo que repite palabra por palabra el subtítulo que tiene debajo gasta
dos tercios del cuadro en decir una cosa. Se escribe **después** del guion y se
compara línea por línea contra su locución; solo el CTA puede repetir. Máximo
cuatro palabras y veintidós caracteres, que ya comprueba el linter.

## Quién pone qué

- **El código pone la técnica y las normas.** Física del movimiento, profundidad,
  luz, ritmo, zonas seguras, reglas de UX/UI y las comprobaciones que verifican
  que se cumplieron. Lo que se decide una vez se decide una vez, se parametriza y
  llega a las dos marcas. Nada que pueda ser una comprobación se queda en prosa.
- **La creatividad la pones tú.** Qué se enseña, por qué se mueve, qué entiende
  quien mira, y cómo esta pieza no se parece a la anterior: guion, ángulo, puesta
  en escena y el argumento de cada escena. El kit existe para que esa energía se
  gaste ahí y no en volver a resolver una sombra.
- **Y una cosa alimenta a la otra.** Cada corrección humana termina en código
  —una primitiva nueva, un `check`, un listón que sube— y cada listón nuevo
  obliga a la siguiente pieza a ser mejor que la anterior. El mejor gancho de
  cada marca queda medido en `brands/<marca>/memory/hero-bar.json` y se convierte
  en el mínimo del siguiente.

## Contrato obligatorio

- Escribe para Ecuador, en español claro y natural. No uses jerga de marketing en la pieza final.
- **Una cifra que afirma un hecho necesita fuente fechada.** Quedan prohibidas las cantidades sobre el mercado o sobre la plataforma —inventario, demanda, porcentajes, alcance, ahorros, retorno de inversión, disponibilidad, precios de mercado, seguridad de zonas— y los testimonios. Solo entran citando su fuente en `verification_notes`.
- **Un dato de ejemplo se inventa a propósito, y es la forma correcta de enseñar un cálculo.** El precio, el área o las características de una propiedad ilustrativa no afirman nada del mercado: son el ejemplo de un anuncio, igual que la foto de una casa que no existe. Se permiten con tres condiciones: que la pieza los marque como `EJEMPLO` en pantalla, que sean verosímiles para el sujeto de la pieza —un departamento no mide 400 m²— y que la voz no los convierta en dato. «Divide el precio para los metros» es válido; «el metro cuadrado está en $303» es una afirmación de mercado y está prohibida. Antes de bloquear una pieza por una cifra, comprueba el rótulo en pantalla: un ejemplo marcado no es un hallazgo.
- No ofrezcas ni insinúes capacidades por intuición o por atractivo comercial. Antes de cada promesa inspecciona el código y su spec: solo se comunica como disponible lo que tenga implementación real y una regla `implemented` o `partial` que describa honestamente su alcance. `proposed`, experimentos, mockups e ideas se omiten de la pieza.
- Distingue entre lo que existe y lo propuesto. El video automático figura como propuesta en `specs/proposals/social-kit.yaml`; nunca lo presentes como función disponible.
- El kit social actual sí genera láminas y textos, QR/URL corta y métricas privadas de visitas por red. Verifica cualquier afirmación nueva contra `specs/` o el código.
- Nunca muestres contadores públicos de visitas, datos privados de contacto, credenciales, paneles administrativos ni información de una propiedad sin autorización.
- La ubicación y la Forma del terreno solo se describen como aparecen públicamente. No prometas exactitud topográfica.
- “Gratis”, “sin comisión” y “sin límite” solo pueden usarse mientras sigan respaldaldos por `frontend/lib/help-faqs.ts` y la página publicada correspondiente.
- Una pieza tiene un público, una idea y un CTA. No combines “buscar”, “publicar” y “contactarnos” en el mismo video.
- Usa persuasión ética: claridad, demostración y reducción de fricción. No fabriques escasez ni prueba social.

## El render se hace una sola vez, al final

Un máster cuesta media hora de máquina y no compra nada accionable: cuando
existe, los errores ya están dentro. La revisión se hace en Remotion Studio, que
toca el mismo código con las mismas props y la misma voz y responde a un archivo
guardado en un segundo.

- **`video --brand <marca> studio <id>` es donde se juzga una pieza.** Sintetiza
  la voz de borrador —gratis, local—, escribe `studio-props.json` y levanta el
  estudio en `http://localhost:3210/EstateMapVideo`. Ahí se ve el video entero,
  se salta de escena a escena y se corrige en caliente.
- **La voz final se revisa en Studio antes del render.** Cuando una persona
  autoriza el gasto, `video studio <id> --final-voice` compra o reutiliza la voz
  bloqueada, recalcula cada escena y los subtítulos con la duración real y carga
  esos props en Studio. La voz final es una sola toma continua: los cortes de
  escena nunca reinician intención, respiración ni prosodia. Después de verla completa, la persona registra esa
  versión exacta con `video approve <id> --final-voice`. `render --final` se
  niega si cambió el plan, la voz o los props desde esa aprobación.
- **`--draft` existe para depurar el renderer**, no para mirar la pieza. Si lo
  que se está arreglando es una animación, se arregla en el estudio.
- Antes de dar una escena por hecha se miran sus fotogramas —`npx remotion still
  … --frame=N`— y se comprueba que se reconozca sin leyenda, que nada tape ni
  choque con otra cosa, que ningún texto baje de 22 px y que la escena no esté
  medio vacía. El estudio enseña el movimiento; el fotograma enseña lo que
  congela la plataforma.

Esto vale igual para Claude y para Codex.

## La voz se paga una sola vez, y al final

El guion se reescribe muchas veces antes de que quede bien. Esas vueltas no cuestan nada y no deben costarlo.

- **Por defecto la voz es gratis.** `video render <id>` usa siempre Kokoro local, aunque `.env` tenga configurado ElevenLabs. Renderiza los borradores que hagan falta.
- **La voz pagada solo entra cuando una persona autoriza el gasto**, con `video studio <id> --final-voice`. Ese comando compra y prepara la revisión; no renderiza.
- **Nunca lances `--final` por iniciativa propia.** Es la única puerta al gasto: espera la orden explícita.
- Antes de gastar, `video voice-cost <id>` dice cuántos caracteres se comprarían. `studio --final-voice` lo repite y pide confirmación por terminal. Sin terminal se niega: el silencio no es un sí. Solo `--yes` autoriza por adelantado, y no lo uses sin que te lo pidan.
- Cada línea comprada queda cacheada por su texto exacto en `.cache/voice/paid/`. Volver a renderizar un guion sin cambios no cuesta nada; si editas una frase, solo se compra esa frase.
- Los perfiles de voz viven en `system/voice-profiles.json`. Cada video elige una sola voz y todas sus escenas la conservan. `--voice-profile` fuerza esa voz en la pieza completa y tiene prioridad sobre el plan.
- **La voz final rota, y la máquina lo comprueba.** Un máster no se compra con la voz de la pieza anterior. `workflow.FinalVoiceRotation` reparte los perfiles pagados que declaran su propio `voice_id` por número de video, así que se sabe de antemano qué voz le toca a cada pieza; `--voice-profile` puede elegir otra, pero repetir la voz del video anterior se rechaza antes de gastar un solo carácter. Esto estuvo escrito solo como aprendizaje y se incumplió once másters seguidos.
- Un borrador nunca acepta un perfil pagado. La primera generación final escribe `voice-lock.json`; después no se puede cambiar perfil ni ajustes en ese video: **una voz ya cobrada no se cambia nunca**, ni para corregir. Una voz distinta exige una variante o pieza nueva, y un re-render de la pieza vuelve a usar la voz bloqueada sin volver a comprarla.
- Cambiar la voz, el modelo o los ajustes de ElevenLabs invalida lo cacheado y vuelve a comprar el guion entero. No los toques sin querer hacerlo.
- El plan gratuito de ElevenLabs **no incluye licencia comercial**. Antes de publicar una pieza con voz pagada, confirma que la cuenta está en un plan que sí la incluya.

### La música nunca se paga

- Por defecto una pieza sale sin música.
- Solo se admite una pista externa gratuita para uso comercial, de autor identificable, con URL y licencia archivadas en el sidecar requerido.
- Una biblioteca futura puede clasificar pistas por energía, tempo y uso narrativo, pero cada archivo conserva su propio sidecar; pertenecer al catálogo no reemplaza la prueba de licencia.
- La fábrica no compone, compra ni genera música con créditos. Sin evidencia de licencia comercial gratuita, usa silencio.
## Estilo creativo

- Video vertical 9:16, 1080 × 1920, ritmo móvil y texto en zona segura.
- **El ritmo se mide en cosas que pasan por segundo, no en duración.** Al menos
  dos eventos visibles cada segundo, ninguna escena por encima de seis segundos,
  y más escenas antes que escenas más largas: ocho en formato corto, veinte
  en historia y cuarenta en clase. Cortar una escena en dos no interrumpe su
  animación, porque `renderer.AssetTimeline` continúa el arco entre cortes. Las
  reglas completas están en `animation-standard.md` §10 pre y §10 bis, y valen
  igual para Geo y para Aents.
- La duración se decide por la carga explicativa. En formato corto, entre 18 y 45 segundos: 18 s para una promesa y demostración simples; 20–30 s para varios pasos, mecanismo, objeciones o contexto; y 31–45 s únicamente para un tutorial específico que necesite enseñar una secuencia completa. Nunca estires una pieza con relleno ni comprimas una explicación hasta volverla ilegible.
- Por encima de 45 segundos y hasta 120 la pieza es una **historia**, y el control de calidad le cambia las reglas: hasta veinte escenas y hasta 10 segundos para plantear antes de mostrar el producto. Se reserva para un relato real que haya que sostener —el origen del producto, un caso completo—, y el brief declara la duración y el motivo. Una historia gana aire para explicar, no permiso para prometer más: sigue teniendo un público, una idea y un CTA.
- Por encima de 120 segundos y hasta 240 la pieza es una **clase**: hasta cuarenta escenas y hasta 25 segundos antes de mostrar el producto. Cuarenta es el techo técnico que permite cubrir cuatro minutos sin superar seis segundos por toma, no una invitación a crear cuarenta diapositivas. Nadie ve cuatro minutos por un arco narrativo; los ve porque está aprendiendo algo que vino a aprender, así que cada escena enseña un paso que la anterior no enseñó. La duración no la decide el guion recibido sino la materia: si el tema se explica en noventa segundos, la pieza dura noventa. Una clase no relaja ninguna otra regla —un público, una idea, un CTA, y ninguna afirmación sin fuente—, y su tope de 25 segundos existe porque una pieza que llega al producto en los últimos diez segundos enseñó gratis y no vendió nada.
- La promesa o tensión aparece en 0–2 s. La marca o el producto debe ser reconocible antes de 3 s.
- La producción es asistida por IA: Claude analiza cada guion y crea las animaciones nuevas que hagan falta en Remotion, reutilizando componentes, paleta, tipografía, profundidad y reglas de movimiento de la marca. No sustituuyas una escena necesaria por otra existente que solo se parezca.
- Antes de diseñar una animación, inspecciona los componentes reales de EstateMap relacionados. Usa como referencia su jerarquía, etiquetas, estados y comportamiento; tradúcelos al renderer aislado sin importar código del frontend ni fingir una captura.
- Toda animación nueva usa un identificador `sim:*`, se registra en Python y Remotion, y recibe una prueba. El linter bloquea cualquier animación propuesta que todavía no esté implementada.
- La portada también se diseña por video: conserva marca, tipografía, zonas seguras y CTA, pero su ilustración, datos y beneficio deben condensar el guion específico. No reutilices la portada anterior cambiando solo el título.
- Alterna el acento de las portadas por número de video dentro de la paleta de marca: verde, violeta, teal y lavanda. La variación no cambia la estructura ni reduce el contraste.
- Mantén al menos 48 px libres entre el límite inferior del título de portada y la ilustración central; ningún visual puede tocar, tapar o competir con el texto.
- En videos y portadas para TikTok, el bloque superior de logo y dominio empieza en `y=205`; este valor equilibra la separación frente al buscador con el contenido de la pieza.
- **El teléfono recorta los lados, y por eso el margen lateral no se negocia.** TikTok escala el 9:16 a la altura de la pantalla, así que un móvil más alto que 16:9 esconde columnas enteras del lienzo: 97 px por lado en 19.5:9 (iPhone X en adelante) y 108 px en 20:9. El sistema reserva `sideCrop = 120 px` en `remotion/src/theme.ts` y `safe.left` cuelga de esa constante. Nada legible empieza dentro de ese margen: ni texto, ni el dominio, ni el tile, ni el borde de una tarjeta. Los fondos y degradados sí siguen a sangre hasta 1080; están para que los corten. La regla anterior —dominio a `x=24`, tile a `84 px` del borde— es justo la que sacó de pantalla la marca en los videos 001 a 003.
- **El sombreado existe para que el texto se lea, no para tapar el producto, y ocupa como mucho el 20 % inferior.** Vale para todas las marcas del sistema —Aents y Geo Propiedades comparten `theme.ts`, `scene.tsx` y `map-field.tsx`; el perfil solo cambia logo, dominio y nombre—. El velo de escena mide 340 px y no pasa de `.58` de opacidad; el degradado del mapa se mantiene en `.18` hasta el 80 % y cierra en `.52`. Nunca llegues a negro puro: la versión anterior tapaba media pieza con 820 px hasta opacidad 1 y oscurecía justo lo que el video existe para enseñar.
- **El suelo de texto es `textFloor` y todo lo que viva abajo cuelga de él.** La reserva inferior para la interfaz de TikTok es de 340 px, así que `textFloor = 1580`. La barra de progreso se ancla a `textFloor + 12`, no a `safe.bottom`: tenerlas en dos constantes distintas hizo que al bajar el texto la barra quedara tachando la segunda línea del subtítulo.
- Las grabaciones reales son complemento cuando demuestran algo que no conviene recrear; la base aprobada son animaciones nativas, continuas y explícitamente ilustrativas, nunca diapositivas estáticas.
- Voz humana o voz en off con subtítulos quemados. Cada rótulo expresa una sola idea.
- Sintetiza cada escena como una sola toma. Las divisiones de subtítulos son visuales y nunca deben introducir cortes o pausas en la locución.
- La pieza debe entenderse sin sonido y mejorar con sonido.
- Conserva una estética humana, directa y demostrativa. No uses tono corporativo grandilocuente.

## La calidad del máster no se negocia

TikTok y Reels recomprimen todo lo que reciben, así que el máster no es lo que
ve nadie: es la fuente desde la que la plataforma comprime. Cada bit que se
pierde aquí se vuelve a perder abajo, y los gráficos planos de marca —grandes
zonas de color liso con tipografía dura encima— son justo lo que primero muestra
bandeado y ruido.

- **Se renderiza al doble y se reduce**: `--scale 2` en Remotion y remuestreo
  Lanczos a 1080 × 1920. La tipografía se redibuja a esa escala en vez de
  escalarse, que es lo único que sobrevive a la recompresión en gráficos planos.
  Cuesta unas cuatro veces el render; se paga.
- **Se entrega a bitrate fijo alto**, no a CRF: 12 Mbps con techo de 14. `crf 16`
  es visualmente transparente pero gasta poquísimos bits en color liso y deja
  estas piezas cerca de 1,2 Mbps; TikTok marca para degradar todo lo que baje de
  unos 5 Mbps y luego recomprime desde esa fuente ya delgada.
- **`color_range tv`**: con entrada en rango completo, x264 escribe la marca
  JPEG y algunos reproductores desplazan los niveles.
- Todo esto está fijado en `renderer.py` (`SUPERSAMPLE_SCALE`, `DELIVERY_FLAGS`)
  y queda registrado en `production.json`; no lo bajes para que un archivo pese
  menos.
- **El máster no se recomprime nunca para caber en un límite de subida.** Si no
  entra por la automatización, se sube a mano arrastrando el archivo. Publicar
  una copia recomprimida es degradar la pieza dos veces: una tú y otra la
  plataforma.
- **Sube desde la app del móvil y activa «Cargas en alta calidad»**, en la
  pantalla de publicar, dentro de «Más opciones». Esa casilla **no existe en
  TikTok Studio desde el navegador**: lo subido por web no pasa por esa ruta.
  Deja además «Ahorro de datos» desactivado.
- **Nunca subas 4K.** TikTok reescala en su servidor con su propio algoritmo y
  añade una degradación que no controlas. El 4K se usa como paso intermedio del
  supersampling, jamás como entrega.

## Cómo se arma el máster

El máster no se renderiza de una pasada: se arma **escena por escena**, y lo que
no cambió no se vuelve a dibujar.

- Cada toma se renderiza como su propio rango de fotogramas de la misma
  composición. Las props que recibe Remotion son siempre el plan completo, así
  que la composición sigue sabiendo cuánto dura la pieza y dónde encaja ese
  tramo: la barra de progreso, el índice de escena y una animación cuyo arco
  cruza un corte salen idénticos a un render de una sola pasada.
- Cada toma se guarda en `.cache/scenes/` bajo la huella de todo lo que podría
  cambiar sus píxeles: sus props, el resto de la pieza, su posición en la línea
  de tiempo, el archivo que la dibuja y los ajustes del codificador. Editar una
  animación de Aents no invalida las escenas de otro archivo; tocar `theme.ts`
  las invalida todas, porque no merece la pena razonar sobre lo contrario.
- **El audio no se ensambla aquí.** Sale de un único render de la composición
  entera, que es el mismo código de siempre: ni la voz ni la música pueden
  desalinearse en una costura porque nadie las está cosiendo.
- **Un máster que no cuadra no se acepta.** Antes de darlo por bueno se compara
  su duración con el plan, y `production.json` registra qué escenas se volvieron
  a dibujar y cuáles se reutilizaron. Si algo huele raro, `video render --fresh`
  lo dibuja todo otra vez.

Esto no baja la calidad: los trozos son el mismo intermedio a 2160 × 3840 que
producía la pasada única, y el remuestreo a 1080 × 1920 con bitrate fijo sigue
ocurriendo una sola vez sobre la pieza completa.

### Palancas de velocidad

- `VIDEO_RENDER_CONCURRENCY=N` — pestañas simultáneas de Remotion. El límite es
  la memoria, no los núcleos, y está medido: sobre la misma escena, 4 pestañas
  tardaron 140,0 s y 8 tardaron 138,6 s. Subirlo no acelera nada y sí provoca
  atascos, así que 4 es el número.
- `VIDEO_RENDER_GL=angle` — rasterizar con la GPU. **Medido y descartado para
  másters.** En el gancho de `aents-001` bajó de 568 s a 87 s —seis veces y
  media— pero los desenfoques grandes que sostienen la luz de la escena salen
  claramente más débiles: la GPU recorta el radio. SSIM 0,992 y PSNR 44 dB dicen
  «idéntico» y se equivocan; lo que cambia es la atmósfera sobre la que está
  construido el escenario del gancho. Sirve para un borrador que nadie va a
  publicar. Si esa velocidad hace falta de verdad, el camino es dejar de pedir
  `filter: blur` sobre capas a pantalla completa —un degradado radial más ancho
  ya es suave y no cuesta nada—, no cambiar de motor y confiar en que no se note.

## Formato de entrega

Cuando escribas un guion, devuelve siempre: objetivo, hipótesis, público, duración, tabla por tiempo (visual/voz/texto/audio), lista de tomas, CTA, caption, portada, tres ganchos alternativos, riesgos de veracidad y criterio de éxito.

## Cuando te pidan un video nuevo

1. Lee `memory/lessons.md`, el catálogo, el contexto de producto y los componentes reales de EstateMap relacionados con el tema.
2. Si la pieza se usará como anuncio pagado, usa `$ad-copy` para clasificar tráfico, conciencia, estrategia y placement antes del guion. Si conduce a una landing nueva o reescrita, usa primero `$copywriting` para fijar la promesa y el CTA de destino. Ninguna de las dos skills puede introducir hechos que no estén respaldaldos por specs, código o una fuente aprobada.
3. Elige la duración objetivo por la carga explicativa y regístrala en el brief: 18–45 s en formato corto (máximo ocho escenas, producto antes del segundo 3), 46–120 s si es una historia (veinte escenas, 10 s) y 121–240 s si es una clase (cuarenta escenas, 25 s). Ninguna escena supera seis segundos. Una audiencia y un CTA en cualquiera de los tres.
4. Decide escena por escena si una animación existente demuestra literalmente la voz. Si no, crea una nueva en Remotion, basada en los estados y componentes reales del producto, regístrala y añade una prueba.
5. Diseña una portada específica para el concepto. Mantén la firma visual y el CTA global, pero no recicles la ilustración ni los datos del video anterior.
6. Sintetiza una sola toma por escena y usa las divisiones únicamente para subtítulos.
7. Abre la pieza con `video --brand <marca> studio <id>` y revísala ahí: escena por escena, con su voz, comprobando acabado, solapamientos, zonas seguras de TikTok y fidelidad con el producto. Corrige y vuelve a mirar. **No renderices para revisar.**
8. Enseña el estudio a la persona responsable y espera su aprobación explícita sobre lo que ve ahí.
9. Solo entonces cotiza la voz con `voice-cost`, cárgala con `studio --final-voice`, revisa el timing completo y registra `approve --final-voice`. Después renderiza **una sola vez** con `render --final`. Ninguna de estas aprobaciones autoriza publicación.

## Piezas publicadas son inmutables

- Cuando una persona indique que un video ya fue publicado, congela todos sus artefactos: MP4, portada, voz, música, guion y documentos derivados.
- Nunca vuelvas a ejecutar `render` ni `cover` sobre una pieza publicada. Las mejoras globales se aplican únicamente al video en curso y a los siguientes.
- Si hace falta corregir una pieza publicada, crea una variante o un video nuevo; no sobrescribas el original.

## Publicación en TikTok después de aprobar

- `video approve` solo aprueba el plan para renderizar. No autoriza una publicación.
- Después de renderizar, exige que `video review` termine correctamente y muestra el MP4 final a la persona responsable.
- Una aprobación humana explícita del MP4 final autoriza a Claude a abrir TikTok con `agent-browser`, cargar `exports/<marca>-NNN.mp4`, usar `caption.txt` y publicar la pieza. No vuelvas a pedir la misma autorización.
- Si TikTok pide iniciar sesión, resolver un CAPTCHA o completar 2FA, deja la ventana visible y pide únicamente esa intervención. Nunca solicites ni copies credenciales en el chat ni las guardes en el repositorio.
- Antes de pulsar el control final de publicación, comprueba que la cuenta, el video y el caption sean los aprobados. No agregues texto, música, etiquetas ni ajustes que no formen parte de la pieza aprobada.
- Tras publicar, conserva la URL o el identificador que entregue TikTok para registrar resultados. Cierra siempre todas las sesiones de `agent-browser` creadas para la tarea y verifica que no quede ninguna abierta, incluso si el flujo falla o se interrumpe.
- Esta automatización pertenece a la fábrica editorial operada por Claude. No implica que el producto Geo Propiedades publique en las cuentas sociales de sus usuarios; esa frontera sigue definida por `SOC-010`.
