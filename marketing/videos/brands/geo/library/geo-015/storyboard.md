# Storyboard: El orden no se compra

## Escena 01 · 0.0–3.9 s · gancho

- Visual: Escenario hero nuevo sobre hero-stage.tsx, cámara única con el movimiento 'descenso lateral con empuje': arranca desplazada a la izquierda y baja mientras se acerca al plano medio; se registra en HERO_STAGINGS. Tres planos declarados: al fondo una retícula de la marca derivando en contra del empuje (push), en el medio una ventana de interface-kit.tsx con la ficha de un anuncio abierta —foto, precio con el rótulo EJEMPLO y una fila de características—, y delante un cursor real con su sombra. Estado inicial: una sola ficha abierta y ningún criterio de comparación en pantalla. Acción: el cursor toca 'volver', la ficha se pliega con anticipate() y cae a una pila desenfocada del plano trasero mientras otra sube a ocupar su sitio con land(); el gesto se repite acelerando, cuatro veces, y cada plegado suelta un pulso de luz que recorre la pila. Respuesta visible: la pila crece hasta tapar el horizonte, y dos precios EJEMPLO que quedaron a la vista se sitúan a la misma altura sin que ninguno suba por encima del otro: el ojo pierde cuál era el más barato. Prueba resuelta: la quinta ficha que sube es idéntica a la primera, el cursor se detiene sobre ella y en el lugar donde debería ir la posición queda un hueco vacío, iluminado, que el fondo empuja hacia el centro del cuadro. Densidad mínima tres eventos por segundo: apertura, plegado, apilado y pulso.
- Recurso: sim:geo-ranking-hero
- Rótulo: Uno por uno
- Voz: Abres anuncios uno por uno y sigues sin saber cuál es el más barato.
- Subtítulos: Abres anuncios uno por uno / y sigues sin saber cuál es / el más barato.
- Entrada: cut


## Escena 02 · 3.9–8.0 s · problema

- Visual: Continuidad de objeto: la pila de fichas de la escena anterior sigue en cuadro y se desliza fuera por la izquierda con glide(), dejando el fondo limpio. Estado inicial: el hueco iluminado del gancho, ahora solo. Acción: sobre él aterriza el encabezado de una página del blog dentro de un panel glass() —título 'Lo más barato en Quito' con la píldora EJEMPLO a su derecha— y debajo entran tres filas de anuncio escalonadas con stagger(), cada una con miniatura, precio EJEMPLO y su número de posición uno, dos y tres. Respuesta visible: al aterrizar, cada fila enciende su número y la primera queda con superficie lit() y un halo detrás; las otras dos bajan un punto de contraste. Prueba resuelta: la fila uno conserva el precio más bajo de las tres y el tile de la marca entra en la esquina superior con el dominio, dejando la lista completa, ordenada y legible sin que nadie la haya tocado.
- Recurso: sim:pagina-ordenada
- Rótulo: Ya no
- Voz: Ya no tienes que hacerlo.
- Subtítulos: Ya no tienes que hacerlo.
- Entrada: cut


## Escena 03 · 8.0–11.5 s · prueba

- Visual: Misma página en cuadro, cámara con empuje lento continuo. Estado inicial: el título 'Lo más barato en Quito' y sus tres filas ordenadas por precio EJEMPLO. Acción: el título se voltea sobre su eje horizontal —cambio de estado sobre un movimiento, nunca un fundido— y sale 'Los terrenos más grandes'; al terminar el giro, las mismas tres filas se reordenan físicamente: la que estaba tercera sube al primer puesto cruzando por delante con settle() y las otras dos ceden su sitio. Respuesta visible: el dato que decide cambia con el título, del precio al área en metros cuadrados, y la columna que manda queda resaltada en cada fila. Prueba resuelta: la lista termina ordenada de mayor a menor área, con la primera fila iluminada y su número uno encendido, demostrando que la misma materia prima produce dos órdenes distintos según la receta.
- Recurso: sim:recetas-ranking
- Rótulo: Los de tu ciudad
- Voz: Aquí están los terrenos más baratos y los más grandes de tu ciudad.
- Subtítulos: Aquí están los terrenos más / baratos y los más grandes / de tu ciudad.
- Entrada: cut


## Escena 04 · 11.5–15.3 s · prueba

