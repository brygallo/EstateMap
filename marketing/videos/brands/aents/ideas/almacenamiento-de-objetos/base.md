# Idea pendiente · Si tu sistema guarda imágenes o documentos

Estado: `en espera de componentes`
Marca: `aents` · Registrada el 2026-08-15

Base general para producir la pieza cuando existan las animaciones. Todavía **no
es un guion aprobado**: fija público, formato, orden y encargo de componentes
para que, cuando se lance por la fábrica, el planificador no empiece de cero.
El texto original está en [`guion-recibido.md`](guion-recibido.md).

## Estrategia

- Público: empresa (quien decide o encarga un sistema, no necesariamente programa)
- Etapa: descubrimiento
- Objetivo: que la empresa reconozca que sus archivos son parte de su infraestructura y abra una conversación sobre su arquitectura
- Conversión: `whatsapp_contact`
- Pilar: Software a medida
- Serie: Conoce Aents
- Concepto: dónde viven los archivos de tu sistema
- Idea única: los archivos crecen aparte del código, y si viven en el mismo disco que la aplicación acaban tumbándola
- CTA: Cuéntanos tu proyecto
- Portada: ¿Dónde se guardan tus archivos?

## Formato

Es una **clase**, no una historia: enseña una materia por pasos y cada escena
añade un paso que la anterior no dio. Duración prevista **≈190 s**, dentro del
tramo 120–240 s, con **13 escenas** sobre un tope de 14.

El guion recibido no cabe tal cual: son 16 escenas y llega a Aents en la última.
La regla de la clase exige mostrar el producto antes del segundo 25, así que la
marca se planta en la escena 2 —quién habla y por qué— y el CTA se reserva para
el final. Fusiones aplicadas: las escenas 7 y 8 del original (inmobiliaria y
empresa) se convierten en una sola sobre el crecimiento real, la 12 (quién usa
esto) desaparece por redundante, y la 13 (nombres de proveedores) se reduce a
una tira de rótulos dentro de la escena de la bodega.

## Mapa de escenas

| # | Tiempo | Función | Qué enseña | Componente |
| --- | --- | --- | --- | --- |
| 1 | 0–14 s | gancho | La pregunta: tu sistema recibe archivos, ¿dónde acaban? El contador va de 100 a 1.000.000 | `sim:aents-almacen-acumulacion` |
| 2 | 14–28 s | problema | Aplicación y archivos en el mismo servidor: sencillo, barato y suficiente hasta que deja de serlo. Aquí entra la marca | `sim:aents-almacen-mismo-disco` |
| 3 | 28–45 s | problema | El disco se llena y el fallo deja de ser de las fotos: es del sistema entero | `sim:aents-almacen-lleno` |
| 4 | 45–60 s | problema | «Compro un servidor más grande»: crece toda la infraestructura cuando solo hacía falta espacio | `sim:aents-almacen-servidor-mayor` |
| 5 | 60–78 s | mecanismo | Separar las dos cosas: la aplicación por un lado, los archivos por otro | `sim:aents-almacen-separacion` |
| 6 | 78–95 s | mecanismo | La bodega: se pide un archivo, se guarda, se borra. Tira de nombres del sector | `sim:aents-almacen-bodega` |
| 7 | 95–112 s | prueba | Cuánto crece de verdad: fotos por propiedad, documentos por año | `sim:aents-almacen-crecimiento` |
| 8 | 112–128 s | problema | Dos servidores: la foto que subió a uno no está en el otro | `sim:aents-almacen-varios-servidores` |
| 9 | 128–145 s | matiz | Guardar no es respaldar: separar facilita el respaldo, no lo sustituye | `sim:aents-almacen-respaldo` |
| 10 | 145–158 s | matiz | Público y privado: un contrato no puede estar a un enlace de distancia | `sim:aents-almacen-acceso` |
| 11 | 158–172 s | criterio | No todo proyecto lo necesita; veinte imágenes fijas no montan esto | `sim:aents-almacen-criterio` |
| 12 | 172–182 s | síntesis | Las preguntas que sí hay que hacer, alrededor del sistema ya ordenado | `sim:aents-almacen-preguntas` |
| 13 | 182–192 s | cta | Tarjeta de marca e invitación | `sim:aents-cierre` (existe) |

## Componentes que faltan

Doce escenas necesitan animación nueva; la decimotercera reutiliza
`sim:aents-cierre` (`AentsSignOffSim`, en `remotion/src/aents-brand-simulations.tsx`),
que ya es la tarjeta de cierre genérica de la marca.

Antes de escribir ninguno, se busca en el registro de `remotion/src/simulations.tsx`
si algo ya demuestra literalmente la voz de esa escena. `sim:aents-arquitectura`
**no sirve** aquí: es el diagrama de «así trabaja tu negocio», con clientes, web y
app, no una arquitectura de almacenamiento.

Todos van en un archivo propio, `remotion/src/aents-storage-simulations.tsx`,
como ya hacen `aents-seo-simulations.tsx` y `aents-web-simulations.tsx`, y se
registran en `simulations.tsx`.

