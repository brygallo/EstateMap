# specs/ — las reglas de negocio, en un formato que se puede comprobar

Cada archivo YAML de esta carpeta describe un conjunto de reglas del sistema.
No es documentación decorativa: de aquí salen la documentación publicada y parte
de los tests, y hay un validador que comprueba que lo escrito siga siendo cierto.

## Qué hay

| Ruta                                | Qué contiene                                            |
| ----------------------------------- | ------------------------------------------------------- |
| `schemas/rule.schema.json`          | El contrato. Todo lo demás se valida contra él.         |
| `domains/`                          | Reglas por área de negocio: propiedades, importación…   |
| `permissions/matrix.yaml`           | Quién puede hacer qué. Declara el vocabulario de permisos. |
| `workflows/`                        | Invariantes de flujos de varios pasos.                  |
| `calculations/`                     | Fórmulas y agregados, con sus casos límite.             |
| `errors/catalog.yaml`               | Códigos de error. Declara el vocabulario de códigos.    |
| `ui/visibility-rules.yaml`          | Qué se muestra y qué se omite a propósito.              |
| `proposals/`                        | Reglas aún sin decidir. No se validan ni bloquean nada. |

## La idea

Una regla dice **qué** hace el sistema y **dónde** lo hace:

```yaml
- id: PROP-004
  name: El precio es opcional en anuncios importados
  status: implemented
  summary: >
    Una propiedad importada puede no tener precio: los portales publican
    "a consultar" y el sistema guarda NULL en vez de inventar un número.
  evidence:
    - file: backend/real_estate/models.py
      lines: "105-106"
      symbol: price
      note: null=True con el motivo en el help_text
  cases:
    - name: Anuncio sin precio declarado
      given: { price: null }
      expected: aceptado
```

`tools/specs/validate.py` comprueba que `backend/real_estate/models.py` exista,
que tenga al menos 106 líneas y que la cadena `price` siga apareciendo. Si
alguien mueve ese campo, CI falla citando `PROP-004`. Ese es todo el truco, y es
lo que separa esto de un documento que envejece en silencio.

## La regla del estado

| `status`          | `evidence`    | Significado                              |
| ----------------- | ------------- | ---------------------------------------- |
| `implemented`     | Obligatoria   | El código lo aplica hoy                  |
| `partial`         | Obligatoria   | Se aplica solo en alguna capa            |
| `proposed`        | **Prohibida** | Intención sin construir                  |
| `not_implemented` | **Prohibida** | Hueco conocido o decisión de no hacerlo  |
| `deprecated`      | Opcional      | Se aplicaba y ya no                      |

Un `proposed` con evidencia es una contradicción y el validador lo rechaza. Es
deliberado: sin esa restricción, cualquiera puede escribir la regla que le
gustaría que existiera y presentarla como si existiera.

Cuando el código tiene un defecto, se escriben **dos reglas**: una `implemented`
con lo que ocurre de verdad y otra `proposed` con lo que debería ocurrir. Los
tests generados a partir de la segunda salen en *skip* con la razón, así que la
suite se queda verde describiendo la realidad y el defecto queda anotado en vez
de olvidado.

## Qué demuestra realmente un caso

Los casos de permisos se convierten en llamadas HTTP de verdad, pero conviene
saber qué queda probado y qué no:

| Caso                                          | Lo que afirma el test                         |
| --------------------------------------------- | --------------------------------------------- |
| `expected: denied` con `http_status`          | La respuesta es exactamente ese código        |
| `expected: denied` sin `http_status`          | La respuesta es 401 o 403                     |
| `expected: allowed` con `expected_http_status` | La respuesta es exactamente ese código        |
| `expected: allowed` **sin** `expected_http_status` | Solo que **no** fue rechazada por permisos |

Ese último caso es más débil de lo que parece: un 400 por un cuerpo incompleto o
un 404 por una ruta equivocada lo dan por bueno. Sirve para afirmar «este rol
llega», no «este endpoint funciona». **Siempre que puedas construir una petición
válida, añade `expected_http_status`**, y el test pasa a defender el
comportamiento y no solo el permiso.

## El puntero se re-ancla, no se corrige a mano

`lines` envejece: un refactor en otro punto del archivo desplaza todo lo de
abajo. El `symbol` es la mitad duradera del ancla, así que hay una orden que
recalcula los rangos alrededor de su símbolo:

```bash
./scripts/specs.sh fix-ranges --dry-run   # qué cambiaría
./scripts/specs.sh fix-ranges             # aplicarlo
```

Nunca inventa un rango donde no lo había, y si el símbolo ha desaparecido del
archivo **no toca nada y avisa**: eso no es deriva, es que probablemente la regla
ya no se aplica, y lo tiene que mirar una persona.

## Comandos

```bash
./scripts/specs.sh validate    # ¿siguen concordando specs y código?
./scripts/specs.sh docs        # regenera docs/generated/
./scripts/specs.sh tests       # regenera los tests derivados
./scripts/specs.sh all         # las tres
./scripts/specs.sh check       # lo que corre CI
```

Las dependencias (PyYAML y jsonschema) se instalan solas en `.venv-specs` la
primera vez. No están en la imagen del backend a propósito: son una herramienta
de desarrollo, no algo que deba viajar a producción.

## Añadir una regla

Está explicado paso a paso en [`agents/prompts/add-business-rule.md`](../agents/prompts/add-business-rule.md).
Lo esencial: encuentra el código antes de declarar la regla implementada, escribe
casos con los bordes (nulo, vacío, límite exacto, límite más uno) y no marques una
capa en `tests:` si no va a existir un test con el marcador `SPEC:<id>`.
