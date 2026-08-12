# Publicidad: arquitectura y dónde va cada pieza

Cómo está montado el módulo. Las reglas están en `specs/domains/advertising.yaml`
y las decisiones estructurales en
`docs/decisions/0004-publicidad-propia-vendida-desde-el-panel.md`.

Convención del repo: **el código va en inglés** —modelos, campos, estados,
endpoints, componentes— y **el español se reserva para lo que lee una persona**:
`verbose_name`, `help_text`, las etiquetas de `Placement`, los textos del panel y
el reclamo de los espacios libres.

## El alcance, en una frase

La venta ocurre entera en WhatsApp. El sistema guarda el creativo, hasta cuándo
va y cuánto se cobró. Todo lo que no es eso —tarifario, pedido, aforo, pasarela,
impresiones— está deliberadamente fuera, y está escrito como tal en las reglas
ADS-040 a ADS-045.

## De dónde se parte

`blog/ads.py` ya resolvía la mitad difícil: `Advertiser`, `SponsorSlot`, cinco
ubicaciones, rotación determinista ponderada, redirector con filtro de bots y
caché versionada. El módulo no lo reescribió: lo mudó, lo generalizó a todo el
portal y añadió campañas explícitas para ofrecer espacios disponibles.

## Estructura

```
backend/advertising/
    models.py       Advertiser, Campaign, overbooked_placements
    placements.py   Placement (TextChoices) y MAX_PER_PLACEMENT
    selection.py    qué campaña sirve cada hueco, en orden de clase
    views.py        API pública: slots y redirector
    admin_api.py    API de staff para /admin/publicidad
    serializers.py
    admin.py        admin de Django, herramienta de rescate
    signals.py      invalidación de caché al cambiar una campaña
    urls.py
    migrations/
        0001_initial.py
        0002_import_from_blog.py   copia las filas desde blog.SponsorSlot
    tests/
        test_serving.py   qué sirve cada hueco y qué rechaza el modelo
        test_api.py       los endpoints públicos y los del panel

frontend/
    lib/ads.ts                    fetch y rotación por página + franja
    components/ads/AdSlot.tsx     el hueco, servidor
    components/ads/HouseAd.tsx    el reclamo propio, cliente (necesita el clic)
    app/admin/publicidad/page.tsx el panel
```

`blog/ads.py` y `blog/views_ads.py` quedan como reexportaciones para que
`/api/blog/sponsors/` siga respondiendo: esa ruta ya la llaman las páginas del
blog en producción y las copias que el CDN tenga calientes. Cambiarla no
compraría nada y rompería algo.

Dos módulos menos de los que parecería: no hay `pricing.py` ni `availability.py`
porque no hay precio ni aforo que calcular.

## Modelo de datos

Dos tablas. Ninguna más.

**`Advertiser`** — el del blog: `name`, `slug`, `website`, `tagline`, `logo`,
`logo_alt`, `is_active`, más `contact_name` y `contact_phone`, que es a quién se
escribe para renovar.

**`Campaign`** — sustituye a `SponsorSlot`. Conserva lo que aquel tenía —creativo
(`headline`, `body`, `cta_label`, `target_url`, `image`, `image_alt`), ventana
(`starts_at`, `ends_at`), `weight`, `is_active`, `click_count`— y añade cuatro
campos:

- `placement` — valor de `Placement`, como hoy
- `kind` — `paid` · `partner` · `promo`
- `target_cities` — ciudades concretas donde puede aparecer
- `target_provinces` — provincias concretas; ambas listas vacías significan todo Ecuador
- `amount_charged_usd` — lo que se cobró. Nulo en `partner` y `promo`

`amount_charged_usd` es todo el registro comercial que existe. No hay pedido, ni
estado de pago, ni factura: la negociación pasó en WhatsApp y aquí solo se anota
el resultado (ADS-001).

### Las tres clases de campaña

`kind` distingue tres cosas que se ven igual y no lo son, y `selection.py` las
sirve en este orden:

| `kind` | Qué es | Importe | Suma en el panel |
| --- | --- | --- | --- |
| `paid` | Alguien pagó | obligatorio | sí |
| `partner` | Marca del propio grupo, gratis. Aents ya está sembrada así en `blog/migrations/0006` | nulo | no |
| `promo` | «¿Quieres aparecer en este espacio?» — la casa vendiéndose | nulo | no |

Si hay pagada, gana la pagada. Si no, entra la del grupo. Si tampoco, entra una
campaña `promo` cuando staff la haya creado. Sin ninguna campaña activa, el
espacio no se renderiza (ADS-016, ADS-017).

Que las tres convivan desde el primer día es lo que permite comprobar el
recorrido completo —creativo, rotación, redirector, conteo sin bots,
invalidación de caché— antes de haberle cobrado a nadie. Si algo falla, falla
con un anuncio propio delante.

