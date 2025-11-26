# 🚀 Guía de Despliegue - Next.js en Producción

## 📋 Índice
- [Cambios Importantes](#cambios-importantes)
- [Configuración del Servidor](#configuración-del-servidor)
- [Variables de Entorno](#variables-de-entorno)
- [GitHub Secrets](#github-secrets)
- [Despliegue Manual](#despliegue-manual)
- [Troubleshooting](#troubleshooting)

---

## 🔄 Cambios Importantes

### Migración de Vite/React a Next.js

La aplicación frontend ha migrado de **Vite/React** a **Next.js**. Principales cambios:

| Aspecto | Antes (Vite) | Ahora (Next.js) |
|---------|--------------|-----------------|
| Build | Archivos estáticos | Aplicación Node.js |
| Servidor | Nginx | Node.js (standalone) |
| Variables | `VITE_*` | `NEXT_PUBLIC_*` |
| Puerto | 80 (nginx) | 3000 (Node.js) |
| Modo | SPA puro | SSR + CSR |

---

## 🖥️ Configuración del Servidor

### Prerequisitos (Ya instalados en tu servidor)
- ✅ PostgreSQL (Base de datos)
- ✅ MinIO (Almacenamiento de archivos)
- ⚠️ Docker & Docker Compose (verificar que estén actualizados)

### Estructura de Directorios
```bash
/var/www/estatemap/
├── backend/
├── frontend/
├── .env.prod
├── docker-compose.prod.yml
└── scripts/
    └── deploy.sh
```

---

## 🔐 Variables de Entorno

### Variables Necesarias en `.env.prod`

#### Backend (Django)
```bash
DJANGO_SECRET_KEY=your_secret_key_here
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com
```

#### Base de Datos (Pre-instalada)
```bash
DB_HOST=localhost  # o la IP de tu servidor de BD
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=estatedb
```

#### MinIO (Pre-instalado)
```bash
MINIO_ENDPOINT=localhost:9000  # o tu endpoint de MinIO
MINIO_ACCESS_KEY=tu_access_key
MINIO_SECRET_KEY=tu_secret_key
MINIO_USE_SSL=False  # True si usas HTTPS
MINIO_BUCKET_NAME=estatemap
MINIO_PUBLIC_ENDPOINT=https://tu-dominio.com:9000
```

#### Frontend (Next.js) - ⚠️ IMPORTANTE
```bash
# Estas variables DEBEN empezar con NEXT_PUBLIC_
NEXT_PUBLIC_API_URL=https://tu-dominio.com/api
NEXT_PUBLIC_FRONTEND_URL=https://tu-dominio.com
```

#### Email
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_email@brevo.com
EMAIL_HOST_PASSWORD=tu_password
DEFAULT_FROM_EMAIL=noreply@tu-dominio.com
```

#### Otros
```bash
FRONTEND_URL=https://tu-dominio.com
SERVER_IP=tu_ip_del_servidor
```

---

## 🔑 GitHub Secrets

Configura los siguientes secretos en: `GitHub Repository → Settings → Secrets and variables → Actions`

### Secretos Requeridos

#### Servidor
- `SERVER_IP` - IP del servidor
- `SERVER_USER` - Usuario SSH
- `SSH_PRIVATE_KEY` - Clave privada SSH

#### Django
- `DJANGO_SECRET_KEY`
- `ALLOWED_HOSTS`

#### Base de Datos
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

#### MinIO
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_USE_SSL`
- `MINIO_BUCKET_NAME`
- `MINIO_PUBLIC_ENDPOINT`

#### Frontend (Next.js) - ⚠️ NUEVOS
- `NEXT_PUBLIC_API_URL` - ⚠️ Cambió de `VITE_API_URL`
- `NEXT_PUBLIC_FRONTEND_URL` - ⚠️ Nuevo

#### Email
- `EMAIL_BACKEND`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USE_TLS`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `DEFAULT_FROM_EMAIL`

#### Otros
- `FRONTEND_URL`

---

## 🚀 Despliegue Manual

### 1. Conectarse al servidor
```bash
ssh usuario@tu-servidor.com
cd /var/www/estatemap
```

### 2. Verificar configuración
```bash
# Verificar que existe .env.prod
cat .env.prod

# Verificar variables de Next.js
grep NEXT_PUBLIC .env.prod
```

### 3. Ejecutar despliegue
```bash
./scripts/deploy.sh
```

### 4. Verificar servicios
```bash
# Ver estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Ver logs del frontend
docker-compose -f docker-compose.prod.yml logs frontend

# Ver logs del backend
docker-compose -f docker-compose.prod.yml logs backend
```

---

## 🔧 Troubleshooting

### Error: Next.js no encuentra variables de entorno

**Problema:** Las variables `NEXT_PUBLIC_*` no están disponibles en el navegador.

**Solución:**
1. Verificar que las variables empiezan con `NEXT_PUBLIC_`
2. Verificar que están en `.env.prod`
3. Reconstruir la imagen:
```bash
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### Error: Cannot connect to API

**Problema:** El frontend no puede conectarse al backend.

**Solución:**
1. Verificar `NEXT_PUBLIC_API_URL` apunta a la URL correcta
2. Verificar que el backend está corriendo:
```bash
docker-compose -f docker-compose.prod.yml ps backend
curl http://localhost:8000/api/
```

### Error: CORS

**Problema:** Error de CORS al llamar al API.

**Solución:**
1. Verificar `ALLOWED_HOSTS` en Django incluye tu dominio
2. Verificar configuración de CORS en `backend/estate_map/settings.py`

### Frontend no responde

**Problema:** El puerto 3000 no responde.

**Solución:**
```bash
# Ver logs del contenedor
docker-compose -f docker-compose.prod.yml logs frontend

# Reiniciar frontend
docker-compose -f docker-compose.prod.yml restart frontend

# Si persiste, reconstruir
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### Verificar que Next.js está en modo standalone

**Comando:**
```bash
# Dentro del contenedor
docker exec estatemap_frontend ls -la .next/standalone

# Debería mostrar archivos incluyendo server.js
```

---

## 📝 Notas Importantes

### Diferencias con la configuración anterior

1. **Puerto Frontend:** Cambió de 80 (nginx) a 3000 (Node.js)
2. **Variables:** Cambió de `VITE_*` a `NEXT_PUBLIC_*`
3. **Nginx ya no se usa:** Next.js sirve directamente con Node.js
4. **Build:** Ahora genera una app Node.js standalone en lugar de archivos estáticos

### Proxy Reverso (Opcional)

Si deseas usar nginx como proxy reverso frente a Next.js:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Verificación de URLs

Asegúrate que estas URLs coincidan en tu configuración:

- `NEXT_PUBLIC_API_URL`: URL pública del API (ej: `https://tu-dominio.com/api`)
- `NEXT_PUBLIC_FRONTEND_URL`: URL pública del frontend (ej: `https://tu-dominio.com`)
- `FRONTEND_URL`: Misma que `NEXT_PUBLIC_FRONTEND_URL` (usada por Django para emails)

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verifica las variables de entorno
3. Asegúrate que PostgreSQL y MinIO estén corriendo
4. Verifica que los puertos no estén en uso por otros servicios

---

**Última actualización:** Noviembre 2024
**Versión:** 2.0 (Next.js)
