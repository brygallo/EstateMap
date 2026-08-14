# Registro de publicaciones

Qué pieza está terminada, dónde se publicó y en qué estado quedó. El catálogo
(`memory/catalog.json`) guarda el estado interno de producción; este archivo
guarda lo que ocurrió **fuera** de la fábrica, en cada red.

Un video no cuenta como publicado aquí hasta que existe en la red con su
descripción y su portada definitivas. Si una red lo deja en revisión, se anota
tal cual: media verdad publicada es una mentira en el registro.

## Estado por video

| Video     | Título                                      | Producción | TikTok      | Facebook    |
| --------- | ------------------------------------------- | ---------- | ----------- | ----------- |
| video-001 | ¿Comprarías una casa sin saber dónde queda? | Terminado  | Publicado   | Publicado   |
| video-002 | Deja de buscar propiedades a ciegas         | Terminado  | Publicado   | Publicado   |
| video-003 | Publica tu propiedad por $0                 | Terminado  | Publicado   | Publicado   |
| video-005 | Tres cosas que revisar antes de contactar   | Terminado  | Publicado   | Publicado   |
| video-006 | Cómo nació Geo Propiedades Ecuador          | Terminado  | Publicado   | Publicado   |
| video-008 | Catorce mil ya están en el mapa. La tuya no | Terminado  | Publicado   | **Pendiente** |
| video-009 | Antes de ir a ver un terreno, revisa la ficha | Terminado | Publicado   | Publicado   |
| video-007 | Esta web la hizo Aents                      | Terminado  | Publicado   | Publicado   |

Leyenda de producción: **Terminado** = renderizado, revisado automáticamente y
firmado por una persona (`video sign`). Los estados internos previos viven en
`memory/catalog.json`.

## video-001

- **Paquete**: `library/_outbox/2026-08-13_comprador_mapa-primero_una-propiedad-atrae_gancho-v01/`
- **Duración**: 15,0 s · 1080 × 1920 · voz ElevenLabs (final) · música «Close Up» (Mixkit, libre comercial)
- **Firmado por**: bryan, 13 ago 2026
- **Portada**: personalizada (`exports/cover.png`), subida a mano en ambas redes.
- **Descripción publicada**:

  > ¿Comprarías una casa sin saber dónde queda? En Geo Propiedades Ecuador ves su
  > ubicación exacta y encuentras opciones en la zona que necesitas. Compara fotos,
  > precio y detalles de cada propiedad en geopropiedadesecuador.com
  > #ecuador #bienesraices #casasenventa #quito #guayaquil #inmobiliaria

### TikTok

- **Cuenta**: Geo Propiedades Ecuador
- **Publicado**: 13 ago 2026, 12:06 p. m.
- **Visibilidad**: Todo el mundo. Al subirlo TikTok lo dejó unos minutos como
  «Contenido en revisión» y visible solo para la cuenta; es el paso automático
  posterior a la carga y se resolvió solo.
- **Enlace**: https://www.tiktok.com/@geopropiedadesecuador/video/7673563852407065877

### Facebook

- **Cuenta**: página GEO Propiedades Ecuador (no el perfil personal; hay que
  cambiar de perfil antes de crear el reel, o se publica como la persona)
- **Formato**: Reel
- **Publicado**: 13 ago 2026
- **Enlace**: https://www.facebook.com/reel/1376670330596544

## video-002

- **Paquete**: `library/_outbox/2026-08-13_comprador_mapa-primero_buscar-sin-ubicacion_gancho-v01/`
- **Duración**: 16,4 s · 1080 × 1920 · voz ElevenLabs (final) · música «Close Up» (Mixkit, libre comercial)
- **Firmado por**: bryan, 13 ago 2026
- **Portada**: personalizada (`exports/cover.png`), acento violeta, subida a mano en ambas redes.
- **Descripción publicada** (idéntica a `caption.txt`, sin añadidos):

  > Buscar casa sin saber dónde queda es perder tiempo. En Geo Propiedades Ecuador
  > eliges tu ciudad, te acercas a la zona y ves las casas con su precio sobre el
  > mapa. Filtra y quédate con lo que sí te sirve. Encuentra tu futuro hogar en
  > geopropiedadesecuador.com #geopropiedadesecuador #ecuador #casasenecuador #mapa

### TikTok

- **Cuenta**: Geo Propiedades Ecuador
- **Publicado**: 13 ago 2026, 12:47 p. m.
- **Enlace**: https://www.tiktok.com/@geopropiedadesecuador/video/7673573798339202325

### Facebook

- **Cuenta**: página GEO Propiedades Ecuador
- **Formato**: Reel
- **Publicado**: 13 ago 2026
- **Enlace**: https://www.facebook.com/reel/1586443222847932

## video-003

