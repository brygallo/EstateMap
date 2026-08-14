# Video 004: Manda la ficha, no diez fotos

Estado: `planificado`

## Estrategia

- Público: profesional
- Etapa: consideración
- Objetivo: Que un agente o inmobiliaria pruebe el flujo de Geo Propiedades Ecuador publicando una propiedad de su inventario, al ver que una ficha con ubicación en el mapa y enlace corto reemplaza el envío de fotos sueltas por chat.
- Conversión: Clic al enlace del perfil y llegada a geopropiedadesecuador.com desde TikTok, seguida del inicio del formulario de publicación con una propiedad.
- Pilar: Publicar sin fricción
- Serie: Busca así, no así
- Concepto: El agente no pierde tiempo por falta de fotos, sino porque sus fotos no responden dónde queda la propiedad. La pieza contrasta el chat con capturas sueltas contra la ficha de Geo Propiedades: ubicación real en el mapa, todo el inventario publicado gratis y sin comisión, y un enlace corto que envía al cliente. Cierra con una sola ficha que responde ubicación, precio y aspecto.
- Promesa: Cada propiedad de tu inventario queda en una ficha con su ubicación en el mapa y un enlace corto que puedes enviar.
- CTA: Prueba el flujo con una propiedad
- Hipótesis: Si al agente se le muestra que el envío por chat falla en la pregunta que más repite el cliente (dónde queda) y que la ficha responde eso con un solo enlace, probará el flujo con una propiedad; el precio no es la objeción, la fricción percibida sí.
- Portada: Manda la ficha, no diez fotos

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.0–3.8 s | gancho | Un teléfono en cuadro con un hilo de chat abierto: el agente envía dos fotos de propiedades y bajo cada una el campo de ubicación aparece vacío. Entran los tres puntos de escritura y llega la burbuja del cliente con la pregunta. Sin marcas de aplicaciones de mensajería. | Mandas diez fotos por chat y siempre llega la misma pregunta. | ¿Dónde queda? | sim:chat-agente | cut |
| 2 | 3.8–9.2 s | prueba | Las fotos sueltas se apartan hacia los lados y entra el mapa de MapLibre con la marca. La cámara baja del país a una zona reconocible y un pin verde se asienta sobre la propiedad, con la etiqueta de precio apareciendo junto al pin. Movimiento continuo, sin cortes internos. | Aquí entra Geo Propiedades Ecuador: publicas y cada propiedad queda ubicada en el mapa. | Ubicación en el mapa | sim:llegada | cut |
| 3 | 9.2–14.8 s | prueba | El mapa se aleja y sobre él entra el panel de producto de la serie con la rejilla de Mis propiedades: tarjetas grandes del mismo anunciante con foto, precio y estado. Cierra con una franja que dice publicar cero dólares y cero por ciento de comisión. Nada de contadores de visitas ni datos de contacto. | Publicas todas las que trabajas: publicar no se paga y no cobramos comisión por la venta. | Gratis y sin comisión | sim:inventario-agente | cut |
| 4 | 14.8–21.4 s | prueba | El panel del kit muestra el enlace corto del anuncio y su código QR en grande, el enlace se copia y viaja hasta el mensaje que recibe el cliente, donde se abre la vista previa con foto, precio y ubicación. No aparece ninguna red social ni publicación automática. | Cada ficha trae su enlace corto y su código: tu cliente lo abre y ve fotos, precio y ubicación. | Un enlace para enviar | sim:enlace-corto | cut |
| 5 | 21.4–24.8 s | cta | Cierre de la serie: la tarjeta de marca común con el tile, Geo Propiedades Ecuador, el dominio, el CTA y la firma de Aents. No lleva animación propia. | Prueba el flujo con una propiedad tuya. | Prueba el flujo | Fondo de marca | fade |

## Voz completa

Mandas diez fotos por chat y siempre llega la misma pregunta. Aquí entra Geo Propiedades Ecuador: publicas y cada propiedad queda ubicada en el mapa. Publicas todas las que trabajas: publicar no se paga y no cobramos comisión por la venta. Cada ficha trae su enlace corto y su código: tu cliente lo abre y ve fotos, precio y ubicación. Prueba el flujo con una propiedad tuya.

## Caption

Diez fotos por chat no responden dónde queda. En Geo Propiedades Ecuador cada propiedad de tu inventario tiene su ficha con la ubicación en el mapa, y un enlace corto con código QR para enviarla. Publicar es gratis y sin comisión. Prueba el flujo con una propiedad en geopropiedadesecuador.com

## Verificación antes de publicar

- [ ] Gratis y sin comisión deben seguir respaldados por frontend/lib/help-faqs.ts y la página publicada de ayuda antes de renderizar.
- [ ] La URL corta y el QR pertenecen al kit posterior a la publicación ya implementado; la pieza no insinúa publicación automática en Instagram, TikTok o Facebook (SOC-010).
- [ ] No se afirma volumen de contactos, rapidez de venta, exclusividad, plusvalía ni seguridad de zonas.
- [ ] Las animaciones sim:chat-agente, sim:inventario-agente y sim:enlace-corto son nuevas: deben implementarse en Remotion, registrarse en Python y recibir prueba antes del render; el linter bloquea identificadores sim:* desconocidos.
- [ ] sim:inventario-agente no muestra contadores públicos de visitas, datos de contacto ni paneles administrativos; solo tarjetas del propio inventario.
- [ ] No aparece ninguna propiedad real identificable sin autorización; las fichas son ilustraciones del producto, no capturas de pantalla.
- [ ] Portada del video 4 con acento lavanda A78BFA según la alternancia verde, violeta, teal, lavanda; marca superior desde y=205, dominio a x=24, tile a 84 px del borde derecho y 48 px libres bajo el título.
- [ ] Zonas seguras vigentes: 240 px superiores, 460 px inferiores, 240 px del lateral derecho bajo y=820 y 64 px del lateral izquierdo; verificar con la composición SafeAreas.
- [ ] CTA único de la familia profesional; no aparece lenguaje de comprador ni un segundo llamado a la acción.
- [ ] Render de borrador con Kokoro local; no usar --final sin orden humana explícita.
