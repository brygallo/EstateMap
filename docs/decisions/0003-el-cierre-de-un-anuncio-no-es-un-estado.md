# 0003 — Un anuncio cerrado no es un estado nuevo, es una columna aparte

- **Fecha:** 2026-08-05
- **Estado:** aceptada
- **Reglas afectadas:** `PROP-033`, `PROP-034` (`specs/domains/properties.yaml`),
  `SOC-102` (`specs/domains/social-kit.yaml`), `WFP-012` y `WFP-013`
  (`specs/workflows/publish-property.yaml`)

## Contexto

Hasta el 2026-08-05 «vendido», «alquilado» y «retirado» eran la misma cosa para
el sistema: `status = 'inactive'`. La fila salía del catálogo y no quedaba rastro
de por qué.

Eso bloqueaba dos cosas a la vez:

- **La pregunta que demuestra que el portal sirve.** «¿Cuántas propiedades se
  vendieron aquí?» no tenía respuesta, porque una venta y un abandono se
  escribían igual.
- **La lámina de «vendido» de `SOC-102`.** Es la pieza más valiosa del kit de
  promoción y la menos evidente: no vende ese inmueble —ya está vendido—, la
  comparte el agente porque es su currículum, y al hacerlo reparte el logo y el
  código corto del portal entre gente que no lo conoce. Para ofrecerla hay que
  saber que el cierre ocurrió de verdad.

La forma obvia de arreglarlo era devolver `sold` y `rented` a
`Property.STATUS_CHOICES`. De hecho ya estuvieron ahí: `0001_initial` los tenía
(`backend/real_estate/migrations/0001_initial.py:53`) y `0005_alter_property_status`
los retiró el 2025-11-18 dejando los tres actuales.

## Decisión

**El cierre vive en su propia columna.** `Property` gana `closed_reason`
(`sold` / `rented` / `withdrawn`, vacío = sigue abierto) y `closed_at`
(`backend/real_estate/models.py:142-149`). `STATUS_CHOICES` se queda con
`for_sale`, `for_rent` e `inactive`, exactamente los mismos tres de antes
(`backend/real_estate/models.py:72-76`).

Un anuncio cerrado es un anuncio `inactive` **con motivo**. La normalización
está en `save()` (`backend/real_estate/models.py:258-269`), que es por donde
pasan todos los caminos de escritura: poner el motivo fuerza `status='inactive'`
y sella `closed_at`; quitarlo borra la fecha. Reabrir significa borrar el motivo,
no cambiar el estado — mientras el motivo siga puesto, el siguiente guardado
devolvería la fila a `inactive` sola.

## Por qué

**Porque `status` es la palanca sobre la que está construida toda lectura
pública, y no hay una sola.** Un cuarto valor no se añade en un sitio: se añade
en todos los sitios que hoy dicen `exclude(status='inactive')`, y hasta encontrar
el último, un piso vendido sigue en el mapa. Los que existen hoy, verificados uno
por uno:

| Superficie | Dónde |
| --- | --- |
| Catálogo, listado y mapa | `backend/real_estate/views.py:407` |
| Inteligencia de mercado de una ficha | `backend/real_estate/views.py:589`, `:622`, `:627` |
| Resolución del código corto impreso | `backend/real_estate/views.py:769` |
| Filtro de propietarios del mapa | `backend/real_estate/views.py:785` |
| Ciudades y ubicaciones con inventario | `backend/real_estate/views.py:817` |
| `market-stats`, del que salen las landings SEO server-rendered | `backend/real_estate/views.py:1875` |
| Panel de ingesta: contadores, listados y mantenimiento | `backend/ingesta/api.py:56`, `:81`, `:228`, `:298` |
| Refresco y retirada de anuncios importados | `backend/ingesta/runner.py:377`, `backend/ingesta/management/commands/ingesta_import.py:101` |
| Métricas por fuente | `backend/ingesta/management/commands/ingesta_stats.py:30` |

El `sitemap.xml` y el `llms.txt` no aparecen en esa lista porque no repiten el
filtro: se construyen sobre `getProperties()`, que llama a `GET /api/properties/`
(`frontend/lib/properties.ts:60`, `frontend/app/sitemap.ts:37`,
`frontend/app/llms.txt/route.ts:25`). Heredan el filtro del backend, lo cual
juega a favor de esta decisión: con una columna aparte no hay nada que cambiar
ahí; con un cuarto estado tampoco habría hecho falta tocarlos, pero cualquier
error en el backend se habría propagado directo al índice de Google y a lo que
citan los modelos de lenguaje.

