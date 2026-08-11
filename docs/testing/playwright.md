# Pruebas de extremo a extremo con Playwright

La suite E2E vive en `tests/` porque valida la integración entre Next.js y
Django, no un paquete aislado.

## Cobertura

- `tests/e2e/map.spec.ts`: mapa MapLibre, movimiento del viewport y privacidad
  del payload público.
- `tests/e2e/catalogo.spec.ts`: catálogo, ficha, metadatos, JSON-LD y robots.
- `tests/e2e/publicar.spec.ts`: registro, sesión, publicación y redirecciones.
- `tests/generated/`: casos derivados de las reglas en `specs/`; no se editan a
  mano.

## Preparación

```bash
docker compose up -d
cd tests
npm ci
npx playwright install chromium
```

La aplicación debe responder en `http://localhost:3010` y el API en
`http://localhost:8010/api`. Pueden cambiarse con `E2E_BASE_URL` y
`E2E_API_URL`.

## Ejecución

Desde la raíz:

```bash
./run_tests.sh e2e
```

O directamente:

```bash
cd tests
npm test
```

La referencia operativa completa está en [`../../tests/README.md`](../../tests/README.md).
