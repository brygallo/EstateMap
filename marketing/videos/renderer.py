#!/usr/bin/env python3
"""Remotion staging and invocation."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from collections import deque
from pathlib import Path
from typing import Any

from media import probe_duration
import media
import brand


ROOT = Path(__file__).resolve().parent
REMOTION = ROOT / "remotion"
FONT = ROOT / "assets/fonts/PlusJakartaSans-ExtraBold.ttf"
BRAND_TILE = ROOT / "assets/brand/aents-brand-tile-1024.png"
BRAND_SYMBOL = ROOT / "assets/brand/aents-symbol-negative.png"
LEGACY_BRAND_TILE = ROOT / "assets/brand/aents-brand-tile-1024.png"
LEGACY_BRAND_SYMBOL = ROOT / "assets/brand/aents-symbol-negative.png"
FPS = 30
ACCENTS = ["#22C55E", "#6B5CF6", "#14B8A6", "#A78BFA"]
URL = "geopropiedadesecuador.com"
BRAND_ID = "geo"
BRAND_NAME = "Geo Propiedades Ecuador"
BRAND_TAGLINE = "Un producto de Aents"


def configure(profile: brand.BrandProfile) -> None:
    global BRAND_TILE, BRAND_SYMBOL, URL, BRAND_ID, BRAND_NAME, BRAND_TAGLINE
    BRAND_TILE = profile.brand_tile
    BRAND_SYMBOL = profile.brand_symbol
    URL = profile.domain
    BRAND_ID = profile.id
    BRAND_NAME = profile.name
    BRAND_TAGLINE = profile.tagline
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm"}

# Animated recreations drawn in Remotion. They are named as assets so a plan can
# choose one the same way it chooses footage, but they have no file behind them.
SIMULATIONS = {
    "sim:geo-location-hero": "Una ficha clara se transforma en un lugar del mapa y responde dónde queda la propiedad",
    "sim:geo-nearby-context": "Una propiedad seleccionada vuelve al mapa y revela opciones cercanas para comparar por ubicación",
    "sim:geo-property-detail": "Un pin dentro de una manzana abre la ficha pública clara con imagen y datos declarados",
    "sim:credicasa-hero": "Una vivienda nueva sostiene 2,99 %, hasta 100 % y hasta $65.000 antes de que vivienda, ingresos y capacidad cierren como condiciones",
    "sim:credicasa-fact-card": "Ficha fechada con tasa nominal, tasa efectiva, financiamiento máximo y plazo máximo publicados",
    "sim:credicasa-home-gate": "Una vivienda ilustrada pasa por los requisitos de vivienda única, nueva, sin fin comercial y con una o más habitaciones",
    "sim:credicasa-three-numbers": "Precio pedido, avalúo comercial máximo y monto máximo del crédito se separan como tres cifras distintas",
    "sim:credicasa-entry-example": "Ejemplo de $60.000 compara una hipoteca 80/20 con financiamiento de hasta 100 %, sin presentarlo como aprobación",
    "sim:credicasa-capacity": "Tres solicitudes de ejemplo reciben montos distintos y terminan en la precalificación",
    "sim:credicasa-applicants-a": "Aportaciones publicadas para afiliación bajo relación de dependencia y afiliación voluntaria",
    "sim:credicasa-applicants-b": "Condiciones publicadas para jubilación, discapacidad e ingreso familiar máximo",
    "sim:credicasa-payment-example": "Ejemplo aproximado de capital e intereses añade seguros y gastos antes de remitir al simulador oficial",
    "sim:credicasa-total-envelope": "Vivienda y gastos financiados comparten el mismo límite máximo de $65.000",
    "sim:credicasa-rate-reset": "Una línea de tiempo marca revisiones cada 180 días y lleva a revisar el contrato",
    "sim:credicasa-reservation": "Una reserva escrita comprueba aprobación del crédito, reembolso y falta de financiamiento",
    "sim:credicasa-order-a": "Primeros cuatro pasos: requisitos, precalificación, presupuesto y vivienda elegible",
    "sim:credicasa-order-b": "Últimos cuatro pasos: comparar, confirmar compatibilidad, avalúo y lectura antes de firmar",
    "sim:que-compras": "La cámara se abre desde el departamento encendido hasta el edificio entero, con sus reglas, sus vecinos y sus deudas",
    "sim:propiedad-horizontal": "El corte del edificio separa lo privado de lo común y la página siguiente muestra el parqueadero y la bodega marcados EN LA ESCRITURA, frente al cartel de tiza que se borra",
    "sim:alicuota": "Los meses de alícuota pagados, lo que cubre, y el certificado firmado de que el vendedor está al día",
    "sim:edificio": "El acta de asamblea con su cuota extraordinaria aprobada, y después el recorrido por la cisterna, el ascensor, la bomba y las humedades",
    "sim:escrituras": "La escritura y el sello del registro: el propietario inscrito se coteja con quien te vende",
    "sim:gravamenes": "El certificado se lee línea a línea —hipoteca, embargo, demanda— junto al impuesto predial",
    "sim:gravamenes-departamento": "El mismo certificado, dicho sobre el departamento en vez del terreno",
    "sim:uso-suelo": "La ficha del municipio: qué se puede construir en el lote, con pisos y retiros",
    "sim:linderos": "El recorrido del perímetro mojón por mojón, y el lado que no coincide con los papeles",
    "sim:servicios": "Agua, luz y alcantarillado llegando o quedándose cortos, y la vía en seco y con lluvia",
    "sim:alrededor": "El mapa se aleja desde el terreno y aparece el entorno: las vías, lo construido alrededor y por dónde se llega",
    "sim:entorno-mapa": "El mapa muestra las vías y el entorno inmediato de un edificio antes de visitarlo",
    "sim:forma-dibujada": "El contorno del terreno se dibuja esquina por esquina y queda claro que lo trazó quien publica, no un topógrafo",
    "sim:medidas": "Las filas declaradas de la ficha, con Medidas: Referencia aproximada resaltada y su aviso",
    "sim:dividir": "La división que hace quien compra: precio total entre área declarada, y el resultado por metro cuadrado",
    "sim:metros-utiles": "El precio se compara usando metros útiles y separando las áreas comunes",
    "sim:preguntas": "La foto del anuncio y, encima, todo lo que una foto no dice: escrituras, deudas, uso de suelo, linderos y servicios",
    "sim:anuncios": "Anuncios cayendo en pila: cada uno con su foto y su precio, y el lugar de la ubicación vacío",
    "sim:llegada": "Los anuncios se apartan y entra el mapa con la marca: el momento en que aparece la solución",
    "sim:mapa": "Del mapa del país a una zona: las burbujas de ciudad se abren en barrios y en casas con su precio",
    "sim:zona": "Se abre una zona: primero el agrupado de la zona y luego los pines de cada casa con su precio",
    "sim:filtros": "Un filtro de precio se ajusta sobre el mapa y desaparecen las propiedades fuera del rango",
    "sim:ficha": "Una ficha aparece con su foto, su precio y sus características",
    "sim:precio": "El precio por metro cuadrado sube y se sitúa dentro del rango habitual de la zona",
    "sim:publicar": "Los cinco pasos de publicar se van marcando uno a uno",
    "sim:publicar-gratis": "El flujo de publicación aparece junto a costo cero y sin comisión",
    "sim:formulario": "El formulario real avanza entre tipo de propiedad y estado",
    "sim:ubicacion-publicacion": "Se alterna entre un punto y la Forma del terreno sobre el mapa",
    "sim:fotos-publicacion": "El precio y las fotos forman la vista previa de la propiedad",
    "sim:chat-agente": "Fotos enviadas una tras otra por chat: bajo cada una el campo de ubicación está vacío y el cliente pregunta dónde queda",
    "sim:inventario-agente": "La rejilla de Mis propiedades se arma con las tarjetas del mismo anunciante, junto a costo cero y sin comisión",
    "sim:enlace-corto": "La ficha abre el enlace corto y el QR del kit, y el enlace viaja hasta la vista previa que recibe el cliente",
    "sim:revisar-fotos": "Galería pública y características declaradas para revisar antes de contactar",
    "sim:precio-area": "Inteligencia pública: precio por m² y contexto frente a inventario activo comparable",
    "sim:ubicacion-ficha": "Ubicación pública y Forma del terreno cuando quien publica la dibuja",
    "sim:contacto": "El bloque de contacto de la ficha: se revela el teléfono, se toca WhatsApp y sale el mensaje que la ficha deja escrito",
    "sim:vender": "El terreno y la casa que quieres vender o arrendar, con su letrero",
    "sim:cero-comision": "Lo que cuesta publicar: cero por publicar, cero comisión y sin límite de propiedades",
    "sim:ya-estan": "El mapa se llena de propiedades en venta y queda un hueco punteado donde falta la de quien mira",
    "sim:anuncio-en-mapa": "El anuncio viaja del formulario al mapa: se dibuja la Forma del terreno y su precio queda encima",
    "sim:te-contactan": "El teléfono del anunciante: entra la llamada del interesado y después su mensaje",
    "sim:donde-queda": "El anuncio publicado con fotos, precio y descripción, la fila de ubicación vacía y los mensajes que preguntan dónde queda",
    "sim:ya-lo-saben": "El mismo anuncio con su ubicación en el mapa, y los mensajes que ahora preguntan por la propiedad",
    "sim:geo-ranking-hero": "Se abre un anuncio, se pliega a una pila y entra el siguiente; los precios visibles quedan a la misma altura y el lugar de la posición se queda vacío e iluminado",
    "sim:pagina-ordenada": "Una página del blog aterriza ya armada: título, nota de recálculo y tres anuncios numerados del más barato al más caro",
    "sim:recetas-ranking": "El título gira a otra receta y las filas se reordenan por área; luego la cámara retrocede y los anuncios publicados suben a una banda que aparta los precios y áreas imposibles",
    "sim:razon-posicion": "Cada fila abre el motivo de su posición y la primera viaja fuera de la lista para caer sobre el mapa convertida en un pin con su precio",
    "sim:sin-destacado": "Destacado, publicidad y lo más visto empujan la primera fila dos veces y salen tachadas; la lista queda igual y el criterio se lee en una píldora",
    "sim:elige-zona": "El mapa se arrastra hasta la zona, se traza el círculo y los anuncios sueltos caen dentro convertidos en precios ubicados",
    "sim:verificar": "La lupa recorre propietario, documentos y gravámenes, y cada fila queda comprobada cuando pasa por ella",
    "sim:negociar": "El precio publicado se tacha, entra la oferta y las dos partes llegan a un acuerdo",
    "sim:promesa": "La promesa de compraventa sube a la mesa y la firman comprador y vendedor",
    "sim:escritura-publica": "La escritura de compraventa recibe el sello de la notaría y aparecen quién vende y quién compra",
    "sim:inscripcion": "La escritura entra al Registro de la Propiedad y el propietario inscrito deja de ser el vendedor",
    "sim:pasos-compra": "Los seis pasos de la compra se encienden en orden y terminan en la propiedad inscrita",
    "sim:aents-reveal": "Geo Propiedades Ecuador funcionando con una firma explícita de autoría de Aents",
    "sim:aents-idea": "Una idea se despliega como app, plataforma web, sistema y automatización",
    "sim:aents-flujo": "Documentos, hojas y mensajes separados convergen en un solo flujo conectado",
    "sim:aents-proceso": "Las etapas de Aents: estrategia, diseño, desarrollo y lanzamiento",
    "sim:aents-servicios": "Servicios de Aents: webs, apps, sistemas y automatización con integraciones",
    "sim:aents-contacto": "Cierre de Aents con WhatsApp 098 373 8151 y aents.net",
    "sim:aents-web-busqueda": "Alguien busca una empresa, abre su web y decide entre confiar o seguir buscando",
    "sim:aents-web-lenta": "Una web lenta y antigua que no cabe en el teléfono y termina cerrada",
    "sim:aents-web-nueva": "La misma página reconstruida: se recorre por secciones y se adapta al móvil",
    "sim:aents-web-conversion": "Una búsqueda se vuelve visita y la visita, una solicitud de información",
    "sim:aents-web-cierre": "Cierre de Aents para webs: la página recibe contactos a cualquier hora",
    "sim:aents-crecimiento": "Un negocio de ejemplo suma clientes mientras WhatsApp, hojas, correos, facturas, pedidos y cobros se cruzan a su alrededor",
    "sim:aents-carga": "Clientes, datos y procesos suben, el tiempo baja, y la cola que pasa por una sola persona se detiene en un error",
    "sim:aents-giro": "El enredo se apaga, queda la pregunta de si el sistema puede hacer el trabajo y aparece el isotipo de Aents",
    "sim:aents-arquitectura": "La arquitectura se construye de arriba abajo: clientes, web y app, el sistema a medida, sus módulos y la automatización",
    "sim:aents-automatizacion": "Un pedido de ejemplo entra y el sistema confirma pago, inventario, factura, aviso al cliente y reporte, uno tras otro",
    "sim:aents-panel": "El panel de un negocio de ejemplo responde qué necesita atención hoy y muestra los roles del equipo",
    "sim:aents-escala": "El número de clientes del ejemplo pasa de diez a diez mil y la interfaz se queda exactamente donde estaba",
    "sim:aents-posicionamiento": "La palabra software se tacha y en su lugar queda construimos sistemas que hacen avanzar negocios",
    "sim:aents-cierre": "Cierre de marca de Aents: isotipo, nombre, Software para personas, sus servicios y aents.net",
    "sim:aents-busqueda": "Una búsqueda de ejemplo devuelve perfiles sociales y una ficha de directorio, y deja vacía la fila de la página web propia",
    "sim:aents-lenta": "Una web de ejemplo tarda segundos en abrir y, al encogerse el marco al tamaño de un teléfono, su contenido se sale de la pantalla",
    "sim:aents-rebote": "El visitante busca, entra y se va; la etiqueta nuevo cliente se tacha y queda oportunidad perdida",
    "sim:aents-rearmado": "Las piezas de una página de ejemplo se ensamblan en una web clara y alguien pulsa solicitar cotización",
    "sim:aents-prueba-web": "Posicionamiento, móvil, velocidad y conversión se confirman y el cuadro entrega el cierre de Aents con aents.net",
    "sim:aents-antes": "La cámara se aleja de las credenciales de una constructora de ejemplo hasta descubrir que viven en una web antigua, y el rótulo ANTES se queda",
    "sim:aents-contraste": "Dos columnas: la empresa de ejemplo con su trayectoria frente a lo que dice de ella su presencia digital, y la pregunta de si se ve el problema",
    "sim:aents-reconstruccion": "El cursor selecciona la web antigua y la borra; tras un silencio la página nueva se arma por piezas: retícula, logo, navegación, imagen, título y botones",
    "sim:aents-credibilidad": "Un solo recorrido por la página nueva: primero las cifras de la empresa de ejemplo y después sus proyectos por tipo",
    "sim:aents-cotizacion": "Un proyecto de ejemplo se abre, la galería avanza, alguien pulsa solicitar cotización y del otro lado entra la nueva solicitud",
    "sim:aents-adaptacion": "El marco pasa de escritorio a tableta y a teléfono, la página se reordena en vez de encogerse y un pulgar alcanza el botón",
    "sim:aents-comparacion": "La web antigua y la nueva comparten cuadro y el divisor viaja hasta que solo queda la nueva",
    "sim:aents-problema-software": "Un nodo PROBLEMA cruza el isotipo de la marca y sale del otro lado convertido en una interfaz con el proceso, los datos y el equipo",
    "sim:aents-disperso": "El mismo proceso repartido en hojas, documentos, mensajes y una tarea que vuelve a empezar, con piezas saliendo en cuatro direcciones",
    "sim:aents-desconectado": "La cámara se aleja y descubre que las cuatro herramientas existen aisladas; los enlaces a medio trazar se completan cuando entra la marca",
    "sim:aents-entender": "El flujo real del negocio —entrada, decisión, equipo y resultado— leído de arriba abajo hasta marcar el paso donde se traba",
    "sim:aents-soluciones": "Desde una misma necesidad, el selector elige app, plataforma web, sistema o automatización y las cuatro terminan enlazadas",
    "sim:aents-etapas": "Un mismo producto cruza estrategia, diseño, desarrollo y lanzamiento transformándose en cada etapa, con el riel marcando dónde va",
    "sim:aents-medida": "Un bloque genérico no entra en el hueco que dibuja el proceso de la empresa; después las piezas se construyen alrededor hasta cerrarlo",
    "sim:aents-seo-encontrar": "La web de un negocio de ejemplo se queda a un lado mientras un buscador y una IA que responde entregan resultados y fuentes que no son suyos",
    "sim:aents-seo-entender": "Un lector recorre la página de ejemplo y de cada pasada sale lo que entendió: quién es, qué hace y cuándo mostrarlo; después aparece en la lista",
    "sim:aents-seo-intencion": "Un anuncio cae encima de lo que alguien estaba haciendo y se va de lado; al lado, una búsqueda encuentra justo la página que responde",
    "sim:aents-seo-senales": "Una página bonita no dice de qué trata, y a su lado se encienden las señales que sí la hacen entendible, hasta la que importa: que responda",
    "sim:aents-seo-red": "Una sola página de servicios se abre en una página por cada búsqueda real, y las tres devuelven al visitante al mismo destino",
    "sim:aents-seo-respuesta": "La lista de resultados se retira y en su lugar queda una respuesta escrita con sus fuentes, donde la web del ejemplo todavía no está",
    "sim:aents-seo-sin-truco": "El botón de salir en la IA no hace nada y la pila de páginas generadas se derrumba; queda lo que sí funciona: clara, propia, actualizada y verificable",
    "sim:aents-seo-datos": "La frase vaga se retira y en su sitio entran los datos concretos de un negocio de ejemplo, que una respuesta puede citar con su fuente",
    "sim:aents-seo-entidad": "Seis lugares donde aparece un negocio de ejemplo dicen lo mismo, y las líneas que los unen confirman una sola identidad",
    "sim:aents-seo-lectores": "Lo que ve el navegador frente a lo que recibe una IA: la raíz vacía, el contenido ya servido en el código, y el despliegue que se bloquea si falta",
    "sim:aents-encoge": "La misma página pasa de monitor a teléfono multiplicando todo por el mismo número: el texto deja de leerse y el botón queda más pequeño que el dedo",
    "sim:aents-sintomas": "Cinco fallos que puedes comprobar en tu propio teléfono, demostrados uno tras otro dentro del mismo aparato, y la cuenta de equis que dejan",
    "sim:aents-dos-caminos": "Dos columnas: a la izquierda una página de escritorio que se reduce hasta caber, a la derecha un teléfono que se llena por orden de importancia",
    "sim:aents-cabe": "Una interfaz de escritorio se construye pieza a pieza y después se comprime en un teléfono hasta que entra; el visto de que cabe no responde si es cómoda",
    "sim:aents-pregunta": "Las acciones posibles orbitan alrededor de una persona y se ordenan: dos ocupan la pantalla y el resto queda a mano",
    "sim:aents-portal-escritorio": "La plataforma de propiedades en escritorio —mapa, buscador, filtros y listado— se estrecha con la misma maquetación hasta que todo choca",
    "sim:aents-portal-movil": "La misma plataforma decidida para el teléfono: mapa a pantalla completa, botón inferior con buscador y filtros, y la ficha que sube desde abajo y se arrastra",
    "sim:aents-dedo": "El mismo botón alcanzado por un cursor y por un dedo: el cursor acierta, el dedo falla dos veces, y los botones crecen hasta que el gesto funciona",
    "sim:aents-tarjetas": "Una tabla se pliega en tarjetas, una ventana modal se convierte en hoja inferior y un menú superior en navegación inferior",
    "sim:aents-gestos": "Tocar, deslizar, mantener, arrastrar y ampliar: cinco gestos encadenados con su consecuencia visible dentro del mismo teléfono",
    "sim:aents-peso": "La misma página abre al instante por fibra y se atasca con datos móviles hasta que las imágenes se aligeran y la lista descarga solo lo que muestra",
    "sim:aents-hacia-arriba": "El marco crece de teléfono a monitor y aparecen una segunda columna, un panel y los filtros; la columna original conserva su ancho",
    "sim:aents-usala": "La prueba real: abrir el menú, buscar, llenar el formulario y pulsar la acción, y después el arco que dibuja hasta dónde alcanza el pulgar",
    "sim:aents-ia-funciona": "El código escrito de un tirón se pliega en una aplicación que abre y confirma que funciona; la cámara se aleja y aparecen seguridad, datos, errores, móvil, permisos y respaldos sin marcar",
    "sim:aents-ia-contexto": "El pedido genérico devuelve cajas iguales que se caen; con usuarios, roles, reglas y tecnología alrededor, la estructura se rehace con nombres y jerarquía",
    "sim:aents-ia-partes": "Un pedido único dispara decenas de archivos y el rastro del error se pierde dos veces; después, cinco bloques que se construyen, se prueban y solo entonces ceden el turno",
    "sim:aents-ia-reglas": "Dos citas de ejemplo piden el mismo horario y chocan; las preguntas abiertas se voltean en reglas y el segundo intento recibe una respuesta y otro horario",
    "sim:aents-ia-camino-feliz": "El recorrido perfecto se confirma y se repite sin conexión, con doble toque y sin permiso: tres equis debajo del único visto",
    "sim:aents-ia-revision": "El cursor se desvía de aceptar todo hacia revisar; cada pregunta señala una línea y el resultado es un bloque menos y dos componentes convertidos en uno",
    "sim:aents-ia-dependencias": "Los paquetes se acoplan hasta enterrar la aplicación; tres preguntas desprenden a los que no las pasan y la aplicación vuelve a verse",
    "sim:aents-ia-seguridad": "Se retira el botón de administrador y la petición llega igual al servidor; después las capas de acceso, permisos y validación la rechazan con su motivo",
    "sim:aents-ia-secretos": "Contraseñas, claves, una hoja de clientes y una copia de la base de datos se detienen ante la barrera y solo pasa el código sin secretos",
    "sim:aents-ia-pruebas": "La misma pieza pasa de construir a probar, lanza cinco casos, falla uno, baja hasta la causa, la corrige y vuelve a lanzarlos todos",
    "sim:aents-ia-git": "El contador de archivos modificados sube hasta que la aplicación deja de abrir; el proyecto vuelve a su último punto estable y la línea se rehace con puntos pequeños",
    "sim:aents-ia-orden": "El proyecto se llena de archivos y enlaces hasta perder la lectura; los duplicados se funden y quedan tres grupos que se recorren de una pasada",
    "sim:aents-ia-criterio": "Código, interfaz y datos están listos pero el centro del negocio está vacío; una persona pone reglas, roles, proceso y objetivo, y el volante queda en su mano",
    "sim:aents-ia-cierre": "El camino de contexto a producto se ordena y da paso al isotipo, la invitación a contar qué estás construyendo y el dominio",
}

# The animations built to open a piece, and how each one is shot.
#
# A hook is not a scene like the others: it is the only one every viewer sees,
# it is the frame the feed freezes on, and in a piece that sells the making of
# software it is the sample of work. So it is built on `hero-stage.tsx` and
# `interface-kit.tsx`, which carry the camera, the depth planes, the light and
# the interface rules, and `quality.check_hero_scene` refuses a plan whose first
# scene names anything that is not on this list.
#
# The value is the camera move, and it is recorded rather than described because
# of what a shared kit does when nobody is watching: it raises the floor and
# then flattens every piece to one look. Two consecutive hooks may not use the
# same staging, and the same gate enforces that.
HERO_STAGINGS = {
    "sim:geo-location-hero": "track-side",
    "sim:credicasa-hero": "pull-back",
    "sim:aents-problema-software": "push-in",
    # Geo's first registered opening, and the one move of the five that suits
    # it. `crane-down` was tried and the frame it produced is the argument
    # against it: the subject here is a white card with a price on it, and a
    # camera that tilts nine degrees while travelling past turns that into a
    # skewed lozenge with its title cut off. `hold-in` keeps the push — the
    # frame is never static — and spends none of it on the thing being read.
    "sim:geo-ranking-hero": "hold-in",
}

# How long a single frame may take before Remotion gives up on it.
#
# The default is thirty seconds, which is generous for a 1080 x 1920 frame and
# not always enough for one at 2160 x 3840 with depth blurs on a machine that is
# also swapping: one frame of `sim:aents-etapas` blew past it and took an hour of
# finished work down with it. The number is not a fix for a slow composition —
# that is what the review measures — it is insurance, so a stall costs a scene
# instead of a master.
FRAME_TIMEOUT_MS = 180_000

# Silence held after the last caption so a scene never cuts on the final
# consonant.
SCENE_TAIL_SECONDS = 0.45

# How the master is encoded. Kept as data, not buried in the command, because
# the finished file cannot answer the question: x264 writes only
# "Lavc61.19.100 libx264" into the encoder tag, with no crf and no preset. Every
# render copies these into production.json so a published piece can prove what
# it was made with.
ENCODER_FLAGS = ["--crf", "16", "--x264-preset", "slow", "--pixel-format", "yuv420p"]

# The master is rendered at twice the composition size. Remotion redraws vector
# type and markup at that scale instead of upscaling pixels, so the detail is
# real, and the downsample below turns it into clean 1080x1920 edges. This is
# the one lever that survives the platform re-encode on flat brand graphics.
SUPERSAMPLE_SCALE = "2"

# How the master is delivered. `crf 16` is visually transparent but spends very
# few bits on flat colour, which lands these pieces near 1.2 Mbps; TikTok flags
# anything under about 5 Mbps for a quality downgrade and then re-encodes from
# that thin source. A fixed high bitrate is therefore worth more downstream than
# a low CRF, and `color_range tv` keeps levels from shifting on players that
# read the full-range flag x264 writes for JPEG-range input.
DELIVERY_FLAGS = [
    "-vf", "scale=1080:1920:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-profile:v", "high",
    "-color_range", "tv",
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
    "-movflags", "+faststart",
]

# TikTok only offers its high-quality upload for files under about 72 MB, so a
# long piece cannot simply take the highest bitrate: 12 Mbps put a 102 s master
# at 87 MB and lost the very route the bitrate was raised for. The target is
# therefore whatever fits under the budget, clamped to a floor that keeps the
# file above the ~5 Mbps the platform treats as low quality — x264 undershoots
# on flat colour, so the floor is enforced with `minrate`, not just requested.
UPLOAD_BUDGET_MB = 68
MIN_DELIVERY_MBPS = 5.6
MAX_DELIVERY_MBPS = 12.0


def delivery_bitrate(seconds: float) -> float:
    """Mbps for the master: as high as the upload budget allows, never below the floor."""
    if seconds <= 0:
        return MAX_DELIVERY_MBPS
    budget = (UPLOAD_BUDGET_MB * 8) / seconds
    return max(MIN_DELIVERY_MBPS, min(MAX_DELIVERY_MBPS, budget))


def bitrate_flags(seconds: float) -> list[str]:
    rate = delivery_bitrate(seconds)
    return [
        "-b:v", f"{rate:.1f}M",
        "-minrate", f"{rate:.1f}M",
        "-maxrate", f"{rate * 1.15:.1f}M",
        "-bufsize", f"{rate * 2:.1f}M",
    ]


def executable() -> Path:
    path = REMOTION / "node_modules/.bin/remotion"
    if not path.exists():
        raise RuntimeError("Remotion dependencies are missing. Run marketing/videos/setup")
    return path


def frames(seconds: float) -> int:
    return max(1, round(seconds * FPS))


def asset_kind(path: Path) -> str:
    if path.suffix.lower() in IMAGE_SUFFIXES:
        return "image"
    if path.suffix.lower() in VIDEO_SUFFIXES:
        return "video"
    raise RuntimeError(f"Unsupported asset: {path.name}")


def stage_fonts() -> Path:
    """Put the shared font and brand mark where Remotion can serve them."""
    public = REMOTION / "public"
    (public / "fonts").mkdir(parents=True, exist_ok=True)
    shutil.copy2(FONT, public / "fonts" / FONT.name)
    (public / "brand").mkdir(parents=True, exist_ok=True)
    for mark in {BRAND_TILE, BRAND_SYMBOL, LEGACY_BRAND_TILE, LEGACY_BRAND_SYMBOL}:
        if mark.exists():
            shutil.copy2(mark, public / "brand" / mark.name)
    return public


def job_name(directory: Path) -> str:
    """Use the canonical brand-qualified video identifier for staging."""
    prefix = f"{BRAND_ID}-"
    if not directory.name.startswith(prefix):
        raise RuntimeError(
            f"Video directory {directory.name} does not belong to active brand {BRAND_ID}"
        )
    return directory.name


def stage(directory: Path) -> Path:
    """Copy everything a render needs into Remotion's public directory."""
    public = stage_fonts()
    job = public / "jobs" / job_name(directory)
    if job.exists():
        shutil.rmtree(job)
    (job / "audio").mkdir(parents=True)
    (job / "assets").mkdir()
    return job


