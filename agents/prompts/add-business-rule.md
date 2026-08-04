# Prompt: añadir una regla de negocio

Úsalo cuando haya que documentar una regla que el código ya aplica pero que
`specs/` todavía no recoge.

---

Necesito añadir una regla de negocio a `specs/`.

**Regla:** <descríbela en una frase>

Pasos, en este orden:

1. **Comprueba que no exista ya.** `grep -ri "<términos>" specs/`. Si existe una
   regla parecida, actualízala en lugar de crear una nueva; los ids no se reciclan
   ni se renumeran.
2. **Encuentra el código que la aplica.** No la des por implementada hasta que
   puedas señalar el archivo, el rango de líneas y un símbolo (función, clase o
   constante) que exista literalmente ahí.
3. **Decide el `status` con honestidad.**
   - ¿El código lo hace hoy en todas las capas? → `implemented`, con `evidence`.
   - ¿Solo en el backend, o solo en la interfaz? → `partial`, con `evidence` y un
     `rationale` que diga qué capa falta.
   - ¿No lo hace nadie? → `proposed` o `not_implemented`, **sin** `evidence`.
4. **Escribe la regla** en el archivo de dominio que le corresponda, siguiendo
   `specs/schemas/rule.schema.json`. El esquema es estricto: una clave inventada
   rompe la validación.
5. **Escribe casos que se puedan ejecutar.** Para permisos, `role` + `expected:
   allowed|denied` junto a `backend.endpoint`; se convierten en llamadas HTTP
   reales. Para validaciones y cálculos, `given` + `expected` con los bordes:
   valor nulo, lista vacía, límite exacto, límite más uno.
6. **Marca `tests:` solo lo que vaya a existir.** Si marcas una capa, el validador
   exigirá un test con el marcador `SPEC:<id>`.
7. **Cierra el ciclo:**
   ```bash
   ./scripts/specs.sh all
   docker compose run --rm backend pytest real_estate/tests/generated/ -q
   ```
8. **Si un test generado falla, sospecha primero de la regla.** Lo más frecuente
   es que el sistema no haga lo que creíamos. Corrige el YAML para describir la
   realidad; si de verdad es un defecto del código, déjalo registrado como dos
   reglas (una `implemented` con lo que pasa, otra `proposed` con lo que debería
   pasar) y dilo en el resumen.

No cambies el comportamiento del código en esta tarea. Documentar y cambiar a la
vez oculta cuál de las dos cosas rompió algo.
