# Suscripciones y planes

Verificado contra el código el 2026-08-04.

> **Estado: no implementado.** No existe ningún modelo, endpoint, migración ni
> lógica de planes de suscripción en el backend; el acceso es gratuito y sin
> niveles, y los únicos límites reales son cuotas técnicas globales (imágenes,
> peso de subida y throttling por IP/usuario) idénticas para todas las cuentas.

---

## 1. Verificación: por qué se afirma que no existe

Estas son las comprobaciones ejecutadas sobre el repositorio. Se documentan
porque la afirmación central de este documento es una **ausencia**, y una
ausencia solo se sostiene mostrando cómo se buscó.

```
$ grep -rniE "subscri|suscrip|premium|stripe|paypal|payphone|datafast|kushki|billing|checkout|invoice|factura" \
    --include="*.py" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" backend/ frontend/ \
  | grep -vE "node_modules|\.venv|/\.next|\.next-build"
```

Resultado: ninguna coincidencia de dominio. Lo único que aparece es
`backend/estate_map/settings.py:366` (un comentario, ver §3) y usos de
`subscribe`/`unsubscribe` que son *callbacks de React*, no suscripciones
comerciales: `frontend/hooks/useMediaQuery.ts:19`,
`frontend/hooks/useGeolocation.ts:214` y `frontend/app/add-property/page.tsx:492`.

```
$ grep -rniE "class .*(Subscription|Plan|Payment|Invoice|Transaction|Order|Billing)" --include="*.py" backend/
(sin resultados)

$ grep -rliE "subscri|payment|billing|invoice" backend/real_estate/migrations/ backend/ingesta/migrations/
(sin resultados)
```

Las 26 migraciones de `real_estate` (de `0001` a
`backend/real_estate/migrations/0026_systemincident.py`) no contienen ninguna
tabla de planes, suscripciones ni cobros. `INSTALLED_APPS`
(`backend/estate_map/settings.py`) declara únicamente `real_estate` e `ingesta`
como apps propias, y `backend/requirements.txt` no incluye ningún SDK de
pasarela de pago.

## 2. Cómo funciona hoy el acceso

El producto es **gratuito y sin niveles**. No hay ninguna bifurcación de
comportamiento en función del usuario:

- **Registro abierto.** `backend/real_estate/urls.py:44` expone `register/`, y
  `backend/real_estate/urls.py:46` el login con Google (`auth/google/`). No hay
  paso de selección de plan ni de cobro entre el registro y la publicación.
- **Publicar solo exige cuenta y verificación de correo**, no un plan. El modelo
  `User` (`backend/real_estate/models.py:7`) tiene exactamente cuatro campos
  propios más allá de `AbstractUser`: `email`, `is_email_verified`,
  `oauth_provider`/`oauth_id` y `avatar_url`. **No existe ningún campo de plan,
  tier, cuota, fecha de expiración ni estado de pago.**
- **No hay tope de propiedades por usuario.** El identificador
  `properties_count` aparece en `backend/real_estate/serializers.py:753` y
  `:790`, pero es un `SerializerMethodField` de solo lectura para el panel de
  administración; nunca se compara contra un máximo. La búsqueda de una cuota
  (`max_properties`, `quota`, `can_publish`, `limit.*propert`) no devuelve
  ninguna comprobación de negocio.

### Advertencia importante: la página de precios es solo marketing

`frontend/app/inmobiliarias/page.tsx:59-90` define un array `PLANS` con tres
niveles —«Corredor» (`Gratis`), «Inmobiliaria» (`$29/mes`) y «Empresa»
(`A medida`)— que se renderiza como tabla de precios en `:224-252`.

**Este contenido es estático y no está respaldado por ninguna lógica.** Sus
llamadas a la acción no llevan a un checkout: la del plan gratuito apunta a
`/registro` (`:66`) y las dos de pago a `WHATSAPP_URL` (`:80`, `:88`), es decir,
a una conversación comercial manual. En particular, la característica anunciada
«Hasta 5 propiedades» del plan Corredor **no está implementada en ninguna
parte**: como se indica arriba, el backend no cuenta ni limita propiedades por
usuario. Cualquier trabajo futuro debe tratar esa página como una promesa
comercial pendiente de construir, nunca como documentación del sistema.

