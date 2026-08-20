# Video 002: Que el sistema haga el trabajo

Estado: `planificado`

## Estrategia

- Público: empresa
- Etapa: descubrimiento
- Objetivo: Posicionar a Aents como el estudio que construye el sistema completo de un negocio y abrir una conversación
- Conversión: contact_request
- Pilar: Software a medida
- Serie: Conoce Aents
- Concepto: Del negocio que se sostiene a mano al sistema que lo sostiene
- Promesa: Aents construye el sistema alrededor de cómo funciona tu negocio
- CTA: Conversemos sobre tu negocio
- Hipótesis: Mostrar primero el desorden que produce crecer y después el sistema que lo absorbe hace que una empresa se reconozca antes de escuchar la oferta
- Portada: Que el sistema haga el trabajo

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.0–5.0 s | gancho | El contador de clientes de un negocio de ejemplo salta de 47 a 384 mientras los canales por donde entra el trabajo aparecen alrededor y sus conexiones empiezan a cruzarse. | Tu negocio puede estar creciendo y, aun así, estar perdiendo tiempo todos los días. | Tu negocio crece | sim:aents-crecimiento | cut |
| 2 | 5.0–10.0 s | problema | Clientes, datos y procesos suben; el tiempo baja. La cola de tareas que pasa por una sola persona se llena y la escena se detiene en un error. | Más clientes, más mensajes, más datos, más procesos que alguien tiene que controlar. | Todo se acumula | sim:aents-carga | cut |
| 3 | 10.0–13.0 s | problema | El enredo se apaga y queda la pregunta sola en pantalla; después entra el isotipo de Aents. | ¿Y si el sistema hiciera ese trabajo? | Hay otra forma | sim:aents-giro | fade |
| 4 | 13.0–18.0 s | prueba | La arquitectura se construye de arriba abajo: clientes, web y app, el sistema a medida, sus módulos y la automatización. Cada conexión se enciende antes de que llegue la banda siguiente. | En Aents diseñamos el software alrededor de cómo funciona realmente tu negocio. | Un sistema a medida | sim:aents-arquitectura | cut |
| 5 | 18.0–24.0 s | prueba | Entra un pedido de ejemplo y el sistema va confirmando pago, inventario, factura, aviso al cliente y reporte, uno tras otro sobre la misma columna. | Conectamos tus procesos, automatizamos las tareas repetitivas y hacemos que la información se mueva sola. | Tareas automatizadas | sim:aents-automatizacion | cut |
| 6 | 24.0–29.0 s | prueba | El panel de un negocio de ejemplo responde qué necesita atención hoy, fila por fila, y abajo aparecen los roles del equipo. | Y todo lo que pasa en tu operación queda a la vista, en un solo panel y con roles para cada persona. | Todo en un panel | sim:aents-panel | cut |
| 7 | 29.0–35.0 s | resultado | El número de clientes del ejemplo pasa de diez a diez mil y las columnas crecen, mientras la interfaz del panel se queda exactamente donde estaba. | Porque un buen sistema no resuelve solo el problema de hoy: está preparado para lo que viene después. | Preparado para crecer | sim:aents-escala | cut |
| 8 | 35.0–41.0 s | resultado | La palabra software se tacha y se retira; en su lugar entra construimos sistemas que hacen avanzar negocios. | No hacemos software por hacer software: construimos sistemas que hacen avanzar negocios. | Sistemas, no software | sim:aents-posicionamiento | cut |
| 9 | 41.0–48.0 s | cta | Todo se apaga y queda la marca: isotipo, Aents, Software para personas, sus servicios y aents.net junto al botón de conversar. | Tu negocio ya sabe hacia dónde quiere crecer. Conversemos y construyamos la tecnología para llegar. | Conversemos | sim:aents-cierre | fade |

## Voz completa

Tu negocio puede estar creciendo y, aun así, estar perdiendo tiempo todos los días. Más clientes, más mensajes, más datos, más procesos que alguien tiene que controlar. ¿Y si el sistema hiciera ese trabajo? En Aents diseñamos el software alrededor de cómo funciona realmente tu negocio. Conectamos tus procesos, automatizamos las tareas repetitivas y hacemos que la información se mueva sola. Y todo lo que pasa en tu operación queda a la vista, en un solo panel y con roles para cada persona. Porque un buen sistema no resuelve solo el problema de hoy: está preparado para lo que viene después. No hacemos software por hacer software: construimos sistemas que hacen avanzar negocios. Tu negocio ya sabe hacia dónde quiere crecer. Conversemos y construyamos la tecnología para llegar.

## Caption

Un negocio que crece acumula clientes, mensajes, datos y procesos que alguien tiene que controlar a mano. En Aents diseñamos el software alrededor de cómo funciona tu operación: conectamos procesos, automatizamos tareas repetitivas y dejamos todo a la vista en un solo panel, con roles para cada persona del equipo. Webs, apps, sistemas empresariales y automatización, desde la estrategia y el diseño hasta el desarrollo y el lanzamiento. Conversemos sobre tu negocio.

## Verificación antes de publicar

- [ ] Oferta verificada en ../Aents/apps/web/src/i18n.ts:367-378: webs, apps para iOS y Android, sistemas empresariales y automatización e integraciones.
- [ ] Paneles, roles y flujos verificados en ../Aents/apps/web/src/i18n.ts:373-375 (services.enterprise y services.enterpriseNote): plataformas de gestión, paneles, roles y flujos que conectan la operación en un solo lugar.
- [ ] Automatización de procesos repetitivos verificada en ../Aents/apps/web/src/i18n.ts:376-378 (services.automation): conectar servicios, datos y procesos repetitivos.
- [ ] Que el sistema esté preparado para crecer se apoya en ../Aents/apps/web/src/i18n.ts:368-372: experiencias que crecen con el negocio y una base preparada para evolucionar. No se promete ningún límite ni capacidad medida.
- [ ] Tagline verificado en ../Aents/packages/brand/src/index.ts:6 y ../Aents/apps/web/src/i18n.ts:225: «Software para personas.». El cierre del guion original decía «BUILD WHAT'S NEXT», que no pertenece a la identidad y se descarta.
- [ ] Se omite la inteligencia artificial del guion original. apps/web no la ofrece como servicio y ../Aents/doc/CONTEXTO-PROYECTO.md:85 solo la nombra dentro de la arquitectura de marca, con el nombre del área pendiente de confirmar en la línea 524. Esa escena se reemplaza por el panel de gestión, que sí está publicado.
- [ ] Las cantidades de los paneles —clientes, pagos, pedidos y la escala de diez a diez mil— pertenecen a un negocio inventado, aparecen rotuladas EJEMPLO mientras están en pantalla y la locución nunca las convierte en dato. Ninguna afirma nada sobre Aents, sus clientes ni el mercado.
