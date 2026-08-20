# Estándar global de animación

Este documento es el contrato de dirección de movimiento para todas las
animaciones de la fábrica. Aplica a composiciones nuevas, variantes, portadas
animadas, recreaciones del producto, mapas, diagramas y cierres. No prescribe
una plantilla: fija el nivel de acabado y las decisiones que deben sostenerse
para que cada pieza se sienta parte de la misma serie.

La meta no es animar muchos elementos. La meta es convertir una idea en una
secuencia visual clara, memorable y precisa. Se permite toda la complejidad de
código necesaria para lograr profundidad, continuidad y detalle; no se acepta
complejidad que solo esconda una composición débil.

## 0. La escena 1 no es una escena más

Todas las demás reglas de este documento se aplican por igual a cualquier toma.
Esta se aplica solo a la primera, y por encima de las demás.

La razón no es estética. La escena 1 es la única que ve todo el mundo: es el
fotograma en el que la plataforma congela la pieza en el feed, y es lo que
decide si existe una escena 2. Y en una empresa que vende la construcción de
software, esa toma no es la introducción del argumento: **es la muestra del
trabajo**. Alguien que evalúa a un proveedor lee el acabado antes que la
promesa, y con razón —el nivel de detalle que se permite una empresa en lo suyo
es el que va a tener con lo del cliente—. Una apertura que parece una
diapositiva ya respondió la pregunta que la pieza venía a hacer, y ningún guion
la recupera.

De ahí que sea una regla y no un consejo, y que la sostengan tres cosas
distintas: un kit obligatorio, un registro que impide repetirse y una medición
que tumba el máster.

### Qué tiene que tener

Cuatro cosas a la vez, no una elegida entre cuatro:

1. **Profundidad cinematográfica.** Una sola cámara para toda la toma y planos
   declarados: cada grupo dice a qué distancia vive y de ahí salen su escala, su
   desenfoque y cuánto se desplaza. Luz con fuente identificable, suelo que la
   recoge y aire con algo dentro. Lo plano es lo que se ve barato y es lo primero
   que la recompresión de la plataforma convierte en bandas.
2. **Coreografía densa.** Al menos tres eventos por segundo, encadenados por
   causa y efecto. Nada entra para quedarse quieto.
3. **Producto real, no símbolos.** Si aparece una interfaz, es una interfaz: un
   solo destino activo, estados con forma y palabra además de color, objetivos
   táctiles de tamaño real, escala de espaciado y de tipografía. Tres rectángulos
   grises representando «el sistema» son exactamente lo que no hay que enseñar.
4. **Un golpe visual que se recuerde.** Uno, y cae en el fotograma en que la idea
   se da la vuelta, nunca en una entrada. Cuesta código y tiempo; se paga.

### Cómo se sostiene

- **Se construye sobre `remotion/src/hero-stage.tsx`.** Ahí viven la cámara, los
  planos de profundidad, el suelo, la luz, el impacto y la cadencia. La interfaz
  sale de `remotion/src/interface-kit.tsx`, que trae las normas de UX/UI dentro:
  espaciado, jerarquía, estados, tamaño mínimo de un control, tipografía. Lo que
  se puede decidir una vez está decidido una vez.
- **Se registra en `renderer.HERO_STAGINGS`** con el movimiento de cámara que
  usa. `quality.check_hero_scene` rechaza el plan cuya escena 1 nombre cualquier
  otra cosa.
- **No hay dos iguales.** Un kit compartido sube el suelo y, si nadie mira, aplana
  todas las piezas al mismo plano. Por eso la puesta en escena es parte de lo que
  el gancho declara, queda guardada en el catálogo, y dos aperturas seguidas con
  el mismo movimiento se rechazan antes de renderizar. `HERO_MOVES` tiene cuatro;
  cuando ninguno sirva, se añade el quinto.
- **Se mide sobre el máster, no sobre el código.** `review_tools.HeroSceneAudit`
  cuenta cuántas veces empieza algo y cuánto tiempo la toma repite la misma
  imagen: mínimo tres eventos por segundo, máximo un 12 % de imagen repetida. Si
  no llega, el máster no pasa la revisión. El gancho anterior de `aents-001` daba
  0,5 eventos por segundo y repetía el 89 % de su duración, y nadie lo vio hasta
  que se midió.
