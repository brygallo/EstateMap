# Tests del backend con pytest

Verificado contra el código el 2026-08-04.

La suite del backend es pytest + pytest-django. No hay `unittest.TestCase` de Django ni
`manage.py test` en uso: todo pasa por `pytest`, configurado en `backend/pytest.ini`.

Dependencias declaradas en `backend/requirements.txt:24-28`: `pytest>=7.4`,
`pytest-django>=4.7`, `pytest-cov>=4.1`, `pytest-xdist>=3.5` y `factory-boy>=3.3`
(`factory-boy` está instalado pero ningún test del repo lo importa hoy).

---

## 1. Configuración: `backend/pytest.ini`

```ini
[pytest]
DJANGO_SETTINGS_MODULE = estate_map.settings
python_files = tests.py test_*.py *_tests.py
python_classes = Test*
python_functions = test_*
addopts =
    --verbose
    --strict-markers
    --tb=short
    --nomigrations
    --reuse-db
markers =
    unit: Unit tests
    integration: Integration tests
    auth: Authentication tests
    email: Email related tests
    slow: Slow running tests
```

### Ajustes clave

| Clave | Valor | Qué implica |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` (`backend/pytest.ini:2`) | `estate_map.settings` | No existe un módulo de settings específico de test. La suite corre con los **mismos settings de producción/desarrollo**; las diferencias de entorno de test se aplican desde fixtures `autouse` del `conftest.py` (ver sección 3). |
| `python_files` (`backend/pytest.ini:3`) | `tests.py test_*.py *_tests.py` | Solo se recolectan ficheros con esos nombres. Los flujos de navegador viven en la suite separada de Playwright. |
| `python_classes` (`backend/pytest.ini:4`) | `Test*` | Las clases de agrupación se llaman `TestLogin`, `TestPasswordReset`, etc. Las clases auxiliares que no deben recolectarse usan prefijo `_` o nombre distinto (`FakeQuerySet` en `backend/real_estate/tests/test_map_payload.py:21`, `_FakeClient` en `backend/ingesta/tests/test_plusvalia.py:233`). |

### Efecto práctico de los `addopts` (`backend/pytest.ini:6-11`)

- **`--nomigrations`**: pytest-django **no ejecuta las migraciones** de Django al crear la base
  de datos de test; construye el esquema directamente desde el estado actual de los modelos
  (`CREATE TABLE` derivado de `models.py`). Ventaja: el arranque de la suite pasa de minutos a
  segundos en un proyecto con historial largo de migraciones. Contrapartida: **la suite no valida
  que las migraciones estén completas ni que apliquen limpio**. Por eso el CI ejecuta, aparte de
  los tests, `python manage.py makemigrations --check --dry-run`
  (`.github/workflows/deploy.yml:45`): esa es la red de seguridad que `--nomigrations` deja fuera.
  Corolario para quien escribe modelos: si cambias un modelo y no generas la migración, los tests
  locales pasan igual y el fallo aparece recién en CI.

- **`--reuse-db`**: la base de datos de test (`test_<DB_NAME>`) **no se destruye al terminar** y se
  reutiliza en la siguiente corrida. Ahorra la recreación completa del esquema en cada ejecución.
  Contrapartida: si cambias un modelo (columna nueva, tabla nueva), la BD reutilizada queda
  desactualizada y verás errores tipo `column ... does not exist`. La solución es forzar la
  recreación una vez:

  ```bash
  docker-compose run --rm backend pytest --create-db
  ```

  (`--create-db` anula `--reuse-db` para esa ejecución.)

- **`--strict-markers`**: usar un marcador no declarado en la sección `markers` es un **error**, no
  un warning. Si necesitas un marcador nuevo, primero agrégalo a `backend/pytest.ini:12-17`.

- **`--tb=short`** y **`--verbose`**: traceback corto y un test por línea en la salida.

### Marcadores declarados (`backend/pytest.ini:12-17`)

`unit`, `integration`, `auth`, `email`, `slow`.

Uso real hoy: `auth` y `email` se aplican en los tests de cuenta
(`backend/real_estate/tests/test_authentication.py:13`, `:171`,
`backend/real_estate/tests/test_email_change.py:15-16`,
`backend/real_estate/tests/test_password_reset.py:15-16`,
`backend/real_estate/tests/test_registration.py:15`), y `unit` en
`backend/real_estate/tests/test_authentication.py:255`. Los marcadores `integration` y `slow`
están declarados pero **no se usan en ningún test actualmente** — importante porque
`./run_tests.sh fast` filtra con `-m 'not slow'` (`run_tests.sh:107`) y, al no haber tests marcados
como `slow`, hoy no excluye nada.

Filtrar por marcador:

```bash
docker-compose run --rm backend pytest -m auth
docker-compose run --rm backend pytest -m "auth and not email"
```

---

## 2. Dónde vive cada cosa

```
backend/
├── pytest.ini                     # configuración única (rootdir de pytest)
├── real_estate/tests/
│   ├── conftest.py                # fixtures compartidas (SOLO para este directorio)
│   ├── spec_support.py            # soporte de los tests generados desde specs/ (sección 3.9)
│   └── test_*.py                  # 16 ficheros
└── ingesta/tests/
    └── test_*.py                  # 9 ficheros, SIN conftest.py propio
