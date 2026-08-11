# Comprar un plan premium

> **Estado: no implementado.**
>
> No existe en el repositorio ninguna suscripción, plan de pago, propiedad "destacada",
> nivel de cuenta ni pasarela de pago. No hay modelos, ni endpoints, ni migraciones, ni
> rutas del frontend, ni dependencias de ningún proveedor de cobro.
>
> Lo único que existe es una **tabla de precios estática en una página de marketing**
> cuyos botones abren WhatsApp: no cobra, no crea nada en base de datos y no cambia
> ningún límite. Ver la sección 2.

Verificado contra el código el 2026-08-04.

---

## 1. Evidencia de la verificación

Comandos ejecutados desde la raíz del repositorio, excluyendo `node_modules`, `.venv`,
`.next`, `.next-build`, `.next-host`, `__pycache__` y los lockfiles.

### A. Pasarelas de pago

```bash
grep -rniE "stripe|paypal|payphone|datafast|kushki|checkout|billing" \
  backend/ frontend/ \
  --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.next \
  --exclude-dir=.next-build --exclude-dir=.next-host --exclude-dir=__pycache__ \
  --exclude="*.lock" --exclude="package-lock.json" -l
```

**Cero resultados.** Ninguna pasarela, ecuatoriana o internacional, aparece en el código.

### B. Modelos de suscripción, plan, pago o factura

```bash
grep -rniE "class .*(Plan|Subscription|Payment|Invoice|Order|Billing)" \
  backend/ --include="*.py" --exclude-dir=__pycache__
```

**Cero resultados.** El inventario completo de modelos de `real_estate` es:
`User`, `Province`, `City`, `Property`, `PropertyPriceHistory`, `PropertyImage`,
`SystemIncident`, `EmailVerificationToken`, `PasswordResetToken`, `EmailChangeToken`,
`Lead`, `PendingPublication` y `ActivityEvent`
(`backend/real_estate/models.py:7`, `19`, `36`, `59`, `204`, `216`, `273`, `305`, `329`,
`353`, `378`, `423`, `467`). Ninguno guarda estado comercial de cuenta.

### C. Campos `premium` / `destacado` / `tier` en los modelos

```bash
grep -rniE "is_premium|is_featured|featured|highlight|boost|tier|plan" \
  backend/real_estate/models.py backend/ingesta/models.py
```

Un único resultado, no relacionado: `backend/ingesta/models.py:10`, una referencia
documental a `PLAN.md` dentro de un docstring del pipeline de ingesta.

`Property` no tiene ningún campo de destaque, prioridad, ranking pagado ni fecha de
expiración de promoción (`backend/real_estate/models.py:59-201`).

### D. Endpoints

```bash
grep -rniE "premium|suscrip|subscri|pago|payment|plan|upgrade" \
  backend/real_estate/urls.py backend/estate_map/urls.py
```

**Cero resultados.** El enrutador expone `properties`, `provinces`, `cities`, `leads`,
`pending-publications` y `activity-events` (`backend/real_estate/urls.py:33-38`), más
autenticación, verificación de correo, perfil, imágenes, panel de administración e
ingesta (`backend/real_estate/urls.py:40-88`). Ninguna ruta de cobro.

### E. Rutas del frontend

```bash
ls frontend/app | grep -iE "premium|plan|pago|checkout|suscrip|upgrade|billing"
```

**Cero resultados.** No hay ninguna ruta de compra, carrito, checkout ni gestión de
suscripción en el App Router.

### F. Migraciones

```bash
grep -rliE "premium|subscription|payment|plan" backend/real_estate/migrations/
```

**Cero resultados.** Nunca existieron tablas de este tipo, ni siquiera borradas: no hay
rastro histórico en las migraciones.

### G. Barrido amplio de términos

Un `grep -rniE "premium|destacad|boost|checkout|stripe|paypal|payphone|datafast|kushki|billing|suscrip|subscri|payment"`
sobre `backend/` y `frontend/` devolvió únicamente falsos positivos:

- `destacad` — texto de interfaz para secciones editoriales de propiedades con foto:
  `frontend/components/SeoLanding.tsx:342` ("Propiedades destacadas"),
  `frontend/app/page.tsx:356`, `frontend/components/map/PropertySidebar.tsx:139`
  ("Ciudades destacadas"). Se seleccionan por tener fotos, no por pago
  (`frontend/lib/properties.ts:246`, `frontend/components/SeoLanding.tsx:18`).
