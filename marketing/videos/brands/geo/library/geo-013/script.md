# Video 013: Te van a preguntar dónde queda

Estado: `planificado`

## Estrategia

- Público: propietario
- Etapa: consideración
- Objetivo: Que un propietario que ya intentó vender por su cuenta publique en Geo Propiedades Ecuador con la ubicación incluida.
- Conversión: Inicio del formulario de publicación desde el perfil o el enlace.
- Pilar: Publicar sin fricción
- Serie: Antes de publicar
- Concepto: El error que se repite en cualquier anuncio: fotos, precio y descripción completos, y la ubicación en ninguna parte. La pieza abre en el primer mensaje que recibe quien publica —¿dónde queda?—, muestra que aquí la ubicación es un paso del formulario, deja el anuncio sobre el mapa y cierra en el mismo hilo de mensajes, ahora preguntando por la propiedad y no por la dirección.
- Promesa: Si publicas con su ubicación en el mapa, dejas de responder la misma pregunta una y otra vez.
- CTA: Publica tu propiedad gratis
- Hipótesis: Al propietario le pesa más una molestia que ya vivió —repetir la dirección por chat— que una lista de ventajas del portal; abrir en esa molestia concreta debería retener mejor a tres segundos que abrir en el precio de publicar, que es el gancho del geo-008.
- Portada: ¿Dónde queda tu propiedad?

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.0–7.0 s | gancho | El anuncio publicado se lee fila por fila: fotos, precio y descripción se marcan como completas, y la fila de ubicación queda vacía en rojo a mitad de escena. Sobre ella entran los dos mensajes y un trazo los conecta con la fila vacía: de ahí salen las preguntas. | Publicaste tu propiedad con fotos, precio y descripción. Y el primer mensaje que llega es siempre el mismo: ¿dónde queda? | ¿Dónde queda? | sim:donde-queda | cut |
| 2 | 7.0–14.0 s | prueba | El paso 2 del formulario real: se alterna entre marcar solo la ubicación y dibujar la Forma del terreno sobre el mapa, con los vértices visibles. | En Geo Propiedades Ecuador la ubicación es parte del anuncio: marcas el punto en el mapa, y si es un terreno, dibujas su forma. | Marca el punto | sim:ubicacion-publicacion | cut |
| 3 | 14.0–21.0 s | prueba | La tarjeta del anuncio viaja del formulario a su sitio en el mapa, se dibuja la Forma del terreno y el precio de ejemplo queda encima. Al final aparecen las propiedades vecinas. | Tu anuncio deja de ser una descripción y queda sobre el mapa, con tus fotos y tu precio, donde la gente busca por zona. | Queda en el mapa | sim:anuncio-en-mapa | cut |
| 4 | 21.0–27.0 s | resultado | El mismo anuncio de la primera escena, ahora con su fila de ubicación resuelta: un mapa pequeño con el punto dibujándose. Los mensajes que entran preguntan por la propiedad. | Así, quien te escribe ya sabe dónde queda, y te pregunta por la propiedad y no por la dirección. | Ya saben dónde queda | sim:ya-lo-saben | cut |
| 5 | 27.0–32.0 s | cta | Cierre global aprobado: tile de marca, Geo Propiedades Ecuador, dominio, CTA y firma de Aents. | Publicar no te cuesta nada. Publica tu propiedad gratis en geo propiedades ecuador punto com. | Publica gratis | Fondo de marca | fade |

## Voz completa

Publicaste tu propiedad con fotos, precio y descripción. Y el primer mensaje que llega es siempre el mismo: ¿dónde queda? En Geo Propiedades Ecuador la ubicación es parte del anuncio: marcas el punto en el mapa, y si es un terreno, dibujas su forma. Tu anuncio deja de ser una descripción y queda sobre el mapa, con tus fotos y tu precio, donde la gente busca por zona. Así, quien te escribe ya sabe dónde queda, y te pregunta por la propiedad y no por la dirección. Publicar no te cuesta nada. Publica tu propiedad gratis en geo propiedades ecuador punto com.

## Caption

Publicas tu casa o tu terreno con fotos, precio y descripción, y el primer mensaje que llega es siempre el mismo: ¿dónde queda? En Geo Propiedades Ecuador la ubicación es parte del anuncio: marcas el punto en el mapa y, si es un terreno, dibujas su forma. Tu anuncio queda sobre el mapa con tus fotos y tu precio, donde la gente busca por zona, y quien te escribe ya sabe dónde está. Publicar no te cuesta nada: geopropiedadesecuador.com #GeoPropiedadesEcuador #BienesRaicesEcuador #VenderMiCasa #TerrenosEcuador

## Verificación antes de publicar

- [ ] Publicar es gratis, sin comisión y sin límite de propiedades según frontend/lib/help-faqs.ts, que es la fuente citada en product-context.md. La pieza solo afirma que publicar no cuesta.
- [ ] La ubicación como paso del formulario y la Forma del terreno existen hoy: sim:ubicacion-publicacion recrea el paso 2 real, donde se alterna entre un punto y el polígono. No se promete exactitud topográfica ni legal.
- [ ] La propiedad de las animaciones es un ejemplo inventado: fotos, precio y características llevan el rótulo EJEMPLO en pantalla y no afirman nada sobre el mercado.
- [ ] No se muestran contadores de visitas, datos privados de contacto ni propiedades identificables; todas las escenas son animaciones ilustrativas y no capturas.
- [ ] No se menciona ni se insinúa el kit social, ni láminas, textos, QR, enlaces cortos, publicación automática en redes ni video automático del anuncio.
- [ ] sim:donde-queda, sim:ubicacion-publicacion, sim:anuncio-en-mapa y sim:ya-lo-saben están implementadas y registradas en Python y en Remotion; cada una ilustra literalmente la frase de su escena.