```

**Detalle que sorprende:** `conftest.py` está dentro de `real_estate/tests/`, no en la raíz del
backend. Por cómo funciona pytest, sus fixtures —**incluidas las `autouse`**— solo aplican a los
tests de `real_estate/tests/`. Los tests de `backend/ingesta/tests/` **no** reciben el correo en
memoria, ni Celery inline, ni el almacenamiento local; cada fichero de `ingesta/tests/` se defiende
solo (p. ej. `backend/ingesta/tests/test_verify_runner.py:45-47` define su propia fixture `autouse`
`no_media`, y `backend/ingesta/tests/test_verify_runner.py:38-40` una fixture local `fuente`).

---

## 3. Fixtures: `backend/real_estate/tests/conftest.py`

Este es el fichero que más conviene conocer antes de escribir un test. Define ocho fixtures —tres de
ellas `autouse`, que se aplican solas sin pedirlas— y reexporta dos más desde `spec_support.py`
(sección 3.9).

### 3.1 `api_client` — `conftest.py:16-19`

```python
@pytest.fixture
def api_client():
    return APIClient()
```

Cliente de DRF **sin autenticar**. Es el punto de entrada para todo test de endpoint. Úsalo para
probar el acceso anónimo, los 401/403 y los flujos públicos (registro, login, creación de leads).

```python
def test_algo(api_client):
    response = api_client.post(reverse('lead-list'), payload, format='json')
```

Para autenticar a mitad de un test, `api_client.force_authenticate(user=owner)` (patrón real en
`backend/real_estate/tests/test_leads.py:51`).

### 3.2 `user_data` — `conftest.py:22-31`

Un `dict` con el payload de registro válido:

```python
{'username': 'testuser', 'email': 'test@example.com',
 'first_name': 'Test', 'last_name': 'User', 'password': 'SecurePass123!'}
```

No toca la base de datos: es **solo el cuerpo de la petición** que se envía al endpoint de registro.
Se usa tal cual o con modificaciones puntuales:

```python
def test_register_invalid_password(api_client, user_data):
    user_data['password'] = '123'
    response = api_client.post(url, user_data)
```

### 3.3 `create_user` — `conftest.py:34-52`

Fixture **factoría** (devuelve una función, no un usuario). Depende de `db`, así que su solo uso ya
habilita el acceso a la base de datos.

Valores por defecto: `username='testuser'`, `email='test@example.com'`, `first_name='Test'`,
`last_name='User'`, `is_active=True`, `is_email_verified=True`, contraseña `'TestPass123!'`.

Detalle de implementación relevante: la contraseña se extrae con `pop` y se aplica con
`set_password()` + `save()` después de `create_user(**defaults)` (`conftest.py:47-51`), de modo que
queda correctamente hasheada y se puede hacer login con ella.

```python
# usuario por defecto, ya verificado y activo
user = create_user()

# variantes: cualquier campo del modelo se sobreescribe por kwargs
owner  = create_user(email='owner@example.com', username='owner')
sin_ok = create_user(is_email_verified=False)
inactivo = create_user(is_active=False)
otro   = create_user(password='OtraPass123!')
```

Ojo: si creas **dos** usuarios en el mismo test tienes que pasar `username` y `email` distintos, o
chocarás con la restricción de unicidad (patrón real en
`backend/real_estate/tests/test_leads.py:44-45`).

### 3.4 `authenticated_client` — `conftest.py:55-61`

```python
@pytest.fixture
def authenticated_client(api_client, create_user):
    user = create_user()
    api_client.force_authenticate(user=user)
    api_client.user = user
    return api_client