## 3. Los límites que sí existen (globales, no por plan)

Todos los límites son constantes de configuración aplicadas por igual a
cualquier usuario autenticado.

### 3.1 Cuotas de imagen y subida

Definidas en `backend/estate_map/settings.py:367-369`, precedidas por el
comentario que anticipa —sin implementarla— la futura diferenciación por plan:

```python
# User-specific limits can be introduced here when subscription plans are implemented.
MAX_IMAGES_PER_PROPERTY = 10
MAX_IMAGE_SIZE_MB = 10
MAX_PROPERTY_UPLOAD_MB = 50
```

(La línea del comentario es exactamente `backend/estate_map/settings.py:366`.)

Su aplicación ocurre en la validación del serializador de propiedades:

| Límite | Valor | Definición | Aplicación |
| --- | --- | --- | --- |
| Imágenes por propiedad | 10 | `settings.py:367` | `serializers.py:230`, comparación en `:240` |
| Peso total del lote | 50 MB | `settings.py:369` | `serializers.py:246`, comparación en `:248` |
| Peso por imagen | 10 MB | `settings.py:368` | `serializers.py:256`, comparación en `:257` |

La comprobación de `MAX_IMAGES_PER_PROPERTY` es acumulativa y descuenta las
imágenes marcadas para borrado (`serializers.py:231-239`), de modo que el tope
se evalúa sobre el estado final de la propiedad, no sobre el lote subido.

Como red de seguridad a nivel de Django, `DATA_UPLOAD_MAX_MEMORY_SIZE`
(`settings.py:346`) y `DATA_UPLOAD_MAX_NUMBER_FILES = 10` (`settings.py:349`)
acotan el cuerpo de la petición antes de llegar al serializador, y
`ALLOWED_IMAGE_TYPES` (`settings.py:352`) restringe los formatos a JPEG, PNG y
WebP.

### 3.2 Throttling (DRF)

`DEFAULT_THROTTLE_RATES` en `backend/estate_map/settings.py:171-182`:

| Scope | Tasa | Línea | Dónde se activa |
| --- | --- | --- | --- |
| `activity_create` | 30/min | `settings.py:172` | `views.py:951` |
| `pending_create` | 10/min | `settings.py:173` | `views.py:899` |
| `map_points` | 120/min | `settings.py:178` | `views.py:291` |
| `property_list` | 60/min | `settings.py:180` | `views.py:294` |
| `property_write` | 30/hour | `settings.py:181` | `views.py:297` |

El throttling se aplica mediante `ScopedRateThrottle` y **solo** afecta a las
vistas que declaran `throttle_scope` (comentario explicativo en
`backend/estate_map/settings.py:167-170` y en `backend/real_estate/views.py:289`).
`property_write` (30/hora) es el límite más cercano a una restricción de
publicación, pero es una defensa antiabuso uniforme, no una cuota comercial: no
distingue entre usuarios ni se puede elevar por cuenta. `THROTTLE_EXEMPT_IPS`
(`settings.py:186-188`) permite exonerar IPs concretas, algo que se usa para el
renderizado interno de Next.js, no para clientes de pago.

## 4. Ganchos existentes de captura comercial

Aunque no hay suscripciones, el sistema **sí monetiza indirectamente** mediante
captura de contactos comerciales gestionados a mano. Estos son los mecanismos
reales:

### 4.1 `PendingPublication` — intentos de publicar sin cuenta

Modelo en `backend/real_estate/models.py:423`, descrito en su docstring como
«Solicitud de publicación capturada antes de que el usuario cree o verifique su
cuenta. No se muestra en el mapa; sirve para seguimiento comercial.»