- **El listón sube solo.** El mejor gancho que ha publicado una marca queda en su
  memoria (`brands/<marca>/memory/hero-bar.json`) y el siguiente tiene que
  igualarlo menos un margen. La regla se alimenta del trabajo, no de que alguien
  se acuerde de subirla.

### Qué pone cada uno

El código pone la técnica: la física, la profundidad, la luz, el ritmo, las
normas de interfaz y la comprobación de que se cumplieron. Lo que no puede poner
—porque no lo sabe— es qué se está enseñando, por qué se mueve y qué debe
entender quien mira. Eso es lo creativo, y ahí entra quien escribe: a definir, a
variar, a cambiar la puesta en escena para que la número doce no sea la número
uno con otro texto. El kit existe para que esa energía se gaste en el argumento
y no en volver a resolver una sombra.

## 1. Definición de una animación terminada

Una animación está terminada únicamente cuando cumple todo lo siguiente:

1. **Demuestra una sola idea.** Puede contener varios pasos, pero todos conducen
   al mismo cambio, comparación o conclusión.
2. **Tiene arco completo.** Se entiende el estado inicial, la transformación y
   el estado final. No termina durante un movimiento ni depende de la voz para
   explicar qué cambió.
3. **Tiene jerarquía.** En cada instante existe un foco principal inequívoco, un
   apoyo secundario y fondo. Dos elementos nunca compiten por atención.
4. **Tiene causalidad.** Cada aparición responde a una acción visible: un toque
   abre, un filtro reduce, un anuncio viaja, una selección destaca. Nada aparece
   porque sí.
5. **Tiene acabado.** Incluye estados de entrada, activos, de salida y reposo;
   no deja placeholders, geometría accidental, texto provisional, saltos,
   recortes, movimientos a medio resolver ni elementos muertos.
6. **Es legible en móvil.** La idea central se reconoce a tamaño de teléfono,
   fuera de las zonas de interfaz y sin pausar el video.
7. **Es determinista.** El mismo plan y las mismas props producen los mismos
   fotogramas. No usa tiempo real, aleatoriedad sin semilla ni datos vivos.

Un storyboard, wireframe, animatic, prueba de partículas o bloque que solo entra
y sale es material de exploración. No se registra como `sim:*` listo para usar.

## 2. Jerarquía visual por fotograma

- Diseñar primero la silueta y las masas grandes; después componentes; al final,
  brillo, textura y microdetalle. Si la escena no funciona sin adornos, todavía
  no funciona.
- Reservar el mayor contraste de escala, color, nitidez o movimiento para el
  sujeto principal. El acento de marca no se reparte por toda la escena.
- Mantener como máximo un evento dominante a la vez. Los eventos secundarios
  pueden anticipar o responder, nunca robar el mismo golpe visual.
- El fondo construye contexto y profundidad, pero se mueve más lento, tiene
  menos contraste y menor densidad que el sujeto.
- Cada objeto importante conserva margen para respirar. No se llenan huecos por
  miedo al espacio vacío.
- Los detalles pequeños deben sobrevivir al recorte lateral real y a una vista
  del video al 25 %. Si no se leen en esas condiciones, se simplifican o eliminan.
- Texto, producto y subtítulos tienen territorios distintos. Una animación no
  coloca información crítica debajo de rótulos, subtítulos ni controles de red.

## 3. Gramática de movimiento

### Movimiento con intención

Todo movimiento cumple al menos una función: orientar, revelar, conectar,
comparar, confirmar, jerarquizar o cerrar. Si al quitarlo no cambia lo que se
entiende ni dónde se mira, se elimina.

- La dirección tiene significado y se conserva: avance normalmente va hacia
  arriba o la derecha; regreso, hacia abajo o la izquierda; profundidad, por
  escala y paralaje. No invertir esa lógica dentro del mismo arco.
- La distancia recorrida corresponde a la importancia. Una microconfirmación no
  cruza todo el lienzo; un cambio de contexto sí puede hacerlo.
- La velocidad comunica peso. Paneles grandes aceleran y frenan con más masa;
  chips, cursores y pines responden con mayor agilidad.
