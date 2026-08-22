# Tráfico orgánico: qué se mide, cuánto hay y qué lo mueve

El producto de este portal es que la gente vea las propiedades. Todo lo demás
—que un dueño quiera publicar, que un anunciante pague— viene después y viene de
ahí. Este documento recoge lo que se midió en producción el 22 de agosto de 2026
y cómo volver a medirlo, para que la próxima persona (o el próximo agente) no
tenga que redescubrirlo.

## Los cuatro números que la gente llama «vistas»

No son lo mismo y se caen por motivos distintos. Confundirlos cuesta una tarde.

| Número | De dónde sale | Cómo baja sin que baje el tráfico |
| --- | --- | --- |
| «Vistas totales» del panel | `Sum(views_count)` de todas las propiedades | Es acumulado: solo baja si desaparecen anuncios |
| Vistas por propiedad | `views_count`, movido por el beacon (PROP-024) | Antes lo movía el render: ver ADR 0005 |
| Sesiones y eventos del panel | `ActivityEvent` desde el navegador, `is_bot=False` | Cambios en el filtro de bots |
| GA4 / Search Console | Externo | Nada del backend |

Dos fechas condicionan cualquier comparación histórica:

- **3 de agosto de 2026**: antes no se guardaba el User-Agent, así que ningún
  crawler pudo marcarse como tal y todos cuentan como personas. Una serie que
  cruce esa línea compara periodos que no son comparables (`BOT_FILTER_SINCE`).
- **21 de agosto de 2026**: la ficha pasó a ISR y `views_count` dejó de contar
  personas hasta que el contador se mudó al navegador (ADR 0005).

## Línea base medida (22 de agosto de 2026)

- **50–90 sesiones humanas al día**, de las cuales **40–60 orgánicas**. Contadas
  por día de Ecuador (UTC-5), que es el día que vive la gente: agrupar por UTC
  parte la tarde ecuatoriana en dos y ensucia cualquier comparación.
- **150–300 eventos al día**, unos 3 por sesión.
- **614 sesiones orgánicas aterrizaron directamente en una ficha en 30 días**
  (~20 al día): el **78 %** de todo el tráfico orgánico. Las fichas son el motor.
- Esas 614 llegadas se repartieron entre **482 fichas distintas**, sobre un
  catálogo de **15.318 activas**: solo el **3,1 %** del inventario produjo algo.
- **86 contactos en 30 días**, 66 de ellos sobre anuncios importados, repartidos
  entre 52 anunciantes distintos: 41 de ellos recibieron exactamente uno.

**Cuidado con los picos.** El 20 y 21 de agosto los eventos se dispararon a 678 y
680 con solo 103 y 94 sesiones (≈7 eventos por sesión contra ≈3 habitual) y el
canal `direct` saltó de 8-26 a 38-40. Era navegación propia probando despliegues.
Comparar contra esos dos días fabrica una caída que no existió. La señal para
detectarlo es la razón eventos/sesión y el salto de `direct`, no el total.

## El techo real: el presupuesto de rastreo

Medido sobre catorce días de logs de nginx (9–23 de agosto de 2026): **Googlebot
pidió 2.624 fichas distintas**, el **17 %** del catálogo. A ese ritmo una vuelta
completa a las 15.318 lleva unos **ochenta días**.

**Mídelo siempre sobre dos semanas, nunca sobre dos días.** El rastreo es a
ráfagas —1.195 peticiones a fichas el 18 de agosto, 29 el 17, 42 el 21— así que
una ventana corta que caiga en un valle multiplica el problema por dos. La
primera medición de este documento salió de dos días y dio 137 días por vuelta:
estaba mal por eso.

Los demás bots vieron 17.094 fichas distintas en esas mismas dos semanas —más
que el catálogo activo, porque incluye anuncios ya retirados—, así que el
servidor puede entregarlo entero. Es Google quien raciona, y lo que raciona
depende de la autoridad del dominio.

Consecuencia práctica: **el crecimiento no está en rankear mejor, está en que
trabaje una porción mayor del catálogo**. Pasar del 3 % al 10 % de fichas con
entradas orgánicas triplica el tráfico sin ganar una sola posición.

