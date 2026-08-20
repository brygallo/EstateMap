# Video 004: Busqué tu empresa en Google

Estado: `planificado`

## Estrategia

- Público: empresa
- Etapa: descubrimiento
- Objetivo: Que una empresa compruebe por sí misma qué encuentra su cliente y abra una conversación
- Conversión: whatsapp_contact
- Pilar: Software a medida
- Serie: Conoce Aents
- Concepto: Lo que tu cliente encuentra cuando te busca
- Promesa: Aents construye webs que abren rápido, funcionan en el celular y convierten visitas en oportunidades
- CTA: Cuéntanos tu proyecto
- Hipótesis: Poner al espectador en el lugar de su propio cliente hace visible un problema que no puede ver desde dentro
- Portada: ¿Qué encuentra tu cliente?

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.0–8.0 s | gancho | Se escribe «Tu Empresa» en un campo de búsqueda genérico. Aparecen tres resultados —perfil de Instagram, página de Facebook y ficha de directorio— y la cuarta fila queda vacía, con borde punteado ámbar: la página web propia no aparece. | Busqué tu empresa en Google, y esto fue lo que encontré. Tu Instagram, tu Facebook, un directorio, pero ninguna página web tuya. | Sin página web | sim:aents-busqueda | cut |
| 2 | 8.0–15.0 s | problema | tuempresa.com tarda en abrir mientras el contador marca los segundos. Cuando por fin carga, el marco se encoge hasta el tamaño de un teléfono y la página conserva su ancho de escritorio: el contenido se sale de la pantalla. | Y si sí tienes una, a veces pasa lo otro: tarda en abrir, y cuando por fin abre, en el celular no hay forma de usarla. | Lenta y no adaptada | sim:aents-lenta | cut |
| 3 | 15.0–22.0 s | problema | El recorrido del visitante avanza de izquierda a derecha: busca, entra, se va. «NUEVO CLIENTE» se tacha y en su lugar queda «OPORTUNIDAD PERDIDA». | Tu cliente está viendo exactamente esto. Vuelve atrás, entra donde sí puede, y acabas de perder una oportunidad sin enterarte. | Se va sin escribir | sim:aents-rebote | cut |
| 4 | 22.0–34.0 s | prueba | Las piezas de la página entran desde fuera y se ensamblan en una web clara: barra, titular, Servicios, Proyectos y Contacto. El puntero pulsa «Solicitar cotización», aparece una nueva oportunidad y debajo se sellan los cuatro pilares: posicionamiento, móvil, velocidad y conversión. | Ahora imagina que encuentra esto: una página que abre rápido, se ve bien en el celular y está hecha para convertir visitas en oportunidades. Diseño, desarrollo, rendimiento y posicionamiento trabajando juntos. | Hecha para funcionar | sim:aents-rearmado | cut |
| 5 | 34.0–40.0 s | cta | Tarjeta de cierre: isotipo de Aents, el nombre, «Software para personas», la invitación a buscar la propia empresa y los dos accesos, «Cuéntanos tu proyecto» y aents.net. | Haz la prueba: busca tu empresa en Google. Si no te gusta lo que encuentra tu cliente, cuéntanos tu proyecto. | Cuéntanos tu proyecto | sim:aents-prueba-web | cut |

## Voz completa

Busqué tu empresa en Google, y esto fue lo que encontré. Tu Instagram, tu Facebook, un directorio, pero ninguna página web tuya. Y si sí tienes una, a veces pasa lo otro: tarda en abrir, y cuando por fin abre, en el celular no hay forma de usarla. Tu cliente está viendo exactamente esto. Vuelve atrás, entra donde sí puede, y acabas de perder una oportunidad sin enterarte. Ahora imagina que encuentra esto: una página que abre rápido, se ve bien en el celular y está hecha para convertir visitas en oportunidades. Diseño, desarrollo, rendimiento y posicionamiento trabajando juntos. Haz la prueba: busca tu empresa en Google. Si no te gusta lo que encuentra tu cliente, cuéntanos tu proyecto.

## Caption

Busca tu empresa como lo haría un cliente. Si no aparece tu página, si tarda en abrir o si en el celular no se puede usar, esa visita se va a otro lado y nunca te enteras. En Aents diseñamos y desarrollamos webs rápidas, adaptables y pensadas para posicionar tu marca y generar oportunidades. Cuéntanos tu proyecto.

## Verificación antes de publicar

- [ ] Oferta de web verificada en ../Aents/apps/web/src/i18n.ts:367-369: «Webs que venden y crecen · Experiencias rápidas y adaptables, diseñadas para posicionar tu marca, generar oportunidades y crecer con tu negocio». De ahí salen los cuatro pilares que se sellan en la escena 4: posicionamiento, móvil, velocidad y conversión.
- [ ] Alcance del trabajo verificado en ../Aents/apps/web/src/i18n.ts:364-365: «desde la estrategia y el diseño hasta el desarrollo y lanzamiento». Por eso la voz dice diseño, desarrollo, rendimiento y posicionamiento, y nada más.
- [ ] CTA verificado en ../Aents/apps/web/src/i18n.ts:366 («Cuéntanos tu proyecto») y contacto en ../Aents/apps/web/src/i18n.ts:399.
- [ ] Se omite deliberadamente cualquier promesa de medición o analítica: ../Aents/doc/PLAN.md:85 y 102 la dejan como trabajo pendiente sujeto a una política de privacidad, y ../Aents/packages/analytics es un paquete vacío. El guion original la incluía como quinta insignia de esa fila y se retiró.
- [ ] No se afirma ninguna cifra de velocidad, rebote ni conversión. El contador de segundos de la escena 2 y los resultados de búsqueda de la escena 1 son de una empresa inventada y llevan el rótulo EJEMPLO en pantalla mientras se ven.
- [ ] La superficie de búsqueda se dibuja genérica —campo, lupa y filas— y no reproduce la marca de ningún buscador. Los perfiles se nombran por el tipo de página que son.
- [ ] La página reconstruida de la escena 4 muestra Servicios, Proyectos y Contacto. El guion original pedía además Testimonios y se retiró: una prueba social inventada no entra ni como rótulo.
