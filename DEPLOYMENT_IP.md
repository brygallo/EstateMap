# 🚀 Guía de Despliegue con IP - EstateMap

**Guía simplificada para desplegar EstateMap usando la IP del servidor (sin dominio)**

---

## 📋 Lo que Necesitas

- ✅ Servidor Contabo con Ubuntu/Debian
- ✅ IP pública del servidor
- ✅ Acceso SSH al servidor
- ✅ Script de setup ejecutado (ya lo hiciste en el paso 2)

---

## 🎯 Pasos Rápidos

### **Paso 1: Conectar al Servidor**

```bash
ssh root@TU_IP_DEL_SERVIDOR
```

### **Paso 2: Clonar el Repositorio**

```bash
cd /var/www/estatemap
git clone https://github.com/TU_USUARIO/EstateMap.git .
```

Si ya existe el directorio, bórralo primero:
```bash
sudo rm -rf /var/www/estatemap/*
git clone https://github.com/TU_USUARIO/EstateMap.git .
```

### **Paso 3: Configurar Variables de Entorno**

```bash
# Copiar el archivo de ejemplo
cp .env.ip.example .env.ip

# Editar con tus valores
nano .env.ip
```

Necesitas configurar:

```bash
# Tu IP del servidor Contabo
SERVER_IP=123.45.67.89

# Django Secret Key (genera uno nuevo)
DJANGO_SECRET_KEY=    # Ver abajo cómo generar

# Contraseñas
DB_PASSWORD=          # Contraseña para PostgreSQL
MINIO_ROOT_PASSWORD=  # Contraseña para MinIO (mínimo 8 caracteres)
```

**Generar valores seguros:**

```bash
# Django Secret Key
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Contraseñas (32 caracteres aleatorios)
openssl rand -base64 32
```

**Ejemplo de .env.ip completo:**

```bash
SERVER_IP=157.90.123.45
DJANGO_SECRET_KEY=django-insecure-abc123xyz456def789ghi012jkl345mno678pqr901stu234vwx567
DB_PASSWORD=X7k2mP9nQ4vL8wR3sT6yU1hJ5bG0cF4e
MINIO_ROOT_PASSWORD=A9zN3mK7pL2qW5rY8tU4vX1cB6gH0jF3
```

### **Paso 4: Construir y Levantar los Servicios**

```bash
# Cargar las variables de entorno
export $(cat .env.ip | grep -v '^#' | xargs)

# Construir las imágenes Docker
docker-compose -f docker-compose.ip.yml build

# Levantar todos los servicios
docker-compose -f docker-compose.ip.yml up -d
```

Este proceso tomará 5-10 minutos la primera vez.

### **Paso 5: Verificar que los Servicios Están Corriendo**

```bash
docker-compose -f docker-compose.ip.yml ps
```

Deberías ver algo como:

```
NAME                        STATUS              PORTS
estatemap_backend_prod      Up (healthy)
estatemap_db_prod           Up (healthy)
estatemap_frontend_prod     Up
estatemap_minio_prod        Up (healthy)
estatemap_nginx_prod        Up (healthy)        0.0.0.0:80->80/tcp
```

Todos deben estar "Up" y los que tienen healthcheck deben mostrar "(healthy)".

### **Paso 6: Crear Superusuario de Django**

```bash
docker-compose -f docker-compose.ip.yml exec backend python manage.py createsuperuser
```

Te pedirá:
- **Username:** admin (o el que prefieras)
- **Email:** tu@email.com
- **Password:** (elige una contraseña segura)

### **Paso 7: Verificar que Todo Funciona**

Abre tu navegador y visita:

- **Frontend:** `http://TU_IP/`
- **API:** `http://TU_IP/api/properties/`
- **Admin:** `http://TU_IP/admin/`

Reemplaza `TU_IP` con la IP real de tu servidor.

---

## ✅ Checklist de Verificación

- [ ] Página principal carga correctamente
- [ ] El mapa se muestra
- [ ] Puedes entrar al admin de Django
- [ ] Puedes crear una propiedad desde el frontend
- [ ] Las imágenes se suben correctamente
- [ ] Las propiedades se muestran en el mapa

---

## 🔧 Comandos Útiles

### Ver Logs

```bash
# Ver todos los logs
docker-compose -f docker-compose.ip.yml logs -f

# Ver solo logs del backend
docker-compose -f docker-compose.ip.yml logs -f backend

# Ver solo logs de nginx
docker-compose -f docker-compose.ip.yml logs -f nginx
```

### Reiniciar Servicios

