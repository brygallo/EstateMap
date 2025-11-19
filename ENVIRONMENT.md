# 🔐 Variables de Entorno - Guía Completa

## 📋 Variables Requeridas

### Django Settings

| Variable | Descripción | Ejemplo | Generación |
|----------|-------------|---------|------------|
| `DJANGO_SECRET_KEY` | Clave secreta de Django | `abc123...` | `openssl rand -base64 50` |
| `ALLOWED_HOSTS` | Hosts permitidos (separados por coma) | `tudominio.com,123.45.67.89,localhost` | Tu dominio/IP |

### Base de Datos (PostgreSQL Local)

| Variable | Descripción | Ejemplo | Notas |
|----------|-------------|---------|-------|
| `DB_HOST` | Host de PostgreSQL | `123.45.67.89` o `localhost` | IP del servidor |
| `DB_USER` | Usuario de PostgreSQL | `estatemap_user` | Creado al instalar PostgreSQL |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `secure_password` | `openssl rand -base64 32` |
| `DB_NAME` | Nombre de la base de datos | `estatemap` | Creado al instalar PostgreSQL |
| `SERVER_IP` | IP del servidor | `123.45.67.89` | IP pública del servidor (para DATABASE_URL) |

### MinIO (Almacenamiento Local)

| Variable | Descripción | Ejemplo | Notas |
|----------|-------------|---------|-------|
| `MINIO_ENDPOINT` | Endpoint de MinIO | `123.45.67.89:9000` | IP del servidor + puerto |
| `MINIO_ACCESS_KEY` | Access Key de MinIO | `minioadmin` | Configurado en MinIO |
| `MINIO_SECRET_KEY` | Secret Key de MinIO | `minioadmin` | Configurado en MinIO |
| `MINIO_USE_SSL` | Usar SSL (True/False) | `False` | `False` para setup local |
| `MINIO_BUCKET_NAME` | Nombre del bucket | `estatemap` | Nombre del bucket para archivos |

### Frontend (React/Vite)

| Variable | Descripción | Ejemplo | Notas |
|----------|-------------|---------|-------|
| `VITE_API_URL` | URL del API backend | `http://123.45.67.89/api` | URL completa del API |
| `VITE_MAPTILER_KEY` | API Key de MapTiler | `abc123...` | Obtenida de https://maptiler.com |

---

## 🔄 Flujo de Variables

### 1. Desarrollo Local

Archivo: `.env` (no versionado)

```bash
# Variables para desarrollo con docker-compose.yml
POSTGRES_DB=estatedb
POSTGRES_USER=estateuser
POSTGRES_PASSWORD=estatepass
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

**Características:**
- PostgreSQL y MinIO en contenedores Docker
- Variables más simples
- Acceso vía nombres de servicio (`db`, `minio`)

### 2. Producción

Archivo: `.env.prod` (no versionado, creado manualmente o por CI/CD)

```bash
# Django
DJANGO_SECRET_KEY=your-generated-secret-key
ALLOWED_HOSTS=tudominio.com,123.45.67.89,localhost

# Database (PostgreSQL local en servidor)
DB_HOST=123.45.67.89
DB_USER=estatemap_user
DB_PASSWORD=secure_password
DB_NAME=estatemap
SERVER_IP=123.45.67.89

# MinIO (local en servidor)
MINIO_ENDPOINT=123.45.67.89:9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_USE_SSL=False
MINIO_BUCKET_NAME=estatemap

# Frontend (React/Vite)
VITE_API_URL=http://123.45.67.89/api
VITE_MAPTILER_KEY=your_maptiler_api_key
```

**Características:**
- PostgreSQL y MinIO instalados localmente en el servidor
- Backend y Frontend en contenedores Docker
- Acceso vía IP del servidor

---

## 🔧 Configuración en Django (settings.py)

### SECRET_KEY
```python
SECRET_KEY = os.getenv('SECRET_KEY', os.getenv('DJANGO_SECRET_KEY', 'change-me'))
```
Soporta ambos nombres para flexibilidad.

### ALLOWED_HOSTS
```python
allowed_hosts_str = os.getenv('ALLOWED_HOSTS', '*')
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(',')]
```
Convierte string separado por comas en lista.

### DATABASE_URL
```python
database_url = os.getenv('DATABASE_URL')
if database_url:
    DATABASES = {'default': dj_database_url.parse(database_url)}