- La anticipación se usa solo cuando ayuda a leer una acción importante. El
  *overshoot* es corto, controlado y propio de objetos elásticos o interfaces;
  nunca hace rebotar texto, pantallas o mapas sin motivo.
- Las entradas preparan la lectura y las salidas liberan el foco siguiente. No
  se anima una salida si un corte comunica mejor el cambio.

### Curvas y resortes

- Para desplazamientos de interfaz y cámara, usar como base una curva suave de
  salida equivalente a `cubic-bezier(0.22, 1, 0.36, 1)`.
- Reservar `spring` para acciones con energía física: aparición de un pin,
  selección, toque o confirmación. Configurar amortiguación suficiente para que
  exista como máximo un sobrepaso perceptible.
- No usar interpolación lineal en movimientos orgánicos o de interfaz. Puede
  usarse en progreso continuo, rotación mecánica o desplazamiento de fondo.
- Todo `interpolate` define `extrapolateLeft` y `extrapolateRight` como `clamp`,
  salvo que exista una razón visual documentada para extrapolar.
- No encadenar resortes sin desfase ni lanzar diez elementos simultáneamente.
  Una secuencia usa *stagger* deliberado y termina antes del siguiente evento.

### Ritmo

- Pensar en golpes visuales, no en segundos vacíos: preparación, acción,
  respuesta y reposo breve.
- Un gesto principal suele necesitar entre 8 y 18 fotogramas; un cambio de
  cámara o estructura, entre 15 y 30. Son puntos de partida, no duraciones
  obligatorias.
- Cada acción importante conserva al menos 6 fotogramas de estado resuelto para
  que el ojo confirme el resultado. El último resultado permanece más tiempo
  cuando contiene la prueba de la escena.
- El *stagger* entre elementos relacionados suele estar entre 2 y 5 fotogramas.
  Si la secuencia tarda tanto que el primero desaparece antes de llegar el
  último, se agrupa o simplifica.
- La animación se calcula desde `frame`, `fps` y la duración real recibida. Sus
  hitos se expresan como proporciones o segmentos del arco, para que no queden
  truncados cuando cambia la locución.

## 4. Composición temporal

Cada composición define por escrito, antes de programarla:

- **Estado inicial:** qué ve la persona en el primer fotograma útil.
- **Pregunta visual:** qué cambio espera o qué tensión necesita resolver.
- **Acción principal:** el gesto que produce el cambio.
- **Respuesta:** qué elementos reaccionan y en qué orden.
- **Prueba:** el estado que demuestra la frase del guion.
- **Salida:** cómo entrega el foco a la escena siguiente.

La secuencia usa tres capas temporales:

1. **Macro:** el arco completo de la idea.
2. **Meso:** dos a cuatro beats que construyen el arco.
3. **Micro:** feedback de toque, enfoque, brillo, sombra, números o iconos.

El microdetalle nunca altera el orden del macro. Si hay que mirar tres veces
para descubrir cuál fue la acción principal, la coreografía debe rehacerse.

## 5. Cámara, profundidad y espacio

- La cámara sigue al sujeto; no hace zoom por energía decorativa. Antes de mover
  la cámara se define el objetivo, el encuadre final y el contenido que debe
  permanecer visible durante el trayecto.
- Un zoom revela nueva información o cambia de escala conceptual. Acercarse a
  lo mismo sin obtener detalle es ruido.
- Usar un sistema consistente de profundidad: fondo, contexto, sujeto y
  foreground. El paralaje disminuye con la distancia y nunca desplaza texto.
- Escala y desenfoque pueden separar planos, pero el sujeto termina nítido. No
  cubrir una interfaz con halos, *glows* o blur que impidan leerla.
- Los elementos que comparten el mismo plano comparten perspectiva, sombra y
  velocidad. Evitar mezclar tarjetas 2D, objetos inclinados y mapas planos sin
  una transición espacial que lo justifique.
- Los fondos y manchas de color llegan a sangre; los objetos legibles respetan
  `sideCrop`, `safe`, `textFloor` y las demás constantes de `theme.ts`.

## 6. Producto e interfaces