```

Combina las dos anteriores: un `APIClient` ya autenticado con el usuario por defecto. El usuario
queda **colgado del propio cliente** como `authenticated_client.user`, que es como los tests acceden
a él sin pedir otra fixture:

```python
def test_request_email_change_success(authenticated_client, clear_mailbox):
    user = authenticated_client.user
    ...
```

Úsalo para todo endpoint que exija sesión (cambio de email, "mis propiedades", leads propios). Si
necesitas un usuario con atributos distintos al default, no uses esta fixture: parte de `api_client`
+ `create_user(...)` + `force_authenticate`.

### 3.5 `clear_mailbox` — `conftest.py:64-68`

Vacía `django.core.mail.outbox` y lo devuelve. Pídela en cualquier test que cuente correos, para no
heredar mensajes de un test anterior:

```python
def test_public_lead_creation_notifies_property_owner(api_client, create_user, clear_mailbox):
    ...
    assert len(mail.outbox) == 1
    assert 'Nuevo interesado en Casa en Quito' in mail.outbox[0].subject
```

Se puede assertar contra `clear_mailbox` (es el mismo objeto lista) o importar `mail` y leer
`mail.outbox`; los tests del repo hacen lo segundo.

### 3.6 `reset_email_backend` — `conftest.py:71-74` — **autouse**

Fuerza `settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'` en cada test. Es
lo que hace que `mail.outbox` exista y que ningún test envíe correo real por SMTP. No hay que
pedirla. (El docstring dice "console backend" pero el valor asignado es `locmem`, que es el correcto
para poder inspeccionar `outbox`.)

### 3.7 `media_stays_on_local_disk` — `conftest.py:77-93` — **autouse**

**Este es el mecanismo por el que la suite no necesita MinIO / almacenamiento de objetos.**

```python
@pytest.fixture(autouse=True)
def media_stays_on_local_disk(settings, tmp_path_factory):
    settings.STORAGES = {
        **settings.STORAGES,
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
            "OPTIONS": {"location": str(tmp_path_factory.mktemp("media"))},
        },
    }
```

Cómo funciona y por qué existe:

1. El `default` storage real del proyecto es S3/MinIO —
   `backend/estate_map/settings.py:332-339` lo fija a
   `storages.backends.s3boto3.S3Boto3Storage`.
2. Sin esta fixture, cualquier test que guarde un `ImageField` intenta escribir en un bucket. Donde
   no hay MinIO corriendo (CI, sobre todo) el `.save()` moría con `NoCredentialsError` en vez de
   fallar —o pasar— por lo que el test realmente comprobaba.
3. La fixture sustituye **solo la clave `default`** (conserva `staticfiles` con el `**spread`) por
   `FileSystemStorage` apuntando a un directorio temporal.
4. `tmp_path_factory.mktemp("media")` crea un directorio **nuevo por cada test**, así que los
   ficheros escritos por un test nunca aparecen en otro.
5. La fixture `settings` de pytest-django deshace el cambio al terminar el test.

Origen: commit `ecb12e7` *"Keep test uploads on local disk so the suite needs no object storage"*
(2026-08-03), que añadió estas 19 líneas al `conftest.py` tras detectar que tres tests del pipeline
de imágenes dependían del contenedor de MinIO.

Consecuencia práctica: puedes escribir tests que suban imágenes (`SimpleUploadedFile`) sin levantar
MinIO. Ejemplos vivos:
`backend/real_estate/tests/test_async_image_pipeline.py`,
`backend/real_estate/tests/test_property_image_validation.py`,
`backend/real_estate/tests/test_image_optimization.py`.

Recordatorio: como el `conftest.py` cuelga de `real_estate/tests/`, esta protección **no cubre**
`ingesta/tests/`; allí `backend/ingesta/tests/test_verify_runner.py:45-47` neutraliza el media por su
cuenta.

### 3.8 `celery_runs_inline` — `conftest.py:96-109` — **autouse**

```python
@pytest.fixture(autouse=True)
def celery_runs_inline():
    from estate_map.celery import app
    previous = app.conf.task_always_eager
    app.conf.task_always_eager = True
    yield
    app.conf.task_always_eager = previous
```

Pone Celery en modo *eager*: cualquier `.delay()` se ejecuta **en el mismo proceso y de forma
síncrona**, en lugar de encolarse en Redis. Sin esto, un test que dispara una tarea fallaría por
conexión rechazada al broker en vez de por su propia aserción. Restaura el valor anterior al salir,
así que no contamina el resto de la sesión.

