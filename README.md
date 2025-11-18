# 🗺️ EstateMap

Sistema de gestión de propiedades inmobiliarias con visualización en mapa interactivo.

---

## 📋 Tabla de Contenidos

- [Desarrollo Local](#-desarrollo-local)
- [Deployment en Producción](#-deployment-en-producción)
  - [Opción A: Con IP (Sin Dominio)](#opción-a-deployment-con-ip-sin-dominio)
  - [Opción B: Con Dominio y SSL](#opción-b-deployment-con-dominio-y-ssl)
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

### Opción A: Deployment con IP (Sin Dominio)

#### 1️⃣ Setup Inicial del Servidor

En tu servidor Contabo (Ubuntu 20.04/22.04):

```bash
# Conectar al servidor
ssh root@TU_IP_DEL_SERVIDOR

# Descargar y ejecutar script de setup
curl -o setup.sh https://raw.githubusercontent.com/brygallo/EstateMap/main/scripts/setup-server.sh
chmod +x setup.sh
sudo ./setup.sh

# IMPORTANTE: Cerrar sesión y volver a conectar
exit
ssh root@TU_IP_DEL_SERVIDOR
```

El script instala:
- Docker y Docker Compose
- Git
- Configura firewall (UFW)
- Abre puertos 80, 443, 9001

#### 2️⃣ Clonar Repositorio

```bash
# Clonar en /var/www/estatemap
git clone https://github.com/brygallo/EstateMap.git /var/www/estatemap
cd /var/www/estatemap
```

#### 3️⃣ Primer Deploy

```bash
# Ejecutar script de deploy
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

El script automáticamente:
- Detecta la IP del servidor
- Genera contraseñas seguras
- Crea archivo `.env.prod`
- Construye imágenes Docker
- Inicia todos los servicios
- Crea bucket de MinIO

#### 4️⃣ Configurar Nginx (Reverse Proxy)

```bash
# Instalar nginx
sudo apt install nginx -y

# Copiar configuración
sudo cp /var/www/estatemap/nginx/estatemap-ip.conf /etc/nginx/sites-available/estatemap

# Editar y reemplazar YOUR_SERVER_IP con tu IP real
sudo nano /etc/nginx/sites-available/estatemap
# Buscar: YOUR_SERVER_IP
# Reemplazar con: tu_ip_real (ejemplo: 123.45.67.89)

# Activar sitio
sudo ln -s /etc/nginx/sites-available/estatemap /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar nginx
sudo systemctl reload nginx
```

#### 5️⃣ Crear Superusuario

```bash
cd /var/www/estatemap
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

#### ✅ Aplicación Lista

- **Frontend:** `http://TU_IP/`
- **Admin:** `http://TU_IP/admin/`
- **API:** `http://TU_IP/api/`
- **MinIO Console:** `http://TU_IP:9001`

---

### Opción B: Deployment con Dominio y SSL

Si ya tienes un dominio:

#### 1️⃣ Configurar DNS

En tu proveedor de dominio (GoDaddy, Namecheap, etc.):

```
Tipo: A
Nombre: @
Valor: TU_IP_DEL_SERVIDOR

Tipo: A
Nombre: www
Valor: TU_IP_DEL_SERVIDOR
```

#### 2️⃣ Seguir pasos 1-3 de Opción A

Completar setup del servidor, clonar repo y primer deploy.

#### 3️⃣ Configurar Nginx con SSL

```bash
# Copiar configuración de dominio
sudo cp /var/www/estatemap/nginx/estatemap-domain.conf /etc/nginx/sites-available/estatemap

# Editar y reemplazar YOUR_DOMAIN.COM
sudo nano /etc/nginx/sites-available/estatemap
# Buscar: YOUR_DOMAIN.COM
# Reemplazar con: tudominio.com

# Activar sitio
sudo ln -s /etc/nginx/sites-available/estatemap /etc/nginx/sites-enabled/

# Verificar
sudo nginx -t
sudo systemctl reload nginx
```

#### 4️⃣ Obtener Certificado SSL (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL (reemplazar con tu dominio)
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Certbot automáticamente:
# - Obtiene certificado SSL
# - Configura nginx
# - Configura renovación automática
```

#### 5️⃣ Actualizar Django Settings

```bash
cd /var/www/estatemap

# Editar .env.prod
nano .env.prod

# Agregar tu dominio a ALLOWED_HOSTS
ALLOWED_HOSTS=tudominio.com,www.tudominio.com,TU_IP,localhost,127.0.0.1

# Reiniciar backend
docker-compose -f docker-compose.prod.yml restart backend
```

#### 6️⃣ Crear Superusuario

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

#### ✅ Aplicación con SSL Lista

- **Frontend:** `https://tudominio.com/`
- **Admin:** `https://tudominio.com/admin/`
- **API:** `https://tudominio.com/api/`
- **MinIO Console:** `http://tudominio.com:9001`

---

## 🤖 CI/CD con GitHub Actions

### Configuración Automática de Deploy

Cada `git push` a `main` despliega automáticamente.

#### 1️⃣ Generar Clave SSH (En tu computadora)

```bash
# Generar clave SSH
ssh-keygen -t ed25519 -C "github-actions-estatemap"
# Guardar en: ~/.ssh/estatemap_deploy
# Passphrase: (dejar vacío)

# Copiar clave pública al servidor
ssh-copy-id -i ~/.ssh/estatemap_deploy.pub root@TU_IP_DEL_SERVIDOR

# Mostrar clave privada (para GitHub Secrets)
cat ~/.ssh/estatemap_deploy
```

#### 2️⃣ Configurar GitHub Secrets

Ve a tu repositorio en GitHub:

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Agrega estos 5 secrets:

| Secret Name | Valor | Descripción |
|-------------|-------|-------------|
| `SSH_PRIVATE_KEY` | Contenido de `~/.ssh/estatemap_deploy` | Clave SSH completa (incluye BEGIN y END) |
| `SERVER_IP` | Tu IP del servidor | Ejemplo: `123.45.67.89` |
| `SERVER_USER` | `root` | Usuario SSH del servidor |
| `DJANGO_SECRET_KEY` | Ver `.env.prod` en servidor | Django secret key |
| `DB_PASSWORD` | Ver `.env.prod` en servidor | Contraseña PostgreSQL |
| `MINIO_ROOT_PASSWORD` | Ver `.env.prod` en servidor | Contraseña MinIO |

Para ver los valores en el servidor:

```bash
ssh root@TU_IP_DEL_SERVIDOR
cat /var/www/estatemap/.env.prod
```

#### 3️⃣ Verificar Workflow

El archivo `.github/workflows/deploy.yml` ya está configurado.

#### 4️⃣ Probar Auto-Deploy

```bash
# En tu computadora local
git add .
git commit -m "test: auto deploy"
git push origin main

# Ver progreso en GitHub
# https://github.com/TU_USUARIO/EstateMap/actions
```

#### ✅ Auto-Deploy Activo

Cada push a `main`:
1. GitHub Actions se conecta al servidor
2. Hace `git pull`
3. Ejecuta `./scripts/deploy.sh`
4. Reconstruye y reinicia contenedores
5. Notifica resultado

---

## 🛠️ Comandos Útiles

### Ver Logs

```bash
cd /var/www/estatemap

# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Solo backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Solo frontend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Reiniciar Servicios

```bash
# Reiniciar todo
docker-compose -f docker-compose.prod.yml restart

# Reiniciar solo backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Detener/Iniciar

```bash
# Detener todo
docker-compose -f docker-compose.prod.yml down

# Iniciar todo
docker-compose -f docker-compose.prod.yml up -d

# Ver estado
docker-compose -f docker-compose.prod.yml ps
```

### Backup de Base de Datos

```bash
# Crear backup
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres estatemap > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres estatemap < backup_20240101_120000.sql
```

### Actualización Manual

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
│       └── deploy.yml              # GitHub Actions CI/CD
├── backend/                        # Django REST API
│   ├── Dockerfile                  # Docker config
│   └── requirements.txt            # Python dependencies
├── frontend/                       # React + Vite
│   ├── Dockerfile                  # Dev Docker config
│   ├── Dockerfile.prod             # Production Docker config
│   └── nginx.conf                  # Nginx config for container
├── nginx/
│   ├── estatemap-ip.conf           # Nginx config para IP
│   └── estatemap-domain.conf       # Nginx config para dominio
├── scripts/
│   ├── deploy.sh                   # Script de deployment
│   └── setup-server.sh             # Setup inicial del servidor
├── docker-compose.yml              # Desarrollo local
└── docker-compose.prod.yml         # Producción
```

---

## 🔒 Seguridad

- **Autenticación:** JWT tokens con Django REST Framework Simple JWT
- **Validación de imágenes:** Compresión y validación automática
- **Contraseñas:** Generación automática de contraseñas seguras
- **HTTPS:** Soporte SSL con Let's Encrypt (dominio)
- **Headers de seguridad:** Configurados en nginx
- **Firewall:** UFW configurado automáticamente
- **Variables de entorno:** Secrets almacenados en `.env.prod`

---

## 📄 Licencia

MIT