def still_for(directory: Path, job: Path, name: str) -> str | None:
    """A real screenshot the card simulation can use as its photo."""
    for candidate in sorted((directory / "assets/input").glob("*.png")) + sorted((directory / "assets/input").glob("*.jpg")):
        shutil.copy2(candidate, job / "assets" / candidate.name)
        return f"jobs/{name}/assets/{candidate.name}"
    return None


def brand_tile_path() -> str | None:
    return f"brand/{BRAND_TILE.name}" if BRAND_TILE.exists() else None


class AssetTimeline:
    """How far each shared clip has been played, so scenes continue it.

    A capture is one continuous take: tap the city, the map opens, tap a pin,
    the listing appears. Scenes that share a clip have to carry on through it
    instead of each restarting at the first frame.
    """

    def __init__(self, plan: dict[str, Any], timings: list[dict[str, Any]]) -> None:
        # Total time an animation is on screen, so its whole arc can be spread
        # over that time instead of restarting on every scene.
        self.spans: dict[str, int] = {}
        for scene, timing in zip(plan["scenes"], timings):
            animation = scene.get("asset")
            if animation in SIMULATIONS:
                self.spans[animation] = self.spans.get(animation, 0) + frames(timing["render_seconds"])
        self.played: dict[str, int] = {}

    def total(self, key: str | None, fallback: int) -> int:
        return self.spans.get(key or "", fallback)

    def advance(self, key: str, span: int, available: int | None = None) -> int:
        """Reserve the next `span` frames of a clip and say where they start."""
        start = self.played.get(key, 0)
        # A recording shorter than the scene loops back rather than run dry.
        if available is not None and start + span > available:
            start = 0
        self.played[key] = start + span
        return start