Una interfaz dibujada a ojo se nota, y se nota antes que el argumento. Quien
mira estas piezas construye productos: lee el espaciado, la alineación, los
estados y el tamaño de los controles sin proponérselo, y de ahí deduce cómo
trabaja quien firma el video. Por eso las normas de interfaz no son consejo:
están en `remotion/src/interface-kit.tsx` —escala de espaciado de 8, escala
tipográfica con suelo de 22 px, elevación única, un solo destino activo en una
navegación, estados que nunca se distinguen solo por color, y un objetivo táctil
que ningún dedo real fallaría—. Una composición pide una ventana, un riel o una
fila en un estado; no vuelve a inventar el rectángulo.

- Una recreación conserva la verdad funcional del producto: jerarquía,
  etiquetas, orden de acciones, estados relevantes y resultado. Se puede
  simplificar densidad, nunca inventar una capacidad.
- Mostrar una interacción completa. Si se toca un filtro, se ve el control
  cambiar, el contenido responder y el estado final quedar seleccionado.
- Cursor, dedo o indicador de toque aparecen antes de la acción, contactan el
  objetivo exacto y desaparecen después del feedback. No flotan sin destino.
- Los componentes comparten radios, bordes, sombras, espaciado y tipografía. Una
  misma interfaz no cambia de sistema visual entre escenas.
- Los datos de ejemplo se distinguen de métricas del producto. No pintar
  inventario, demanda, ahorro, resultados o actividad sin una fuente aprobada.
- Un dato de ejemplo sí se inventa: precio, área y características de una
  propiedad ilustrativa son la forma correcta de enseñar un cálculo. La
  composición lo declara con el rótulo `EJEMPLO` visible mientras la cifra esté
  en pantalla, y las magnitudes son verosímiles para el sujeto de la pieza. Un
  ejemplo marcado no es un defecto; una magnitud imposible sí lo es.
- Una ilustración no se describe como captura real. Una captura real no se
  redibuja hasta cambiar lo que demuestra.
- Las etiquetas esenciales usan las palabras reales del producto. En esta serie
  se dice «Forma del terreno» y no se muestran contadores de visitas en público.

## 7. Texto, números e iconografía

- El rótulo dice una idea y la animación la demuestra; no duplican palabra por
  palabra toda la locución.
- No animar letras individualmente salvo que la palabra misma sea el concepto.
  La legibilidad gana sobre el espectáculo tipográfico.
- Un número que cambia usa cifras tabulares o un ancho estable para evitar que
  el resto de la composición tiemble.
- Los iconos pertenecen a una sola familia, con grosor óptico consistente. No se
  mezclan emoji, pictogramas rellenos e iconos lineales.
- Flechas y líneas nacen desde su origen y llegan a un destino concreto; no son
  decoración. Sus puntas, grosor y velocidad permanecen consistentes.
- El texto importante entra como unidad o por grupos semánticos. Nunca aparece
  carácter por carácter mientras la voz continúa con otra idea.
- **Un texto no sale de la caja a la que pertenece.** Un rótulo dentro de una
  tarjeta, píldora, panel o marcador se queda dentro de sus bordes, y lo mismo
  vale para el lienzo: nada se imprime encima del borde de su contenedor. La
  única excepción es la salida deliberada que forma parte de la animación —un
  elemento que entra o abandona el cuadro, una palabra que rebasa a propósito
  para mostrar que no cabe— y entonces se ve como intención, no como accidente.
- El tamaño de un texto contenido se mide, no se estima. Se ajusta con `fit()`
  de `layout.ts` contra el ancho interior real del contenedor —su ancho menos el
  padding—, nunca con un tamaño fijo ni con un condicional sobre la longitud de
  la cadena: el primero se rompe con la primera palabra larga y el segundo
  acierta por casualidad. `AUTOMATIZACIÓN` en `sim:aents-idea` se imprimió sobre
  los dos bordes de su tarjeta por confiar en `title.length > 10 ? 22 : 29`.

## 8. Color, luz, textura y efectos

- La paleta base y los acentos viven en `theme.ts`. Una composición elige un
  acento dominante; los demás solo distinguen categorías cuando el significado
  lo exige.
- El color responde al estado: neutro para contexto, acento para acción, verde
  para confirmación cuando corresponda y contraste de alerta solo para riesgo o
  error real.
- Sombras y luces declaran una fuente coherente. Un objeto no cambia de sombra
  al moverse salvo que cambie de plano.
