# El panel por dentro: rastro, papelera y descubrimiento

Verificado contra el código el 2026-08-21.

El panel de `/admin` lleva tiempo listando y moderando bien. Lo que se documenta
aquí es lo otro: lo que hace para que una operación deje rastro, para que un
error se pueda deshacer, para que las tablas no crezcan sin techo y para que una
pregunta se pueda contestar sin abrir una sesión SSH.

Las reglas están en
[`specs/domains/admin-operations.yaml`](../../specs/domains/admin-operations.yaml)
(ADM-001 … ADM-014). Este documento explica por qué, no qué.

Documentos hermanos: [arquitectura](./architecture.md) ·
[caché](./caching.md) · [actividad y métricas](./activity-metrics.md) ·
[matriz de permisos](../permissions/matrix.md).

---

## 1. La bitácora: por qué una tabla y no el log

Cada escritura administrativa ya emitía una línea `admin_audit action=…` al
logger. Esas líneas se conservan —siguen siendo lo primero que se mira cuando
algo falla en producción—, pero viven en la salida de un contenedor que se
recrea en cada despliegue y no se pueden filtrar por «qué le pasó a la propiedad
412».

`AdminAuditLog` guarda actor, acción, objetivo, qué cambió e IP. Dos detalles
que no son casuales:

- **El actor se guarda dos veces**: la clave ajena para poder navegar a la
  cuenta mientras exista, y `actor_label` como texto congelado. Borrar al
  administrador no puede convertir su rastro en «alguien».
- **`changes` describe qué cambió, no siempre con qué valores.** Para un cambio
  de estado el valor nuevo es la información; para una edición de texto basta la
  lista de campos. Copiar aquí la descripción entera convertiría la auditoría en
  una segunda copia del catálogo que nadie purga.

**Auditar nunca puede tumbar la acción auditada** (ADM-002). `AdminAuditService`
envuelve su propio cuerpo y no re-lanza: una transferencia consumada cuya fila
de auditoría se perdió es un problema; una que revienta a mitad porque la
auditoría falló es peor.

Se lee en `/admin/auditoria`, se filtra por acción, actor, objetivo y ventana, y
se exporta.

## 2. La papelera: el borrado es una fecha, no un DELETE

Antes, `DELETE /api/admin/properties/{id}/` llamaba a `prop.delete()` y con la
fila se iban las fotos del almacén de objetos, el historial de precios y los
leads recibidos —sobre un anuncio que casi siempre publicó otra persona.

Ahora ese verbo marca `deleted_at`, guarda el estado que el anuncio ofrecía y lo
deja en `inactive`. La decisión de diseño está en esa última palabra: **la
papelera no inventa un estado nuevo**. `inactive` es el filtro que ya aplican el
mapa, el sitemap, las landings, las estadísticas y la ingesta, así que el
anuncio desaparece de todas ellas sin tocar ni una consulta. Es el mismo
argumento que mantuvo `sold` y `rented` fuera de `status`.

```
DELETE /admin/properties/{id}/          → papelera (204)
POST   /admin/properties/{id}/restore/  → vuelve al estado que ofrecía (200)
POST   /admin/properties/{id}/purge/    → borrado real, solo desde la papelera (204)
```

Restaurar devuelve el `status` anterior y limpia `closed_reason`: restaurar una
fila no es restaurar un anuncio, y un motivo de cierre olvidado lo arrastraría
de vuelta a `inactive` en el siguiente guardado.

Purgar exige que ya esté en la papelera. Eso convierte el borrado irreversible
en un acto deliberado de dos pasos separados en el tiempo.

A los 30 días la purga nocturna se lleva lo que queda, **una fila a la vez**: el
`.delete()` de un queryset se salta las señales que limpian las imágenes de
MinIO y dejaría los archivos huérfanos.

## 3. Retención

Está en [actividad y métricas §6](./activity-metrics.md). El resumen: primero se
condensa el día en `ActivityDailyRollup`, después se borra su detalle, y nunca
al revés.

## 4. Caché del dashboard

