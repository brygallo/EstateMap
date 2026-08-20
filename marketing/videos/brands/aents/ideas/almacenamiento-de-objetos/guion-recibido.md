# Guion recibido (sin editar)

Texto tal como llegó el 15 de agosto de 2026. No es el guion de producción: la
versión que se va a construir está en [`base.md`](base.md), que lo condensa para
que quepa en los límites de la fábrica. Se conserva íntegro porque las
descripciones de animación de cada escena son el encargo de los componentes.

---

# Si tu sistema guarda imágenes o documentos, deberías saber esto

## ESCENA 1 — GANCHO

**Narración:**

¿Tu sistema permite subir imágenes, PDFs, contratos, facturas o cualquier tipo de archivo?

Entonces hay una pregunta que deberías hacerte:

**¿Dónde se están guardando todos esos archivos?**

Porque mientras tienes cien imágenes probablemente no pasa nada.

Pero…

¿qué ocurre cuando tienes cien mil?

¿O un millón?

Ahí puedes descubrir que tienes un problema que nunca habías considerado.

**Animación:**

Empieza una aplicación normal.

Un usuario sube una imagen.

Luego otra.

Después un PDF.

Todo parece funcionar perfectamente.

El contador empieza:

100 archivos.

1.000.

10.000.

100.000.

1.000.000.

La aplicación comienza a quedarse rodeada de archivos.

Texto:

**“¿Dónde estás guardando todo esto?”**

---

## ESCENA 2 — EL ERROR MÁS FÁCIL

**Narración:**

Cuando comenzamos un sistema, es muy fácil hacer esto:

tenemos un servidor…

y guardamos ahí mismo las imágenes y documentos.

La aplicación está ahí.

Los archivos están ahí.

Todo está en el mismo lugar.

Es sencillo.

Es barato.

Y para un proyecto pequeño puede funcionar perfectamente.

El problema aparece cuando ese proyecto deja de ser pequeño.

**Animación:**

Un servidor aparece en el centro.

Dentro colocamos:

**MI SISTEMA**

Debajo:

**MIS ARCHIVOS**

Llegan fotografías y PDFs.

Todo funciona.

✓

Después empiezan a acumularse.

El espacio disponible comienza a reducirse.

---

## ESCENA 3 — ¿QUÉ PASA CUANDO SE LLENA?

**Narración:**

Imagina que contrataste un servidor con 100 gigabytes de almacenamiento.

Tu aplicación utiliza 20.

Tu base de datos utiliza otros 10.

Y los usuarios empiezan a subir fotografías.

30 gigabytes.

50.

51.

52.

Hasta que un día…

**el disco se llena.**

Y ahora no solamente tienes un problema con las imágenes.

El mismo servidor también está ejecutando tu sistema.

Algo que parecía simplemente:

“necesitamos guardar fotos”

puede terminar afectando toda la aplicación.

**Animación:**

Servidor:

**100 GB**

Sistema: 20 GB.

Base de datos: 10 GB.

Archivos empiezan a llenar una barra.

40%.

60%.

80%.

95%.

100%.

**SIN ESPACIO**

Después vemos que no solamente dejan de entrar fotografías.

La aplicación completa empieza a mostrar errores.

Texto:

**“Un problema de archivos puede convertirse en un problema del sistema.”**

---

## ESCENA 4 — “COMPRO UN SERVIDOR MÁS GRANDE”

**Narración:**

La primera solución parece evidente.

**“Compro un servidor con más espacio.”**

Y puede resolver el problema.

Por un tiempo.

Pasas de 100 gigabytes a 500.

Después necesitas un terabyte.

Después más.

Pero estás haciendo crecer toda tu infraestructura simplemente porque tus usuarios están guardando más archivos.

Y quizá tu aplicación no necesita más procesador.

No necesita más memoria.

**Solamente necesita más espacio.**

Entonces aparece una idea importante:

¿por qué no separar las dos cosas?

