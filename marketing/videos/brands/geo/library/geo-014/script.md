# Video 014: Empieza por el lugar, no por la lista

Estado: `planificado`

## Estrategia

- Público: comprador
- Etapa: descubrimiento
- Objetivo: Que quien busca propiedad entre al mapa y explore por zona en vez de recorrer anuncios sueltos.
- Conversión: Sesión de exploración del mapa desde el perfil o el enlace.
- Pilar: Mapa primero
- Serie: Busca así, no así
- Concepto: El orden de la búsqueda invertido: en vez de abrir anuncio por anuncio y averiguar después dónde queda cada uno, mueves el mapa hasta la zona donde quieres vivir y las propiedades aparecen ahí dentro, con su precio. La pieza termina en la ficha de la que te interesó.
- Promesa: Puedes empezar la búsqueda por la zona donde quieres vivir y ver ahí mismo lo que hay.
- CTA: Encuentra tu futuro hogar
- Hipótesis: El geo-002 nombra el hábito para negarlo; esta pieza propone el orden contrario desde el primer segundo. Si el mapa se mueve por una mano visible antes del segundo tres, la promesa se entiende sin sonido y sube el clic al enlace del perfil.
- Portada: Empieza por el lugar

## Guion y escenas

| Escena | Tiempo | Función | Visual | Voz | Rótulo | Recurso | Transición |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.0–5.0 s | gancho | El mapa del país se acerca en un solo movimiento continuo: las burbujas de ciudad se abren en barrios y después en casas con su precio. El producto está en cuadro desde el primer fotograma. | Empieza por el lugar donde quieres vivir, y no por la lista de anuncios. | Empieza por el lugar | sim:mapa | cut |
| 2 | 5.0–11.0 s | problema | La pila de anuncios cae y se desplaza cada vez más rápido: cada tarjeta tiene su foto y su precio, y debajo el aviso de que la ubicación no está indicada. | Anuncio por anuncio ves fotos y precios sueltos, sin saber en qué parte de la ciudad estás. | Precios sin lugar | sim:anuncios | cut |
| 3 | 11.0–18.0 s | prueba | Una mano arrastra el mapa hasta la zona y la toca; el círculo de la zona se traza mientras la cámara sigue cerrando. Las tarjetas sueltas de arriba caen dentro del círculo y se convierten en precios ubicados. Remate: la etiqueta de la zona aterriza sobre los pines. | En Geo Propiedades Ecuador mueves el mapa hasta la zona que te interesa, y las propiedades aparecen ahí dentro. | Elige la zona | sim:elige-zona | cut |
| 4 | 18.0–24.0 s | resultado | La ficha pública entra con su galería, su precio de ejemplo rotulado y sus características declaradas. Sin cifras de zona ni de comparables. | Abres la que te gusta y ves sus fotos, su precio, sus características y dónde está. | Abre su ficha | sim:ficha | cut |
| 5 | 24.0–28.0 s | cta | Cierre global aprobado: tile de marca, Geo Propiedades Ecuador, dominio, CTA y firma de Aents. | Encuentra tu futuro hogar en geo propiedades ecuador punto com. | Encuentra tu hogar | Fondo de marca | fade |

## Voz completa

Empieza por el lugar donde quieres vivir, y no por la lista de anuncios. Anuncio por anuncio ves fotos y precios sueltos, sin saber en qué parte de la ciudad estás. En Geo Propiedades Ecuador mueves el mapa hasta la zona que te interesa, y las propiedades aparecen ahí dentro. Abres la que te gusta y ves sus fotos, su precio, sus características y dónde está. Encuentra tu futuro hogar en geo propiedades ecuador punto com.

## Caption

Buscar propiedad anuncio por anuncio es ver fotos y precios sueltos sin saber en qué parte de la ciudad estás. En Geo Propiedades Ecuador el orden es al revés: mueves el mapa hasta la zona donde quieres vivir y las propiedades aparecen ahí dentro, con su precio. Abres la que te gusta y ves sus fotos, sus características y dónde está. Encuentra tu futuro hogar en geopropiedadesecuador.com #GeoPropiedadesEcuador #BienesRaicesEcuador #CasasEnEcuador #Mapa

## Verificación antes de publicar

- [ ] Todo lo que muestra la pieza existe hoy: mapa interactivo con propiedades, precio sobre el mapa y ficha pública con fotos, precio, características y ubicación, según product-context.md y el código del portal.
- [ ] No se afirma cuántas propiedades hay en el mapa, en una ciudad o en una zona. La animación de zona no pinta conteos de inventario ni de comparables.
- [ ] Los precios que aparecen sobre el mapa y en la ficha son ejemplos de anuncio, marcados con el rótulo EJEMPLO en pantalla; no describen precios de mercado.
- [ ] No se juzga ninguna zona como segura, rentable o de alta plusvalía; la pieza solo muestra cómo se busca.
- [ ] No se menciona ni se insinúa el kit social, ni publicación automática en redes ni video automático del anuncio.
- [ ] sim:mapa, sim:anuncios, sim:elige-zona y sim:ficha están implementadas y registradas en Python y en Remotion; cada una ilustra literalmente la frase de su escena.