| Componente | Qué tiene que verse |
| --- | --- |
| `sim:aents-almacen-acumulacion` | Una app normal recibe una imagen, otra, un PDF. El contador escala 100 → 1.000 → 10.000 → 100.000 → 1.000.000 y los archivos van rodeando a la aplicación |
| `sim:aents-almacen-mismo-disco` | Un servidor con MI SISTEMA arriba y MIS ARCHIVOS debajo. Entran archivos, todo funciona, el espacio libre se encoge |
| `sim:aents-almacen-lleno` | Barra de 100 GB de ejemplo: sistema 20, base de datos 10, archivos llenando hasta SIN ESPACIO. Después el fallo se propaga a la aplicación entera |
| `sim:aents-almacen-servidor-mayor` | 100 GB → 500 GB → 1 TB. El coste sube mientras CPU y memoria siguen ociosas; solo se ilumina ALMACENAMIENTO |
| `sim:aents-almacen-separacion` | El servidor se parte en dos planos: TU APLICACIÓN y TUS ARCHIVOS. Los archivos viajan al segundo y el primero queda limpio |
| `sim:aents-almacen-bodega` | Bodega digital con cajas —fotos, videos, PDF, contratos, respaldos—. La app pide `foto-325` y recibe exactamente esa. Al final, tira de nombres del sector (S3, R2, Google Cloud Storage, Azure Blob, MinIO) sin comparar ni recomendar |
| `sim:aents-almacen-crecimiento` | Dos ejes del mismo hecho: 1 propiedad × 10 fotos → 1.000 → 100.000; y una línea de años 2026→2031 acumulando facturas y contratos |
| `sim:aents-almacen-varios-servidores` | Servidor 1 recibe `foto.jpg`; el usuario vuelve por el Servidor 2 y NO ESTÁ. Aparecen sincronizaciones cruzadas, se deshacen, y todos apuntan a una sola bodega |
| `sim:aents-almacen-respaldo` | El servidor con app y archivos cae y se lleva todo. Se rebobina: separados, con BACKUP aparte, y una recuperación que sí ocurre |
| `sim:aents-almacen-acceso` | Zona pública con imágenes de producto y zona privada con contratos y facturas. Un visitante cualquiera rebota; uno autorizado entra |
| `sim:aents-almacen-criterio` | A la izquierda una página pequeña de 20 imágenes que está bien como está; a la derecha una plataforma cuyos archivos crecen solos |
| `sim:aents-almacen-preguntas` | «¿Dónde guardamos las imágenes?» se abre en espacio, crecimiento, respaldo, privacidad, recuperación y escalabilidad, alrededor de un sistema ya ordenado: aplicación, base de datos, almacenamiento y respaldo |

Se construyen con el vocabulario de `system-kit.tsx` documentado en
`animation-standard.md` §10 bis —`land()`, `glide()`, `settle()`, `stagger()`,
`Halo`, `glass()`, `lit()`, `Reveal`, `Trace`, `push={p}`—, toman la paleta de
`tokensFor('aents', …)` y ajustan cada rótulo con `fit()` contra el ancho
interior real de su caja. Ningún texto se sale de su contenedor.

## Pendiente de verificar antes de escribir el guion final

- [ ] **Que Aents ofrezca revisar arquitectura.** El cierre recibido dice «podemos ayudarte a revisarla», y eso es una promesa de servicio. Hay que encontrarla en `../Aents/apps/web/src/i18n.ts` o retirarla y cerrar con lo que sí está publicado.
- [ ] **CTA y contacto.** `aents-004` los ancló en `../Aents/apps/web/src/i18n.ts:366` y `:399`; volver a comprobar la línea, no copiar el número.
- [ ] **Las cifras son un ejemplo inventado.** 100 GB, 20, 10, el millón de fotos: llevan rótulo EJEMPLO en pantalla mientras se ven, como en `aents-004`. Ninguna se enuncia como dato de un cliente.
- [ ] **Los nombres del sector se citan, no se comparan.** Nada de precios, rendimiento ni «el mejor es». Se nombran como categorías que existen y la elección se declara dependiente del proyecto.
- [ ] **MinIO no se presenta como caso propio.** Geo Propiedades lo usa, pero contar la infraestructura de un producto del grupo como demostración necesita decisión explícita, y ahí el video dejaría de ser genérico.
- [ ] **Firma de cierre.** El guion recibido dice «Software for people»; las piezas ya producidas cierran con «Software para personas.». Se mantiene la forma en español salvo decisión contraria.
- [ ] **Duración.** Confirmar que la fábrica acepta `--duration 190` con presupuesto de clase (14 escenas, producto antes del segundo 25) antes de planificar.

## Cómo se lanza cuando esté lista

```bash
marketing/videos/video --brand aents new \
  "Clase de Aents sobre dónde viven los archivos de un sistema: el disco compartido con la aplicación, qué pasa cuando se llena, y el almacenamiento de objetos como forma de separar aplicación y archivos. Dura 190 s porque enseña una secuencia completa —problema, consecuencia, mecanismo, matices y criterio— y comprimirla obliga a soltar el respaldo o el control de acceso, que son la mitad del argumento." \
  --duration 190
```

Después se borra esta carpeta: a partir de ahí manda `library/`.