- Partículas, destellos, ruido, grano, brillos y gradientes se admiten cuando
  explican energía, profundidad o celebración. Se limitan en cantidad, zona y
  duración; nunca cubren texto ni producto.
- Los efectos se construyen como sistemas reutilizables y parametrizados. No se
  copian veinte valores mágicos para producir variaciones casi iguales.
- Evitar el aspecto de plantilla: tarjetas entrando desde cada borde, rebote en
  todo, gradiente gratuito, confeti constante y transiciones distintas en cada
  corte.

## 9. Transiciones y continuidad

- El corte es la transición por defecto. Se cambia por continuidad de objeto,
  movimiento, forma, color o cámara, no por variedad.
- Una transición pertenece a las dos escenas: el final de la anterior prepara
  el primer estado de la siguiente. No se añade una capa independiente que solo
  las tapa.
- Conservar dirección, posición o forma de un objeto compartido crea continuidad
  mejor que un barrido. Usar *match cuts* cuando la relación ayude a entender.
- `fade` se reserva para pausa, cambio de tiempo o cierre; no une pasos de una
  misma interacción.
- No usar *whip*, glitch, zoom agresivo o flash salvo que el concepto lo pida y
  la revisión de accesibilidad lo permita.

## 10. Arquitectura de implementación

- Cada `sim:*` expone una composición responsable de su arco y recibe como
  mínimo `frame`, `total` y `accent`. No lee estado global ni conoce la escena
  anterior.
- Separar datos, geometría, componentes visuales y coreografía. Los componentes
  reutilizables no contienen tiempos absolutos propios cuando el padre necesita
  coordinarlos.
- Nombrar los hitos por significado (`filterApplied`, `cardSettled`), no por su
  número (`phase2`, `time3`). Agrupar constantes visuales y evitar números
  mágicos repartidos por JSX.
- La geometría repetida se genera de forma determinista. Las listas tienen claves
  estables y los cálculos costosos no se duplican por elemento y fotograma.
- No usar CSS animations, `setTimeout`, fecha actual, red, audio como reloj ni
  efectos que progresen fuera de `frame`. Remotion controla el tiempo completo.
- No ocultar errores con `overflow: hidden` global. Cada recorte responde a una
  máscara o viewport intencional.
- Una composición nueva se registra en `planner.py`, `renderer.py` y el registro
  de Remotion, y añade o actualiza las pruebas de paridad. No existe mientras
  uno de esos contratos falte.
- El código puede ser extenso cuando modela una animación rica. Aun así, debe
  dividirse por conceptos visuales, reutilizar primitivas y permitir ajustar la
  coreografía sin reescribir la ilustración.

## 10 pre. Densidad: cuántas cosas pasan por segundo

La causa número uno de que una pieza se sienta lenta no es su duración: es que
pasan pocas cosas. Una escena correcta, bien compuesta y con un solo sujeto
puede seguir siendo aburrida si el espectador ya vio todo lo que iba a pasar en
el primer segundo y le quedan cuatro.

- **Al menos dos eventos visibles por segundo.** Un evento es algo que empieza:
  una llegada, una confirmación, una línea que se traza, una cifra que cambia,
  una pieza que sale de su sitio, una luz que cruza. El empuje de cámara no
  cuenta —es el suelo, no un evento.
- **Ninguna escena pasa de seis segundos.** Por encima de eso son dos escenas.
  El linter lo avisa (`scene_pace`), y cortar no rompe nada: una animación
  continúa su arco entre escenas porque `renderer.AssetTimeline` la reanuda
  donde iba. Se corta donde la voz cambia de idea.
- **Más escenas antes que escenas más largas.** Los topes son ocho en formato
  corto, dieciséis en historia y veinticuatro en clase. Un guion de 48 segundos
  se cuenta mejor en catorce tomas que en nueve.
- **El escalonado de un grupo es corto.** `stagger()` usa 0,045 por defecto:
  cuatro tarjetas entran en medio segundo, no en tres. Cuatro tarjetas repartidas
  por toda la escena son una lista; en medio segundo son un golpe.
- **Las entradas duran poco.** Una llegada es un evento, no un viaje: en torno a
  `ARRIVAL` (una décima del arco). Lo que tarda en llegar se lo quita al
  siguiente evento.
