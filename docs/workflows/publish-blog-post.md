# Publicar un artículo del blog

Verificado contra el código el 2026-08-11.

Cómo se escribe, se programa y se publica un artículo en `/blog`, y por qué la
publicación depende de una fecha y no de una cola.

Las reglas de negocio están en [`specs/domains/blog.yaml`](../../specs/domains/blog.yaml)
(vista legible en [`docs/generated/blog.md`](../generated/blog.md)). Este documento
cuenta el recorrido; la spec es la que manda.

---

## 1. Por qué existe

El inventario del portal posiciona consultas transaccionales: «departamentos en
venta en Cumbayá» tiene una landing propia y anuncios que la sostienen. Pero la
gente pregunta otras cosas antes de llegar ahí —cuánto cuesta la alcabala, qué
exige la Ley de Inquilinato, si conviene el BIESS o un banco— y esas consultas no
tienen inventario que las respalde. Son además las que los buscadores de IA citan,
porque piden una explicación y no una lista de precios.

El blog cubre ese hueco. Y como es contenido que se produce por tandas, la pieza
que lo hace útil no es el editor: es el calendario.

## 2. El recorrido

```
Redacción (admin Django)        API pública            Next.js              Buscadores
        |                            |                     |                     |
   escribe el post                   |                     |                     |
   status=draft                      |                     |                     |
        |                            |                     |                     |
   acción «Programar:                |                     |                     |
   uno por día»                      |                     |                     |
   status=scheduled                  |                     |                     |
   published_at=D+1, D+2, D+3…       |                     |                     |
        |                            |                     |                     |
        |   (pasan los días)         |                     |                     |
        |                            |                     |                     |
  [llega published_at]               |                     |                     |
        |                            |                     |                     |
        |  el post YA es público ---->| GET /api/blog/posts/                     |
        |  (lo decide la fecha)       |   filtra published_at <= now             |
        |                            |                     |                     |
  beat horario:                      |                     |                     |
  publish_scheduled_posts            |                     |                     |
   ├── status -> published           |                     |                     |
   ├── bump blog:ver (Redis)         |                     |                     |
   ├── POST /api/revalidate --------->                      |                     |
   │     tags: blog, blog-<slug>     |          purga ISR de /blog y del post     |
   └── IndexNow ------------------------------------------------------------------>
                                                             Bing, y con él ChatGPT/Copilot
```

## 3. La decisión que ordena todo lo demás

**Un post es público desde que `published_at` queda en el pasado** (BLOG-001). El
filtro de la API acepta `scheduled` y `published` por igual y mira solo la fecha:

```python
# backend/blog/models.py
def public(self):
    return self.filter(
        status__in=(Post.Status.SCHEDULED, Post.Status.PUBLISHED),
        published_at__isnull=False,
        published_at__lte=timezone.now(),
    )
```

La alternativa —que una tarea de Celery cambie el estado y solo entonces se vea—
pone al broker a mandar sobre el calendario editorial. Un worker caído un sábado
congelaría la publicación hasta que alguien lo notase, y lo notaría por el hueco
en Search Console, no por una alerta.

Así, la tarea horaria hace solo lo que un reloj no puede hacer:

| Si el worker corre | Si el worker está caído |
| --- | --- |
| El post sale a su hora | El post sale a su hora |
| `status` pasa a `published` | Se queda en `scheduled` (cosmético) |
| Bing lo sabe en minutos | Bing lo descubre al recrawlear |
| `/blog` lo lista al instante | `/blog` lo lista al expirar su ISR (≤1 h) |

Ninguna fila de la derecha pierde el artículo. Es la propiedad que se buscaba.

## 4. Programar una tanda

En el admin: seleccionar los borradores → **«Programar: uno por día a partir de
mañana»**.

- Reparte la selección a razón de un post por día, a las **13:00 UTC** (08:00 en
  Ecuador), por orden de creación.
- Arranca al día siguiente del último post ya programado si ese es posterior a
  mañana, de modo que una segunda tanda se **encola detrás** de la primera en vez
  de solaparse (BLOG-007). Sin eso, escribir por tandas sacaría dos artículos el
  mismo día, que es justo lo que la programación existe para evitar.

Las otras dos acciones: **«Publicar ahora»** adelanta la fecha al instante, y
**«Pasar a borrador»** retira del sitio sin borrar ni falsear fechas (BLOG-002).

