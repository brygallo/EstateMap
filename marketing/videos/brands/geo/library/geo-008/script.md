# Video 008: Catorce mil ya están en el mapa. La tuya no.

Estado: `planificado`

## Estrategia

- Público: propietario
- Etapa: conversión
- Objetivo: Que un propietario ecuatoriano con una casa o terreno para vender o arrendar entre a geopropiedadesecuador.com e inicie la publicación de su propiedad.
- Conversión: Inicio del formulario de publicación (paso 1 del flujo "Publicar propiedad")
- Pilar: Publicar sin fricción
- Serie: Publicar cuesta cero
- Concepto: Pieza de venta para propietarios con tráfico frío. El argumento no es el procedimiento, es la ausencia: el mapa de Geo Propiedades Ecuador ya tiene más de catorce mil propiedades en venta, y la de quien mira no está. La pieza abre en la quietud de una propiedad que nadie ve, muestra el hueco, la pone en el mapa con sus fotos, su precio y la Forma del terreno, y termina en el resultado concreto: el interesado llama o escribe directo, sin comisión de por medio. Cierra preguntando qué espera para ser la siguiente.
- Promesa: Tu propiedad puede estar en el mismo mapa donde ya hay más de catorce mil en venta, sin pagar por publicar ni comisión al cerrar, y quien se interese te escribe directo a ti.
- CTA: Publica tu propiedad gratis
- Hipótesis: En tráfico frío de propietarios, liderar con el precio cero y negar explícitamente la suscripción y la prueba gratis reduce la sospecha de costo oculto y aumenta los inicios de publicación frente a un video que explica primero el formulario.
- Portada: ¿Dónde está tu propiedad?

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.0–7.2 s | gancho | Arranca ya en movimiento: la propiedad con su letrero de SE VENDE meciéndose, el sol y las nubes cruzando despacio detrás. El letrero está ahí desde el primer cuadro y nada más ocurre alrededor: la quietud es el punto. Alterna entre terreno y casa para que se reconozcan las dos audiencias. | Tienes un terreno o una casa en venta. Pusiste el letrero, les dijiste a los conocidos, y pasan los meses. No la ve nadie. | No la ve nadie | sim:vender | cut |
| 2 | 7.2–14.0 s | problema | El mapa se llena de pines uno tras otro, en cascada, mientras la cámara se acerca. Cuando la voz dice que la tuya no está, se abre un hueco marcado con un contorno punteado y la etiqueta 'Aquí falta la tuya'. No se pinta ninguna cifra: el número lo dice la voz, con su fuente registrada. | En el mapa de Geo Propiedades Ecuador ya hay más de catorce mil propiedades en venta. La tuya no está entre ellas. | Catorce mil ya están | sim:ya-estan | cut |
| 3 | 14.0–21.3 s | prueba | La ficha viaja desde abajo hasta su lugar sobre el mapa, se dibuja el polígono de la Forma del terreno y el precio se posa encima. El movimiento es una sola toma continua, sin cortes. | Ponla ahí tú también: queda en el mapa con tus fotos, tu precio y la forma del terreno si la dibujas, donde la gente busca. | Ponla en el mapa | sim:anuncio-en-mapa | cut |
| 4 | 21.3–28.7 s | resultado | El teléfono del anunciante: primero la llamada entrante vibrando, después el mensaje del interesado llegando al chat. Nada de intermediarios en pantalla: la conversación es entre dos personas. | Y cuando a alguien le guste, te llama o te escribe directo a ti. Sin intermediarios y sin comisión: lo que acuerdes es tuyo. | Te escriben a ti | sim:te-contactan | cut |
| 5 | 28.7–38.2 s | cta | Cierre de marca común de la serie: tile, Geo Propiedades Ecuador, dominio geopropiedadesecuador.com, el CTA 'Publica tu propiedad gratis' y la firma de Aents. | Publicarla no te cuesta un centavo. ¿Qué esperas para que la tuya sea la siguiente en el mapa? Publica tu propiedad gratis en geo propiedades ecuador punto com. | Que sea la siguiente | Fondo de marca | fade |

## Voz completa

Tienes un terreno o una casa en venta. Pusiste el letrero, les dijiste a los conocidos, y pasan los meses. No la ve nadie. En el mapa de Geo Propiedades Ecuador ya hay más de catorce mil propiedades en venta. La tuya no está entre ellas. Ponla ahí tú también: queda en el mapa con tus fotos, tu precio y la forma del terreno si la dibujas, donde la gente busca. Y cuando a alguien le guste, te llama o te escribe directo a ti. Sin intermediarios y sin comisión: lo que acuerdes es tuyo. Publicarla no te cuesta un centavo. ¿Qué esperas para que la tuya sea la siguiente en el mapa? Publica tu propiedad gratis en geo propiedades ecuador punto com.

## Caption

Tienes un terreno o una casa en venta y no la ve nadie. En el mapa de Geo Propiedades Ecuador ya hay más de catorce mil propiedades en venta; la tuya todavía no está entre ellas. Ponerla ahí no te cuesta un centavo y no cobramos comisión cuando cierres: queda en el mapa con tus fotos, tu precio y la Forma del terreno si la dibujas, y quien se interese te llama o te escribe directo a ti, sin intermediarios. ¿Qué esperas para que la tuya sea la siguiente? geopropiedadesecuador.com #ecuador #bienesraices #vendermicasa #terrenosecuador #arriendo

## Verificación antes de publicar

- [ ] La cifra hablada, «más de catorce mil propiedades en venta», procede de la propia página pública geopropiedadesecuador.com/estadisticas-inmobiliarias, leída el 2026-08-14, que publica 14.950 propiedades en venta activas. Se dice como piso, no como cantidad exacta. Es inventario del catálogo, que incluye anuncios importados: por eso la pieza NO dice que sean miles de personas las que publicaron, ni que hayan vendido.
- [ ] Si ese conteo público bajara de catorce mil, la afirmación deja de ser cierta y la pieza se retira; conviene revisarlo antes de cualquier republicación.
- [ ] Publicar gratis y sin comisión por ventas ni arriendos: frontend/lib/help-faqs.ts. Verificar que esas FAQ sigan publicadas antes de comprar la voz final.
- [ ] Contacto directo por teléfono o WhatsApp con el anunciante, sin intermediarios: frontend/lib/help-faqs.ts y el bloque de contacto de la ficha pública.
- [ ] La Forma del terreno va siempre condicionada a que quien publica la dibuje, y nunca se promete exactitud topográfica ni legal.
- [ ] No se promete que la propiedad se venda, ni en qué plazo. 'Que sea la siguiente' se refiere a estar en el mapa, que es lo que la pieza demuestra, y así se enuncia en la voz.
- [ ] 'Lo que acuerdes con esa persona queda completo para ti' se refiere únicamente a la ausencia de comisión de la plataforma; no promete precio ni resultado.
- [ ] Ninguna animación pinta cifras: el número vive en la locución, donde queda registrada su fuente.
- [ ] Se retiran de la pieza el borrador guardado y el 'sin límite de propiedades' por decisión del usuario del 2026-08-14, aunque ambos sigan siendo ciertos según las FAQ.
- [ ] CTA único de propietario. No aparece lenguaje de comprador ni de agente.
- [ ] Acento de portada por número de video: 008 corresponde a lavanda #A78BFA.
- [ ] Voz de borrador con Kokoro local. No usar --final sin orden humana explícita.
