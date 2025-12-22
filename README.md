# EstateMap

Sistema de gestion de propiedades inmobiliarias con visualizacion en mapa, autenticacion completa y frontend en Next.js.

## Contenido

- Descripcion general
- Caracteristicas
- Stack
- Requisitos
- Configuracion rapida (Docker)
- Desarrollo sin Docker
- Variables de entorno
- API y flujos clave
- Produccion
- Scripts utiles

## Descripcion general

EstateMap ofrece CRUD de propiedades con mapas interactivos, geolocalizacion, imagenes optimizadas y un flujo de autenticacion con verificacion por email.

## Caracteristicas

- Mapa con capas (OSM, Carto, Esri) y dibujo de poligonos
- Geolocalizacion del usuario y geocodificacion inversa (Nominatim)
- Publicacion de propiedades con imagenes optimizadas y miniaturas
- Estado de propiedades con exclusion de inactivas del mapa
- Autenticacion JWT, verificacion de email y reset de password
- Cambio de email con verificacion por codigo
- Provincias y ciudades (Ecuador) con comandos de carga
- PWA con Next.js y previews sociales por propiedad

## Stack

- Backend: Django + Django REST Framework + SimpleJWT
- Frontend: Next.js 14 + React + Tailwind CSS + Leaflet
- DB: PostgreSQL
- Storage: MinIO (S3 compatible)

## Requisitos

- Docker y Docker Compose (recomendado para desarrollo)
- Node.js 18+ y Python 3.11+ si trabajas sin Docker

## Configuracion rapida (Docker)

1) Variables de entorno

```bash
cp .env.example .env
```

Si estas en desarrollo, puedes usar email por consola:

```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

2) Levantar servicios

```bash
docker-compose up --build
```

3) Accesos

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/
- MinIO Console: http://localhost:9001

4) Crear superusuario (opcional)

```bash
docker-compose exec backend python manage.py createsuperuser
```

5) Cargar provincias y ciudades (opcional)

```bash
docker-compose run --rm backend python manage.py load_ecuador_locations
```

## Desarrollo sin Docker

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
npm install
npm run dev
```

Necesitas un PostgreSQL y MinIO accesibles segun las variables de entorno.

## Variables de entorno

Variables mas usadas (ver `.env.example` y `.env.prod.example`):

Backend
- `DJANGO_SECRET_KEY` o `SECRET_KEY`: clave secreta
- `DEBUG`: `True` o `False`
- `ALLOWED_HOSTS`: lista separada por comas
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `DATABASE_URL`: opcional, reemplaza los valores anteriores
- `MINIO_ENDPOINT`, `MINIO_PUBLIC_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL`, `MINIO_BUCKET_NAME`
- `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`
- `FRONTEND_URL`: usado en links de emails

Frontend (Next.js)
- `NEXT_PUBLIC_API_URL`: URL del backend accesible desde el navegador
- `NEXT_PUBLIC_FRONTEND_URL`: URL publica del frontend
- `NEXT_PUBLIC_GTM_ID`: opcional

## API y flujos clave

Autenticacion (base: `/api`)
- `POST /login/`: obtiene access y refresh
- `POST /token/refresh/`: renueva access
- `POST /register/`: registro con envio de codigo
- `POST /verify-email/`: valida codigo de email
- `POST /resend-verification/`
- `POST /request-password-reset/` y `POST /reset-password/`
- `POST /request-email-change/` y `POST /verify-email-change/`

Propiedades
- `GET /properties/`: solo activas
- `GET /properties/my_properties/`: incluye inactivas del usuario
- `DELETE /properties/{id}/delete_image/`: elimina imagen

Ubicaciones
- `GET /provinces/` y `GET /cities/?province=<id>`

Imagenes
- `GET /media/<path>`: proxy para servir imagenes de MinIO sin problemas CORS

## Produccion

1) Crear `.env.prod` desde `.env.prod.example`
2) Configurar Nginx con `nginx/estatemap.conf`
3) Deploy con:

```bash
./scripts/deploy.sh
```

El flujo de GitHub Actions usa `.github/workflows/deploy.yml` y requiere los secretos definidos en el workflow.

## Scripts utiles

- `./scripts/deploy.sh`: deploy a produccion con Docker
- `./run_tests.sh`: ejecutar tests del backend
- `./rebuild-frontend.sh`: rebuild del frontend en Docker