def stage_asset(directory: Path, job: Path, name: str, scene: dict[str, Any]) -> tuple[str | None, str | None]:
    """Copy a scene's footage into the job and say what kind it is."""
    asset = scene.get("asset")
    if not asset:
        return None, None
    if asset in SIMULATIONS:
        return asset, "simulation"
    source = directory / "assets/input" / asset
    if not source.is_file():
        raise RuntimeError(f"Scene asset is missing: {asset}")
    shutil.copy2(source, job / "assets" / source.name)
    return f"jobs/{name}/assets/{source.name}", asset_kind(source)


def scene_props(
    index: int,
    scene: dict[str, Any],
    timing: dict[str, Any],
    directory: Path,
    job: Path,
    name: str,
    timeline: AssetTimeline,
) -> dict[str, Any]:
    voice_target = job / "audio" / f"voice-{index + 1:02}.mp3"
    voice_relative = ""
    if timing.get("voice_file"):
        shutil.copy2(Path(timing["voice_file"]), voice_target)
        voice_relative = f"jobs/{name}/audio/{voice_target.name}"
    asset_relative, asset_type = stage_asset(directory, job, name, scene)
    span = frames(timing["render_seconds"])
    start = 0
    if asset_type == "simulation" and asset_relative:
        start = timeline.advance(asset_relative, span)
    elif asset_relative and asset_type == "video":
        available = frames(probe_duration(directory / "assets/input" / scene["asset"]))
        start = timeline.advance(scene["asset"], span, available)
    return {
        "purpose": scene["purpose"],
        "durationInFrames": span,
        "headline": scene["on_screen_text"],
        "captions": timing["captions"],
        "visualDirection": scene["visual_direction"],
        "transition": scene["transition"],
        "asset": asset_relative,
        "assetType": asset_type,
        # Remotion's card simulation can show a real listing photo; nothing
        # populates it yet, so the composition falls back to its drawn card.
        "photo": None,
        "voiceFile": voice_relative,
        "assetStartInFrames": start,
        "assetTotalInFrames": timeline.total(scene.get("asset"), span),
        # The rotation exists so consecutive pieces do not look identical, and
        # it runs through the whole shared palette — violet and lavender
        # included. On a piece drawn inside the product's own interface that is
        # another brand's colour on a green screen: `geo-015` came out with a
        # violet rule over its headline and a violet progress bar. A plan that
        # states an accent has made a decision, and the rotation defers to it.
        "accent": str(scene.get("accent") or "").strip() or ACCENTS[index % len(ACCENTS)],
    }