Implicación al escribir tests: después de llamar a un endpoint que encola trabajo, el efecto de la
tarea **ya ocurrió** cuando vuelve la respuesta; no hace falta esperar ni hacer *polling*. Se ve en
`backend/real_estate/tests/test_async_image_pipeline.py`, que prueba el pipeline asíncrono de
imágenes de punta a punta con esta premisa.

### 3.9 `spec_world` y `spec_request` — reexportadas desde `spec_support.py`

`conftest.py:9-11` importa dos fixtures que no define él:

```python
from real_estate.tests.spec_support import spec_request, spec_world  # noqa: F401
```

Pertenecen a la infraestructura de **tests generados a partir de `specs/`** (herramientas en
`tools/specs/`, entrypoint `./scripts/specs.sh`), que está en construcción: en el momento de esta
verificación `specs/` solo contiene `specs/schemas/rule.schema.json` y **todavía no hay ningún test
generado** en el repo. Se documentan aquí porque ya están disponibles para cualquier test de
`real_estate/tests/`.

- **`spec_world`** (`spec_support.py:128-130`): depende de `db` y devuelve un `SpecWorld`, el
  "mundo mínimo" de un caso de permisos — usuarios creados bajo demanda por rol y una propiedad
  publicada. Roles válidos (`spec_support.py:26-35`): `anonymous`, `authenticated`, `unverified`,
  `owner`, `not_owner`, `staff`, `superuser`, `internal`. `spec_world.property`
  (`spec_support.py:80-97`) crea perezosamente una propiedad en Macas propiedad del rol `owner`;
  `spec_world.client(role)` (`spec_support.py:115-125`) devuelve un `APIClient` autenticado con ese
  rol, salvo `anonymous` (sin autenticar) e `internal` (sin usuario, con `REMOTE_ADDR=127.0.0.1`
  para quedar exento de los throttles anti-scraper).
- **`spec_request`** (`spec_support.py:133-149`): una función
  `_request(method, path, role, payload=None)` que resuelve los marcadores `{property_id}`, `{id}`,
  `{pk}` y `{owner_id}` de la ruta contra el `spec_world` y ejecuta la llamada con el cliente del
  rol. Los verbos sin cuerpo (`GET`, `DELETE`, `HEAD`, `OPTIONS`) se envían sin payload; el resto
  como JSON.

`spec_support.py` expone además el helper `assert_outcome(...)` (`spec_support.py:152-189`), que no
es fixture: se importa directamente y compara la respuesta real contra el `allowed` / `denied` que
promete la spec.

---

## 4. Inventario de ficheros de test

### 4.1 `backend/real_estate/tests/` (16 ficheros)

