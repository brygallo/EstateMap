# Pruebas de extremo a extremo

Playwright contra el sistema completo: Next.js sirviendo páginas con datos de
Django. Vive fuera de `frontend/` a propósito, porque no prueba ese paquete sino
la integración de todo, y porque así el navegador de Playwright no entra en la
imagen de build del frontend.

```
tests/
├── e2e/          escrito a mano
├── generated/    derivado de specs/ — se sobrescribe entero, no lo edites
├── playwright.config.ts
└── package.json
```

## Poner en marcha

```bash
cd tests
npm install
npx playwright install chromium
```

La suite **no levanta el entorno**. Arráncalo antes desde la raíz del repo:

```bash
docker compose up -d
```

Y comprueba que responde antes de lanzar nada:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3010   # frontend
curl -s http://localhost:8010/api/health/                        # backend
```

## Ejecutar

```bash
npm test                       # todo, en Chromium y en móvil
npm test -- --project=chromium # solo escritorio
npm test -- e2e/map.spec.ts    # un archivo
npm run test:ui                # modo interactivo, útil para depurar selectores
npm run report                 # abre el informe HTML de la última ejecución
```

Direcciones configurables por variable de entorno:

| Variable       | Por defecto                  | Para qué                        |
| -------------- | ---------------------------- | ------------------------------- |
| `E2E_BASE_URL` | `http://localhost:3010`      | Dónde escucha Next.js           |
| `E2E_API_URL`  | `http://localhost:8010/api`  | Dónde escucha Django            |

## Conflicto de puertos conocido

En la máquina de desarrollo actual el puerto **8010 lo ocupa otro sistema**
(`aents_web_1`), así que el contenedor `backend` de este proyecto no puede
arrancar mientras aquél esté levantado. Se nota porque `docker compose ps` no
muestra `estatemap_backend` y `curl http://localhost:8010/api/health/` contesta
`{"service": "aents-backend"}` en vez de la salud de este proyecto.

Salidas: parar el otro sistema, o publicar el backend en otro puerto y apuntar
ahí `E2E_API_URL` y `NEXT_INTERNAL_API_URL`.

Recuerda además que conviven dos servidores de desarrollo del frontend, el de
Docker en el 3010 y uno en el host; si levantas el del host, hazlo con
`NEXT_DIST_DIR=.next-host` para que no se peleen por el directorio `.next`.

## Qué se prueba

| Archivo                  | Cubre                                                          |
| ------------------------ | -------------------------------------------------------------- |
| `e2e/map.spec.ts`        | El lienzo de MapLibre monta, mover el mapa pide datos, y el payload público no filtra métricas privadas |
| `e2e/catalogo.spec.ts`   | Listado, ficha de propiedad, contadores de visitas ocultos, título y descripción, JSON-LD, robots.txt |
| `e2e/publicar.spec.ts`   | Registro, inicio de sesión, la puerta de cuenta antes de publicar y la redirección de las rutas heredadas |
| `generated/*.spec.ts`    | Reglas de `specs/` que declaran `tests: {playwright: true}`     |

## Convenciones

- `getByRole` y `getByText` antes que selectores CSS. Si de verdad hace falta un
  gancho estable, añade un `data-testid` al componente y decláralo en la spec
  correspondiente (`frontend.test_id`), no te agarres a una clase de Tailwind.
- Nada de `waitForTimeout` con números mágicos: espera por un estado o por una
  respuesta de red concreta.
- Los tests corren en paralelo y en cualquier orden. Si uno crea datos, que use
  valores únicos por ejecución (mira `nuevoCorreo()` en `publicar.spec.ts`).
- Un flujo que no se puede probar sin datos previos se salta con `test.skip` y
  una razón escrita, no se deja frágil.
- Comentarios de código en inglés, textos de aserción en español, como el resto
  del repositorio.

## Relación con `specs/`

Los archivos de `generated/` salen de los bloques `cases:` de `specs/`. Se
regeneran con:

```bash
./scripts/specs.sh tests
```

Un test que cubre una regla lleva el marcador `SPEC:<id>` en su comentario; es lo
que permite a `tools/specs/validate.py` saber que la regla está cubierta de
verdad. Si escribes a mano un test que cubre una regla, ponle el marcador.