- Visual: El arco de sim:recetas-ranking continúa sin interrupción tras el corte. La cámara retrocede y descubre, por debajo de la página, el origen: anuncios publicados que suben en fila desde el borde inferior, cada uno con su foto, su precio EJEMPLO y su área. Acción: los anuncios cruzan una banda de la receta trazada con Trace, y ahí se decide su destino: la mayoría continúa y encaja en la lista, mientras dos con valores imposibles —un precio de un dólar y un área desproporcionada— chocan contra la banda, rebotan y son apartados a un lado con una etiqueta 'descartado'; el primero lo intenta dos veces antes de quedar fuera. Respuesta visible: la lista de arriba se recompone en tiempo real cada vez que un anuncio encaja, sin dejar huecos ni prometer filas que no existan. Prueba resuelta: la página queda armada con exactamente los anuncios que pasaron, los descartados apagados a un costado, y una píldora bajo el título que dice 'según el inventario publicado' sin ninguna cifra.
- Recurso: sim:recetas-ranking
- Rótulo: Nadie las escribe
- Voz: Estas listas no las hace una persona: se arman con lo publicado ahora.
- Subtítulos: Estas listas no las hace / una persona: / se arman con lo publicado ahora.
- Entrada: cut


## Escena 05 · 15.3–19.6 s · prueba

- Visual: Zoom dirigido sobre la fila uno de la lista, que crece hasta ocupar el centro del cuadro. Estado inicial: la fila con su miniatura, su precio EJEMPLO y su número de posición. Acción: la fila se despliega hacia abajo y saca su razón en una tira propia —'el precio por metro más bajo de este listado', con las cifras del anuncio de ejemplo rotuladas EJEMPLO—; enseguida la fila dos y la fila tres hacen lo mismo escalonadas, cada una con su motivo distinto, y ninguna razón nombra visitas ni destacados. Respuesta visible: un dedo toca la fila uno, la tira se pliega y la miniatura sale de la lista viajando hacia la derecha. Prueba resuelta: cae sobre el mapa de la marca como un pin que aterriza con land(), la zona se ilumina bajo él y la ficha queda anclada a un lugar concreto, cerrando el recorrido de la posición al mapa.
- Recurso: sim:razon-posicion
- Rótulo: Y dónde queda
- Voz: Cada terreno dice por qué está en ese puesto, y lo abres en el mapa.
- Subtítulos: Cada terreno dice por qué está / en ese puesto, / y lo abres en el mapa.
- Entrada: cut


## Escena 06 · 19.6–23.7 s · resultado

- Visual: La cámara vuelve a la lista completa, ahora quieta y con las tres posiciones resueltas. Estado inicial: el orden establecido en las escenas anteriores. Acción: tres etiquetas entran desde el borde derecho intentando pegarse a la fila uno —'Destacado', 'Publicidad' y 'Lo más visto'—; cada una se acerca dos veces, empuja la fila y es rechazada: la fila no se mueve de su sitio y la etiqueta rebota, se apaga y sale del cuadro tachada. Respuesta visible: tras cada rechazo, la columna del dato que ordena la lista —el precio por metro EJEMPLO— parpadea encendida, confirmando quién decide. Prueba resuelta: las tres etiquetas quedan fuera del panel, apagadas, y el orden original permanece idéntico al del principio con la fila uno iluminada; el criterio se lee dentro de una píldora: 'ordenado por el dato'.
- Recurso: sim:sin-destacado
- Rótulo: No se compra
- Voz: El primer puesto no se compra. Ni con publicidad, ni con clics.
- Subtítulos: El primer puesto no se compra. / Ni con publicidad, / ni con clics.
- Entrada: cut


## Escena 07 · 23.7–28.5 s · cta

- Visual: Cierre de marca común de la serie, sin cambios: la lista ordenada se aleja y se funde en el fondo claro de la marca mientras el tile de Geo Propiedades Ecuador aterriza en el centro con land() y su halo detrás. Debajo, el nombre completo y el dominio geopropiedadesecuador.com se destapan con Reveal de izquierda a derecha, dentro de la zona segura y por encima de textFloor. Después entra el CTA 'Encuentra tu futuro hogar' en una sola fila, y al pie la firma 'Un producto de Aents'. La cámara conserva un empuje mínimo hasta el último fotograma y el cuadro queda resuelto y estático solo al final, con todo el bloque legible en miniatura.
- Recurso: Fondo de marca
- Rótulo: Encuentra el tuyo
- Voz: Aparece primero. Encuentra el tuyo en geopropiedadesecuador punto com.
- Subtítulos: Aparece primero. / Encuentra el tuyo / en geopropiedadesecuador punto com.
- Entrada: fade