def build_props(
    directory: Path,
    plan: dict[str, Any],
    timings: list[dict[str, Any]],
    music: Path | None,
    narration: Path | None = None,
) -> dict[str, Any]:
    job = stage(directory)
    name = job_name(directory)
    timeline = AssetTimeline(plan, timings)
    scenes = [
        scene_props(index, scene, timing, directory, job, name, timeline)
        for index, (scene, timing) in enumerate(zip(plan["scenes"], timings))
    ]
    music_relative = None
    if music:
        shutil.copy2(music, job / "audio/music.mp3")
        music_relative = f"jobs/{name}/audio/music.mp3"
    narration_relative = None
    if narration:
        shutil.copy2(narration, job / "audio/narration.mp3")
        narration_relative = f"jobs/{name}/audio/narration.mp3"
    return {
        "brandId": BRAND_ID,
        "brandName": BRAND_NAME,
        "brandTagline": BRAND_TAGLINE,
        "brandSymbol": f"brand/{BRAND_SYMBOL.name}" if BRAND_SYMBOL.exists() else None,
        "title": plan["title"],
        "coverText": plan["cover_text"],
        "cta": plan["cta"],
        "url": URL,
        "brandTile": brand_tile_path(),
        "kicker": plan.get("kicker"),
        "musicFile": music_relative,
        "narrationFile": narration_relative,
        "showSafeAreas": False,
        "scenes": scenes,
    }