- **Paquete**: `library/_outbox/2026-08-13_propietario_publicar-sin_mini-tutorial-para_gancho-v01/`
- **Duración**: 24,0 s · 1080 × 1920 · voz ElevenLabs (final) · música «Close Up» (Mixkit, libre comercial)
- **Firmado por**: bryan, 13 ago 2026
- **Portada**: personalizada (`exports/cover.png`), acento verde, subida a mano en ambas redes.
- **Descripción publicada** (idéntica a `caption.txt`, sin añadidos):

  > ¿Vas a vender o alquilar una propiedad? Anúnciala por $0 y sin comisión en Geo
  > Propiedades Ecuador. Elige el tipo y la operación, marca la ubicación con un
  > punto o la Forma del terreno, agrega el precio, sube tus fotos y elige la
  > portada. Empieza en geopropiedadesecuador.com
  > #BienesRaicesEcuador #PropiedadesEcuador

### TikTok

- **Cuenta**: Geo Propiedades Ecuador
- **Publicado**: 13 ago 2026
- **Enlace**: https://www.tiktok.com/@geopropiedadesecuador/video/7673604827011796245

### Facebook

- **Cuenta**: página GEO Propiedades Ecuador
- **Formato**: Reel
- **Publicado**: 13 ago 2026
- **Enlace**: https://www.facebook.com/reel/1592022199083099

## video-005

- **Paquete**: `library/_outbox/2026-08-13_comprador_educacion-inmobiliaria_un-mini-tutorial_gancho-v01/`
- **Duración**: 35,2 s · 1080 × 1920 · voz ElevenLabs (final)
- **Firmado por**: bryan, 13 ago 2026
- **Portada**: personalizada (`exports/cover.png`), subida a mano.
- **Primero con el margen lateral corregido**: se renderizó a las 15:32, después del cambio de
  `sideCrop` de las 14:57. Verificado recortando el MP4 a 19.5:9: el dominio, el tile y los
  titulares quedan enteros.

### TikTok

- **Cuenta**: Geo Propiedades Ecuador
- **Publicado**: 13 ago 2026
- **Enlace**: pendiente de anotar

### Facebook

- **Publicado**, subido a mano por bryan. La automatización no pudo: el diálogo «Crear reel» aceptó
  el MP4 en los dos `input[type=file]` y en tres recargas, y en las tres se quedó en «Subir video»
  sin generar vista previa. No era el archivo —los videos 002 y 003 subieron por esa misma vía el
  mismo día—, era el creador de reels fallando.

## video-006

- **Paquete**: `library/_outbox/2026-08-13_comprador_confianza-y_el-fundador-cuenta_gancho-v01/`
- **Duración**: 101,8 s (1:41) · 1080 × 1920 · voz ElevenLabs (final) · música «Piano Reflections» (Mixkit)
- **Firmado por**: bryan, 13 ago 2026
- **Máster a calidad máxima**, confirmado por la sesión que lo produjo: leyó `renderer.py` con las
  flags nuevas ya puestas y lanzó el render después. 29,12 MB, 2,07 Mbps.
- **Subido a mano por bryan**, arrastrando el archivo.

### TikTok

- **Cuenta**: Geo Propiedades Ecuador
- **Publicado**: 13 ago 2026, con «Cargas en alta calidad» activo.

### Facebook

- **Publicado**, confirmado el 14 ago en «Tus reels» de la página. Facebook aceptó el reel pese a
  los 101,8 s: el tope de 90 s no se aplicó. Tardó en procesarse, y por eso no aparecía en la
  comprobación del mismo día.

## video-008

- **Paquete**: `library/_outbox/2026-08-14_propietario_publicar-sin_pieza-de-venta_gancho-v01/`
- **Duración**: 42,4 s · 8,64 MB · voz ElevenLabs (final) · `crf 16 / preset slow` registrado en `production.json`
- **Firmado por**: bryan, 14 ago 2026
- **La cifra del gancho está verificada.** «Más de catorce mil propiedades en venta» se comprobó
  contra `geopropiedadesecuador.com/estadisticas-inmobiliarias`, que publica **14.950** activas. Se
  enuncia como piso, no como cantidad exacta, y ninguna animación la pinta: vive solo en la
  locución. Si ese conteo público bajara de catorce mil, la pieza deja de ser cierta y se retira.
### TikTok

- **Publicado**: 14 ago 2026, 11:43. Visibilidad «Todo el mundo», portada personalizada,
  «Cargas en alta calidad» activo. Costó cuatro intentos: el uploader se queda girando después de
  descartar un borrador anterior, y sólo aceptó el archivo tras recargar con la sesión limpia.

### Facebook

- **Pendiente.** El diálogo «Crear reel» volvió a atascarse en «Subir video» con los dos
  `input[type=file]`. Es el mismo fallo intermitente que costó tres recargas en el 003 y que nunca
  aceptó el 005. Se sube a mano.

## video-007