**Porque el estado ya se había decidido antes, y a propósito.**
`0005_alter_property_status` retiró `sold` y `rented`. Revertir eso obliga a
resolver la pregunta que aquella migración esquivó —qué hace el inventario
público con un anuncio vendido— y a hacerlo en el mismo cambio.

**Porque había un test verde afirmando lo contrario.** `WFP-012` fija que el
selector de publicación ofrece exactamente las tres opciones del modelo y que
cualquier otra recibe `400`; su caso de API manda `status: sold` y espera ese
`400` (`backend/real_estate/tests/generated/test_spec_publish_property.py:52`).
La regla se cerró el 2026-08-04, un día antes, después de que el formulario
ofreciera durante meses dos estados que el modelo rechazaba y quien los elegía
recibiera un error de validación sin explicación. Añadir `sold` habría vuelto a
poner en rojo la guardia de regresión escrita el día anterior justo para eso.

**Y porque un cierre es otro hecho.** `status` responde «¿qué ofrece este
anuncio?»: venta, alquiler, nada. `closed_reason` responde «¿por qué se fue?».
Meter la segunda respuesta en el campo de la primera obliga a todo el que filtre
por operación a conocer palabras que no son operaciones.

## Alternativas descartadas

**Añadir `sold` y `rented` a `STATUS_CHOICES`.** Es lo descrito arriba: nueve
puntos de filtrado que auditar, una migración que se revierte, un test verde que
se rompe y un campo que pasa a significar dos cosas. Estaba propuesta como
`WFP-013` desde antes; se queda en `proposed` con la nota de que la necesidad ya
está cubierta por otro camino.

**Deducir el cierre del contexto** (por ejemplo, «inactivo y con un lead
convertido = vendido»). Convierte una afirmación del dueño en una conjetura del
sistema, y esa conjetura acaba impresa en una imagen que se reenvía por WhatsApp
y que sobrevive a cualquier corrección posterior. `SOC-102` niega la lámina
cuando el momento no ocurrió justamente por eso.

**Una tabla de cierres con historial.** Un anuncio se cierra una vez; si se
reabre, lo interesante es que está abierto otra vez. Una tabla añade un JOIN a
cada lectura de la ficha a cambio de un historial que nadie ha pedido. Si algún
día hace falta (reaperturas repetidas, auditoría de quién cerró), el sitio
natural es una tabla nueva, no partir esta columna.

## Consecuencias

- **Un anuncio cerrado conserva ficha y código corto** (`PROP-034`). Las
  acciones de detalle resuelven la fila por id y dejan pasar cualquier anuncio
  con motivo de cierre (`backend/real_estate/views.py:399`), y la ruta del código
  corto excluye solo `inactive` **sin** motivo
  (`backend/real_estate/views.py:769`). Es la condición para que el QR impreso en
  una lámina de «vendido» no caiga en un 404.
- **Retirar sigue siendo retirar.** Sin motivo, la ficha desaparece igual que
  siempre. La diferencia no es de estado, es de intención.
- **El dueño ya alcanza sus propios anuncios inactivos** por la ficha
  (`backend/real_estate/views.py:404`). Era un hueco funcional anterior: quien
  desactivaba un anuncio se quedaba sin poder abrirlo, editarlo ni reactivarlo, y
  con el cierre habría sido peor, porque marcar «vendido» habría equivalido a
  perder el anuncio.
- **Reabrir hay que hacerlo explícito en cada camino que no pase por `save()`.**
  El serializer lo hace al cambiar el estado a algo distinto de `inactive`
  (`backend/real_estate/serializers.py:38-49`), y el cambio de estado en lote del
  panel admin lo repite a mano porque usa `.update()`
  (`backend/real_estate/views.py:2531-2534`). Cualquier futuro `.update()` masivo
  sobre `status` tiene la misma obligación: es el precio de que el motivo mande
  sobre el estado.
- **El panel admin puede reabrir pero no cerrar.** `PATCH_ALLOWED_FIELDS` del
  `AdminPropertyViewSet` sigue siendo `{status, title, price, city, description}`
  (`backend/real_estate/views.py:2344`), así que `closed_reason` no se puede
  escribir por ahí. Marcar un anuncio como vendido es hoy cosa del dueño, por el
  CRUD de propiedades. No es un descuido que haya que arreglar sin pensarlo: un
  cierre es una afirmación sobre un negocio ajeno.
- **`sold` y `rented` siguen sin ser estados válidos**, y el test que lo
  comprueba sigue verde. Quien vuelva a proponerlos tiene aquí la lista de lo que
  tendría que auditar.
