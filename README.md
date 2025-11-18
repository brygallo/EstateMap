# 🗺️ EstateMap

Sistema de gestión de propiedades inmobiliarias con visualización en mapa interactivo.

---

## 🚀 Deployment en Servidor (Producción)

### 1️⃣ Primera Vez - Setup del Servidor

**En tu servidor Contabo:**

```bash
# Instalar Docker y configurar
curl -o setup.sh https://raw.githubusercontent.com/brygallo/EstateMap/main/scripts/setup.sh
chmod +x setup.sh
./setup.sh

# IMPORTANTE: Salir y volver a entrar
exit
ssh root@TU_IP
```

### 2️⃣ Clonar y Desplegar

```bash
# Clonar repositorio
git clone https://github.com/brygallo/EstateMap.git /var/www/estatemap
cd /var/www/estatemap

# Desplegar
./scripts/deploy.sh
```

**El script automáticamente:**
- ✅ Detecta tu IP
- ✅ Genera contraseñas seguras
- ✅ Construye e inicia todos los servicios

### 3️⃣ Crear Superusuario

```bash
docker-compose -f docker-compose.ip.yml exec backend python manage.py createsuperuser
```

### ✅ ¡Listo!

- **Frontend:** `http://TU_IP/`
- **Admin:** `http://TU_IP/admin/`
- **API:** `http://TU_IP/api/`

---

## 🤖 Despliegue Automático con GitHub Actions

### Setup (Una Sola Vez)

#### 1. En el Servidor

```bash
# Ver los valores de los secrets
cd /var/www/estatemap
cat .env.ip
```

Guarda estos valores, los necesitarás en GitHub.

#### 2. En tu Computadora Local

```bash
# Generar clave SSH para GitHub Actions
ssh-keygen -t ed25519 -C "github-actions"
# Guardar como: ~/.ssh/estatemap_deploy
# Passphrase: [Enter] (dejar vacío)

# Copiar clave pública al servidor
ssh-copy-id -i ~/.ssh/estatemap_deploy.pub root@TU_IP

# Mostrar clave PRIVADA (para GitHub)
cat ~/.ssh/estatemap_deploy
```

#### 3. En GitHub

Ve a tu repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Agrega estos 6 secrets:

| Nombre | Valor |
|--------|-------|
| `SSH_PRIVATE_KEY` | Contenido completo de `~/.ssh/estatemap_deploy` |
| `SERVER_IP` | Tu IP del servidor |
| `SERVER_USER` | `root` |
| `DJANGO_SECRET_KEY` | Del archivo `.env.ip` del servidor |
| `DB_PASSWORD` | Del archivo `.env.ip` del servidor |
| `MINIO_ROOT_PASSWORD` | Del archivo `.env.ip` del servidor |

### 🎉 ¡Listo! Auto-Deploy Activado

Ahora cada `git push origin main` despliega automáticamente:

```bash
git add .
git commit -m "tu cambio"
git push origin main

# Ve el progreso en: GitHub → Actions
```

---

## 🛠️ Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.ip.yml logs -f

# Ver solo backend
docker-compose -f docker-compose.ip.yml logs -f backend

# Reiniciar servicios
docker-compose -f docker-compose.ip.yml restart

# Detener todo
docker-compose -f docker-compose.ip.yml down

# Backup de base de datos
docker-compose -f docker-compose.ip.yml exec -T db pg_dump -U postgres estatemap > backup_$(date +%Y%m%d).sql

# Actualizar manualmente (sin GitHub Actions)
cd /var/www/estatemap
git pull
./scripts/deploy.sh
```

---

## 🌐 Agregar Dominio y SSL (Futuro)

Cuando compres un dominio:

1. **Configurar DNS:**
   - Tipo A: `@` → Tu IP
   - Tipo A: `www` → Tu IP

2. **Actualizar configuración:**
```bash
# Editar nginx para agregar SSL
nano nginx/conf.d/estatemap-ip.conf

# Agregar servicio certbot al docker-compose
nano docker-compose.ip.yml

# Redesplegar
./scripts/deploy.sh
```

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

## 📦 Stack Tecnológico

- **Backend:** Django 5.0 + Django REST Framework
- **Frontend:** React 18 + Vite + Tailwind CSS + Leaflet
- **Base de Datos:** PostgreSQL 15
- **Almacenamiento:** MinIO (S3-compatible)
- **Web Server:** Nginx
- **CI/CD:** GitHub Actions
- **Deployment:** Docker Compose

---

## 📂 Estructura del Proyecto

```
EstateMap/
├── backend/              # Django REST API
├── frontend/             # React + Vite
├── nginx/               # Configuración Nginx
├── scripts/             # Scripts de deployment
├── docker-compose.yml   # Desarrollo local
└── docker-compose.ip.yml # Producción
```

---

## 🔒 Seguridad

- Contraseñas generadas automáticamente con alta entropía
- JWT tokens para autenticación
- Validación y optimización automática de imágenes
- Headers de seguridad en Nginx

---

## 📄 Licencia

MIT