- **Los huecos se rellenan con micro-eventos.** `metronome()` da una cadencia
  independiente de la coreografía principal: un pulso que baja por la línea, un
  destello al confirmar, una pieza que sale de la pila. Ahí es donde se gana la
  sensación de «pasa esto, y esto, y esto».
- **El arco principal cierra antes del 70 % de la escena.** El resto es aire
  para leer y para que el remate respire, no tiempo muerto que llenar.

## 10 bis. El vocabulario de movimiento (`system-kit.tsx`)

Estas son las reglas del sistema con el que se construyó el arco «Del problema
al software» de Aents, y son obligatorias para toda composición nueva de
cualquiera de las dos marcas. No describen un estilo: describen por qué una
composición se lee como producto terminado y no como una presentación.

- **Nada aparece: todo aterriza.** Una entrada usa `land()`, que sobrepasa su
  marca un 4 % y vuelve. El exceso es pequeño a propósito; una tarjeta que
  rebota como un juguete se lee como plantilla.
- **Nada viaja a velocidad constante.** Lo que se desplaza usa `glide()` —
  acelera y frena— o `settle()` cuando algo se lanza y se posa. `interpolate`
  lineal se reserva para barridos de luz y progresos mecánicos.
- **El sujeto puede tomar impulso.** `anticipate()` retrocede antes de salir. Se
  usa en el sujeto de la escena, nunca en los elementos de apoyo.
- **Un grupo entra escalonado.** `stagger(index)` da a cada miembro su propio
  tiempo. Cuatro tarjetas que entran en el mismo fotograma son una diapositiva.
- **El sujeto va delante de su propia luz.** `Halo` detrás del foco. Lo plano es
  lo que se ve barato, y es la señal de profundidad más barata que sobrevive a
  la recompresión de la plataforma.
- **Una superficie tiene borde iluminado y sombra propia.** `glass()` para lo
  neutro y `lit()` para lo que está siendo elegido. Un rectángulo con color de
  fondo es un div; con luz arriba y sombra abajo es una tarjeta.
- **El texto se destapa, no se funde.** `Reveal` recorta con máscara. Un fundido
  no tiene dirección ni mano detrás: parece un marcador de posición.
- **Un conector viaja con cabeza.** `Trace` dibuja la línea con un punto que
  avanza. Una línea que solo crece es una barra de progreso; con cabeza es una
  señal yendo a un sitio, que es el sujeto de media biblioteca.
- **Toda escena lleva empuje continuo.** `Panel` y `Field` reciben `push={p}`:
  un movimiento lento, de una sola dirección, durante toda la toma, con la
  retícula del fondo derivando en contra. Sin él, la revisión marca la escena
  como quieta y tiene razón.
- **La profundidad se declara por plano.** Cada grupo tiene su distancia, y de
  ella salen su escala, su desenfoque y cuánto se desplaza en el parallax. Todos
  los elementos a la misma distancia es lo que hace que una composición parezca
  un formulario.
- **Un cambio de estado ocurre sobre un movimiento.** El objeto gira, se voltea o
  cruza; no se funde con su siguiente versión. Un fundido entre dos estados
  esconde justo lo que la escena existe para enseñar.
- **El fracaso se ve fracasar.** Si algo no encaja, no conecta o se repite, tiene
  que intentarlo y fallar en pantalla —al menos dos veces— antes de que llegue
  la solución. Un acierto sin intento previo no se lee como respuesta.
- **Nada se toca por accidente.** Dos elementos que comparten borde o se solapan
  sin que la composición lo pida son un defecto, no una casualidad: el máster de
  las 11:34 del aents-001 dejó la tarjeta SOFTWARE pegada al isotipo y la órbita
  invadiendo su propio centro.
- **La geometría que puede chocar se declara como datos, y se comprueba.** Las
  cuatro opciones de `sim:aents-soluciones` vivían sobre una elipse que giraba, y
  a los tamaños que tenían cada una invadía la tarjeta central 28 × 11 px: el
  solape aparecía y desaparecía con el giro, y nadie lo vio hasta que una persona
  lo señaló en pantalla. Ahora las posiciones son constantes (`CHOICE`, `NEED`,
  `SOLUTIONS`) y una prueba recorre los rectángulos y falla si dos se acercan a
  menos de la separación mínima. Una posición calculada al vuelo no se puede
  comprobar; una declarada, sí.