def open_gl() -> str | None:
    """Which OpenGL backend Chromium rasterises with.

    Left to Remotion's own choice by default, and that default is not laziness:
    `angle` was measured and rejected.

    On the hook of aents-001 — 120 frames at 2160 x 3840, every depth blur in the
    piece — the two backends came out at 568 s on software and 87 s on `angle`.
    Six and a half times faster is an enormous number, and it is not free: the
    large blurred radials that carry the key light and the halos come out
    markedly weaker on the GPU, which clamps a big blur radius where the software
    rasteriser resolves it. SSIM 0.992 and PSNR 44 dB read as «visually
    identical» and are not the point; the difference is not noise, it is the
    atmosphere the hero stage is built on.

    So `VIDEO_RENDER_GL=angle` stays available for a draft nobody will publish,
    and a master is not rendered with it. If that speed is wanted for real, the
    way to get it is to stop asking for `filter: blur` on full-screen layers —
    a wider radial gradient is already soft and costs nothing — not to switch
    backends and hope the difference does not show.
    """
    value = os.environ.get("VIDEO_RENDER_GL", "").strip()
    return value or None


def render_concurrency(explicit: int | None = None) -> int | None:
    """How many browser tabs Remotion may render into at once.

    Remotion defaults to one tab per core, and each one holds a full frame — at
    `--scale 2` that is 2160 x 3840. On a 16 GB machine already running another
    render this exhausts memory and the tabs die one after another with
    `target closed`, which looks like a bug in the composition and is not one.

    Nothing is passed by default, so a machine with room keeps Remotion's own
    choice. `VIDEO_RENDER_CONCURRENCY` caps it for a session; `--concurrency`
    caps one render.
    """
    if explicit:
        return explicit
    value = os.environ.get("VIDEO_RENDER_CONCURRENCY")
    return int(value) if value and value.isdigit() and int(value) > 0 else None