**Animación:**

Servidor de 100 GB.

Se transforma en uno de 500 GB.

Después:

1 TB.

El precio va aumentando.

Pero CPU y memoria permanecen prácticamente sin utilizar.

Se resalta únicamente:

**ALMACENAMIENTO**

Texto:

**“¿Y si solamente necesitas más espacio?”**

---

## ESCENA 5 — AQUÍ APARECE EL ALMACENAMIENTO DE OBJETOS

**Narración:**

Para eso existe algo llamado:

**Object Storage**, o almacenamiento de objetos.

El nombre puede sonar complicado.

Pero la idea es bastante sencilla.

En lugar de guardar todas las imágenes y documentos dentro del mismo servidor donde funciona tu aplicación…

los archivos se guardan en un sistema separado diseñado específicamente para almacenarlos.

Tu servidor se preocupa por ejecutar la aplicación.

Y el almacenamiento de objetos se preocupa por guardar los archivos.

**Animación:**

El servidor anterior se divide suavemente en dos.

Izquierda:

**TU APLICACIÓN**

Derecha:

**TUS ARCHIVOS**

Todas las fotografías, videos y PDFs viajan hacia el segundo bloque.

El servidor principal queda limpio.

Texto:

**“Separa aplicación y archivos.”**

---

## ESCENA 6 — PIENSA EN ÉL COMO UNA BODEGA

**Narración:**

Puedes imaginarlo como una gran bodega digital.

Tu aplicación sabe qué necesita.

Le pide:

“Dame esta fotografía.”

La bodega encuentra el archivo y lo entrega.

Necesitas guardar otro.

Lo envías.

Necesitas eliminarlo.

Lo eliminas.

Y esa bodega puede estar preparada para almacenar cantidades enormes de archivos sin convertir el disco de tu aplicación en el centro de todo el problema.

**Animación:**

Transformamos Object Storage en una bodega digital.

Entran cajas:

**Fotos**

**Videos**

**PDF**

**Contratos**

**Backups**

La aplicación solicita:

**foto-325**

La bodega encuentra exactamente esa caja y la devuelve.

Texto:

**“Una bodega para tus archivos.”**

---

## ESCENA 7 — EJEMPLO FÁCIL: UNA INMOBILIARIA

**Narración:**

Imagina una página inmobiliaria.

Tienes mil propiedades.

Y cada propiedad tiene diez fotografías.

Son diez mil imágenes.

Ahora imagina cien mil propiedades.

Ya hablamos de un millón de fotografías.

Y todavía podrías tener:

planos,

videos,

documentos

y fotografías en diferentes tamaños.

Tu negocio puede crecer muchísimo más rápido que el almacenamiento disponible en un servidor tradicional.

**Animación:**

Una propiedad.

10 fotografías.

Después:

1.000 propiedades.

**10.000 fotos**

Después:

100.000 propiedades.

**1.000.000 fotos**

Las imágenes llenan la pantalla.

Todas se absorben hacia Object Storage.

La aplicación continúa funcionando normalmente.

---

## ESCENA 8 — OTRO EJEMPLO: UNA EMPRESA

**Narración:**

Y no solamente hablamos de fotografías.

Piensa en un sistema empresarial.

Cada día puede guardar:

facturas,

contratos,

órdenes,

reportes,

documentos escaneados,

comprobantes

y archivos enviados por usuarios.

Individualmente parecen pequeños.

Pero un sistema puede estar funcionando durante cinco, diez o quince años.

Los archivos se acumulan.

Por eso el almacenamiento no debería pensarse solamente para lo que tienes hoy.

También deberías preguntarte:

**¿qué ocurrirá con estos archivos dentro de cinco años?**

**Animación:**

Calendario:

2026.

Llegan documentos.

2027.

Más.

2028.

Más.

2030.

2031.

La montaña crece.

Texto:

**“Tu sistema puede vivir durante años.”**

---

