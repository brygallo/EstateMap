# Prompt: implementar una regla ya especificada

Úsalo cuando `specs/` contenga una regla `proposed` o `not_implemented` y toque
construirla.

---

Implementa la regla **<ID>** de `specs/`.

1. **Léela entera**, incluidos `rationale`, `conditions` y todos los `cases`. Si
   hay una regla `implemented` hermana que describe el comportamiento actual
   (típico en los defectos conocidos), léela también: te dice exactamente qué vas
   a cambiar.
2. **Comprueba que la regla sigue teniendo sentido.** Si el código cambió desde
   que se escribió, dilo y actualiza la spec antes de programar.
3. **Empieza por el backend.** La validación que importa se hace en el servidor.
   Si la regla habla de permisos, cuida que un `permission_classes` dentro de un
   `@action` de DRF **sustituye** al del viewset, no se suma: es la causa de al
   menos un hueco ya registrado en este repo.
4. **Escribe el test antes de dar por buena la implementación**, con el marcador
   `SPEC:<ID>` en el docstring.
5. **Refleja la regla en el frontend** si tiene interfaz, y añade el
   `data-testid` que la spec declare en `frontend.test_id`.
6. **Actualiza la spec:**
   - `status` pasa a `implemented` (o `partial` si solo cubriste una capa).
   - Añade `evidence` apuntando al código que acabas de escribir.
   - Si existía la pareja «regla `implemented` que describía el defecto», bórrala
     o pásala a `deprecated`; ya no describe la realidad.
7. **Cierra el ciclo:**
   ```bash
   ./scripts/specs.sh all
   docker compose run --rm backend pytest -q
   cd tests && npx playwright test
   ```

No marques la tarea como terminada si queda cualquier contradicción entre código,
tests y specs.