def run_remotion(command: list[str], log: Path) -> tuple[int, str]:
    """Run Remotion with its progress visible while it runs, not after.

    Capturing the output kept every `Rendered n/N` line inside the process until
    it exited. That was survivable at thirty seconds; a lesson is close to six
    thousand frames at 2160 x 3840, so a render that was progressing normally
    and one whose tabs had died looked exactly alike for over an hour. The lines
    go to a log beside the master as they arrive, and the tail comes back for
    the error message.
    """
    log.parent.mkdir(parents=True, exist_ok=True)
    tail: deque[str] = deque(maxlen=40)
    with log.open("w", encoding="utf-8") as handle:
        process = subprocess.Popen(
            command, cwd=REMOTION, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=1
        )
        assert process.stdout is not None
        for line in process.stdout:
            handle.write(line)
            handle.flush()
            tail.append(line)
        code = process.wait()
    return code, "".join(tail)


def remotion_render(
    props_path: Path,
    target: Path,
    composition: str = "EstateMapVideo",
    *,
    supersample: bool = False,
    concurrency: int | None = None,
    frames: tuple[int, int] | None = None,
    muted: bool = False,
    codec: str = "h264",
) -> Path:
    """Run Remotion once, and nothing else.

    `frames` renders an inclusive range instead of the whole composition. The
    props are the complete plan either way, so the composition still knows how
    long the piece is and where this stretch sits inside it: the progress cue,
    the scene index and the arc of an animation that spans a cut all come out
    exactly as they would in a single pass. That is what makes a range
    interchangeable with the same frames of a full render, and it is the whole
    basis of the scene cache.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    command = [
        str(executable()), "render", "src/index.ts", composition, str(target),
        "--props", str(props_path), "--codec", codec,
        "--timeout", str(FRAME_TIMEOUT_MS),
    ]
    if codec == "h264":
        command += ENCODER_FLAGS
    if supersample:
        command += ["--scale", SUPERSAMPLE_SCALE]
    if frames:
        command += [f"--frames={frames[0]}-{frames[1]}"]
    if muted:
        command += ["--muted"]
    backend = open_gl()
    if backend:
        command += ["--gl", backend]
    tabs = render_concurrency(concurrency)
    if tabs:
        command += ["--concurrency", str(tabs)]
    code, tail = run_remotion(command, target.parent / f"{target.stem}.render.log")
    if code:
        raise RuntimeError(f"Remotion render failed:\n{tail}")
    return target


def deliver(source: Path, target: Path, audio: Path | None = None) -> Path:
    """Turn a supersampled render into the delivery master.

    One re-encode, from a generous source, at the fixed high bitrate the
    platform needs. Splitting the render into cached scenes does not add a
    generation: the chunks are the same intermediate the single pass produced,
    and this is still the only place the picture is resampled.
    """
    flags = bitrate_flags(probe_duration(source))
    inputs = ["-i", str(source)]
    mapping: list[str] = []
    if audio:
        inputs += ["-i", str(audio)]
        mapping = ["-map", "0:v:0", "-map", "1:a:0"]
    media.run(["ffmpeg", "-y", *inputs, *mapping, *DELIVERY_FLAGS, *flags, str(target)])
    return target


def render_video(
    props_path: Path,
    target: Path,
    composition: str = "EstateMapVideo",
    supersample: bool = False,
    concurrency: int | None = None,
) -> Path:
    """Export the master at the highest quality the platform can carry.

    TikTok and Reels re-encode whatever they receive, so the master is not what
    the viewer sees: it is the source the platform compresses from. Every bit
    lost here is lost again downstream, and flat brand graphics — large areas of
    solid colour with hard type over them — are exactly what shows banding and
    mosquito noise first.

    `crf 16` is visually transparent and leaves that downstream margin;
    `preset slow` spends encoder time, not quality, and `profile high` with
    `yuv420p` is what both platforms decode without falling back. The master is
    never re-compressed to fit an upload limit: if it does not fit, it is
    uploaded by hand.

    `supersample` renders at twice the composition size and resamples down to
    1080x1920 at a fixed high bitrate. Type is redrawn rather than upscaled, and
    the platform then re-encodes from a generous source instead of the ~1.2 Mbps
    a low CRF spends on flat colour. It costs roughly four times the render, so
    only the master asks for it; scene previews stay at composition size.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    render_target = target.with_name(f"{target.stem}.supersampled{target.suffix}") if supersample else target
    try:
        remotion_render(
            props_path, render_target, composition, supersample=supersample, concurrency=concurrency
        )
        if supersample:
            deliver(render_target, target)
    finally:
        if supersample:
            render_target.unlink(missing_ok=True)
    return target