`AdminDashboardView` disparaba decenas de agregaciones sobre el catálogo entero
y recorría en Python los contactos de treinta días en cada carga. Medido en
desarrollo con 6.200 anuncios: **1.004 ms sin caché, 3 ms con ella.**

La entrada vive 5 minutos bajo una clave que lleva la versión del inventario
(`versioned_key`), así que publicar o borrar un anuncio la invalida sin esperar
al TTL. Lo que solo caduca por tiempo son los recuentos que no dependen de una
propiedad, como las altas de usuarios. `?refresh=1` la salta.

El mismo patrón, con 15 minutos, protege `/api/admin/seo-health/`, que recorre
el catálogo varias veces.

## 5. Diagnóstico de una propiedad

`GET /api/admin/properties/{id}/diagnostics/` contesta «¿por qué no se ve?».

La respuesta siempre existió, repartida entre la fila, el estado de las fotos,
la absorción de la zona, la versión de la caché en Redis y el umbral de la
landing en el frontend. Juntar esas piezas costaba una sesión de SSH por
pregunta.

Se dice en el orden en que importa:

| Bloque     | Qué contiene                                                     |
| ---------- | ---------------------------------------------------------------- |
| `blockers` | Lo que la oculta: papelera, inactiva, duplicada, sin coordenadas |
| `warnings` | Lo que la degrada: sin fotos, sin título, descripción corta, sin precio, sin área |
| resto      | Fotos con su `optimization_error`, zona y absorción, sitemap y umbral del combo, origen de la ingesta, actividad de 30 días, versiones de caché |

Cada hallazgo lleva escrito el remedio. Un diagnóstico que no dice qué hacer
solo mueve la pregunta de sitio.

## 6. Páginas y SEO

`/admin/seo` contesta la pregunta que el panel no sabía contestar: **qué página
se abre si consigo dos anuncios más en tal ciudad.**

Las landings del portal no se escriben una a una: se abren solas cuando una
porción del catálogo alcanza `MIN_COMBO_PROPERTIES` (cinco) y se cierran solas
cuando baja. Eso convierte una decisión de SEO en una decisión de inventario.

`SeoHealthService` aplica **el mismo número** que `frontend/lib/seo-combos.ts`.
Está escrito en los dos lados y dicho en ambos comentarios: un panel que
prometiera una página con cuatro anuncios cuando el sitemap exige cinco sería
peor que no tener panel.

Aquí no hay ni una métrica de posicionamiento —ni una impresión, ni un clic de
Search Console—. Se mide lo único que el portal controla: su inventario y la
calidad del texto con el que compite.

## 7. Exportación

`GET /api/admin/export/{properties|users|leads|audit}/`.

- **Se transmite fila a fila** (`StreamingHttpResponse` sobre un generador con
  `iterator()`). Un `list()` del catálogo dentro de un worker de 512 MB
  compartido con la ingesta es la forma conocida de tumbar el contenedor.
- **Lleva BOM UTF-8.** Excel en Windows —que es donde acaba este archivo— abre
  un CSV sin BOM interpretando latin-1, y «Cumbayá» llega roto.
- **El token no viaja por la URL.** Sería lo cómodo, porque una navegación no
  lleva cabeceras; y la URL entera acabaría en el log de acceso de nginx, donde
  un JWT válido durante horas es una credencial en claro. El cliente pide el
  archivo con `fetch` y lo arma en el navegador
  (`frontend/lib/admin-export.ts`).
- **La descarga se audita** y se marca `no-store, private`: un CSV de usuarios o
  de contactos es una copia de datos personales saliendo del sistema.

Es una vista de DRF y no de Django aunque devuelva un archivo, para que el
permiso lo decida el mismo par `IsAuthenticated, IsAdminUser` que protege el
resto del panel en vez de una comprobación escrita a mano que puede divergir.

## 8. Búsqueda global

`GET /api/admin/search/?q=` busca a la vez en propiedades, cuentas, contactos y
solicitudes pendientes. Está en la barra lateral y responde a `⌘K`.

Los resultados se limitan **por grupo y no en total**, para que buscar «Macas»
no devuelva diez propiedades y nada más. Cada resultado trae su propio `href`
del panel, así que la interfaz no tiene que saber cómo se construye la URL de
cada tipo.
