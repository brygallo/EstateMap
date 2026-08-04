# Desarrollo guiado por especificaciones

Este proyecto guarda sus reglas de negocio en `specs/`, no en la cabeza de quien
escribió el código. Antes de tocar nada, lee esto entero.

## Por qué existe

Un portal inmobiliario acumula reglas que nadie recuerda: qué precio va en qué
campo cuando un anuncio es venta y alquiler a la vez, qué se envía al mapa y qué
se omite a propósito, cuándo gana un anuncio duplicado frente a otro. Cuando esas
reglas solo viven en el código, cada cambio es una apuesta.

`specs/` las hace explícitas y **verificables**: toda regla marcada como
implementada apunta a las líneas que la aplican, y `tools/specs/validate.py`
comprueba que ese código siga ahí. Si alguien mueve o borra la implementación, el
gate falla citando el id de la regla.

## El contrato

Antes de modificar código:

1. **Busca la regla en `specs/`.** `grep -r "<palabra>" specs/` o mira el índice
   generado en `docs/generated/README.md`.
2. **No inventes reglas de negocio.** Si el código hace algo que ninguna spec
   describe, eso es un hallazgo, no una licencia para improvisar.
3. **Si falta una regla, párate y propón.** Crea `specs/proposals/<tema>.yaml`
   con el mismo formato y `status: proposed`. Las propuestas no se validan contra
   el código y no bloquean nada.
4. **Implementa primero la validación del backend.** El frontend no es una
   frontera de seguridad: en este repo los tokens viven en `localStorage` y
   `is_staff` se lee de un JWT sin verificar firma. Todo lo que importe se decide
   en el servidor.
5. **Refleja la regla en el frontend** después, para que la interfaz no prometa
   lo que el servidor no cumple.
6. **Regenera los tests** con `./scripts/specs.sh tests` y escribe a mano los que
   el generador no puede deducir.
7. **Ejecuta las tres capas**: unitarias y de API con `pytest`, extremo a extremo
   con Playwright.
8. **No des una tarea por terminada mientras exista una contradicción** entre
   código, tests y specs. Si el test falla, una de las tres partes miente;
   averigua cuál antes de tocar nada.

## La regla que más se incumple

**El estado de una regla determina si puede llevar evidencia, y es innegociable.**

| `status`          | ¿Lleva `evidence`? | Qué significa                                |
| ----------------- | ------------------ | -------------------------------------------- |
| `implemented`     | Obligatoria        | El código lo aplica hoy                      |
| `partial`         | Obligatoria        | Se aplica solo en alguna capa                |
| `proposed`        | **Prohibida**      | Nadie lo ha construido; es una intención     |
| `not_implemented` | **Prohibida**      | Se decidió no construirlo, o es un hueco     |
| `deprecated`      | Opcional           | Se aplicaba y ya no                          |

Escribir una regla como `implemented` porque "debería funcionar así" es la única
forma de romper este sistema. Si no puedes citar `archivo:línea` con un símbolo
que exista, la regla no está implementada. Punto.

Cuando el código hace algo que consideras un defecto, no lo escondas: usa **dos
reglas**. Una `implemented` que describa lo que ocurre de verdad, y otra
`proposed` con el comportamiento correcto. La suite se queda en verde describiendo
la realidad, y el defecto queda registrado con un test en skip esperando a que
alguien lo arregle. Hay varios casos así en `specs/permissions/matrix.yaml`.

## Comandos

```bash
./scripts/specs.sh validate    # ¿siguen las specs correspondiendo con el código?
./scripts/specs.sh docs        # regenera docs/generated/
./scripts/specs.sh tests       # regenera los tests derivados de las specs
./scripts/specs.sh all         # las tres
./scripts/specs.sh check       # lo que corre CI: falla si algo está desactualizado
./scripts/specs.sh fix-ranges  # re-ancla los `lines` sobre su `symbol` tras un refactor
```

Si `validate` se queja de que un rango no contiene su símbolo, la respuesta casi
siempre es `fix-ranges`, no editar el número a mano. Pero si te dice que el
símbolo **ha desaparecido** del archivo, para: eso significa que el código que
aplicaba la regla ya no está, y hay que decidir si la regla sigue siendo cierta.

Y al escribir un caso `expected: allowed`, añade `expected_http_status` siempre
que puedas construir una petición válida. Sin él, el test solo prueba que el rol
no fue rechazado: un 400 o un 404 pasarían.

Los tests generados son de usar y tirar: se sobrescriben enteros. **No los
edites**; edita el caso en el YAML y vuelve a generar.

## Marcadores `SPEC:`

Una regla que pide cobertura (`tests: {api: true}`) exige que algún test lleve el
marcador `SPEC:<id>` en su cuerpo. Los generados lo llevan solo; a los escritos a
mano hay que ponérselo en el docstring o en un comentario:

```python
def test_no_se_puede_borrar_imagen_ajena(...):
    """SPEC:PERM-014 — solo el propietario borra sus imágenes."""
```

Sin marcador, `validate.py` da la regla por descubierta. Es el único hilo entre
una regla y su prueba, así que no lo pongas en un test que no la ejerza de verdad.

## Dónde va cada cosa

| Carpeta                  | Qué contiene                                        | ¿A mano? |
| ------------------------ | --------------------------------------------------- | -------- |
| `specs/`                 | Reglas en YAML. La fuente de verdad.                | Sí       |
| `specs/proposals/`       | Reglas sin implementar aún. No se validan.          | Sí       |
| `docs/generated/`        | Vista Markdown de `specs/`.                         | **No**   |
| `docs/business-rules/`   | Prosa explicativa, contexto, historia.              | Sí       |
| `docs/technical/`        | Arquitectura, caché, Celery, Redis.                 | Sí       |
| `docs/decisions/`        | ADRs: decisiones y por qué.                         | Sí       |
| `backend/…/tests/generated/` | Tests derivados de los casos de las specs.      | **No**   |
| `tests/e2e/`             | Playwright escrito a mano.                          | Sí       |
| `tests/generated/`       | Playwright derivado de las specs.                   | **No**   |

## Convenciones del repo que este documento no deroga

- **Todo el código va en inglés**: identificadores, comentarios, docstrings,
  mensajes de error de las herramientas, nombres de tests y sus aserciones. El
  español se reserva para lo que lee una persona: los textos de la interfaz, la
  documentación de `docs/` y la prosa de las specs (`summary`, `rationale`).
  Un test de Playwright se llama `map payload leaks no private metrics`, y dentro
  puede buscar el texto «Forma del terreno» porque eso es lo que ve quien usa el
  portal.
- Los mensajes de commit van en inglés, y nunca se hace `git commit` sin que lo
  pida explícitamente la persona con la que trabajas.
- Nada de comentarios `{# … #}` ni `<!-- … -->` dentro de las plantillas Django:
  acaban visibles en la interfaz.
- El mapa es MapLibre. `react-leaflet` se eliminó del proyecto.
- En la interfaz se dice «Forma del terreno», y los contadores de visitas no se
  muestran nunca en público.