## ESCENA 9 — ¿Y SI TIENES MÁS DE UN SERVIDOR?

**Narración:**

Hay otro problema.

Supongamos que tu aplicación crece y ahora necesitas dos servidores.

Un usuario sube una fotografía…

y se guarda en el servidor número uno.

Después vuelve a entrar.

Pero esta vez el sistema lo atiende desde el servidor número dos.

Entonces aparece una pregunta:

**¿cómo obtiene ese servidor la fotografía que quedó guardada en el otro?**

Puedes empezar a sincronizar archivos.

Pero mientras más servidores agregas, más complicada puede hacerse la solución.

Con almacenamiento separado, todos los servidores pueden utilizar el mismo lugar para los archivos.

**Animación:**

Servidor 1 recibe:

**foto.jpg**

Después el usuario llega al Servidor 2.

Busca la fotografía.

**NO ESTÁ**

Aparecen servidores 3 y 4.

Empiezan conexiones complicadas entre ellos.

Retrocedemos.

Ahora todos se conectan a una sola bodega:

**OBJECT STORAGE**

Foto disponible.

✓

Texto:

**“Un solo lugar para tus archivos.”**

---

## ESCENA 10 — TAMBIÉN AYUDA CON LOS BACKUPS

**Narración:**

Y piensa en algo todavía más importante.

¿Qué pasa si mañana pierdes el servidor?

Si tu aplicación y todos tus archivos estaban únicamente en el mismo disco…

puedes tener un problema bastante serio.

Separar correctamente el almacenamiento también facilita diseñar mejores estrategias de respaldo y recuperación.

Pero cuidado:

usar almacenamiento de objetos no significa automáticamente que ya tienes backup.

Los respaldos siguen teniendo que planificarse.

La pregunta siempre debería ser:

**si mañana algo falla, ¿puedo recuperar mis archivos?**

**Animación:**

Servidor contiene:

APP + ARCHIVOS.

El servidor falla.

Todo desaparece.

Pantalla negra.

Retrocedemos.

Ahora aplicación y archivos están separados.

Además aparece:

**BACKUP**

Un fallo ocurre.

Se inicia recuperación.

Texto:

**“Guardar no es lo mismo que respaldar.”**

---

## ESCENA 11 — ARCHIVOS PÚBLICOS Y PRIVADOS

**Narración:**

También puedes controlar quién puede acceder a cada archivo.

Una fotografía de un producto puede ser pública.

Pero un contrato…

una factura…

un documento personal…

o un archivo interno de una empresa…

probablemente no debería estar disponible para cualquiera que consiga un enlace.

Por eso una buena arquitectura también debe decidir:

qué archivos son públicos,

cuáles son privados

y quién tiene permiso para acceder a ellos.

**Animación:**

Dos zonas.

**PÚBLICO**

Imágenes de productos.

✓

**PRIVADO**

Contratos.

Facturas.

Documentos.

Aparece un usuario cualquiera:

✕

Usuario autorizado:

✓

Texto:

**“No todos los archivos deberían ser públicos.”**

---

## ESCENA 12 — ¿QUIÉN UTILIZA ESTO?

**Narración:**

Y esto no es una tecnología extraña.

Probablemente utilizas aplicaciones todos los días que necesitan soluciones de este tipo.

Redes sociales almacenando fotografías y videos.

Plataformas de streaming almacenando contenido.

Tiendas online almacenando imágenes de productos.

Sistemas empresariales almacenando documentos.

Aplicaciones móviles almacenando archivos de usuarios.

Cuando manejas grandes cantidades de archivos, necesitas pensar seriamente dónde van a vivir.

**Animación:**

Aparecen diferentes tipos de aplicaciones:

Red social → fotos.

Streaming → videos.

E-commerce → productos.

Empresa → documentos.

Inmobiliaria → propiedades.

Todas terminan conectándose conceptualmente a:

**OBJECT STORAGE**

---

