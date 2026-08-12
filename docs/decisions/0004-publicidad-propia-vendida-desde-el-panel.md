# 4. La publicidad se vende por WhatsApp y el sistema solo la publica

Fecha: 2026-08-11
Estado: aceptada e implementada

## Contexto

El portal ya sirve publicidad, pero solo dentro del blog. `blog/ads.py` define
`Advertiser` y `SponsorSlot`, cinco ubicaciones editoriales, rotación
determinista por peso y un redirector que cuenta clics excluyendo bots. Funciona
y está bien resuelto. Lo que no existe es publicidad fuera del blog, ni forma
alguna de que alguien se entere de que ese espacio se vende.

La pregunta que motiva esta decisión es concreta: cómo se convierte un espacio
del portal en algo que alguien puede comprar. Y la respuesta corta es que ya se
puede — hablando. Lo que falta no es una tienda, es que el espacio libre lo diga.

## Decisiones

### 1. El sistema guarda tres datos de una venta, y ninguno más

Una campaña lleva el creativo, la ubicación, la ventana de fechas y el importe
cobrado. No hay tarifa, ni pedido, ni cotización, ni estado de pago, ni factura.

El sistema se queda con la parte que una conversación hace mal: acordarse de
apagar un anuncio el día que toca, repartir impresiones entre varios
anunciantes, no dejar un hueco vacío. Todo lo demás —convencer, negociar, poner
precio, cobrar— lo hace mejor una persona por chat, que es como se vende ya todo
lo que se vende en este portal.

Hay un motivo más duro que la elegancia: cada campo comercial de más es un campo
que alguien tiene que rellenar bien cada vez, y que miente el día que no lo
rellena. Un importe que alguien anota siempre vale más que un sistema de pedidos
con cinco estados que se abandona a la tercera venta.

### 2. Venta directa, servida desde este dominio. Nada de redes de terceros

No se integra AdSense ni ninguna red programática. Los creativos son imagen y
texto guardados en MinIO y servidos desde el propio dominio, y el clic pasa por
el redirector que ya existe.

El motivo es aritmético antes que ideológico. Con el tráfico de un portal joven,
una red programática paga por mil impresiones aproximadamente lo que aquí se
puede cobrar por el patrocinio de una ciudad durante un mes. A cambio mete
JavaScript de terceros en las páginas que el proyecto entero está intentando
posicionar, arruina el LCP y el CLS que tanto ha costado, y obliga a un banner
de consentimiento que hoy no hace falta.

Hay una segunda razón, y es la que de verdad decide: lo que este portal puede
vender no es alcance, es contexto. Quien mira casas en Macas es exactamente el
público de una ferretería, una notaría o un banco de Macas — y eso una red
programática no lo sabe cobrar.

### 3. Un espacio vacío se vende a sí mismo, y manda a WhatsApp

Cuando una ubicación no tiene nada que servir, no se colapsa: renderiza el
reclamo propio del portal, «¿Quieres aparecer en este espacio?», con el mismo
aspecto que tendrá el anuncio del cliente. El botón abre WhatsApp con el mensaje
ya redactado, diciendo qué espacio se estaba mirando y en qué ciudad.

Es la decisión que más rinde al principio, cuando el inventario está vacío casi
siempre. El hueco es el mejor sitio donde anunciar que se vende, porque quien lo
ve ya está en el público que un negocio local quiere alcanzar. Y tiene un efecto
que ninguna otra forma de vender consigue: la vista previa del producto es el
producto. Al anunciante no hay que explicarle cómo se verá su anuncio, lo está
viendo.

Lo que hace que la conversación funcione es el contexto dentro del mensaje. Un
«hola, quiero publicidad» obliga a preguntar tres cosas antes de poder
responder; uno que ya trae el espacio y la ciudad se contesta con un precio.

El mismo mecanismo sirve para lo propio, y por eso una campaña es de una de tres
clases. `paid` es la que alguien pagó, con su importe anotado. `partner` es una
marca del propio grupo publicada gratis —Aents ya está sembrada así en el blog—
con creativo real y sin importe. `promo` es el reclamo y sus variantes, incluida
la invitación a publicar una propiedad. Se sirven en ese orden.

Que las tres convivan desde el primer día no es una concesión, es cómo se sabe
que el mecanismo funciona: con Aents publicada gratis en las ubicaciones nuevas
se comprueba el recorrido completo —creativo, rotación, redirector, conteo sin
bots, invalidación de caché— antes de haberle cobrado un dólar a nadie. Si algo
falla, falla con un anuncio propio delante.

### 4. Hay sitios del portal que no están en venta

El lienzo del mapa no admite publicidad de ninguna forma: ni superpuesta, ni
como marcador patrocinado. El mapa es el producto, y un marcador pagado además
falsearía lo único que aquí no se falsea.

El bloque de contacto de una ficha tampoco. Ese clic es lo que el portal le debe
a quien publicó su propiedad; un anuncio que lo intercepte le está cobrando a un
anunciante por robarle un lead al dueño, y los dueños dejan de publicar.

La densidad se limita a un anuncio por pantalla y tres por página. En un mercado
donde la competencia está saturada de banners, la densidad baja es una ventaja
competitiva.

### 5. El módulo vive en `advertising/`, no en `blog/`

Los modelos se mueven del blog a una aplicación propia, con migración de datos.
Dejarlos donde están obligaría a que la ficha de una propiedad importara del
blog para pintar un banner, que es la clase de dependencia que nadie deshace
luego.

## Lo que se decide no construir

Queda escrito con el mismo detalle que lo que sí, en las reglas ADS-040 a
ADS-045, y con estado `not_implemented`: no son cosas pendientes, son cosas que
el módulo deliberadamente no hace.

No hay **tarifario** porque el precio se negocia caso por caso, y publicar una
cifra fija cerraría esa puerta y obligaría a mantener una página que nadie va a
mantener. No hay **pedido ni formulario** porque una máquina de estados solo se
gana el sitio cuando hay tantas ventas que la cabeza no las sostiene. No hay
**control de aforo** porque quien vende sabe lo que ha vendido; el riesgo
asumido —dos anunciantes repartiéndose una ubicación por peso— está escrito en
ADS-042 para que el día que moleste se sepa qué regla cambiar. No hay
**pasarela** porque `specs/domains/subscriptions.yaml` existe precisamente por
haber dado por implementado un sistema de cobros inexistente, y esta vez queda
dicho antes. Y no se cuentan **impresiones** porque significan una escritura por
vista de página a cambio de un número que solo sirve para enseñárselo a alguien;
con el clic y las fechas se responde la única pregunta que un anunciante hace de
verdad.

## Consecuencias

- El módulo es pequeño: dos tablas, dos endpoints públicos, dos de panel, un
  componente y una pantalla. Casi todo lo difícil ya estaba escrito en
  `blog/ads.py`; el trabajo fue mudarlo, generalizarlo y añadirle el relleno.
- Vender directo significa que alguien tiene que vender. Sin comercial, el
  reclamo de los huecos es el único vendedor que habrá — razón de más para que
  esté bien hecho, y para registrar sus clics con `trackEvent` y saber qué
  espacios despiertan interés.
- Sobrevender es posible y nadie lo impedirá. Es una decisión consciente, no un
  descuido.
- Las reglas viven en `specs/domains/advertising.yaml`, cada una citando el
  `archivo:línea` que la aplica, y `./scripts/specs.sh validate` las vigila. Las
  seis que describen lo que no se construye van como `not_implemented` y sin
  evidencia, que es lo que el contrato exige.