## Superficies: dónde aparece cada ubicación

| `code` | Superficie | Dónde exactamente |
| --- | --- | --- |
| `home_feed` | Inicio y mapa | Tarjeta dentro de la lista de resultados. Nunca sobre el lienzo (ADS-003) |
| `city_hero` | Landings de ciudad y provincia | Banda bajo la cabecera de `/propiedades/[ciudad]`, `/provincias/[provincia]`, `/[combo]` |
| `listing_feed` | Listados SEO | Tras la sexta ficha de la rejilla, con la forma de una `PropertyCard` |
| `property_sidebar` | Ficha de propiedad | Debajo del bloque de contacto, jamás dentro (ADS-004) |
| `property_footer` | Ficha de propiedad | Antes de las propiedades similares |
| `stats_inline` | `/estadisticas-inmobiliarias` | Entre secciones de `MarketStatsSections` |
| `site_footer` | Todo el sitio | Tira de aliados en `Footer` |
| `index_top`, `index_feed`, `post_inline`, `post_footer`, `category_top` | Blog | Ya existen |

El modal del mapa (`PropertyModal`) se queda fuera a propósito: es la superficie
donde se convierte, y ya está apretada en móvil.

## Entrega en el frontend

`components/ads/AdSlot.tsx` es el componente de servidor que pinta cualquier
hueco. `components/blog/SponsorSlot.tsx` sigue donde estaba sirviendo las cinco
ubicaciones del blog contra la ruta antigua: funcionaba, y reescribir el blog
para estrenar el módulo habría sido arriesgar algo que ya rendía.

```tsx
<AdSlot placement="property_sidebar" seed={property.id} city={property.city} />
```

Enlaza al redirector con `rel="sponsored nofollow noopener"` y pinta la etiqueta
«Publicidad» encima, como hoy.

### Cómo rota entre varios anunciantes

`pickAd` elige por hash ponderado con `weight`, y lo que hashea no es solo la
identidad de la página: es la identidad **más la franja de media hora en curso**.

```ts
// lib/ads.ts
const window = Math.floor(Date.now() / ROTATION_WINDOW_MS);
cursor = hashSeed(`${seed}:${window}`) % total;
```

Con eso se cubren las dos rotaciones a la vez:

- **entre páginas** — dos fichas distintas muestran anunciantes distintos, que
  es lo que reparte las impresiones cuando hay miles de propiedades;
- **en el tiempo** — la misma ficha va cambiando de anunciante unas 48 veces al
  día, que es lo que se le vendió a quien compró «el espacio», no «el espacio en
  la ficha 123».

Y sigue siendo determinista dentro de la franja, así que la página aguanta
cacheada y no parpadea tras la hidratación. La franja de 30 minutos **no es un
número elegido al azar**: es el mismo TTL que tienen `CACHE_TTL_ADS` y el
`revalidate` de las páginas, de modo que la franja avanza justo cuando la
página se vuelve a generar. La rotación no cuesta ni una petición de más.

Lo que este esquema no da: quien recargue la misma ficha dos veces en la misma
media hora ve el mismo anuncio. Es el precio de servir páginas cacheadas
(ADS-013).

`weight` es además la única palanca de reparto que existe, porque no hay control
de aforo (ADS-042): peso 30 frente a peso 10 son tres impresiones de cada
cuatro. Quien vende decide el reparto escribiendo un número.

### El tope, y por qué el panel tiene que avisar

`MAX_PER_PLACEMENT` limita cuántos creativos devuelve la API por ubicación —hoy
cuatro— y el orden es `-weight`. Vender cinco espacios en la misma ubicación
deja al de menor peso **sin aparecer jamás**, en silencio.

Es el fallo más caro del módulo precisamente porque no se nota: nadie se entera
hasta que el anunciante pregunta por qué nunca se ha visto. Por eso la lista de
campañas del panel marca la ubicación que tiene más campañas vivas que el tope
(ADS-019). Sin aforo automático, ese aviso es lo único que separa «vendí de más»
de «le cobré a alguien por nada».

Lo que añade: si no hay nada elegible, no devuelve `null`. Renderiza `HouseAd`,
el reclamo propio, con su distintivo «Espacio disponible» —que es más honesto
que llamar publicidad a un cartel de «se alquila»— y sin precio, porque el
precio no está en el sistema (ADS-040).

Variantes por forma, no por ubicación: `card` (rejilla), `banner` (cabeceras),
`aside` (barra lateral), `strip` (pie). Ocho ubicaciones, cuatro formas.

### A dónde lleva el reclamo

A WhatsApp, con el contexto redactado dentro. `buildWhatsAppUrl` —el mismo
ayudante que ya usa `/inmobiliarias`—:

```
Hola, quiero anunciarme en Geo Propiedades.
Espacio: ficha de propiedad (property_sidebar). Ciudad: Macas.
```

Ese contexto es lo que hace que la conversación empiece con un precio en vez de
con tres preguntas, y es un dato que la página tiene en el momento del clic y
que se pierde para siempre si no se escribe ahí (ADS-018).

El clic se registra con `trackEvent('ad_slot_inquiry_clicked', { placement, city })`,
la misma tubería que ya cuenta los contactos de una propiedad: descarta
rastreadores en el cliente con `isCrawler` y en el servidor con
`is_bot_request`. Saber qué ubicaciones despiertan interés y en qué ciudades es
lo que dice qué vale la pena vender, y sale gratis porque la tubería ya existe.

## API

Pública, `AllowAny` — dos endpoints, los mismos que el blog ya tiene:

- `GET /api/ads/slots/?placement=&city=` — hasta cuatro creativos. Caché con
  `versioned_key`, TTL 30 min.
- `GET /api/ads/go/<id>/` — el clic. Redirección, no píxel: funciona sin
  JavaScript y deja el filtro de bots y la política de referente en el servidor.
  `no-store`, `Referrer-Policy: origin`, `X-Robots-Tag: noindex, nofollow`. Una
  campaña vencida redirige igual (ADS-015).

De staff, `IsAuthenticated + IsAdminUser`, calcado de `blog/admin_api.py`:
`/api/admin/ads/campaigns/` y `/api/admin/ads/advertisers/`. Pausar y reanudar
son `@action` con nombre y no un `PATCH` de `is_active`, para que quede en el log
qué se hizo y no solo qué quedó.

## Panel: `/admin/publicidad`

Todo el panel de este proyecto es React. `/admin/publicidad` se construye con
las mismas piezas que `frontend/app/admin/blog/page.tsx`, que es el precedente
más cercano —lista, diálogo de edición, subida de imagen— y del que conviene no
apartarse:

```tsx
'use client';
// AdminRoute + AdminSidebar envuelven la página, como el resto de /admin
// Card, Badge, Button, Input, Label, Select, Textarea, Dialog de components/ui
// apiGet / apiPost / apiPatch / apiDelete de @/lib/api
// toast de sonner para el resultado de cada acción
```

Estado local con `useState` y una función `load()` en `useCallback` disparada
desde `useEffect`, igual que en el blog. Sin librería de datos: el panel del blog
no la necesita y este tiene menos entidades todavía.

El admin de Django (`/admin/`, backend) se conserva como herramienta de rescate;
la operación habitual de campañas y anunciantes ocurre en el panel React.

**Una pantalla**: la lista de campañas y su formulario, más el alta de
anunciantes.

Crear una campaña es elegir anunciante y ubicación, subir el creativo, poner dos
fechas y anotar cuánto se cobró. El formulario previsualiza el creativo montado
en su componente real, porque un titular de 120 caracteres cabe en el formulario
y no en la tarjeta (ADS-032).

La lista destaca arriba **lo que vence en los próximos siete días** y muestra lo
cobrado en el mes. Sin pedidos ni recordatorios automáticos, ese aviso es lo
único que evita perder una renovación (ADS-031).

Y marca en rojo la ubicación con más campañas vivas que el tope, con el nombre
del anunciante que se está quedando fuera (ADS-019).

## Caché e invalidación

Clave de versión propia, `ads:ver`, en el mismo Redis DB 1 y con el mismo patrón
que `props:ver`. La sube cualquier cambio que altere lo servido —publicar,
pausar, editar creativo— y dispara la revalidación de las rutas afectadas.

El clic **no** invalida nada: se cuenta con `update()` y `F()`, nunca con
`save()`, para que el contador no tire la caché del listado en cada visita
(ADS-033). Es la razón por la que `views_ads.go` ya está escrito así.

## Qué queda fuera, y por qué está escrito

| No hay | Regla | En su lugar |
| --- | --- | --- |
| Tarifario ni precios | ADS-040 | Se negocia por chat, caso por caso |
| Formulario de solicitud ni pedido | ADS-041 | Un mensaje de WhatsApp |
| Control de aforo | ADS-042 | Quien vende sabe lo que vendió; `weight` reparte |
| Pasarela de pagos | ADS-043 | Cobro fuera del portal, importe anotado |
| Impresiones e informes automáticos | ADS-044 | Solo el clic, que el redirector ya cuenta |

Van como `not_implemented` y no como `proposed` porque no son cosas pendientes:
son cosas que el módulo deliberadamente no hace. Si algún día una de ellas se
construye, que sea porque alguien leyó la regla y decidió lo contrario.