| Fichero | Qué cubre |
|---|---|
| `test_registration.py` | Registro de usuario (éxito, email duplicado, contraseña inválida, campos faltantes), verificación de email por código (válido, inválido, expirado, ya verificado) y reenvío del código. |
| `test_authentication.py` | Login (éxito, contraseña errónea, email inexistente, usuario inactivo, email sin verificar + reenvío, campos faltantes), peticiones autenticadas vs. anónimas, contenido y refresco del token JWT, y el modelo `User` (creación, unicidad de email, `__str__`). |
| `test_password_reset.py` | Solicitud de reset (éxito, email inexistente, invalidación de tokens previos), aplicación del reset (token inválido, expirado, ya usado, contraseña débil) y validez del token. |
| `test_email_change.py` | Cambio de email autenticado: solicitud (éxito, sin sesión, email duplicado, mismo email, invalidación de tokens previos), verificación (código inválido/expirado, email tomado entre medias) y validez del token. |
| `test_leads.py` | Creación pública de un lead y el correo que llega al dueño y al `contact_email` de la propiedad; y que el listado de leads solo devuelve los de las propiedades propias. |
| `test_services.py` | `GoogleAuthenticationService` (rechaza email no verificado, vincula cuenta existente), que el endpoint de Google no filtra la excepción interna, que el serializador público ignora campos internos, y que el servicio de notificación de leads registra en log el fallo de envío. |
| `test_async_image_pipeline.py` | Pipeline asíncrono de imágenes: el POST responde antes de optimizar, el worker publica y borra el fichero en *staging*, un fichero ilegible marca la fila como fallida sin reintentar sin fin, el barrido elimina huérfanos pero respeta los reclamados, una caída del broker aún produce imagen final, un *staging* no escribible no rompe la publicación, y el serializador sirve las imágenes pendientes desde *staging*. |
| `test_image_optimization.py` | `ImageOptimizationService`: una imagen pequeña ya optimizada se conserva byte a byte, una grande se redimensiona una sola vez a WebP de alta calidad, la miniatura se genera directamente al tamaño configurado, y un PNG grande con transparencia mantiene el alfa con WebP sin pérdida. |
| `test_property_image_validation.py` | Validación de subidas en `PropertySerializer`: rechaza por debajo de dimensiones mínimas, formato no permitido, subida combinada de más de 50 MB y más de diez imágenes ya en la propiedad; acepta formato soportado y rebobina el stream. |
| `test_polygon_validation.py` | `validate_and_normalize_polygon`: normaliza un anillo abierto lat/lng a GeoJSON cerrado y rechaza polígonos auto-intersecantes. |
| `test_map_payload.py` | `build_map_payload`: un polígono sin punto guardado obtiene chincheta en su centro, el clúster de ciudad se sitúa sobre sus listados (no sobre el centro del cantón), los límites del clúster ignoran un listado mal ubicado, y el zoom de expansión sigue la dispersión del grupo. |
| `test_bot_detection.py` | `is_bot_user_agent` con user-agents no humanos y de navegador (parametrizado), marcado de crawlers en la ingesta ignorando el valor que envíe el cliente, métricas de dueño que cuentan solo humanos y reportan volumen de bots, y el throttle de `map-points` que frena scrapers sin bloquear al renderer propio. |
| `test_admin_dashboard.py` | Dashboard admin: calidad del catálogo y salud de la ingesta; filtros del listado admin entre inventario importado y de usuario; filtros de calidad y cambio de estado en lote. |
| `test_admin_metrics_contacts.py` | `AdminMetricsService` y el conteo de contactos únicos: varios métodos en una sesión cuentan uno, sesiones distintas cuentan aparte, fallback a usuario si falta sesión, tasa de contacto cero sin vistas de detalle, división por vistas de detalle, desglose por método, contacto sin sesión ni usuario, contacto sin propiedad, exclusión de contactos de más de 30 días, y denominador que incluye las vistas de página de propiedad. |
| `test_market_intelligence.py` | Inteligencia de mercado: la comparación de una propiedad contra el inventario y el seguimiento de cambios de precio; y que el filtro por ciudad acota **todas** las métricas de `market-stats`. |
| `test_system_operations.py` | Observabilidad y operaciones: los incidentes se agregan sin query strings ni payloads, el endpoint admin de estado del sistema reporta el worker y permite resolver un incidente, y la clave de idempotencia impide publicar la propiedad dos veces. |

### 4.2 `backend/ingesta/tests/` (9 ficheros)

| Fichero | Qué cubre |
|---|---|
| `test_plusvalia.py` | El scraper de Plusvalía, el fichero más grande: parseo de ficha (proyecto, coordenadas exactas, WhatsApp, precio y operación, inmobiliaria e id, imágenes y descripción, mayor resolución por imagen, limpieza del CTA "leer descripción completa", dormitorios y baños), clasificados sin coordenadas descartados, prioridad de las coordenadas del listado sobre la ficha, extracción de registros del listado por id, venta+alquiler con ambos precios; y comportamiento de red: backoff y reintento ante 429, aborto tras 403 repetidos, corte de la franja histórica en modo incremental, HTTP 410 notificado y contado para el corte, y redirección fuera de `/propiedades` registrada como retirada. |
| `test_remax.py` | El scraper de RE/MAX: parseo a dict, coordenadas exactas, teléfono y email, tipo de operación y precio, dimensiones y ambientes, ubicación desde el `addressInfo` del listado, imágenes excluyendo las 360 y usando el CDN, descripción del detalle, `source_url` por operación, y descarte sin coordenadas. |
| `test_verify_runner.py` | El corredor de verificación: borra las que devuelven *gone* y sella las supervivientes, visita primero las más antiguas respetando el límite, entra en enfriamiento y reanuda tras un bloqueo, y se rinde tras el máximo de enfriamientos conservando el progreso. |
| `test_retirement.py` | Retirada de listados: conserva la auditoría pero borra la propiedad importada, un listado nunca importado solo deja un registro de auditoría pequeño, y una propiedad publicada por un usuario **nunca** se borra. |
| `test_incremental_state.py` | Estado incremental: un listado retirado es conocido por la siguiente corrida incremental, y uno retirado hace tiempo se vuelve a comprobar a los treinta días. |
| `test_upsert_images.py` | Upsert con imágenes: la propiedad creada se revierte si fallan todas las imágenes, se revierte si las imágenes son obligatorias y faltan, y `attach_images_from_urls` conserva las imágenes existentes cuando fallan las descargas. |
| `test_packaging.py` | `PaqueteReader`: acepta un paquete completo, rechaza uno parcial, reporta una línea JSON inválida y rechaza `external_id` duplicados. |
| `test_maintenance.py` | Mantenimiento del catálogo: la vista previa cuenta solo candidatos importados a limpieza, y la limpieza exige confirmación y nunca borra una propiedad de usuario. |
| `test_source_dates.py` | `extract_html_source_dates` / `parse_source_datetime`: extrae `datePosted`/`dateModified` del JSON-LD del HTML y no inventa una fecha cuando el valor es inválido. |

