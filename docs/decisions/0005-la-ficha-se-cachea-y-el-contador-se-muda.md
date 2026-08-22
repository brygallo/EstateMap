# 0005 — La ficha se sirve cacheada, así que el contador de visitas se muda al navegador

- **Fecha:** 2026-08-22
- **Estado:** aceptada

## Contexto

El 21 de agosto de 2026 `/propiedad/[id]` pasó a servirse con ISR: `revalidate =
300` más `generateStaticParams` vacío y `dynamicParams`, de modo que cada ficha
se renderiza bajo demanda una vez y se entrega desde caché durante cinco
minutos. El motivo era bueno —era la página más rastreada del sitio, respondía
`Cache-Control: private, no-store` y quedaba fuera del CDN— y funcionó.

Tuvo una consecuencia que nadie buscó. `views_count` solo se movía dentro de
`PropertyViewSet.retrieve()`, es decir, en la llamada que el renderizador de
Next hace al backend. Con la ficha cacheada esa llamada dejó de ocurrir una vez
por visitante para ocurrir, como mucho, una vez cada cinco minutos por anuncio.
El contador dejó de medir personas y pasó a medir renders, sin que ningún test
fallara y sin que ninguna cifra se pusiera en rojo: simplemente se aplanó.

Se descubrió al revés de como suelen descubrirse estas cosas. El panel mostraba
menos «vistas» tras un despliegue y la primera hipótesis fue una caída de
tráfico. Al medir en producción, las sesiones humanas estaban intactas —entre 50
y 90 al día, como las dos semanas anteriores— y lo que se había caído era el
contador.

Segundo daño, más silencioso: el nivel de demanda que el análisis muestra al
lector y al propietario se calculaba comparando `views_count` acumulado contra
la mediana de la ciudad. Sobre un contador congelado, ese semáforo dice cada día
algo menos cierto.

## Decisión

**El navegador cuenta las visitas; el backend deja de contarlas al renderizar.**

`PropertyViewCounter` mueve `views_count` cuando llega un `page_view` de tipo
`property` que no viene de un bot, dentro de la creación del `ActivityEvent` que
el beacon ya enviaba. `retrieve()` no toca el contador.

**El interés se mide sobre una ventana, no sobre la vida del anuncio.** El nivel
de demanda sale de las personas distintas que llegaron en los últimos treinta
días, comparadas con la distribución del mismo universo de comparables —con los
ceros dentro—, y no de un acumulado que premia la antigüedad.

## Consecuencias

- El contador vuelve a medir personas, y mide las mismas que el resto del panel:
  ambos salen de `ActivityEvent`, filtrados por `is_bot`.
- Los valores históricos de `views_count` no son comparables con los nuevos. Los
  anteriores al 3 de agosto de 2026 incluyen crawlers, los del 21 y 22 están
  aplanados por el ISR, y a partir de ahí cuentan visitas humanas.
- Un visitante con JavaScript desactivado no cuenta. Es el mismo trato que ya
  recibía en el resto de la analítica y no se considera una pérdida relevante.
- Cualquier página futura que se sirva cacheada hereda la lección: **si un
  contador vive en el render, el día que la página se cachea el contador miente
  sin avisar**. Lo que mide personas tiene que ejecutarse donde hay una persona.

Ver `PROP-024` y `PRC-032` en `specs/`, y `docs/technical/trafico-organico.md`
para la medición que lo destapó.