Aviso al medir: `/var/log/nginx/access.log` es único para todos los vhosts del
host y no registra el `Host`, así que los conteos por ruta genérica (`/`,
`/robots.txt`, `/assets/…`) mezclan aents.net y los demás sitios. Las rutas
`/propiedad/…` y `/propiedades/…` sí son inequívocamente de este portal.

## Por qué el 97 % no producía nada

Cuando Google llegaba, encontraba una página que ya existía en otro sitio: mismo
título, mismas fotos, misma descripción. Lo único propio —precio por m², rango de
la zona, comparables, oferta disponible— se cargaba desde el navegador después
de hidratar, así que **no estaba en el HTML** que lee un rastreador. Para el
buscador la ficha era una copia sin valor añadido, y en un duplicado gana el
original.

Lo que se hizo el 22 de agosto de 2026:

- **SEO-007**: el análisis se renderiza en el servidor y viaja en el HTML. El
  modal del mapa conserva la variante cliente porque no es indexable.
- **SEO-008**: el `h1` y el `<title>` describen la búsqueda («Casa de venta en
  Quito · 3 dormitorios · 180 m²») en vez del titular importado, que se conserva
  debajo y deja de gritar.
- **SEO-009**: el sitemap solo ofrece fichas con precio y ciudad, y la prioridad
  sale de cuándo cambió de verdad. Impacto medido: solo 67 de 15.312 anuncios
  quedan fuera, el catálogo está limpio; el valor está en la prioridad, no en la
  poda.
- **PRC-030/031/032**: los comparables son del mismo tipo, operación y zona
  nombrada (o ciudad, diciéndolo); se publican cinco con enlace —cada tarjeta es
  un enlace interno, que es como se reparte el rastreo—; el veredicto va en
  palabras con la diferencia en dólares y una etiqueta de confianza.

## Cómo volver a medir

Contra producción (`root@212.47.65.135`), sobre el contenedor `estatemap_backend`:

```python
# Serie diaria de sesiones humanas vs bots
from django.db.models.functions import TruncDate
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from real_estate.models import ActivityEvent
(ActivityEvent.objects.filter(created_at__gte=timezone.now() - timedelta(days=14))
 .annotate(d=TruncDate("created_at")).values("d", "is_bot")
 .annotate(n=Count("id"), s=Count("session_id", distinct=True)).order_by("d"))
```

Para el KPI —llegadas orgánicas a una ficha— se agrupa por
`payload__attribution__channel` y se mira si `payload__attribution__landing_page`
empieza por `/propiedad/`. Para el rastreo, sobre los logs:

```bash
awk '/Googlebot/ && $7 ~ /^\/propiedad\// {print $7}' /var/log/nginx/access.log | sort -u | wc -l
```

Excluir el tráfico propio: las sesiones que tocan `/admin` son staff, pero el
trabajo de desarrollo suele navegar sin pasar por el panel. La razón
eventos/sesión y el salto de `direct` son mejores indicadores.

Y compara sábado contra sábado. El portal cae el fin de semana —30-33 sesiones
orgánicas los sábados de agosto de 2026, contra 42-62 entre semana—, así que un
lunes contra un domingo inventa una caída del 40 %.

## Lo que todavía no se puede medir desde aquí

Cuántas de las URL del sitemap están **indexadas**. El rastreo se ve en los logs;
la indexación solo la sabe Search Console, y este repositorio no tiene
credenciales para consultarla. Mientras no las haya, «Google no llega a todo el
catálogo» es una inferencia sólida a partir del rastreo, no una medición.

## Lo que no se arregla programando

La auditoría de `docs/seo/analisis-geo-2026-08.md` puntúa la parte técnica en
19/20 y la estructura en 18/20, y la **autoridad de marca en 7/20**. El
presupuesto de rastreo que Google concede depende de esa autoridad. Más menciones
y enlaces fuera del dominio → más rastreo → más fichas indexadas → más gente
viendo propiedades. La mitad de este bucle no está en el repositorio.