---

## 5. Cómo se ejecuta la suite

Hay dos caminos, y conviene saber cuándo usar cada uno.

### 5.1 `./run_tests.sh` — atajos sobre Docker

`run_tests.sh` está en la **raíz del repo**. Comprueba que Docker esté corriendo y, para cada
subcomando, lanza:

```bash
docker-compose run --rm backend pytest <args>
```

(`run_tests.sh:52`). Es decir, levanta un contenedor `backend` efímero (`--rm`) con sus servicios
dependientes de `docker-compose.yml` — Postgres, MinIO, Redis — y ejecuta pytest dentro. El
directorio de trabajo dentro del contenedor es `/app`, que es `./backend` montado como volumen, por
eso las rutas que pasa el script son relativas a `backend/` (`real_estate/tests/...`).

| Subcomando | Lo que ejecuta realmente | Referencia |
|---|---|---|
| `all` (por defecto) | `pytest real_estate/tests/` | `run_tests.sh:70` |
| `registration` | `pytest real_estate/tests/test_registration.py` | `run_tests.sh:74` |
| `password-reset` | `pytest real_estate/tests/test_password_reset.py` | `run_tests.sh:78` |
| `email-change` | `pytest real_estate/tests/test_email_change.py` | `run_tests.sh:82` |
| `auth` | `pytest real_estate/tests/test_authentication.py` | `run_tests.sh:86` |
| `coverage` | ver sección 6 | `run_tests.sh:89-97` |
| `watch` | `pytest real_estate/tests/ -f` | `run_tests.sh:103` |
| `fast` | `pytest real_estate/tests/ -m 'not slow'` | `run_tests.sh:107` |
| `failed` | `pytest real_estate/tests/ --lf` (solo los que fallaron la última vez) | `run_tests.sh:111` |
| `verbose` | `pytest real_estate/tests/ -vv` | `run_tests.sh:115` |
| `help` | imprime la ayuda | `run_tests.sh:118` |

Cualquier otro argumento imprime "Opción no reconocida" y sale con código 1 (`run_tests.sh:122-126`).

**Dos limitaciones reales del script**, que hay que tener presentes:

1. **Nunca ejecuta `backend/ingesta/tests/`.** Todos los subcomandos apuntan a `real_estate/tests/`.
   `./run_tests.sh all` **no** es "toda la suite". Para los tests de ingesta hay que invocar pytest
   directamente (sección 5.2).
2. El subcomando `watch` pasa `-f` (`--looponfail`), un flag provisto por `pytest-xdist`. Está
   documentado aquí porque es lo que el script hace; no se verificó su funcionamiento con la versión
   de `pytest-xdist` instalada.

Además, el `set -e` de la cabecera (`run_tests.sh:6`) hace que el script aborte en cuanto pytest
devuelva un código distinto de cero, así que el mensaje amarillo de "algunos tests fallaron"
raramente se ve.

**Cuándo usarlo:** en el día a día sobre el entorno Docker del proyecto, cuando quieres iterar sobre
los flujos de cuenta (registro, login, reset, cambio de email) sin recordar rutas ni flags.

### 5.2 `pytest` directo — la suite completa

Desde `backend/`, con el entorno Python del backend y las variables de base de datos apuntando a la
BD de desarrollo:

```bash
cd backend

pytest                                  # TODO: real_estate/tests + ingesta/tests
pytest real_estate/tests/               # solo la app principal
pytest ingesta/tests/                   # solo la ingesta (el script no llega aquí)
pytest -q                               # salida compacta, como en CI
```

O el equivalente dentro del contenedor:

```bash
docker-compose run --rm backend pytest            # toda la suite
docker-compose run --rm backend pytest ingesta/tests/
```