def render_cover(directory: Path, plan: dict[str, Any], target: Path) -> Path:
    """Export the still cover.

    The asset is staged from the video's own input directory rather than read
    from a previous render's job folder, so `video cover` produces the same
    image whether or not a render ran first.
    """
    name = job_name(directory)
    job = REMOTION / "public/jobs" / name
    (job / "assets").mkdir(parents=True, exist_ok=True)
    asset = None
    asset_type = None
    for scene in plan["scenes"]:
        name = scene.get("asset")
        source = directory / "assets/input" / name if name else None
        if source and source.is_file() and asset_kind(source) == "image":
            shutil.copy2(source, job / "assets" / source.name)
            asset = f"jobs/{name}/assets/{source.name}"
            asset_type = "image"
            break
    try:
        video_number = int(directory.name.rsplit("-", 1)[-1])
    except ValueError:
        video_number = 1
    props = {
        "brandId": BRAND_ID,
        "brandName": BRAND_NAME,
        "brandTagline": BRAND_TAGLINE,
        "brandSymbol": f"brand/{BRAND_SYMBOL.name}" if BRAND_SYMBOL.exists() else None,
        "coverText": plan["cover_text"],
        # Which illustration the cover shows, named by the plan instead of
        # guessed from a word in the title. A cover that changed its hook used
        # to load the wrong illustration and cover its own headline.
        "coverArt": plan.get("cover_art"),
        "cta": plan["cta"],
        "audience": plan.get("audience") or "",
        "url": URL,
        "brandTile": brand_tile_path(),
        "accent": ACCENTS[(video_number - 1) % len(ACCENTS)],
        "asset": asset,
        "assetType": asset_type,
    }
    props_path = directory / "cover-props.json"
    props_path.write_text(json.dumps(props, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    target.parent.mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(
        [str(executable()), "still", "src/index.ts", "EstateMapCover", str(target), "--props", str(props_path)],
        cwd=REMOTION,
        text=True,
        capture_output=True,
    )
    if completed.returncode:
        raise RuntimeError(f"Remotion cover failed:\n{completed.stdout[-1500:]}\n{completed.stderr[-1500:]}")
    return target
