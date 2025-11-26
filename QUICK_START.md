# 🚀 Guía Rápida de Inicio - Geo Propiedades Ecuador

## ✅ Configuración de Variables de Entorno

**IMPORTANTE**: Este proyecto usa un **único archivo `.env`** en la raíz para todas las variables.

### 1. Crear archivo .env

```bash
# Desde la raíz del proyecto
cd EstateMap/
cp .env.example .env
```

### 2. Editar valores importantes

Abre `.env` y verifica/ajusta estas variables:

```env
# Frontend (Next.js) - REQUERIDAS
NEXT_PUBLIC_API_URL=http://localhost:8000/api/
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# URL para links en emails
FRONTEND_URL=http://localhost:3000

# Base de datos
DB_NAME=estatedb
DB_USER=postgres
DB_PASSWORD=postgres

# Email (opcional para desarrollo)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

## 🐳 Iniciar con Docker

```bash
# Desde la raíz del proyecto
cd EstateMap/

# Iniciar todos los servicios
docker-compose up

# O en segundo plano
docker-compose up -d
```

Accede a:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **MinIO Console**: http://localhost:9001

## 💻 Desarrollo Sin Docker

### Backend

```bash
cd backend/
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend/
npm install
npm run dev
```

## 📝 Variables de Entorno - Estructura

```
EstateMap/
├── .env              ← ÚNICO archivo (backend + frontend)
├── .env.example      ← Plantilla
├── backend/
│   └── (sin .env)
└── frontend/
    └── .env.example  ← Solo referencia
```

### Variables Clave

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `NEXT_PUBLIC_API_URL` | URL del backend API | `http://localhost:8000/api/` |
| `NEXT_PUBLIC_FRONTEND_URL` | URL del frontend | `http://localhost:3000` |
| `FRONTEND_URL` | URL para emails | `http://localhost:3000` |
| `DB_HOST` | Host de PostgreSQL | `host.docker.internal` |
| `MINIO_ENDPOINT` | Endpoint de MinIO | `minio:9000` |

## 🔧 Comandos Útiles

### Docker

```bash
# Ver logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Reiniciar un servicio
docker-compose restart frontend

# Reconstruir
docker-compose build frontend
docker-compose up frontend

# Detener todo
docker-compose down

# Limpiar volúmenes
docker-compose down -v
```

### Frontend (Next.js)

```bash
cd frontend/

# Desarrollo
npm run dev

# Build producción
npm run build
npm run start

# Linting
npm run lint
```

### Backend (Django)

```bash
cd backend/

# Migraciones
python manage.py makemigrations
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Servidor de desarrollo
python manage.py runserver
```

## 🐛 Solución de Problemas

### Variables no se cargan

```bash
# Verifica que .env existe en la raíz
ls -la .env

# Reinicia servicios
docker-compose restart
```

### Error "NEXT_PUBLIC_API_URL is undefined"

1. Verifica que `.env` está en la **raíz** (no en `frontend/`)
2. Verifica que la variable empieza con `NEXT_PUBLIC_`
3. Reinicia: `docker-compose restart frontend`

### Frontend no conecta con backend

Verifica que `NEXT_PUBLIC_API_URL` en `.env` incluya `/api/` al final:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/
```

### Puerto ya en uso

```bash
# Ver qué usa el puerto 3000
lsof -i :3000

# Cambiar puerto en docker-compose.yml
ports:
  - "3001:3000"  # Mapea 3001 localmente
```

## 📚 Documentación Completa

- [ENV_CONFIG.md](ENV_CONFIG.md) - Detalles de variables de entorno
- [frontend/README.md](frontend/README.md) - Documentación del frontend
- [MIGRATION.md](frontend/MIGRATION.md) - Guía de migración a Next.js
- [DOCKER_NEXT.md](DOCKER_NEXT.md) - Docker + Next.js

## ✅ Checklist de Primer Uso

- [ ] Copiar `.env.example` a `.env` en la raíz
- [ ] Editar variables en `.env`
- [ ] Verificar que NO existe `frontend/.env.local`
- [ ] Ejecutar `docker-compose up`
- [ ] Abrir http://localhost:3000
- [ ] Verificar que carga correctamente
- [ ] Probar login/registro

---

**¿Problemas?** Revisa [DOCKER_FIX.md](DOCKER_FIX.md) para soluciones comunes.
