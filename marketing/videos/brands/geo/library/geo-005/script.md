# Video 005: Tres cosas que revisar antes de contactar

Estado: `planificado`

## Estrategia

- Público: comprador
- Etapa: consideración
- Objetivo: Enseñar a compradores e inquilinos a leer una ficha pública completa (fotos y características, precio frente a área, ubicación en el mapa) para que abran el mapa de Geo Propiedades Ecuador con criterio propio y guarden la pieza como referencia.
- Conversión: Clic al sitio desde el perfil o guardado de la pieza; secundariamente, apertura de una ficha desde el mapa.
- Pilar: Educación inmobiliaria
- Serie: Antes de contactar
- Concepto: Un mini tutorial de tres comprobaciones que cualquiera puede hacer sin escribirle a nadie: recorrer las fotos y lo declarado, relacionar el precio total con el área para obtener el metro cuadrado, y abrir la ubicación en el mapa junto con la Forma del terreno cuando la ficha la muestre. La pieza no juzga si una propiedad conviene: entrega el método y devuelve la decisión a quien busca.
- Promesa: Con tres comprobaciones en la misma ficha llegas a la conversación sabiendo qué estás mirando.
- CTA: Encuentra tu futuro hogar
- Hipótesis: Si en lugar de vender el mapa le damos al comprador un método de tres pasos que puede aplicar hoy, la pieza gana guardados y visitas cualificadas al sitio, porque el valor se entrega antes del clic y el producto aparece como el lugar donde ese método ya es posible.
- Portada: Revisa esto antes de contactar

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.0–3.6 s | gancho | Arranca ya en movimiento: la ficha entra desde abajo con la foto grande ocupando el cuadro y un ligero desplazamiento hacia arriba, como cuando alguien acaba de abrir un anuncio. El producto se reconoce en el cuadro uno. Sobre la foto, un destello suave recorre el borde y las características quedan todavía apagadas, insinuando que falta información por mirar. Marca superior con dominio a x=24 y tile a 84 px del borde derecho, ambos desde y=205. Rótulo y subtítulos en una sola columna anclada abajo, terminando en y=1580, con 72 px entre titular y subtítulo. Zonas seguras: nada esencial arriba de y=240, debajo de y=1460, ni en los 240 px de la derecha bajo y=820. | Una foto bonita no basta para elegir una propiedad. | Más que la foto | sim:ficha | cut |
| 2 | 3.6–9.1 s | prueba | Continúa la misma ficha sin corte de contexto: la galería avanza con desplazamiento continuo por tres o cuatro fotos y luego la vista baja hasta el bloque de características, donde habitaciones, baños y área se encienden uno a uno acompañando exactamente el orden de la voz. El movimiento es constante, nunca congela la ficha. Los valores son genéricos e ilustrativos, no de una propiedad identificable. Rótulo en una sola fila abajo, marca superior fija en y=205. | Antes de escribir, mira todas las fotos y lo declarado: habitaciones, baños y área. | Fotos y lo declarado | sim:ficha | cut |
| 3 | 9.1–14.3 s | prueba | El precio total y el área, ya vistos en la escena anterior, se separan del cuerpo de la ficha y se colocan uno sobre otro; entre ellos aparece la operación y el resultado por metro cuadrado sube contando hasta su valor. La relación se lee sola, sin adjetivos en pantalla ni marcas de bueno o malo. Si la animación incluye rango de zona o comparables, mantenerlos apagados salvo que provengan del cálculo real del producto. Rótulo abajo, marca superior fija. | Después relaciona el precio total con el área y calcula el metro cuadrado. | Precio y área | sim:precio | cut |
| 4 | 14.3–20.0 s | prueba | La ficha se retrae y el mapa toma el cuadro con un acercamiento continuo hasta la zona; primero aparece el punto de la propiedad y, cuando la voz lo nombra, el punto da paso al polígono de la Forma del terreno dibujándose sobre el mapa, con su etiqueta escrita tal cual aparece en la interfaz. Sin calles ni nombres reales legibles: es una recreación ilustrativa, no una captura. Rótulo abajo, marca superior fija. | Abre la ubicación en el mapa y, si la ficha la muestra, revisa la Forma del terreno. | Ubicación en el mapa | sim:ubicacion-publicacion | cut |
| 5 | 20.0–26.1 s | cta | Las tres comprobaciones vuelven un instante como tres marcas que se completan sobre el mapa mientras entra la marca al nombrarse Geo Propiedades Ecuador, y el plano se resuelve en la tarjeta de cierre común de la serie: tile, Geo Propiedades Ecuador, dominio geopropiedadesecuador.com, el CTA 'Encuentra tu futuro hogar' y la firma de Aents. El cierre no se modifica respecto al resto de la serie. | Estas tres cosas están en cada ficha de Geo Propiedades Ecuador. Encuentra tu futuro hogar. | Tu futuro hogar | sim:llegada | fade |