**Cuándo usarlo:** siempre que quieras la cobertura real de la suite (incluida `ingesta`), replicar
lo que hará el CI, o pasar flags que el script no expone (`-k`, `-x`, `--create-db`, `-n`, `-m`).

### 5.3 Ejecutar un solo test

```bash
# por ruta::clase::test
pytest real_estate/tests/test_authentication.py::TestLogin::test_login_success

# por ruta::test (funciones sueltas, sin clase)
pytest real_estate/tests/test_leads.py::test_user_only_lists_leads_for_own_properties

# toda una clase
pytest real_estate/tests/test_password_reset.py::TestResetPassword

# por subcadena del nombre, en cualquier fichero
pytest -k "expired"
pytest -k "login and not missing"

# un fichero completo
pytest ingesta/tests/test_plusvalia.py

# parar en el primer fallo
pytest -x
```

Lo mismo vía Docker anteponiendo `docker-compose run --rm backend`:

```bash
docker-compose run --rm backend pytest real_estate/tests/test_leads.py -k notifies
```

---

## 6. Cobertura

El subcomando `coverage` (`run_tests.sh:89-97`) ejecuta exactamente:

```bash
docker-compose run --rm backend pytest real_estate/tests/ \
    --cov=real_estate \
    --cov-report=html \
    --cov-report=term-missing
```

- `--cov=real_estate`: mide **solo la app `real_estate`**. La app `ingesta` no entra en el informe.
- `--cov-report=term-missing`: resumen en la terminal, con las líneas no cubiertas de cada módulo.
- `--cov-report=html`: informe navegable. El script lo anuncia en `backend/htmlcov/index.html`
  (`run_tests.sh:97`) — se genera bajo el `cwd` del contenedor (`/app`, montado desde `./backend`),
  de ahí la ruta.

Para incluir la ingesta, hay que invocarlo a mano:

```bash
docker-compose run --rm backend pytest --cov=real_estate --cov=ingesta --cov-report=term-missing
```

`pytest-cov>=4.1` está declarado en `backend/requirements.txt:26`.

---

## 7. CI

**Sí, la suite corre en CI.** El único workflow es `.github/workflows/deploy.yml`.

- **Disparador** (`.github/workflows/deploy.yml:3-6`): `push` a la rama `main`. No hay disparador de
  `pull_request` ni manual: los tests **no** se ejecutan automáticamente sobre una PR abierta, solo
  cuando el commit llega a `main`.
- **Job `verify`** (`.github/workflows/deploy.yml:9-61`), sobre `ubuntu-latest`, con servicios
  `postgres:16` (con healthcheck `pg_isready`) y `redis:7-alpine`.
- Backend (`.github/workflows/deploy.yml:33-45`): Python 3.12 con caché de pip,
  `pip install -r backend/requirements.txt`, y desde `backend/`:

  ```bash
  pytest -q
  python manage.py makemigrations --check --dry-run
  ```

  Variables de entorno del paso: `DB_HOST=localhost`, `DB_NAME=estatedb`, `DB_USER=estateuser`,
  `DB_PASSWORD=estatepass`, `REDIS_CACHE_URL=redis://localhost:6379/1`.

  Nota: `pytest -q` **sin ruta**, así que en CI sí se recolecta la suite completa —
  `real_estate/tests/` **e** `ingesta/tests/`— a diferencia de `./run_tests.sh all`. Y no hay MinIO
  en el runner: la suite pasa gracias a la fixture `media_stays_on_local_disk` de la sección 3.7.

- Frontend (`.github/workflows/deploy.yml:46-61`): Node 20, `npm ci --legacy-peer-deps`,
  `npm run lint`, `npm run typecheck`, `npm test` (que es `vitest run`, `frontend/package.json:11`)
  y `npm run build`.
- **Job `deploy`** (`.github/workflows/deploy.yml:63-66`): declara `needs: verify`, así que un fallo
  de los tests **bloquea el despliegue** a producción.

---

## 8. Convenciones para escribir un test nuevo

1. **Ubicación y nombre.** Va en `backend/real_estate/tests/` o `backend/ingesta/tests/`, en un
   fichero `test_<tema>.py`. Recuerda que solo `real_estate/tests/` hereda el `conftest.py`.