```bash
# Reiniciar todo
docker-compose -f docker-compose.ip.yml restart

# Reiniciar solo el backend
docker-compose -f docker-compose.ip.yml restart backend
```

### Detener Todo

```bash
docker-compose -f docker-compose.ip.yml down
```

### Ver Uso de Recursos

```bash
docker stats
```

### Backup de Base de Datos

```bash
# Crear backup
docker-compose -f docker-compose.ip.yml exec -T db pg_dump -U postgres estatemap > backup_$(date +%Y%m%d).sql

# Ver tamaño del backup
ls -lh backup_*.sql
```

### Limpiar Imágenes Docker Antiguas

```bash
docker image prune -af
```

---

## 🔄 Actualizar la Aplicación

Cuando hagas cambios en el código:

```bash
# Descargar últimos cambios
git pull origin main

# Reconstruir y reiniciar
export $(cat .env.ip | grep -v '^#' | xargs)
docker-compose -f docker-compose.ip.yml build
docker-compose -f docker-compose.ip.yml up -d

# Aplicar migraciones si hay cambios en la BD
docker-compose -f docker-compose.ip.yml exec backend python manage.py migrate
```

---

## 🚨 Troubleshooting

### ❌ Error: "502 Bad Gateway"

**Solución:**
```bash
# Ver logs del backend
docker-compose -f docker-compose.ip.yml logs backend

# Reiniciar backend
docker-compose -f docker-compose.ip.yml restart backend
```

### ❌ Error: "Database connection failed"

**Solución:**
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose -f docker-compose.ip.yml ps db

# Ver logs de la base de datos
docker-compose -f docker-compose.ip.yml logs db

# Verificar que la contraseña en .env.ip sea correcta
cat .env.ip | grep DB_PASSWORD
```

### ❌ Error: Las imágenes no se suben

**Solución:**
```bash
# Verificar MinIO
docker-compose -f docker-compose.ip.yml logs minio

# Reinicializar MinIO
docker-compose -f docker-compose.ip.yml restart minio
docker-compose -f docker-compose.ip.yml exec backend python init_minio.py
```

### ❌ Error: Página no carga

**Solución:**
```bash
# Verificar nginx
docker-compose -f docker-compose.ip.yml logs nginx

# Verificar que el puerto 80 esté abierto en el firewall
sudo ufw status

# Si no está abierto:
sudo ufw allow 80/tcp
```

### ❌ Error: "Cannot connect to Docker daemon"

**Solución:**
```bash
# Iniciar Docker
sudo systemctl start docker

# Habilitar Docker al inicio
sudo systemctl enable docker

# Verificar que tu usuario esté en el grupo docker
groups
# Si no ves "docker", sal y vuelve a entrar por SSH
```

---

## 📝 Notas Importantes

### 🔒 Seguridad

⚠️ **IMPORTANTE:** Esta configuración NO usa HTTPS/SSL. Los datos viajan sin encriptar.

**Recomendaciones:**
- Usa contraseñas fuertes en `.env.ip`
- No compartas tu IP públicamente
- Cuando tengas dominio, migra a la configuración con SSL (usa `DEPLOYMENT.md`)

### 🔄 Migración a Dominio con SSL

Cuando compres el dominio:

1. Detener servicios actuales:
```bash
docker-compose -f docker-compose.ip.yml down
```

2. Seguir la guía `DEPLOYMENT.md` desde el paso 3

3. Tus datos (base de datos, imágenes) se mantienen intactos

---

## 📊 Información del Sistema

### Puertos Usados

- **80:** Nginx (HTTP)
- **5432:** PostgreSQL (interno, no expuesto)
- **9000:** MinIO API (interno, no expuesto)
- **9001:** MinIO Console (interno, no expuesto)
- **8000:** Django (interno, no expuesto)

### Volúmenes Docker

Los datos persisten en volúmenes Docker:
- `postgres_data_prod` - Base de datos
- `minio_data_prod` - Imágenes
- `static_volume` - Archivos estáticos
- `frontend_build` - Build del frontend

Para ver espacio usado:
```bash
docker system df -v
```

---

## 🎉 ¡Listo!

Tu aplicación EstateMap debería estar funcionando en:

**`http://TU_IP/`**

Si tienes problemas, revisa:
1. Los logs con `docker-compose -f docker-compose.ip.yml logs -f`
2. Que todos los contenedores estén "healthy"
3. Que el firewall permita el puerto 80

---

**Última actualización:** Enero 2025
**Configuración:** Solo IP (sin SSL)
**Para producción con dominio:** Ver `DEPLOYMENT.md`
