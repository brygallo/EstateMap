# Actividad, atribución y métricas

Verificado contra el código el 2026-08-05.

Todo lo que este portal sabe sobre quién hizo qué está en una sola tabla,
`ActivityEvent`, y lo leen exactamente dos consumidores: el panel del dueño del
proyecto y el informe de promoción de un anuncio. Este documento explica de dónde
salen esas filas, por qué la mitad de las que había no se pueden usar y qué
significa cada número que se enseña.

---

## 1. `ActivityEvent`: qué es y qué no es

`backend/real_estate/models.py:627`. Siete campos:

| Campo | Qué guarda |
| --- | --- |
| `user` | El usuario autenticado, o `NULL`. La mayoría de eventos son anónimos. |
| `property` | El anuncio al que se refiere, o `NULL` para los eventos de mapa y de embudo. |
| `session_id` | UUID que el navegador guarda en `localStorage` bajo `geo:activity-session` (`frontend/lib/analytics.ts:85-90`). Es lo más parecido a «una persona» que existe aquí. |
| `event_name` | Nombre libre, validado contra alfanuméricos y `_-.` (`backend/real_estate/serializers.py:617-621`). |
| `path` | Ruta desde la que se disparó. |
| `payload` | JSON libre. Aquí vive `attribution` (§3). |
| `is_bot` | Decidido **en el servidor**; ver §2. |

Es una tabla de **auditoría funcional**, no de seguridad ni de facturación:
`POST /api/activity-events/` es público con throttle de 30/min y la consulta es
solo para staff (`backend/real_estate/views.py:1331-1353`). El cliente no
controla su identidad: `user` se toma de `request.user` si viene autenticado y
`is_bot` se calcula ignorando lo que mande
(`backend/real_estate/serializers.py:628-635`).

Un detalle que sostiene el informe de promoción: cuando el evento no trae
`property_id` en el payload —el caso del beacon genérico de página vista, que
solo conoce la URL— el id se deduce de `path`
(`_property_id_from_path`, `backend/real_estate/serializers.py:636-644`). Sin
eso, una llegada a una ficha desde un enlace del kit no quedaría asociada al
anuncio al que llegó, que es justamente lo que se cuenta.

**Índices** (`backend/real_estate/models.py:656-670`): por `event_name`, por
`user`, por `property` —todos con `created_at`— y uno más,
`activity_prop_human_idx` sobre `(property, is_bot, created_at)`, que existe para
el informe de promoción. Es un B-tree normal y no un GIN sobre `payload` a
propósito: esos tres campos ya recortan la tabla a los pocos cientos de eventos
de un anuncio dentro de la ventana, y el test sobre el JSON corre después sobre
ese puñado. Un GIN se pagaría en cada escritura.

---

## 2. Bots: por qué existe `is_bot` y por qué hay una fecha de corte

Los buscadores y los asistentes de IA **ejecutan JavaScript**. Eso significa que
disparaban el mismo beacon que una persona y aterrizaban en `ActivityEvent`
indistinguibles de una sesión real. Al medirlo, cerca del **78% de las sesiones
registradas eran crawlers** y el panel leía unas 5 veces alto
(`backend/real_estate/bot_detection.py:1-13`).

Cómo se decide:

- **En el servidor, desde el User-Agent.** `is_bot_request` →
  `is_bot_user_agent` (`backend/real_estate/bot_detection.py:196-217`), una
  única regex compilada con patrones de fabricante (Googlebot, GPTBot,
  ClaudeBot, PerplexityBot, Ahrefs…) y patrones genéricos. Un User-Agent vacío
  cuenta como bot: todo navegador real manda uno.
- **Nunca bloquea.** Es una decisión explícita: los crawlers conservan acceso
  completo a todo, sus eventos se guardan igual con `is_bot=True` y siguen
  siendo graficables aparte (`month_bot_events`,
  `backend/real_estate/services/admin_metrics.py:96`). Este módulo cuenta, no
  autoriza.