- `payment` — la directiva `Permissions-Policy` que **desactiva** la API de pagos del
  navegador: `frontend/next.config.js:72` → `payment=()`.
- `premium` — descripciones históricas de ejemplo, sin integración con pagos.
- `subscri` — `subscribe` / `unsubscribe` de hooks de React:
  `frontend/hooks/useMediaQuery.ts:19`, `frontend/hooks/useGeolocation.ts:214`,
  `frontend/app/add-property/page.tsx:492`.

### H. La confirmación explícita del propio código

`backend/estate_map/settings.py:367`:

```python
# User-specific limits can be introduced here when subscription plans are implemented.
MAX_IMAGES_PER_PROPERTY = 10
```

El comentario habla de los planes en futuro (*"when … are implemented"*), justo encima de
los límites que hoy son constantes globales iguales para todos.

---

## 2. Lo único que se parece a un plan: la tabla de precios de `/inmobiliarias`

`frontend/app/inmobiliarias/page.tsx:59-90` declara una constante estática llamada
`PLANS` con tres entradas:

| Plan | Precio mostrado | CTA | `href` |
|---|---|---|---|
| Corredor | `Gratis` | "Empezar gratis" | `/registro` |
| Inmobiliaria | `$29/mes` | "Hablar con ventas" | `WHATSAPP_URL` |
| Empresa | `A medida` | "Contactar" | `WHATSAPP_URL` |

(`frontend/app/inmobiliarias/page.tsx:62`, `65-66`, `70`, `79-80`, `84`, `87-88`)

`WHATSAPP_URL` se construye con `buildWhatsAppUrl` en
`frontend/app/inmobiliarias/page.tsx:16`, importado de `@/lib/constants`
(`frontend/app/inmobiliarias/page.tsx:7`).

El bloque se renderiza en `frontend/app/inmobiliarias/page.tsx:216-258` bajo el título
"Planes". El botón de cada tarjeta es un `<a href={plan.href}>`
(`frontend/app/inmobiliarias/page.tsx:246-253`): **no hay `onSubmit`, ni `fetch`, ni
llamada a la API, ni estado de compra.**

Consecuencias verificadas:

