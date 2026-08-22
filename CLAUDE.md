# EstateMap / Geo Propiedades Ecuador

Portal inmobiliario con mapa. Django + DRF en `backend/`, Next.js (App Router) en
`frontend/`, Postgres, Redis, MinIO y Celery. En producción los servicios de datos
corren nativos en el host y las aplicaciones en Docker.

## Antes de tocar código

Las reglas de negocio de este proyecto son explícitas y verificables: viven en
`specs/`, no repartidas por el código. El contrato completo está en
[`agents/CLAUDE.md`](agents/CLAUDE.md) y **es de lectura obligatoria** antes de
modificar comportamiento.

@agents/CLAUDE.md

## Orientación rápida

| Quiero…                                  | Miro en                                  |
| ---------------------------------------- | ---------------------------------------- |
| Saber qué regla aplica a algo            | `specs/` y `docs/generated/README.md`    |
| Entender por qué está hecho así          | `docs/business-rules/`, `docs/decisions/` |
| Arquitectura, caché, Celery, Redis       | `docs/technical/`                        |
| Qué hace el panel además de listar       | `docs/technical/admin-panel.md`          |
| De dónde salen las métricas y las visitas | `docs/technical/activity-metrics.md`    |
| Cuánto tráfico hay y qué lo mueve        | `docs/technical/trafico-organico.md`    |
| Qué pasa por el CDN y qué no             | `docs/technical/cdn-cloudflare.md`      |
| Quién puede hacer qué                    | `docs/permissions/matrix.md`             |
| Qué devuelve la API cuando falla         | `docs/errors/api-errors.md`              |
| Cómo se publica o se importa una propiedad | `docs/workflows/`                      |
| Cómo se ejecutan los tests               | `docs/testing/`                          |

## Comandos habituales

```bash
./scripts/specs.sh all                       # valida specs y regenera docs y tests
./run_tests.sh                               # suite del backend (dentro de Docker)
docker compose up                            # entorno completo de desarrollo
cd tests && npx playwright test              # extremo a extremo
```