- **También hay un filtro en el cliente** (`CRAWLER_UA`,
  `frontend/lib/analytics.ts:15-33`), que ni siquiera envía el beacon. Es una
  optimización, no la frontera: la frontera es la del servidor, porque el
  cliente puede mentir.

### La fecha de corte: 2026-08-03

`is_bot` empezó a rellenarse el **2026-08-03**. Todas las filas anteriores
llevan el valor por defecto, `False`, y **no se guardó el User-Agent**, así que
no hay nada que reevaluar: no se pueden reclasificar ni ahora ni nunca.

La consecuencia es dura y hay que tenerla presente al leer cualquier serie
histórica: **antes de esa fecha no existe el dato «visitas humanas»**, existe
«visitas, de las cuales aproximadamente tres de cada cuatro eran robots».

El informe de promoción lo trata como un suelo duro:
`BOT_FLAGGING_SINCE = 2026-08-03`
(`backend/real_estate/services/promotion_stats.py:56-61`) y la ventana se calcula
con `max(now - window, BOT_FLAGGING_SINCE)`
(`backend/real_estate/services/promotion_stats.py:73-76`). El panel del dueño
**no** aplica ese suelo, pero tampoco lo necesita: sus ventanas son de 7, 14 y 30
días, así que ya no alcanzan la zona ciega.

---

## 3. Atribución: de dónde dice el visitante que viene

`trackEvent` (`frontend/lib/analytics.ts:35-73`) mete un objeto `attribution`
dentro de `payload` en **todos** los eventos:

```
{ source, medium, campaign, term, content, channel, referrer, landing_page }
```

Se calcula a partir de los `utm_*` de la URL y, si no hay, del `Referer`, y se
guarda en `localStorage` bajo `geo:first-attribution`.

**Es atribución de primer contacto, y no caduca.** El bloque solo se rellena si
no había ya uno guardado (`frontend/lib/analytics.ts:47`). Dos consecuencias que
condicionan cómo se lee cualquier informe:

- Quien llegó una vez por Google y meses después entra por un enlace de
  Instagram del kit **sigue contando como Google**. El informe de promoción
  subcuenta, nunca sobrecuenta.
- Quien llegó por un enlace del kit y vuelve más tarde escribiendo la dirección
  sigue atribuyéndose a esa red mientras no borre el almacenamiento.

Lo primero es lo deseable de las dos: es preferible que el número que se le
enseña al dueño se quede corto a que se lo invente.

El código corto (`/p/{code}`) redirige a la ficha preservando la query, para que
la atribución sobreviva al salto (`frontend/app/p/[code]/page.tsx:21-31`).

---

## 4. Los dos consumidores

### 4.1 Panel del dueño del proyecto — `AdminMetricsService`

`backend/real_estate/services/admin_metrics.py`, consumido solo por
`GET /api/admin/dashboard/`. Todo lo que el panel llama «gente» sale de
`human_events = ActivityEvent.objects.filter(is_bot=False)`
(`:63-65`). Ventanas: 7 días contra los 7 anteriores para las variaciones, 30
días para los desgloses y 14 para las series diarias (`:56-61`).

La «audiencia» no son filas: `_audience` (`:23-28`) cuenta `session_id`
distintos y le suma los usuarios autenticados que llegaron sin sesión, para no
contar dos veces a la misma persona ni perder a quien navega con el
almacenamiento capado.

### 4.2 Informe de promoción de un anuncio — `promotion_stats`

`backend/real_estate/services/promotion_stats.py`, servido por
**`GET /api/properties/{id}/promotion-stats/`**
(`backend/real_estate/views.py:664-687`). Es la mitad que le faltaba a `SOC-008`:
los enlaces y QR del kit ya viajaban etiquetados con
`utm_campaign=owner_kit` y `utm_source=<red>`, así que el dato se estaba
recogiendo desde el principio; lo que no existía era quien lo leyera.