2. **Acceso a base de datos.** O `@pytest.mark.django_db` sobre cada test/clase, o
   `pytestmark = pytest.mark.django_db` a nivel de módulo. El repo usa ambos: el marcador por test en
   los ficheros de cuenta (`test_leads.py:8`), y el `pytestmark` de módulo en los más nuevos
   (`test_admin_metrics_contacts.py:11`, `test_market_intelligence.py:8`,
   `ingesta/tests/test_retirement.py:8`). Para un test puramente funcional que no toca la BD, no
   pongas el marcador (`test_polygon_validation.py`, `test_map_payload.py`,
   `test_source_dates.py`).
3. **Nombres de test descriptivos, en inglés y en forma de afirmación.** La convención dominante en
   el código reciente es que el nombre diga la regla de negocio que se comprueba:
   `test_user_only_lists_leads_for_own_properties`,
   `test_user_published_property_is_never_deleted`,
   `test_cluster_bounds_ignore_a_single_misplaced_listing`. (Los tests de los scrapers son la
   excepción histórica: están en español, `test_coordenadas_reales_exactas`.)
4. **Usa las fixtures del `conftest.py`** en vez de crear usuarios a mano: `api_client`,
   `create_user`, `authenticated_client`, `clear_mailbox`.
5. **URLs por `reverse()`**, nunca literales: `reverse('lead-list')`. Así un cambio de ruta no
   silencia el test.
6. **Marcadores.** Solo `unit`, `integration`, `auth`, `email`, `slow`. Cualquier otro falla por
   `--strict-markers`; si necesitas uno nuevo, decláralo primero en `backend/pytest.ini:12-17`.
7. **Comentarios y docstrings en inglés** (regla global del repo).
8. **Nada de servicios externos.** Correo, Celery y almacenamiento ya están neutralizados por las
   fixtures `autouse`; para HTTP externo, el patrón del repo es un cliente falso inyectado
   (`_FakeClient` en `ingesta/tests/test_plusvalia.py:233`, `FakeScraper` en
   `ingesta/tests/test_verify_runner.py:15`) o `monkeypatch`.
9. **Estructura arrange / act / assert**, separada por líneas en blanco.

### Ejemplo real

Copiado tal cual de `backend/real_estate/tests/test_leads.py:1-39`. Es representativo: usa tres
fixtures del `conftest.py`, `reverse()` para la URL, y asserta tanto sobre la respuesta HTTP como
sobre el efecto lateral (el correo en `mail.outbox`, que existe gracias a la fixture `autouse`
`reset_email_backend`).

```python
import pytest
from django.core import mail
from django.urls import reverse

from real_estate.models import Lead, Property


@pytest.mark.django_db
def test_public_lead_creation_notifies_property_owner(api_client, create_user, clear_mailbox):
    owner = create_user(email='owner@example.com', username='owner')
    property_obj = Property.objects.create(
        owner=owner,
        title='Casa en Quito',
        city='Quito',
        province='Pichincha',
        price=120000,
        contact_email='contacto@example.com',
    )

    response = api_client.post(
        reverse('lead-list'),
        {
            'property': property_obj.id,
            'name': 'Maria Interesada',
            'phone': '0999999999',
            'email': 'maria@example.com',
            'message': 'Me interesa visitar la propiedad.',
            'source': 'property_modal',
        },
        format='json',
    )

    assert response.status_code == 201
    assert Lead.objects.filter(property=property_obj, name='Maria Interesada').exists()
    assert len(mail.outbox) == 1
    assert 'Nuevo interesado en Casa en Quito' in mail.outbox[0].subject
    assert mail.outbox[0].to == ['owner@example.com', 'contacto@example.com']
    assert 'Maria Interesada' in mail.outbox[0].body
    assert '0999999999' in mail.outbox[0].body
```

---

## 9. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `column ... does not exist` / `relation ... does not exist` | `--reuse-db` reutiliza una BD de test con esquema viejo tras cambiar un modelo | `pytest --create-db` una vez |
| `'xyz' not found in markers configuration option` | `--strict-markers` con un marcador no declarado | Declararlo en `backend/pytest.ini:12-17` |
| Los tests pasan en local pero CI falla en `makemigrations --check` | `--nomigrations` construye el esquema desde los modelos y no obliga a generar la migración | `python manage.py makemigrations` y commitear el fichero |
| Un test de `ingesta/` intenta escribir en MinIO o llamar al broker | El `conftest.py` con las fixtures `autouse` solo cubre `real_estate/tests/` | Neutralizarlo en el propio fichero, como hace `ingesta/tests/test_verify_runner.py:45-47` |
| `./run_tests.sh all` pasa pero CI falla | El script no ejecuta `ingesta/tests/` | Correr `pytest` sin ruta antes de subir |
