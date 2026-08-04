# Pagos y cobros

Verificado contra el código el 2026-08-04.

> **Estado: no implementado.** No existe ninguna integración de pasarela de
> pago, ni modelo de transacción, ni almacenamiento de datos de tarjeta en el
> repositorio; el único mecanismo de monetización presente es la captura de
> contactos comerciales (`Lead` y `PendingPublication`) que el equipo atiende
> manualmente por WhatsApp.

---

## 1. Verificación

La afirmación central es una **ausencia**, así que se documenta cómo se buscó.

### 1.1 Pasarelas de pago

```
$ git ls-files | grep -vE "node_modules|\.next" \
  | xargs grep -rniE "stripe|paypal|payphone|datafast|kushki|paymentez|nuvei|mercadopago|webhook.*pay|tarjeta de credito|card_number|cvv"
```

Resultado: **ninguna coincidencia real**. Las tres únicas líneas devueltas están
en `frontend/package-lock.json` y son ruido léxico: dos hashes `integrity` en
base64 que contienen la subcadena `pay`, y `frontend/package-lock.json:6200`, un
campo `funding` con la URL de donación (`paypal.me`) del autor de una
dependencia transitiva. Ninguna es código, configuración ni credencial.

Se cubrieron explícitamente las pasarelas internacionales (Stripe, PayPal) y las
usadas en Ecuador (PayPhone, Datafast, Kushki, Paymentez, Nuvei, Mercado Pago).

### 1.2 Modelos y migraciones de cobro

```
$ grep -rniE "class .*(Subscription|Plan|Payment|Invoice|Transaction|Order|Billing)" --include="*.py" backend/
(sin resultados)

$ grep -rliE "subscri|payment|billing|invoice" backend/real_estate/migrations/ backend/ingesta/migrations/
(sin resultados)
```

Las 26 migraciones de `real_estate` (hasta
`backend/real_estate/migrations/0026_systemincident.py`) no crean ninguna tabla
de cobros. Los modelos declarados en `backend/real_estate/models.py` son: `User`
(`:7`), `Province` (`:19`), `City` (`:36`), `Property` (`:59`),
`PropertyPriceHistory` (`:204`), `PropertyImage` (`:216`), `SystemIncident`
(`:273`), `EmailVerificationToken` (`:305`), `PasswordResetToken` (`:329`),
`EmailChangeToken` (`:353`), `Lead` (`:378`), `PendingPublication` (`:423`) y
`ActivityEvent` (`:467`). **Ninguno es financiero.**

### 1.3 Dependencias y rutas

`backend/requirements.txt` no declara ningún SDK de pasarela: sus dependencias
son Django/DRF, `psycopg2-binary`, `Pillow`, almacenamiento
(`django-storages`, `boto3`, `minio`), HTTP (`requests`, `httpx`, `curl_cffi`),
Celery/Redis, autenticación (`django-allauth`, `dj-rest-auth`, `google-auth`) y
utilidades de test.

`backend/real_estate/urls.py` no registra ninguna ruta de cobro ni de webhook.
El router (`:33-38`) expone `properties`, `provinces`, `cities`, `leads`,
`pending-publications` y `activity-events`; el resto de `urlpatterns` son
autenticación, cuenta, estadísticas de mercado, imágenes y el panel de
administración.

En el frontend, ninguna de las rutas de `frontend/app/` corresponde a un
checkout: existen `registro`, `iniciar-sesion`, `cuenta`, `account`,
`add-property`, `publicar-propiedad`, `publicar-asistido`,
`empezar-publicacion`, `mis-propiedades`, `editar-propiedad` y las páginas
públicas de catálogo y SEO, pero **no hay `pago`, `checkout`, `suscripcion` ni
equivalente**.

## 2. Constancia de cumplimiento (PCI / protección de datos)

Punto relevante para auditoría y para cualquier revisión de seguridad:

- **No se recogen datos de tarjeta.** No existe ningún campo de modelo,
  serializador ni formulario que capture número de tarjeta, CVV, fecha de
  caducidad o titular. El grep de §1.1 sobre `card_number`, `cvv` y `tarjeta de
  credito` no devuelve ninguna coincidencia.