## 5. Escribir el contenido

El cuerpo es **Markdown**, no HTML. El frontend lo convierte en nodos de React
(`frontend/lib/markdown.tsx`), así que nada de lo que se pegue en el admin puede
convertirse en marcado vivo: un `<script>` en el cuerpo llega al lector como
caracteres en la página.

El subconjunto soportado es el que usan los artículos:

| Sintaxis | Resultado |
| --- | --- |
| `## Título` / `### Subtítulo` | `h2` / `h3`, con ancla y entrada en el índice |
| línea suelta | párrafo |
| `- punto` / `1. punto` | lista con o sin números |
| `> texto` | cita |
| `---` | separador |
| `**negrita**`, `*cursiva*`, `` `código` `` | inline |
| `[texto](/ruta)` | enlace interno; los externos salen con `nofollow` y `target="_blank"` |

Lo que quede fuera del subconjunto se muestra tal cual, en vez de desaparecer:
es preferible que el editor vea el símbolo a que crea que el CMS se comió su texto.

Campos que valen la pena rellenar aunque sean opcionales:

- **Preguntas frecuentes** — se publican como `FAQPage` en JSON-LD. Es el formato
  que Google y los buscadores de IA citan literalmente.
- **Autor y cargo** — señales E-E-A-T. El `Article` lleva `author` como `Person`
  con su `jobTitle` cuando hay nombre; si no, firma la organización.
- **Ciudad** — engancha el artículo con la página de precios m² de esa ciudad.
- **Etiquetas** — alimentan los enlaces desde las páginas de estadísticas.

## 6. Qué se publica hacia fuera

Cuando un post pasa a ser público (BLOG-005):

- **IndexNow** recibe `/blog/<slug>`, `/blog` y `/sitemap.xml`. Bing alimenta a
  ChatGPT y Copilot, así que es la vía más rápida a una cita de IA.
- **Next.js** recibe las etiquetas `blog` y `blog-<slug>` en `/api/revalidate`.
- **Redis** mueve `blog:ver`, lo que deja inalcanzables los payloads cacheados sin
  tener que enumerarlos (mismo mecanismo que el inventario, ver
  [caching.md](../technical/caching.md)).

Programar para dentro de un mes **no dispara nada**: la señal comprueba
`is_public` antes. Avisar a un buscador de una URL que todavía devuelve 404 gasta
presupuesto de rastreo y le enseña un error.

## 7. De dónde salen los primeros siete posts

Las guías vivían incrustadas en el frontend, en `frontend/lib/guias.ts`. Su prosa
se exportó de ese módulo **sin reescribirla**, se convirtió a Markdown y se cargó
como los primeros posts del blog conservando el slug
(`backend/blog/seed/guides.json`, cargado por la migración de datos
`blog/0002_seed_guides.py`).

`/guias` y `/guias/<slug>` redirigen de forma permanente a `/blog` y
`/blog/<slug>` (BLOG-006). Es una migración de URLs, no una publicación nueva: el
mismo texto en dos rutas obligaría a Google a elegir canónica y repartiría las
señales entre las dos.

La carga es idempotente y **no pisa** un post que ya exista, así que una
corrección editorial hecha en el admin sobrevive a un redespliegue.

## 8. Superficie pública

| Ruta | Qué es |
| --- | --- |
| `/blog` | Índice: destacado, últimas entradas, categorías |
| `/blog/<slug>` | Artículo, con `Article` + `FAQPage` + `BreadcrumbList` |
| `/blog/categoria/<slug>` | Archivo por categoría |
| `/blog/rss.xml` | Feed RSS 2.0 de las últimas 30 entradas |

Las categorías con menos de `MIN_POSTS_FOR_INDEXING` (3) artículos siguen
resolviendo pero salen del sitemap y del índice: una página con un solo artículo
solo compite con ese artículo. Es el mismo criterio anti-thin-content que aplican
las landings de sector.

La API es de **solo lectura** (BLOG-003). Se escribe en el admin de Django y en
ningún otro sitio.

## 9. Comprobaciones

```bash
docker compose exec backend python -m pytest blog/tests/ -q   # 22 tests
cd frontend && npx vitest run lib/markdown.test.tsx           # el renderer
./scripts/specs.sh validate                                   # specs contra código
```