- **Paquete**: `library/_outbox/2026-08-13_profesional_confianza-y_caso-de-estudio_gancho-v01/`
- **Duración**: 60,7 s · 1080 × 1920 · voz ElevenLabs (final) · música «Close Up» (Mixkit)
- **Firmado por**: bryan, 13 ago 2026
- **Qué es**: anuncio de Aents, no del portal. Su escena final es `sim:aents-contacto`, que trae su
  propio cierre con logo, teléfono, WhatsApp y aents.net en vez de la tarjeta de marca común.
- **Máster a calidad máxima**: primer video renderizado con `crf 16` y `preset slow`. 13,26 MB, un
  14 % más de datos que con el ajuste anterior para la misma duración y resolución.
- **Subido a mano por bryan** en las dos redes, arrastrando el archivo: pesa más que los 10 MB que
  admite el puente del navegador, y el máster no se recomprime para sortear ese límite. El resto
  —descripción, portada, ajustes y publicación— lo hizo la automatización.

### TikTok

- **Cuenta**: Geo Propiedades Ecuador
- **Publicado**: 13 ago 2026, con «Cargas en alta calidad» activo. TikTok lo marcó como 1080P.

### Facebook

- **Cuenta**: página GEO Propiedades Ecuador
- **Formato**: Reel
- **Publicado**: 13 ago 2026

### Dos renders descartados antes de este

- El de las 16:38 pintaba **cifras de inventario inventadas** en las burbujas del mapa —8719 Quito,
  3779 Guayaquil, 2233 Cumbayá, 1915 Nayón, 487 Cuenca— hardcodeadas en `simulations.tsx` sin
  fuente. Estaba subido a TikTok y a un clic de publicarse. Se descartó la subida. Los videos 001 y
  002 salieron con esas cifras y quedan congelados así.
- El siguiente ya no las tenía, pero los nombres largos se salían del círculo: la etiqueta se
  pintaba a un tamaño fijo pensado para cuatro dígitos. Corregido en `Bubble`, que ahora escala el
  texto a la longitud del nombre.

## video-009

- **Paquete**: `library/_outbox/2026-08-14_comprador_educacion-inmobiliaria_pieza-educativa-que_gancho-v01/`
- **Duración**: 89,5 s · 13,62 MB · voz ElevenLabs (final) · música «Curiosity» de Diego Nava (Mixkit)
- **Firmado por**: bryan, 14 ago 2026
- **Primera voz que se paga de verdad en la tanda**: 1.353 caracteres nuevos, ninguno cacheado. Los
  renders anteriores reutilizaban compras previas y salían a coste cero.
- **La voz pagada alargó la pieza un 15 %**: 77,6 s con Kokoro, 89,5 s con ElevenLabs. Coherente con
  la lección de que el estimador mide la voz de borrador.
- **Música nueva a propósito**: «Close Up» ya sonaba en cinco de los ocho videos anteriores.
- **Qué promete y qué no**: es diligencia debida para comprar terreno —escrituras, gravámenes, uso
  de suelo, linderos, servicios—, declara que no es asesoría legal y remite a un abogado y a un
  topógrafo. No afirma que ninguna zona sea buena, segura ni rentable. El producto aparece en una
  escena de nueve, solo para ver dónde queda y qué hay alrededor.

### TikTok

- **Publicado**: 14 ago 2026. Portada personalizada y «Cargas en alta calidad» activo.

### Facebook

- **Publicado**: 14 ago 2026, confirmado por la notificación «Tu reel ya se puede ver». El archivo
  lo soltó bryan a mano; el resto lo hizo la automatización.

## Lo que cuesta tiempo al publicar

- **Facebook no acepta el video por automatización, y no es cuestión de acertar con el input.**
  Medido el 14 ago: tras inyectar el archivo en el `input[type=file]`, una consulta inmediata por
  JavaScript devuelve `files.length === 0`. El componente se remonta y descarta lo inyectado, así
  que el diálogo se queda en «Subir video» sin vista previa porque nunca llegó a tener el archivo.
  Funciona de vez en cuando —002, 003, 006 y 007 pasaron— solo cuando el componente no se remonta
  a tiempo, de ahí que parezca aleatorio.
  La ruta que Facebook sí escucha es un `drop` real, con `isTrusted: true`. No se puede falsificar:
  reenviar el `File` desde el input requiere que el archivo siga ahí (no sigue), y JavaScript no
  puede construir un `File` desde una ruta del disco por seguridad del navegador.
  **Conclusión: el video lo suelta una persona.** El resto —descripción, portada, ajustes y
  publicar— sí lo hace la automatización. No gastes más de un intento antes de pedirlo.
- **Facebook publica como quien seas en ese momento.** Cambia al perfil de la
  página *antes* de abrir el creador; el diálogo no ofrece elegir destino.
- **TikTok retiene el video unos minutos** en «Contenido en revisión» con
  visibilidad «Solo yo». Se resuelve solo; no hay que tocar nada.

## Métricas

Las métricas no se anotan aquí. Se exportan de cada red a un CSV y se cargan con
`video results <id> --file <csv>`, que mueve el video a `published` en el
catálogo y habilita `video learn` para convertirlas en lecciones.