- **Los elementos que compiten por la misma decisión tienen el mismo tamaño.** Si
  cuatro opciones y la necesidad que las elige están en el mismo cuadro, son
  cinco tarjetas iguales. Una más pequeña, o una que crece un 4 % al ser elegida,
  no se lee como jerarquía: se lee como descuido. Lo elegido se señala con luz,
  con color o con posición, nunca con tamaño.
- **Una afirmación sobre N pasos enseña N cosas distintas.** «Estrategia, diseño,
  desarrollo y lanzamiento» sobre el mismo rectángulo gris con la opacidad movida
  no son cuatro etapas, son un cuadro que parpadea; así estaba
  `sim:aents-etapas`, y quien lo vio dijo exactamente eso: «solo salen cuadros
  random». Cada paso dibuja lo que sale de él —el flujo trazado, el wireframe, el
  producto construido, el producto en uso— o la escena no está afirmando nada.

## 11. Rendimiento y robustez

- Diseñar para 1080 × 1920 a 30 fps y revisar los fotogramas más densos. Una
  escena detallada no justifica un render inestable o memoria descontrolada.
- Preferir transformaciones y opacidad para movimiento frecuente; reservar
  filtros costosos, máscaras complejas y blur grande para momentos acotados.
- Evitar miles de nodos DOM o SVG cuando una forma, patrón o capa rasterizada
  aprobada comunica lo mismo.
- Ningún valor llega a `NaN`, infinito, escala negativa accidental ni opacidad
  fuera de rango. Proteger duraciones cero y props opcionales.
- Probar al menos duración mínima, nominal y larga. En todas, el arco llega a su
  prueba y deja un estado final legible.

## 12. Accesibilidad y confort

- Mantener contraste suficiente y no depender solo de color para comunicar un
  cambio; sumar forma, posición, etiqueta o icono.
- Evitar más de tres destellos intensos por segundo, alternancia de pantalla
  completa y patrones que vibren. Cualquier flash es breve, localizado y
  prescindible para entender.
- No mover continuamente el fondo detrás de texto que debe leerse. Durante la
  lectura, el sujeto puede respirar con micro movimiento, pero no competir.
- Una persona debe entender el cambio sin audio. La voz añade contexto; no
  repara una animación ambigua.

## 13. Revisión obligatoria

Revisar cada animación nueva como secuencia, no solo como fotograma bonito:

### Contenido

- [ ] La acción demuestra literalmente la afirmación aprobada.
- [ ] No inventa funciones, datos, cifras, resultados ni prueba social.
- [ ] El estado final se entiende sin locución.

### Dirección visual

- [ ] Existe un foco dominante en cada beat.
- [ ] El arco tiene inicio, transformación, prueba y salida.
- [ ] La cámara y cada efecto cumplen una función narrativa.
- [ ] El nivel de detalle se sostiene en primer plano y en móvil.
- [ ] No parece una plantilla ni una presentación de diapositivas.

### Movimiento

- [ ] No hay saltos, temblores, clipping accidental ni interpolaciones fuera de rango.
- [ ] Las acciones tienen anticipación, respuesta y reposo suficientes.
- [ ] La animación completa su arco con las duraciones mínima, nominal y larga.
- [ ] La transición entrega correctamente el foco a la escena siguiente.

### Legibilidad y seguridad

- [ ] Texto y objetos clave respetan las zonas seguras y el recorte lateral.
- [ ] Funciona sin audio, a tamaño móvil y sin detener el video.
- [ ] Color, destellos y movimiento no generan una barrera de accesibilidad.
- [ ] No hay datos privados, marcas ajenas ni recursos sin permiso.

### Implementación

- [ ] El render es determinista y dirigido por `frame`.
- [ ] Los registros Python y Remotion coinciden.
- [ ] Las pruebas relevantes pasan y los fotogramas críticos fueron inspeccionados.
- [ ] No queda texto provisional, placeholder ni código de exploración activo.

Si falla un punto de contenido, legibilidad o implementación, la animación no se
aprueba. Los desacuerdos puramente estéticos se resuelven contra la jerarquía, la
firma visual y la claridad de la demostración, no agregando más efectos.