## ESCENA 13 — ALGUNOS NOMBRES QUE PUEDES ESCUCHAR

**Narración:**

Si alguna vez escuchas nombres como:

Amazon S3,

Cloudflare R2,

Google Cloud Storage,

Azure Blob Storage

o MinIO…

ahora ya sabes de qué estamos hablando.

Son diferentes soluciones relacionadas con este problema:

**almacenar grandes cantidades de archivos fuera del servidor principal de tu aplicación.**

Algunas son servicios que contratas.

Otras pueden instalarse en infraestructura propia.

La mejor opción dependerá del proyecto.

**Animación:**

Aparecen los nombres uno por uno alrededor del concepto central:

**ALMACENAMIENTO DE OBJETOS**

No entrar en APIs ni términos técnicos.

Finalmente todos desaparecen y queda el concepto.

---

## ESCENA 14 — NO TODOS LOS PROYECTOS LO NECESITAN

**Narración:**

Ahora…

¿significa que cualquier página pequeña necesita montar toda esta infraestructura?

No.

Si tienes una página sencilla con veinte imágenes que prácticamente nunca cambian, probablemente no necesitas complicarla.

La arquitectura debe responder al problema real.

Pero si estás construyendo un sistema donde los usuarios constantemente suben:

fotografías,

videos,

PDFs,

documentos

o cualquier cantidad creciente de archivos…

entonces esta conversación empieza a ser importante.

**Animación:**

Izquierda:

Página pequeña.

20 imágenes.

✓ Servidor sencillo.

Derecha:

Plataforma.

Miles de usuarios.

Miles de archivos creciendo.

Aparece:

**PIENSA EN ALMACENAMIENTO**

Texto:

**“No compliques lo pequeño. Prepara lo que puede crecer.”**

---

## ESCENA 15 — LA PREGUNTA QUE DEBERÍAS HACER

**Narración:**

Así que si tienes un sistema o estás desarrollando uno…

no preguntes solamente:

**“¿Dónde guardamos las imágenes?”**

Pregunta:

¿Cuánto espacio tenemos?

¿Cuánto estamos creciendo cada mes?

¿Qué ocurre cuando ese espacio se termina?

¿Tenemos respaldo?

¿Qué archivos son privados?

¿Podemos recuperar la información si algo falla?

¿Y qué ocurrirá cuando necesitemos más de un servidor?

No necesitas ser programador para hacer estas preguntas.

Si tu empresa depende del sistema…

también depende de sus archivos.

**Animación:**

Una pregunta inicial:

**“¿Dónde guardamos las imágenes?”**

Se expande:

**¿Cuánto espacio?**

**¿Cómo crece?**

**¿Backup?**

**¿Privacidad?**

**¿Recuperación?**

**¿Escalabilidad?**

Todas rodean el sistema.

---

## ESCENA 16 — CIERRE

**Narración:**

Entonces recuerda:

si tu sistema guarda imágenes, videos, PDFs o documentos…

esos archivos también forman parte de tu infraestructura.

Y mientras tu proyecto crece, la forma en la que los almacenas empieza a importar cada vez más.

El almacenamiento de objetos es una de las soluciones que existen para separar tus archivos de tu aplicación y permitir que ambos puedan crecer de una manera mucho más ordenada.

Y si estás desarrollando un sistema y no sabes si tu arquitectura está preparada para crecer…

podemos ayudarte a revisarla.

En **Aents** diseñamos y desarrollamos software pensando no solamente en que funcione hoy…

sino en lo que puede necesitar mañana.

**Aents. Software for people.**

**Animación:**

Volvemos al primer servidor completamente lleno.

Lo reorganizamos.

Aplicación por un lado.

Base de datos por otro.

Object Storage por otro.

Backup.

Todo conectado y ordenado.

La cámara se aleja.

Aparece:

**“Tu software es más que código.”**

Después:

**Aents**

**Software for people.**

**aents.net**
