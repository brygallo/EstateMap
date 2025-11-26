# Configuración de Variables de Entorno

Este proyecto usa un **único archivo `.env`** en la raíz para todas las variables de entorno, tanto del backend como del frontend.

## 📁 Ubicación del Archivo

```
EstateMap/
├── .env              ← ÚNICO archivo de variables (raíz del proyecto)
├── .env.example      ← Plantilla de ejemplo
├── backend/
└── frontend/
    └── .env.example  ← Solo referencia (no se usa)
```

## 🔑 Variables del Proyecto

### Backend (Django)

```env
# Base de Datos PostgreSQL
DB_NAME=estatedb
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=host.docker.internal
DB_PORT=5432

# Django
DJANGO_SECRET_KEY=tu_secret_key_aqui
DJANGO_DEBUG=True

# MinIO (Almacenamiento de archivos)
MINIO_ENDPOINT=minio:9000
MINIO_PUBLIC_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=False
MINIO_BUCKET_NAME=estatemap

# Email (Brevo)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_usuario@smtp-brevo.com
EMAIL_HOST_PASSWORD=tu_password
DEFAULT_FROM_EMAIL=notificaciones@tudominio.com

# URL del Frontend (para links en emails)
FRONTEND_URL=http://localhost:3000
```

### Frontend (Next.js)

```env
# IMPORTANTE: Las variables para Next.js DEBEN empezar con NEXT_PUBLIC_
# para estar disponibles en el navegador

NEXT_PUBLIC_API_URL=http://localhost:8000/api/
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

## 🔄 Migración de Vite a Next.js

### Variables Antiguas (Ya NO se usan)

```env
# ❌ OBSOLETO - Era para Vite
VITE_API_URL=http://localhost:8000/api
```

### Variables Nuevas (Next.js)

```env
# ✅ NUEVO - Para Next.js
NEXT_PUBLIC_API_URL=http://localhost:8000/api/
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

## 📋 Diferencias Importantes

| Aspecto | Vite (Antiguo) | Next.js (Nuevo) |
|---------|----------------|-----------------|
| **Prefijo** | `VITE_` | `NEXT_PUBLIC_` |
| **Puerto por defecto** | 5173 | 3000 |
| **Acceso** | `import.meta.env.VITE_*` | `process.env.NEXT_PUBLIC_*` |
| **Archivo** | `frontend/.env` | `.env` (raíz) |

## 🐳 Docker Compose

El `docker-compose.yml` está configurado para montar el `.env` de la raíz en todos los servicios:

```yaml
services:
  backend:
    env_file:
      - .env  # ← Lee desde la raíz

  frontend:
    env_file:
      - .env  # ← Lee desde la raíz
```

## ⚙️ Configuración por Entorno

### Desarrollo Local (sin Docker)

1. Copia `.env.example` a `.env` en la raíz
2. Ajusta las variables según necesites
3. Las variables `NEXT_PUBLIC_*` se cargarán automáticamente

### Desarrollo con Docker

El archivo `.env` se monta automáticamente en todos los contenedores.

```bash
docker-compose up
```

### Producción

Para producción, define las variables en tu plataforma de deployment:

**Vercel, Netlify, etc:**
- Ve a Settings → Environment Variables
- Agrega cada variable `NEXT_PUBLIC_*`

**Docker Compose Producción:**
- Usa un archivo `.env.production`
- O define las variables directamente en `docker-compose.prod.yml`

## 🔒 Seguridad

### Variables Públicas vs Privadas

**Variables PÚBLICAS** (accesibles en el navegador):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```
✅ Estas se exponen en el cliente - está bien para URLs públicas

**Variables PRIVADAS** (solo servidor):
```env
DB_PASSWORD=postgres
EMAIL_HOST_PASSWORD=tu_password
DJANGO_SECRET_KEY=secret
```
❌ NUNCA usar prefijo `NEXT_PUBLIC_` para estas

### Reglas de Oro

1. ✅ **Solo URLs y datos públicos** pueden tener `NEXT_PUBLIC_`
2. ❌ **Nunca** expongas passwords, secrets, o keys privadas
3. ✅ **Siempre** revisa qué variables expones al cliente
4. ✅ **Usa `.env.local`** para sobrescrituras locales (Git ignora)

## 📝 Checklist de Configuración

- [ ] Copiar `.env.example` a `.env` en la raíz
- [ ] Actualizar `NEXT_PUBLIC_API_URL` con tu URL de backend
- [ ] Actualizar `NEXT_PUBLIC_FRONTEND_URL` con tu URL de frontend
- [ ] Actualizar `FRONTEND_URL` para emails (mismo que frontend URL)
- [ ] Configurar credenciales de base de datos
- [ ] Configurar credenciales de MinIO
- [ ] Configurar credenciales de email (Brevo)
- [ ] Verificar que NO existe `frontend/.env` o `frontend/.env.local`

## 🆘 Solución de Problemas

### Error: "NEXT_PUBLIC_API_URL is undefined"

**Causa**: Next.js no encuentra la variable

**Solución**:
1. Verifica que el `.env` esté en la raíz del proyecto
2. Verifica que la variable empiece con `NEXT_PUBLIC_`
3. Reinicia el servidor: `npm run dev` o `docker-compose restart frontend`

### Error: Variables no se actualizan

**Solución**:
```bash
# Sin Docker
cd frontend
rm -rf .next
npm run dev

# Con Docker
docker-compose restart frontend
```

### Variables de producción no funcionan

**Verifica**:
1. Las variables están definidas en tu plataforma de deployment
2. El build se ejecutó DESPUÉS de definir las variables
3. No hay conflicto con archivos `.env.local` o `.env.production`

## 📚 Referencias

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)

---

**Última actualización**: Noviembre 2025
**Versión**: Next.js 14+
