# 🗺️ EstateMap

Sistema de gestión de propiedades inmobiliarias con visualización en mapa interactivo.

---

## 📋 Tabla de Contenidos

- [Desarrollo Local](#-desarrollo-local)
- [Deployment en Producción](#-deployment-en-producción)
- [CI/CD con GitHub Actions](#-cicd-con-github-actions)
- [Stack Tecnológico](#-stack-tecnológico)

---

## 💻 Desarrollo Local

### Prerrequisitos

- Docker y Docker Compose

### Ejecutar

```bash
# Copiar variables de entorno
cp .env.example .env

# Agregar tu API key de MapTiler en .env
VITE_MAPTILER_KEY=tu_api_key

# Iniciar servicios
docker-compose up

# Frontend: http://localhost:5173
# Backend: http://localhost:8000/api/
```

---

## 🚀 Deployment en Producción

### Arquitectura

En producción se utilizan:
- **PostgreSQL** y **MinIO** instalados localmente en el servidor
- **Nginx** instalado localmente como reverse proxy
- **Backend** y **Frontend** en contenedores Docker

### Prerrequisitos en el Servidor

1. **Sistema Operativo:** Ubuntu 20.04/22.04 LTS
2. **Servicios instalados localmente:**
   - PostgreSQL 15
   - MinIO
   - Nginx
   - Docker & Docker Compose
   - Git

---

### 1️⃣ Instalación de Servicios Locales

#### PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crear usuario y base de datos
sudo -u postgres psql
```

En el prompt de PostgreSQL:

```sql
CREATE USER estatemap_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE estatemap OWNER estatemap_user;
GRANT ALL PRIVILEGES ON DATABASE estatemap TO estatemap_user;
\q
```

#### MinIO

```bash
# Descargar MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Crear usuario y directorios
sudo useradd -r minio-user -s /sbin/nologin
sudo mkdir -p /mnt/data/minio
sudo chown minio-user:minio-user /mnt/data/minio

# Crear servicio systemd
sudo nano /etc/systemd/system/minio.service
```

Contenido de `/etc/systemd/system/minio.service`:

```ini
[Unit]
Description=MinIO
Documentation=https://min.io/docs/minio/linux/index.html
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/usr/local/bin/minio

[Service]
WorkingDirectory=/usr/local

User=minio-user
Group=minio-user
ProtectProc=invisible

Environment="MINIO_ROOT_USER=your_access_key"
Environment="MINIO_ROOT_PASSWORD=your_secret_key"

ExecStart=/usr/local/bin/minio server /mnt/data/minio --console-address ":9001"

Restart=always
LimitNOFILE=65536
TasksMax=infinity

[Install]
WantedBy=multi-user.target
```

```bash
# Iniciar MinIO
sudo systemctl daemon-reload
sudo systemctl start minio
sudo systemctl enable minio
sudo systemctl status minio
```

#### Nginx

```bash
# Instalar Nginx
sudo apt install nginx -y

# Iniciar servicio
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose -y

# Verificar instalación
docker --version
docker-compose --version
```

---

### 2️⃣ Configuración del Proyecto

```bash
# Clonar repositorio
git clone https://github.com/brygallo/EstateMap.git /var/www/estatemap
cd /var/www/estatemap

# Crear archivo de configuración
cp .env.prod.example .env.prod
nano .env.prod
```

Configurar `.env.prod`:

```bash
# Django
DJANGO_SECRET_KEY=your-generated-secret-key-here
ALLOWED_HOSTS=yourdomain.com,123.45.67.89,localhost,127.0.0.1

# Database (PostgreSQL local)
DB_HOST=123.45.67.89
DB_USER=estatemap_user
DB_PASSWORD=your_secure_password
DB_NAME=estatemap
SERVER_IP=123.45.67.89

# MinIO (local service)
MINIO_ENDPOINT=123.45.67.89:9000
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_USE_SSL=False
MINIO_BUCKET_NAME=estatemap

# Frontend (React/Vite)
VITE_API_URL=http://123.45.67.89/api
VITE_MAPTILER_KEY=your_maptiler_api_key
```

**Generar contraseñas seguras:**

```bash
# Django Secret Key
openssl rand -base64 50

# Contraseñas de DB y MinIO
openssl rand -base64 32
```

---

### 3️⃣ Configurar Nginx

```bash
# Copiar configuración
sudo cp /var/www/estatemap/nginx/estatemap.conf /etc/nginx/sites-available/estatemap

# Editar y reemplazar YOUR_DOMAIN_OR_IP
sudo nano /etc/nginx/sites-available/estatemap

# Activar sitio
sudo ln -s /etc/nginx/sites-available/estatemap /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar nginx
sudo systemctl reload nginx
```

---

### 4️⃣ Primer Deploy

```bash
cd /var/www/estatemap
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

El script automáticamente:
- Hace pull de los últimos cambios
- Construye las imágenes Docker
- Inicia backend y frontend
- Ejecuta migraciones
- Recolecta archivos estáticos

---

### 5️⃣ Crear Superusuario

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

---

### 6️⃣ Configurar SSL (Opcional - Con Dominio)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot configurará automáticamente nginx con HTTPS
```

---

## 🤖 CI/CD con GitHub Actions

### Configuración Automática

Cada `git push` a `main` despliega automáticamente en producción.

### Setup (Una Sola Vez)

#### 1. Generar Clave SSH

En tu computadora local:

```bash
# Generar clave SSH
ssh-keygen -t ed25519 -C "github-actions-estatemap"
# Guardar en: ~/.ssh/estatemap_deploy
# Sin passphrase (presiona Enter)

# Copiar clave pública al servidor
ssh-copy-id -i ~/.ssh/estatemap_deploy.pub root@YOUR_SERVER_IP

# Mostrar clave privada (para GitHub)
cat ~/.ssh/estatemap_deploy
```

#### 2. Configurar GitHub Secrets

En GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Crear estos secrets:

| Secret Name | Valor | Descripción |
|-------------|-------|-------------|
| `SSH_PRIVATE_KEY` | Contenido de `~/.ssh/estatemap_deploy` | Clave SSH privada completa |
| `SERVER_IP` | Tu IP del servidor | Ejemplo: `123.45.67.89` |
| `SERVER_USER` | `root` o tu usuario SSH | Usuario SSH del servidor |
| `DJANGO_SECRET_KEY` | Generar con `openssl rand -base64 50` | Django secret key |
| `ALLOWED_HOSTS` | Lista separada por comas | Ejemplo: `tudominio.com,123.45.67.89,localhost` |
| `DB_HOST` | Host de PostgreSQL | Ejemplo: `123.45.67.89` o `localhost` |
| `DB_USER` | Usuario de PostgreSQL | Ejemplo: `estatemap_user` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | Contraseña segura |
| `DB_NAME` | Nombre de la base de datos | Ejemplo: `estatemap` |
| `MINIO_ENDPOINT` | Endpoint de MinIO local | Ejemplo: `123.45.67.89:9000` |
| `MINIO_ACCESS_KEY` | Access key de MinIO | Tu MinIO access key |
| `MINIO_SECRET_KEY` | Secret key de MinIO | Tu MinIO secret key |
| `MINIO_BUCKET_NAME` | Nombre del bucket | Ejemplo: `estatemap` |
| `VITE_API_URL` | URL del API para frontend | Ejemplo: `http://123.45.67.89/api` |
| `VITE_MAPTILER_KEY` | API Key de MapTiler | Tu MapTiler API key |

#### 3. El archivo `.github/workflows/deploy.yml` ya está configurado

Verifica que existe en tu repositorio.

#### 4. Probar Auto-Deploy

```bash
# En tu máquina local
git add .
git commit -m "test: auto deploy"
git push origin main

# Ver el progreso en GitHub Actions
# https://github.com/YOUR_USER/EstateMap/actions
```

### ✅ Flujo Automático

Cada `git push` a `main`:

1. ✅ GitHub Actions detecta el push
2. ✅ Se conecta al servidor vía SSH
3. ✅ Ejecuta `git pull origin main`
4. ✅ Ejecuta `./scripts/deploy.sh`
5. ✅ Reconstruye y reinicia contenedores
6. ✅ Notifica si hubo errores

---

## 🛠️ Comandos Útiles

### Ver Logs

```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Solo backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Solo frontend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Reiniciar Servicios

```bash
# Todo
docker-compose -f docker-compose.prod.yml restart

# Solo backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Detener/Iniciar

```bash
# Detener
docker-compose -f docker-compose.prod.yml down

# Iniciar
docker-compose -f docker-compose.prod.yml up -d

# Estado
docker-compose -f docker-compose.prod.yml ps
```

### Backup de Base de Datos

```bash
# Crear backup
sudo -u postgres pg_dump estatemap > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar
sudo -u postgres psql estatemap < backup_20240101_120000.sql
```

### Actualizar Manualmente

```bash
cd /var/www/estatemap
git pull origin main
./scripts/deploy.sh
```

---

## 📦 Stack Tecnológico

- **Backend:** Django 5.0 + Django REST Framework
- **Frontend:** React 18 + Vite + Tailwind CSS + Leaflet
- **Base de Datos:** PostgreSQL 15
- **Almacenamiento:** MinIO (S3-compatible)

---

## 📂 Estructura del Proyecto

```
EstateMap/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions CI/CD
├── backend/                     # Django REST API
│   ├── Dockerfile               # Docker config
│   └── requirements.txt         # Python dependencies
├── frontend/                    # React + Vite
│   ├── Dockerfile               # Dev Docker config
│   ├── Dockerfile.prod          # Production Docker config
│   └── nginx.conf               # Nginx config for container
├── nginx/
│   └── estatemap.conf           # Nginx server config
├── scripts/
│   └── deploy.sh                # Deployment script
├── .env.prod.example            # Production env template
├── docker-compose.yml           # Development
└── docker-compose.prod.yml      # Production
```

---

## 🔒 Seguridad

- **Autenticación:** JWT tokens con Django REST Framework Simple JWT
- **Validación de imágenes:** Compresión y validación automática
- **Variables de entorno:** Credenciales almacenadas en `.env.prod` (no versionado)
- **HTTPS:** Soporte SSL con Let's Encrypt (opcional con dominio)
- **Headers de seguridad:** Configurados en nginx
- **Contraseñas seguras:** Generadas con OpenSSL

---

## 📄 Licencia

MIT
