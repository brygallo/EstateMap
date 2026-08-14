# Video 003: Publicar tu propiedad es gratis

Estado: `planificado`

## Estrategia

- Público: propietario
- Etapa: conversión
- Objetivo: Que un propietario en Ecuador inicie el formulario de publicación en geopropiedadesecuador.com, entendiendo que publicar no cuesta y que el proceso es corto y guiado.
- Conversión: Inicio del formulario de publicación (visita a la página de publicar desde el perfil o el enlace del video), medido como sesión que llega al primer paso del formulario.
- Pilar: Publicar sin fricción
- Serie: En 15 segundos
- Concepto: La objeción del propietario no es el precio del anuncio, es no saber cuánto le van a cobrar ni cuánto trabajo le va a costar. La pieza responde las dos en orden: publicar no se paga y no hay comisión, y el camino son pasos cortos y concretos: datos, ubicación en el mapa con un punto o la Forma del terreno, precio y fotos. Termina con la ficha armada y un solo CTA.
- Promesa: Publicas tu propiedad en Geo Propiedades Ecuador siguiendo pasos cortos, sin pagar y sin comisión.
- CTA: Publica tu propiedad gratis
- Hipótesis: Si el primer segundo nombra el costo cero como pregunta directa y el resto del video muestra el formulario paso a paso en vez de adjetivos, los propietarios que ven la pieza completa iniciarán el formulario más que con un video que solo diga "publica gratis". Variable aislada frente a los videos 001 y 002: la audiencia y el CTA; se mantiene formato, firma visual y cierre de marca.
- Portada: Publicar gratis, sin comisión

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.0–2.7 s | gancho | Arranca en movimiento: la columna de pasos de publicación se dibuja de arriba abajo sobre navy y el primer paso se marca en verde. A la derecha, una etiqueta de precio del anuncio con el valor tachado y un cero grande en teal. El producto se reconoce en el primer cuadro. Rótulo en una sola fila en la banda inferior, dentro de la zona segura; marca superior con dominio y tile desde y=205. | ¿Quieres publicar tu propiedad sin pagar? | Publicar sin pagar | sim:publicar | cut |
| 2 | 2.7–6.5 s | problema | Entra la marca apartando el desorden: los papeles y trámites acumulados salen de cuadro y aparece el formulario del portal con su cabecera, el indicador de pasos y los primeros campos reales del alta, tipo de propiedad y operación. Jerarquía y etiquetas siguen las del formulario de publicación, simplificadas solo lo necesario para leerse en vertical. Cursor bajando por los campos, sin saltos. | En Geo Propiedades Ecuador llenas un formulario corto. | Formulario corto | sim:llegada | cut |
| 3 | 6.5–10.8 s | prueba | El mapa ocupa la franja superior, limpio y sin texto encima. Un toque deja caer el pin sobre una manzana y el pin se asienta con rebote corto. Después el control cambia al segundo modo y una mano traza cuatro vértices que cierran un polígono en verde translúcido, etiquetado Forma del terreno igual que en la interfaz. Movimiento continuo, sin congelar la imagen. Todo el texto en la banda inferior. | Marcas el punto en el mapa o dibujas la Forma del terreno. | Forma del terreno | sim:zona | cut |
| 4 | 10.8–14.5 s | resultado | El campo de precio se completa dígito a dígito con separador de miles y etiqueta de moneda. Debajo, miniaturas entrando en la cuadrícula y una arrastrándose a la primera posición, como el reordenamiento del cargador de imágenes. Al terminar, las piezas se acomodan y forman la ficha con foto, precio y características, en el mismo orden que la tarjeta del portal. | Agregas el precio y tus fotos, y tu ficha queda lista. | Precio y fotos | sim:ficha | cut |
| 5 | 14.5–18.0 s | cta | Tarjeta de marca común de la serie, sin cambios: tile violeta, Geo Propiedades Ecuador, el dominio geopropiedadesecuador.com, el CTA Publica tu propiedad gratis y la firma de Aents. Fondo navy con acento teal en el CTA para acompañar la portada. Un solo CTA en toda la pieza. | Publica tu propiedad gratis, sin comisión. | Publica gratis | Fondo de marca | fade |

## Voz completa

¿Quieres publicar tu propiedad sin pagar? En Geo Propiedades Ecuador llenas un formulario corto. Marcas el punto en el mapa o dibujas la Forma del terreno. Agregas el precio y tus fotos, y tu ficha queda lista. Publica tu propiedad gratis, sin comisión.

## Caption

Publicar tu propiedad en Geo Propiedades Ecuador no cuesta y no cobramos comisión. Llenas un formulario corto, marcas dónde queda con un punto en el mapa o dibujas la Forma del terreno, agregas el precio y tus fotos, y tu ficha queda publicada. Empieza en geopropiedadesecuador.com #Ecuador #BienesRaices #Quito #Guayaquil #Cuenca

## Verificación antes de publicar

- [ ] Gratis y sin comisión: respaldado por product-context.md (publicación gratuita, sin comisión y sin límite de propiedades, según frontend/lib/help-faqs.ts). Antes de renderizar hay que releer help-faqs.ts y la página de ayuda publicada; si el texto cambió, cambia la voz de la escena 5 y la portada.
- [ ] Forma del terreno: es el término exacto de interfaz. La voz dice 'dibujas la Forma del terreno' y no promete exactitud legal ni topográfica.
- [ ] Quité 'vista previa' del guion aunque el brief la pedía: no pude comprobar en add-property/page.tsx que exista ese estado. La escena 4 dice 'tu ficha queda lista', que describe el resultado de publicar y no una pantalla concreta. Si el formulario sí tiene previsualización, se repone la frase y se vuelve a renderizar el borrador.
- [ ] No se menciona el número de fotos para no depender de un límite que puede cambiar; product-context registra hasta diez fotos reordenables, así que 'tus fotos' es conservador.
- [ ] No se prometen visitas, contactos, plazos de venta, demanda, plusvalía ni publicación automática en redes. Tampoco se menciona el kit social: esta pieza tiene un solo CTA.
- [ ] Animaciones a construir antes del render final, derivadas de los componentes reales del alta (add-property/page.tsx y el mapa de dibujo): 'sim:formulario' con los pasos y campos reales; 'sim:ubicacion' con el cambio entre punto y Forma del terreno; 'sim:fotos' con la subida y el reordenamiento. Cada una se registra en Python y Remotion y recibe prueba. Mientras no estén registradas, el plan usa sim:publicar, sim:zona y sim:ficha, que son las recreaciones aprobadas más cercanas, y el video no debe darse por terminado con ellas.
- [ ] Todas las animaciones son ilustraciones dibujadas del producto. Ni la voz ni los rótulos afirman que se esté viendo una grabación de pantalla.
- [ ] El mapa es MapLibre; ninguna animación ni texto lo nombra de otra forma.
- [ ] No aparecen propiedades reales identificables, datos de contacto, contadores de visitas, paneles administrativos ni credenciales. Los precios y direcciones de la animación son de muestra.
- [ ] Voz del borrador: Kokoro local. No ejecutar 'video render --final' hasta que una persona apruebe el MP4 explícitamente.
- [ ] Portada con acento teal por corresponder al video 003 en la rotación verde, violeta, teal, lavanda. Marca superior desde y=205, dominio a x=24, tile a 84 px del borde derecho, y al menos 48 px libres entre el título y la ilustración.
