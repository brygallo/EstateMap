# 0001 — Las reglas de negocio viven en `specs/` y se validan contra el código

- **Fecha:** 2026-08-04
- **Estado:** aceptada

## Contexto

El sistema acumuló reglas que solo existían en la cabeza de quien las escribió o
enterradas en un `if`. Algunos ejemplos reales encontrados al documentar el
código:

- `price` guarda el precio de venta y `rent_price` el de alquiler **solo** cuando
  un anuncio es las dos cosas a la vez; si es solo alquiler, el precio va en
  `price`. No hay forma de deducirlo sin leer un comentario en el modelo.
- El payload del mapa omite `views_count` a propósito, porque los contadores de
  visitas no se muestran en público. Nada en el código dice que sea una regla y
  no una omisión.
- `show_measurements = False` sugiere que se ocultan las medidas, pero el
  polígono exacto se envía siempre: la promesa de la interfaz y el comportamiento
  del backend no coinciden.
- `duplicate_of` e `is_duplicate` existen en el modelo y ningún camino del código
  los escribe.

Documentar esto en Markdown resuelve el problema el día que se escribe y lo
reintroduce tres meses después, cuando el código cambia y el documento no.

## Decisión

Las reglas de negocio se escriben en YAML bajo `specs/`, con un esquema estricto
(`specs/schemas/rule.schema.json`), y **toda regla marcada como implementada debe
apuntar al código que la aplica**: archivo, rango de líneas y un símbolo.

`tools/specs/validate.py` comprueba esos punteros contra el árbol de trabajo. Si
el archivo desaparece, si el rango se sale del final o si el símbolo se renombró,
la validación falla citando el id de la regla. CI lo ejecuta en cada pull request.

De las specs se derivan dos cosas:

- **Documentación** (`docs/generated/`), que por construcción no puede quedarse
  desfasada respecto al YAML.
- **Tests** (`backend/real_estate/tests/generated/` y `tests/generated/`), a
  partir del bloque `cases:` de cada regla. Los casos de permisos se convierten
  en llamadas HTTP reales contra los viewsets.

El vínculo inverso —de la regla a su prueba— es un marcador `SPEC:<id>` en el
código del test. El validador exige que exista para cada regla que declare
cobertura.

## Alternativas descartadas

**Un motor de políticas en tiempo de ejecución** (`policy_engine.evaluate("SUB-001", …)`).
Mueve la decisión a un intérprete de YAML en producción: más piezas, peor
depuración y ninguna garantía de que el YAML describa lo que el resto del código
hace igualmente por su cuenta. El valor que se buscaba —que las reglas sean
explícitas y comprobables— se obtiene validando en desarrollo, sin coste en
producción ni riesgo en la ruta de las peticiones.

**Solo Markdown.** Es lo que ya había. No hay forma de comprobar mecánicamente
que un párrafo siga siendo cierto.

**Meter PyYAML y jsonschema en la imagen del backend** para poder validar desde
`pytest`. Dos dependencias de producción para un control de desarrollo. Se optó
por un virtualenv aparte (`.venv-specs`), y el test que corre el validador dentro
de la suite usa `importorskip`, de modo que pasa por alto si las dependencias no
están y el gate real vive en CI.

## Consecuencias

**A favor**

- Una regla que deja de cumplirse se detecta al mover el código, no cuando un
  usuario se queja.
- Las contradicciones entre lo que promete la interfaz y lo que hace el servidor
  quedan escritas como dos reglas explícitas en vez de perderse.
- Los defectos conocidos (por ejemplo, que cualquier autenticado pueda borrar
  imágenes de propiedades ajenas) quedan registrados con su test en *skip*, en
  lugar de vivir en una conversación.
- Las herramientas de IA que trabajan en el repo tienen dónde mirar antes de
  inventar comportamiento; `agents/CLAUDE.md` lo convierte en obligación.

**En contra**

- Escribir una regla cuesta más que escribir un párrafo, porque hay que encontrar
  el código y verificar la cita.
- Los rangos de líneas se rompen con refactorizaciones grandes. Es el precio de
  que la validación signifique algo; `symbol` amortigua los desplazamientos
  pequeños.
- Hay que acordarse de regenerar. CI lo comprueba con `--check`, así que el olvido
  se convierte en un fallo visible y no en una desincronización silenciosa.

## Notas

El ejemplo que motivó esta decisión proponía una regla `SUB-001` de "importación
exclusiva para Premium". Al verificarla contra el código resultó que **no existe
ninguna suscripción, plan ni pasarela de pago** en el repositorio. Está registrada
en `specs/domains/subscriptions.yaml` con `status: not_implemented` y sin
evidencia: el primer uso del sistema fue impedir que se documentara como real una
regla que no lo era.