## Voz completa

Una foto bonita no basta para elegir una propiedad. Antes de escribir, mira todas las fotos y lo declarado: habitaciones, baños y área. Después relaciona el precio total con el área y calcula el metro cuadrado. Abre la ubicación en el mapa y, si la ficha la muestra, revisa la Forma del terreno. Estas tres cosas están en cada ficha de Geo Propiedades Ecuador. Encuentra tu futuro hogar.

## Caption

Antes de escribirle al anunciante, la ficha ya te dice bastante. 1) Recorre todas las fotos y lo declarado: habitaciones, baños y área. 2) Relaciona el precio total con el área y saca el metro cuadrado. 3) Abre la ubicación en el mapa y, si la ficha la muestra, mira la Forma del terreno. Con eso llegas a la conversación sabiendo qué preguntar. Encuentra tu futuro hogar en geopropiedadesecuador.com #Ecuador #Vivienda #Arriendo #ComprarCasa #Quito #Guayaquil #Cuenca

## Verificación antes de publicar

- [ ] El video no afirma que una propiedad sea buena, barata, rentable ni segura: solo enseña a leer datos que ya están publicados en la ficha.
- [ ] Las características citadas (habitaciones, baños, área) y el precio son campos declarados por el anunciante en la ficha pública; la voz dice 'lo declarado' para no atribuir esos datos a una verificación de la plataforma.
- [ ] El metro cuadrado se presenta como un cálculo que hace la persona (precio dividido para el área), no como una comparación de mercado ni como un veredicto sobre la oferta.
- [ ] Revisar en el render que la animación sim:precio no muestre rango de zona ni número de comparables si esos datos no provienen del cálculo real del producto; sin respaldo, esa escena pasa a un tratamiento neutro de precio dividido para área antes de aprobar.
- [ ] La Forma del terreno se nombra con el término exacto de la interfaz y se condiciona a 'si la ficha la muestra'. No se promete exactitud topográfica ni legal.
- [ ] El mapa es MapLibre; ninguna escena lo nombra ni sugiere otra tecnología.
- [ ] No aparecen contadores de visitas, datos de contacto, credenciales ni paneles administrativos. Las fichas de las animaciones son ilustraciones genéricas, no una propiedad real identificable.
- [ ] No se menciona publicación, gratuidad ni comisión: la pieza es solo de comprador y conserva un único CTA.
- [ ] CTA: se usa 'Encuentra tu futuro hogar' según el brief y la corrección humana registrada en memory/lessons.md del 13/08/2026 para piezas de comprador, que prevalece sobre la familia genérica 'Explora el mapa'.
- [ ] Serie 'Antes de contactar': es nueva y funciona como espejo para comprador de 'Antes de publicar'. Requiere registro en memory/decisions.md si se aprueba.
- [ ] Todas las animaciones usadas ya están registradas; no se propone ningún sim nuevo sin implementación, registro en Python y Remotion, y prueba.
- [ ] Borrador con voz local Kokoro. No se ejecuta --final sin aprobación humana explícita del MP4.