- `SOURCE_CHOICES` (`models.py:435-440`): `account_required` (intento de
  publicar sin cuenta, valor por defecto según `models.py:451`), `whatsapp_help`
  (ayuda por WhatsApp), `exit_prompt` (abandono del formulario) y `other`.
- `STATUS_CHOICES` (`models.py:428-433`): `new` (por defecto, `models.py:452`),
  `contacted`, `converted`, `discarded`. El estado `converted` es hoy el único
  indicador de conversión comercial que existe en el modelo de datos.
- Guarda el borrador completo del anuncio en un `JSONField` `draft`
  (`models.py:450`) junto con teléfono y correo de contacto (`models.py:444-445`),
  de modo que el equipo puede retomar la publicación manualmente.

Disparadores en el frontend, todos en el formulario de alta:
`savePendingPublication()` en `frontend/app/add-property/page.tsx:642` se invoca
con `whatsapp_help` (`:707`), `exit_prompt` (`:826`) y `account_required`
(`:903`).

En el backend, `PendingPublicationViewSet`
(`backend/real_estate/views.py:880`, ruta registrada en
`backend/real_estate/urls.py:37`) abre el `create` a `AllowAny`
(`views.py:892-894`) y reserva lectura y edición a administradores; cada alta
notifica al equipo vía `PendingPublicationNotificationService().notify_created()`
(`views.py:927`). La bandeja se gestiona desde
`frontend/app/admin/pending-publications/page.tsx`, que permite cambiar el
estado (`:157`) y abrir un WhatsApp al interesado (`:169`).

### 4.2 `Lead` — interesados en una propiedad

Modelo en `backend/real_estate/models.py:378`. `SOURCE_CHOICES`
(`models.py:383-389`) distingue `property_modal`, `property_page`, `whatsapp`,
`phone` y `other`; `STATUS_CHOICES` (`models.py:391-395`) recorre `new` →
`contacted` → `closed`. `LeadViewSet` (`backend/real_estate/views.py:844`)
permite el `create` público y restringe el resto a usuarios autenticados, que
solo ven los leads de sus propias propiedades (docstring en `views.py:845-852`).

### 4.3 Contacto comercial directo

Los planes de pago anunciados se resuelven íntegramente fuera del producto: los
CTA de `frontend/app/inmobiliarias/page.tsx:80` y `:88` abren WhatsApp mediante
`buildWhatsAppUrl` (`:16`). No hay formulario de alta de plan ni registro
persistente de esas conversaciones en la base de datos.

---

## 5. Puntos de extensión — PROPUESTA, NO IMPLEMENTADO

> ⚠️ **Nada de esta sección existe en el código.** Es un inventario de los
> lugares que habría que tocar, anclado a ficheros reales, para que quien
> implemente suscripciones no tenga que redescubrirlos. No debe leerse como
> descripción del sistema actual.

- **Portador del plan:** el modelo `User` (`backend/real_estate/models.py:7`) es
  el único punto natural; hoy no tiene ningún campo relacionado.
- **Punto de aplicación de cuotas:** `backend/estate_map/settings.py:366` señala
  explícitamente ese bloque como el lugar previsto para límites por usuario, y
  la validación de `backend/real_estate/serializers.py:230-262` es donde esos
  valores se consumirían.
- **Tope de propiedades:** no existe ningún punto de control; habría que crearlo
  en el `create` de `PropertyViewSet` (`backend/real_estate/views.py:289-297`,
  donde ya vive el scope `property_write`).
- **Throttling diferenciado:** los scopes de `settings.py:171-182` son globales;
  un plan de pago exigiría throttles por usuario en lugar de por scope.
- **Embudo de conversión:** `PendingPublication.status = "converted"`
  (`models.py:431`) es el gancho ya existente más cercano a un evento de alta.
- **Precios mostrados:** cualquier implementación debe reconciliar
  `frontend/app/inmobiliarias/page.tsx:59-90`, hoy codificado a mano, con la
  fuente de verdad real.

Ver también [`payments.md`](./payments.md) para el estado de la integración de
cobros.