```
El `docker-compose.prod.yml` crea el `DATABASE_URL` automáticamente:
```yaml
DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@${SERVER_IP}:5432/${DB_NAME}
```

### MinIO
```python
AWS_ACCESS_KEY_ID = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
AWS_SECRET_ACCESS_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
AWS_STORAGE_BUCKET_NAME = os.getenv('MINIO_BUCKET_NAME', 'estatemap')
AWS_S3_ENDPOINT_URL = f"http://{os.getenv('MINIO_ENDPOINT', 'minio:9000')}"
```

---

## 🤖 GitHub Secrets (CI/CD)

Para el auto-deploy, configura estos secrets en GitHub:

### Secrets Requeridos (Total: 15)

1. **SSH y Servidor**
   - `SSH_PRIVATE_KEY` - Clave SSH privada completa
   - `SERVER_IP` - IP del servidor (ej: `123.45.67.89`)
   - `SERVER_USER` - Usuario SSH (ej: `root`)

2. **Django**
   - `DJANGO_SECRET_KEY` - Generar con `openssl rand -base64 50`
   - `ALLOWED_HOSTS` - Lista separada por comas (ej: `tudominio.com,123.45.67.89,localhost`)

3. **Base de Datos**
   - `DB_HOST` - Host de PostgreSQL (ej: `123.45.67.89` o `localhost`)
   - `DB_USER` - Usuario de PostgreSQL
   - `DB_PASSWORD` - Contraseña de PostgreSQL
   - `DB_NAME` - Nombre de la base de datos

4. **MinIO**
   - `MINIO_ENDPOINT` - IP:puerto (ej: `123.45.67.89:9000`)
   - `MINIO_ACCESS_KEY` - Access key de MinIO
   - `MINIO_SECRET_KEY` - Secret key de MinIO
   - `MINIO_BUCKET_NAME` - Nombre del bucket (ej: `estatemap`)

5. **Frontend**
   - `VITE_API_URL` - URL del API backend (ej: `http://123.45.67.89/api`)
   - `VITE_MAPTILER_KEY` - API Key de MapTiler (obtener en https://maptiler.com)

El workflow de GitHub Actions crea el `.env.prod` automáticamente:
```yaml
echo "DJANGO_SECRET_KEY=${{ secrets.DJANGO_SECRET_KEY }}" > .env.prod
echo "ALLOWED_HOSTS=${{ secrets.ALLOWED_HOSTS }}" >> .env.prod
# ... etc
```

---

## ✅ Checklist de Configuración

### Primera Vez en Servidor

- [ ] Instalar PostgreSQL
- [ ] Crear usuario y base de datos PostgreSQL
- [ ] Instalar MinIO como servicio systemd
- [ ] Configurar credenciales de MinIO
- [ ] Anotar IP del servidor
- [ ] Crear `.env.prod` manualmente con todas las variables
- [ ] Verificar que todos los servicios estén corriendo

### GitHub Actions

- [ ] Generar par de claves SSH
- [ ] Copiar clave pública al servidor
- [ ] Configurar 15 secrets en GitHub
- [ ] Hacer push a `main` para probar

### Verificación

```bash
# En el servidor, verificar variables
cat /var/www/estatemap/.env.prod

# Verificar que Docker pueda leer las variables
docker-compose -f docker-compose.prod.yml config

# Verificar que backend puede conectarse a PostgreSQL y MinIO
docker-compose -f docker-compose.prod.yml logs backend
```

---

## 🔍 Troubleshooting

### Error: "Database connection failed"

**Causa:** `SERVER_IP` incorrecta o PostgreSQL no está corriendo.

**Solución:**
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar que PostgreSQL esté escuchando
sudo netstat -plnt | grep 5432

# Verificar variables
echo $SERVER_IP
```

### Error: "MinIO connection failed"

**Causa:** `MINIO_ENDPOINT` incorrecta o MinIO no está corriendo.

**Solución:**
```bash
# Verificar MinIO
sudo systemctl status minio

# Verificar que MinIO esté escuchando
sudo netstat -plnt | grep 9000

# Acceder a consola MinIO
http://YOUR_IP:9001
```

### Error: "DisallowedHost"

**Causa:** `ALLOWED_HOSTS` no incluye tu dominio/IP.

**Solución:**
```bash
# Editar .env.prod
nano /var/www/estatemap/.env.prod

# Agregar tu dominio/IP
ALLOWED_HOSTS=tudominio.com,123.45.67.89,localhost,127.0.0.1

# Reiniciar backend
docker-compose -f docker-compose.prod.yml restart backend
```

---

## 📚 Referencias

- [Django Settings](https://docs.djangoproject.com/en/5.0/ref/settings/)
- [dj-database-url](https://github.com/jazzband/dj-database-url)
- [MinIO Configuration](https://min.io/docs/minio/linux/index.html)
- [PostgreSQL Setup](https://www.postgresql.org/docs/)