- Nada de lo que promete el play "Inmobiliaria" ("Propiedades ilimitadas", "Prioridad en
  el mapa y SEO", `frontend/app/inmobiliarias/page.tsx:72-78`) está implementado. No hay
  campo que lo active ni código que lo lea.
- El límite anunciado del plan gratuito ("Hasta 5 propiedades",
  `frontend/app/inmobiliarias/page.tsx:64`) **no existe en el backend**: no hay ningún
  tope de propiedades por usuario en `PropertyViewSet`
  (`backend/real_estate/views.py:281-325`) ni en `PropertySerializer`
  (`backend/real_estate/serializers.py:172-366`). Cualquier cuenta verificada puede
  publicar sin límite de unidades, sujeta solo al throttle por hora (sección 4).

En resumen: es **una página comercial, no una funcionalidad**. La conversión es manual,
por WhatsApp.

---

## 3. Qué ocurre HOY cuando alguien quiere ayuda o más visibilidad

No hay autoservicio de pago. Los dos caminos reales terminan en la misma bandeja
comercial de administración.

### 3.1 `PendingPublication` — la solicitud queda registrada

```python
class PendingPublication(models.Model):
    """
    Solicitud de publicación capturada antes de que el usuario cree o verifique
    su cuenta. No se muestra en el mapa; sirve para seguimiento comercial.
    """
```
(`backend/real_estate/models.py:423-427`)

`SOURCE_CHOICES` (`backend/real_estate/models.py:435-440`):

| `source` | Etiqueta | Cuándo se crea |
|---|---|---|
| `account_required` | Intento de publicar sin cuenta | El usuario pulsa "publicar" sin sesión (`frontend/app/add-property/page.tsx:901-906`) |
| `whatsapp_help` | Ayuda por WhatsApp | El usuario pide ayuda desde el formulario (`frontend/app/add-property/page.tsx:704-717`) |
| `exit_prompt` | Abandono del formulario | El usuario cancela con contenido escrito (`frontend/app/add-property/page.tsx:824-834`) |
| `other` | Otro | Valor de repliegue del serializer (`backend/real_estate/serializers.py:492-494`) |

Cómo funciona:

- `POST /api/pending-publications/` es **público**; el resto de acciones exige
  administrador (`backend/real_estate/views.py:917-920`). A un no-staff el queryset le
  devuelve `none()` (`backend/real_estate/views.py:929-932`).
- El frontend lo envía con `skipAuth: true`
  (`frontend/app/add-property/page.tsx:648-650`), incluyendo un `draft` JSON con todo lo
  que el usuario había tecleado: polígono, precio, ciudad y número de fotos
  (`frontend/app/add-property/page.tsx:664-690`).
- Al crearse se notifica por correo a los administradores:
  `PendingPublicationNotificationService().notify_created(pending)`
  (`backend/real_estate/views.py:952-954`, servicio nuevo sin commitear en
  `backend/real_estate/services/notifications.py:25-37`) →
  `send_pending_publication_notification` (`backend/real_estate/email_utils.py:194-227`),
  que escribe a `settings.ADMINS` con respaldo en `PENDING_PUBLICATION_NOTIFY_EMAIL`
  (`backend/real_estate/email_utils.py:196-197`).
- El administrador gestiona el estado con `PATCH`: `new` → `contacted` → `converted` /
  `discarded` (`backend/real_estate/models.py:428-433`, serializer de estado en
  `backend/real_estate/serializers.py:497-501`).
- Límite: `10/min` (`backend/estate_map/settings.py:174`, aplicado en
  `backend/real_estate/views.py:922-927`).

**No es visibilidad pagada:** una `PendingPublication` no aparece en el mapa. El mapa se
construye exclusivamente desde `Property.objects.exclude(status='inactive').exclude(is_duplicate=True)`
(`backend/real_estate/views.py:347`), que nunca consulta este modelo.

### 3.2 `/publicar-asistido` — solo WhatsApp

La ruta `/publicar-asistido` (`frontend/app/publicar-asistido/page.tsx`, 316 líneas)
recoge nombre, teléfono, tipo, operación, ciudad, precio y detalles, y al enviar
**abre WhatsApp con el mensaje ya redactado**:

```
const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage(values))}`;
window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
```
(`frontend/app/publicar-asistido/page.tsx:87-99`)

Conviene señalarlo con precisión: esta página **no crea ninguna `PendingPublication`** ni
llama a la API. Su único rastro en el sistema es el evento
`assisted_publication_whatsapp_started` (`frontend/app/publicar-asistido/page.tsx:88`).

### 3.3 `Lead` — el interés de un comprador sobre una propiedad ya publicada

Distinto de lo anterior: `Lead` es el contacto de un **interesado** sobre una propiedad,
no la solicitud de un vendedor. *"Permite medir qué propiedades generan interés y da a la
inmobiliaria una bandeja de leads que gestionar"* (`backend/real_estate/models.py:378-382`).

- `SOURCE_CHOICES`: `property_modal`, `property_page`, `whatsapp`, `phone`, `other`
  (`backend/real_estate/models.py:383-389`).
- Estados: `new` → `contacted` → `closed` (`backend/real_estate/models.py:391-395`).
- Al crearse se envía correo: `LeadNotificationService().notify_created(lead)`
  (`backend/real_estate/views.py:902-904` → `backend/real_estate/services/notifications.py:13-22`
  → `backend/real_estate/email_utils.py:229`).
- Obligatorios: nombre y teléfono
  (`backend/real_estate/serializers.py:462-471`).

Los leads son **gratuitos y sin tope** para cualquier propietario. La página de marketing
sugiere que el "Panel de gestión de leads" es una función de pago
(`frontend/app/inmobiliarias/page.tsx:74`), pero en el código está disponible para
cualquier cuenta: `/my-properties` los carga con un simple `GET /api/leads/`
(`frontend/app/my-properties/page.tsx:133-151`).

---

## 4. Los límites reales vigentes (lo que un plan de pago cambiaría)

Todos son constantes globales, idénticas para toda cuenta. Ninguno depende del usuario.

### Imágenes — `backend/estate_map/settings.py:368-370`

| Constante | Valor | Dónde se aplica |
|---|---|---|
| `MAX_IMAGES_PER_PROPERTY` | 10 | `backend/real_estate/serializers.py:230-245`, y como `max_length=10` del `ListField` en `backend/real_estate/serializers.py:183` |
| `MAX_IMAGE_SIZE_MB` | 10 | `backend/real_estate/serializers.py:255-262` |
| `MAX_PROPERTY_UPLOAD_MB` | 50 | `backend/real_estate/serializers.py:246-251` (suma del lote) |

Formatos aceptados: JPEG, PNG y WebP
(`backend/estate_map/settings.py:353`, comprobado en `backend/real_estate/serializers.py:265`).

Estas tres constantes son exactamente las que el comentario de
`backend/estate_map/settings.py:367` señala como candidatas a volverse
"user-specific" cuando existan planes.

### Throttles — `backend/estate_map/settings.py:172-182`

| Scope | Tasa | Qué limita |
|---|---|---|
| `property_write` | `30/hour` | Crear y editar propiedades (`backend/real_estate/views.py:323-325`) |
| `property_list` | `60/min` | Listado público (`backend/real_estate/views.py:320-321`) |
| `map_points` | `120/min` | Puntos del mapa (`backend/real_estate/views.py:317-318`) |
| `pending_create` | `10/min` | `POST /api/pending-publications/` (`backend/real_estate/views.py:922-927`) |
| `activity_create` | `30/min` | `POST /api/activity-events/` (`backend/real_estate/views.py:974-979`) |

Matiz relevante: las dos lecturas públicas usan `AntiScraperScopedThrottle`, que exime al
SSR interno de Next.js y al personal `is_staff`
(`backend/real_estate/throttling.py:42-51`). La escritura usa el `ScopedRateThrottle`
estándar, **sin exenciones**: las 30 escrituras por hora se aplican también al staff.

### Límite de propiedades por cuenta

**No existe.** No hay tope de unidades publicables en `PropertyViewSet`
(`backend/real_estate/views.py:281-325`) ni en el serializer
(`backend/real_estate/serializers.py:172-366`). El "Hasta 5 propiedades" del plan gratuito
anunciado (`frontend/app/inmobiliarias/page.tsx:64`) es texto de marketing sin respaldo
en código.

### Ordenamiento del mapa

No hay ningún criterio pagado. El orden por defecto de `Property` es `-created_at`
(`backend/real_estate/models.py:175`), y los índices existentes son geográficos, de filtro
y de vistas (`backend/real_estate/models.py:176-183`). El "Prioridad en el mapa y SEO"
anunciado (`frontend/app/inmobiliarias/page.tsx:76`) tampoco tiene implementación.

---

## 5. PROPUESTA — NO IMPLEMENTADO

> Todo lo que sigue es una sugerencia de diseño. **Nada de esto existe en el repositorio.**
> No lo tomes como documentación del sistema.

Si algún día se implementaran los planes, el código ya deja tres puntos de anclaje
naturales:

1. **Los límites.** `backend/estate_map/settings.py:367` ya anticipa el cambio. Reemplazar
   los `getattr(settings, 'MAX_IMAGES_PER_PROPERTY', 10)` del serializer
   (`backend/real_estate/serializers.py:230`, `246`, `255`) por una consulta al plan del
   `request.user` sería un cambio localizado en tres puntos.
2. **Los throttles.** DRF resuelve las tasas por scope; una subclase de
   `ScopedRateThrottle` que sobrescriba `get_rate()` según el plan encajaría junto a
   `AntiScraperScopedThrottle` (`backend/real_estate/throttling.py:42`), que ya demuestra
   el patrón de anular el comportamiento por tipo de usuario.
3. **El embudo comercial.** `PendingPublication` ya captura la intención con estado
   `converted` (`backend/real_estate/models.py:431`), y `ActivityEvent`
   (`backend/real_estate/models.py:467`) ya registra el embudo de publicación. Un plan de
   pago mediría su conversión sobre esa infraestructura existente, sin inventar
   analítica nueva.

Quedaría por decidir todo lo demás: proveedor de cobro (ninguno está integrado hoy),
modelo de datos de suscripción, facturación electrónica ecuatoriana y qué significa
exactamente "prioridad en el mapa" — que hoy no es ningún campo, sino una promesa de una
página de marketing.