**Quién puede llamarlo.** Solo el dueño del anuncio y staff
(`IsPropertyOwnerOrStaff`, `backend/real_estate/permissions.py:25-43`): un
anónimo recibe 401 y un tercero autenticado 403 (`PERM-071`). Es la excepción
deliberada a la publicidad de las láminas, que sí son públicas porque las redes
sociales tienen que descargarlas: una imagen no dice nada que la ficha no
enseñe, pero **quién llegó y desde dónde es del dueño**. El anuncio se resuelve
con `get_object_or_404(Property, pk=pk)` y no por el catálogo público, porque un
anuncio vendido es justo el que más ganas tiene su dueño de mirar y ya no está
en el catálogo.

**Qué cuenta**, en este orden:

1. Eventos del anuncio, no bots, dentro de la ventana — por ahí entra
   `activity_prop_human_idx`.
2. De esos, los que traen `payload.attribution.campaign = "owner_kit"`. Un
   visitante que llegó por Google no es mérito del kit y no aparece.
3. Agrupados por `payload.attribution.source`, con
   `KeyTextTransform` anidado (`:100-110`). El `order_by()` vacío es obligatorio:
   sin él, el `ordering = ["-created_at"]` del modelo se cuela en el `GROUP BY` y
   cada fila se convierte en su propio grupo.

**Un visitante es un `session_id` distinto**, no un evento
(`Count("session_id", distinct=True)`, `:106`). El navegador repite su sesión en
cada beacon, así que contar filas convertiría a una persona curioseando en una
docena de visitas. `events` se devuelve al lado porque el interés está en la
relación entre ambos.

**Ventana**: 90 días por defecto, con el suelo de §2. Larga como para que un
anuncio compartido una vez al mes enseñe algo, corta como para describir la
campaña de ahora y no la vida entera del anuncio.

**Las cuatro redes del kit siempre aparecen** aunque traigan cero
(`KIT_NETWORKS`, `:40`), para que el desglose se lea «Instagram trajo 9, Facebook
ninguno» y no esconda calladamente las que no funcionaron. El orden es por
visitantes descendente con desempate estable, de modo que dos lecturas que dicen
lo mismo no reordenan la lista.

**Nunca se pinta un cero desnudo.** El payload trae un campo `state` con tres
valores (`:68-70`):

| `state` | Significa |
| --- | --- |
| `not_shared` | Nadie ha compartido el anuncio todavía. |
| `shared_without_visitors` | Se compartió —hay eventos de `promotion_kit_shared`, `_downloaded` o `_copied`— y no trajo a nadie. |
| `has_visitors` | Vinieron visitantes reales. |

La distinción importa porque solo uno de los tres casos es problema del dueño.
«0 visitas» a secas se lee como un fallo del portal.

**Forma de la respuesta**: `property_id`, `state`, `window_days`, `since`,
`measured_since`, `total_visitors`, `total_events`, `shares` y `networks[]`
—cada uno con `source`, `visitors` y `events`—.
`measured_since` viaja a propósito: es la forma de que la interfaz pueda decir
«desde el 3 de agosto» en lugar de dar a entender que el número cubre toda la
vida del anuncio. Lo consume `frontend/lib/promotion-stats.ts:73`.

**No tiene throttle.** `PropertyViewSet.get_throttles`
(`backend/real_estate/views.py:339-353`) solo limita `map_points`, `list` y las
escrituras. Es una lectura autenticada y acotada al propio anuncio, así que el
riesgo es de coste, no de fuga.

---

## 5. Lo que estos números no son

- **No son analítica web.** No hay páginas vistas, ni rebote, ni duración de
  sesión. Hay eventos con nombre que alguien decidió disparar.
- **No son `views_count`.** El contador de visitas de una propiedad vive en la
  propia fila de `Property` y se incrementa en `retrieve` (también saltándose los
  bots), es otro camino y otro número, y **nunca se enseña en público**
  (`VIS-001`).
- **No son comparables a través del 2026-08-03.** Cualquier gráfico que cruce
  esa fecha compara humanos con humanos-más-robots.
- **No cuentan personas, cuentan navegadores.** Un `session_id` vive en
  `localStorage`: la misma persona en el móvil y en el portátil son dos.
