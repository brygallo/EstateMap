# EstateMap

Portal inmobiliario para Ecuador con catálogo público, mapas interactivos,
publicación de propiedades, gestión de contactos, blog e ingesta de inventario.

## Arquitectura

- Backend: Django 6, Django REST Framework, PostgreSQL and JWT authentication.
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS and MapLibre GL.
- Background work: Celery with Redis as broker.
- Cache: Redis, isolated from the task broker by database index.
- Object storage: S3-compatible storage through MinIO and `django-storages`.
- Tests: pytest, Vitest and Playwright.
- Business rules: versioned YAML specifications under `specs/`.

The detailed architecture is documented in
[`docs/technical/architecture.md`](docs/technical/architecture.md). Business
rules live in `specs/`; generated documentation is available in
[`docs/generated/README.md`](docs/generated/README.md).

## Requirements

- Docker with the Compose plugin.
- Node.js 20 or later for frontend development outside Docker.
- Python 3.12 or later for backend development outside Docker.

## Local setup

Create the local environment file and review every value before starting:

```bash
cp .env.example .env
docker compose up --build
```

Default development endpoints:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3010` |
| Backend API | `http://localhost:8010/api/` |
| Django admin | `http://localhost:8010/admin/` |
| MinIO API | `http://localhost:9020` |
| MinIO console | `http://localhost:9021` |

Create an administrator when needed:

```bash
docker compose exec backend python manage.py createsuperuser
```

Load Ecuador's province and city catalog:

```bash
docker compose exec backend python manage.py load_ecuador_locations
```

## Development without Docker

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

PostgreSQL, Redis and S3-compatible storage must still be available and match
the selected environment variables.

## Verification

```bash
./scripts/specs.sh check
./run_tests.sh backend
./run_tests.sh frontend
./run_tests.sh e2e
./run_tests.sh all
```

The E2E suite expects the complete application to be running. See
[`tests/README.md`](tests/README.md) for its configuration.

## Specification-driven changes

Read [`agents/CLAUDE.md`](agents/CLAUDE.md) before changing behavior. In short:

1. Find the relevant rule in `specs/`.
2. Do not invent missing business behavior; add a proposal instead.
3. Enforce security and validation in the backend first.
4. Keep code, tests and specs consistent.
5. Regenerate derived files with `./scripts/specs.sh all`.

Do not edit `docs/generated/`, `backend/real_estate/tests/generated/` or
`tests/generated/` by hand.

## Production

Production uses `docker-compose.prod.yml` and `.env.prod`, generated from the
deployment platform's secret store. Never commit `.env`, `.env.prod`, build
logs, database exports or real customer data.

Deployment details intentionally remain outside this public quick-start. See
[`SECURITY.md`](SECURITY.md) before reporting a vulnerability or handling an
exposed credential.