- **No se almacenan datos de tarjeta.** Al no existir modelos ni migraciones de
  cobro (§1.2), la base de datos no contiene, ni ha contenido, datos de titular
  de tarjeta.
- **No hay tráfico hacia pasarelas.** No hay clientes HTTP, claves de API,
  webhooks ni variables de entorno apuntando a ningún procesador de pagos.
- **La cabecera de permisos del navegador desactiva la Payment Request API.**
  `frontend/next.config.js:72` envía
  `Permissions-Policy: camera=(), microphone=(), payment=(), geolocation=(self)`,
  de modo que `payment=()` bloquea explícitamente esa API en el navegador. Es
  una medida de endurecimiento preexistente, no un indicio de integración.

**Consecuencia:** el sistema queda hoy **fuera del alcance de PCI DSS**, porque
no transmite, procesa ni almacena datos de titular de tarjeta. Cualquier
integración futura cambiaría esa clasificación y debe evaluarse antes de
escribir código.

## 3. Qué hay en su lugar: monetización manual

El dinero, si lo hay, se cierra fuera del producto. Los mecanismos reales son:

- **Tabla de precios estática sin cobro asociado.**
  `frontend/app/inmobiliarias/page.tsx:59-90` define un array `PLANS`
  («Corredor» gratis, «Inmobiliaria» `$29/mes`, «Empresa» a medida). Los CTA de
  los planes de pago (`:80` y `:88`) apuntan a `WHATSAPP_URL`, construido en
  `:16` con `buildWhatsAppUrl`. **No existe checkout**: el precio se muestra,
  pero el cobro se negocia por conversación. Ver `subscriptions.md` §2 para el
  detalle de por qué esa página no describe el comportamiento del sistema.
- **`PendingPublication`** (`backend/real_estate/models.py:423`) captura
  intentos de publicación sin cuenta para seguimiento comercial. Su
  `STATUS_CHOICES` (`models.py:428-433`) incluye `converted`, hoy el único
  registro de una conversión en toda la base de datos, y se marca a mano desde
  `frontend/app/admin/pending-publications/page.tsx:157`. La creación es pública
  y está limitada a 10/min (`pending_create`,
  `backend/estate_map/settings.py:173`, aplicado en
  `backend/real_estate/views.py:899`).
- **`Lead`** (`backend/real_estate/models.py:378`) registra a los interesados en
  cada propiedad, con `STATUS_CHOICES` `new`/`contacted`/`closed`
  (`models.py:391-395`). Es el valor que el portal entrega al anunciante, y por
  tanto lo que un plan de pago vendería.
- **Notificación al equipo.** `LeadNotificationService` y
  `PendingPublicationNotificationService`
  (`backend/real_estate/services/notifications.py:13` y `:25`) avisan de cada
  captura. *Nota: este fichero está sin commitear en el árbol de trabajo en la
  fecha de verificación.*

Los límites operativos que aplican a todos los usuarios por igual (imágenes,
peso de subida, throttling) están documentados en
[`subscriptions.md`](./subscriptions.md) §3; ninguno depende de un pago.

---

## 4. Puntos de extensión — PROPUESTA, NO IMPLEMENTADO

> ⚠️ **Nada de esta sección existe en el código.** Es un mapa de dónde habría
> que intervenir, no una descripción del sistema.

- **Ubicación del código:** el patrón del repositorio sitúa la lógica de negocio
  en `backend/real_estate/services/` (junto a `notifications.py` y
  `authentication.py`); una integración de pasarela encajaría ahí, no en las
  vistas.
- **Webhooks:** requerirían rutas nuevas en `backend/real_estate/urls.py`, con
  verificación de firma y exentas del throttling por scope descrito en
  `backend/estate_map/settings.py:171-182`.
- **Regla obligatoria:** usar checkout alojado o tokenización de la pasarela,
  de forma que los datos de tarjeta **nunca** toquen este backend y se conserve
  la situación de §2. Almacenar únicamente identificadores opacos devueltos por
  el proveedor.
- **Secretos:** deben entrar por variables de entorno, como el resto de la
  configuración sensible en `backend/estate_map/settings.py`; nunca en el
  repositorio.
