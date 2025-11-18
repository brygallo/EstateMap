# 🚀 Guía de Despliegue - EstateMap en Contabo

Esta guía te llevará paso a paso desde un servidor Contabo nuevo hasta tener EstateMap funcionando en producción con SSL y despliegue continuo desde GitHub.

---

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Configuración del Servidor Contabo](#configuración-del-servidor-contabo)
3. [Configuración de DNS](#configuración-de-dns)
4. [Configuración del Repositorio GitHub](#configuración-del-repositorio-github)
5. [Despliegue Inicial](#despliegue-inicial)
6. [Configuración SSL](#configuración-ssl)
7. [Despliegue Continuo](#despliegue-continuo)
8. [Verificación](#verificación)
9. [Mantenimiento](#mantenimiento)
10. [Troubleshooting](#troubleshooting)

---

## 1. Prerrequisitos

### Necesitarás:
- ✅ Servidor Contabo (Ubuntu 20.04+ o Debian 11+)
- ✅ Dominio comprado y acceso al panel DNS
- ✅ Cuenta de GitHub con el repositorio EstateMap
- ✅ Acceso SSH al servidor

### Información que debes tener lista:
- IP del servidor Contabo
- Nombre de dominio (ejemplo: `estatemap.com`)
- Usuario SSH del servidor (generalmente `root` o tu usuario)

---

## 2. Configuración del Servidor Contabo

### 2.1 Conectar al Servidor

Conéctate a tu servidor Contabo vía SSH:

```bash
ssh root@TU_IP_DEL_SERVIDOR
```

### 2.2 Ejecutar Script de Configuración Inicial

```bash
# Descargar el script de setup
curl -o server-setup.sh https://raw.githubusercontent.com/TU_USUARIO/EstateMap/main/scripts/server-setup.sh

# Darle permisos de ejecución
chmod +x server-setup.sh

# Ejecutar el script
./server-setup.sh
```

Este script instalará:
- Docker y Docker Compose
- Git
- Configuración del firewall (UFW)
- Swap file (2GB)
- Directorios necesarios

### 2.3 Reloguear (Importante)

Después del script, sal y vuelve a conectar para que los cambios de Docker tomen efecto:

```bash
exit
ssh root@TU_IP_DEL_SERVIDOR
```

### 2.4 Verificar Docker

```bash
docker --version
docker-compose --version
```

Deberías ver las versiones instaladas sin errores.

---

## 3. Configuración de DNS

### 3.1 Configurar Registros DNS

En el panel de tu proveedor de dominio (GoDaddy, Namecheap, etc.), configura estos registros DNS:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | @ | TU_IP_DEL_SERVIDOR | 3600 |
| A | www | TU_IP_DEL_SERVIDOR | 3600 |

**Ejemplo:**
- Si tu IP es `123.45.67.89` y tu dominio es `estatemap.com`:
  - `estatemap.com` → `123.45.67.89`
  - `www.estatemap.com` → `123.45.67.89`

### 3.2 Verificar Propagación

Espera 5-30 minutos y verifica que el DNS esté propagado:

```bash
# En tu computadora local
dig estatemap.com
nslookup estatemap.com
```

Debe resolver a la IP de tu servidor.

---

## 4. Configuración del Repositorio GitHub

### 4.1 Clonar Repositorio en el Servidor

```bash
cd /var/www/estatemap
git clone https://github.com/TU_USUARIO/EstateMap.git .
```

### 4.2 Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.production.example .env.production

# Editar con nano o vim
nano .env.production
```

Configura estos valores:

```bash
# DOMINIO
DOMAIN=tu-dominio.com  # SIN https:// ni www

# DJANGO SECRET KEY (generar nueva)
DJANGO_SECRET_KEY=  # Ver sección 4.3 para generar

# ALLOWED HOSTS
DJANGO_ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com

# CORS ORIGINS
CORS_ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# BASE DE DATOS
DB_PASSWORD=  # Contraseña segura

# MINIO
MINIO_ROOT_PASSWORD=  # Mínimo 8 caracteres
```

### 4.3 Generar Contraseñas Seguras

```bash
# Django Secret Key
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Contraseñas generales
openssl rand -base64 32
```

Copia estos valores a tu `.env.production`.

### 4.4 Configurar GitHub Secrets

Ve a tu repositorio en GitHub:
- **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Crea estos secrets:

| Nombre | Valor | Descripción |
|--------|-------|-------------|
| `SERVER_IP` | `123.45.67.89` | IP de tu servidor Contabo |
| `SERVER_USER` | `root` | Usuario SSH |
| `SSH_PRIVATE_KEY` | Tu clave SSH privada | Ver sección 4.5 |
| `DOMAIN` | `tu-dominio.com` | Tu dominio SIN https:// |
| `DJANGO_SECRET_KEY` | Valor generado | Secret key de Django |
| `DB_PASSWORD` | Valor generado | Contraseña de PostgreSQL |
| `MINIO_ROOT_PASSWORD` | Valor generado | Contraseña de MinIO |

### 4.5 Configurar SSH para GitHub Actions

En tu **computadora local** (no en el servidor):

```bash
# Generar par de claves SSH (si no tienes una)
ssh-keygen -t ed25519 -C "github-actions-estatemap"
# Guardar como: ~/.ssh/estatemap_deploy

# Copiar la clave PÚBLICA al servidor
ssh-copy-id -i ~/.ssh/estatemap_deploy.pub root@TU_IP_DEL_SERVIDOR

# Copiar la clave PRIVADA (todo el contenido del archivo)
cat ~/.ssh/estatemap_deploy
```

Copia **TODO** el contenido (incluyendo `-----BEGIN` y `-----END`) y pégalo en el secret `SSH_PRIVATE_KEY` de GitHub.

---

## 5. Despliegue Inicial

### 5.1 Construir y Levantar Servicios

En el servidor:

```bash
cd /var/www/estatemap

# Construir imágenes
docker-compose -f docker-compose.prod.yml build

# Levantar servicios
docker-compose -f docker-compose.prod.yml up -d
```

### 5.2 Verificar Servicios

```bash
# Ver estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Deberías ver:
# - estatemap_db_prod (healthy)
# - estatemap_minio_prod (healthy)
# - estatemap_backend_prod (healthy)
# - estatemap_frontend_prod (running)
# - estatemap_nginx_prod (healthy)
```

### 5.3 Ejecutar Migraciones

```bash
# Aplicar migraciones de base de datos
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Crear superusuario
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

---

## 6. Configuración SSL

### 6.1 Ejecutar Script de Inicialización SSL

```bash
cd /var/www/estatemap
./scripts/init-ssl.sh
```

Este script:
1. Configura nginx temporal para HTTP
2. Solicita certificados SSL a Let's Encrypt
3. Configura nginx para HTTPS
4. Reinicia servicios

### 6.2 Verificar SSL

Visita tu sitio:
- `https://tu-dominio.com` ✅ Debe mostrar candado verde
- `http://tu-dominio.com` ✅ Debe redirigir a HTTPS

---

## 7. Despliegue Continuo

### 7.1 ¿Cómo Funciona?

Cada vez que hagas `git push` a la rama `main`:
1. GitHub Actions se activa automáticamente
2. Se conecta al servidor vía SSH
3. Hace backup de la base de datos
4. Descarga los cambios nuevos
5. Construye imágenes Docker
6. Ejecuta migraciones
7. Reinicia servicios
8. Verifica que todo funcione

### 7.2 Probar Despliegue Automático

Haz un cambio pequeño y súbelo:

```bash
# En tu computadora local
echo "# Test deploy" >> README.md
git add README.md
git commit -m "test: probar despliegue automático"
git push origin main
```

Ve a GitHub:
- **Actions** → Verás el workflow en ejecución
- Espera 2-5 minutos
- Si está verde ✅ = éxito

---

## 8. Verificación

### 8.1 Checklist de Verificación

- [ ] `https://tu-dominio.com` carga correctamente
- [ ] Certificado SSL válido (candado verde)
- [ ] Backend API funciona: `https://tu-dominio.com/api/properties/`
- [ ] Admin de Django: `https://tu-dominio.com/admin/`
- [ ] Puedes crear una propiedad desde el frontend
- [ ] Las imágenes se suben correctamente
- [ ] El mapa muestra propiedades

### 8.2 Comandos de Verificación

```bash
# Estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Logs del backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Logs de nginx
docker-compose -f docker-compose.prod.yml logs -f nginx

# Health check
curl https://tu-dominio.com/health
```

---

## 9. Mantenimiento

### 9.1 Ver Logs

```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Solo backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Solo nginx
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### 9.2 Backup Manual

```bash
# Crear backup de base de datos
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres estatemap > backup_$(date +%Y%m%d).sql

# Descargar backup a tu computadora
scp root@TU_IP:/var/www/estatemap/backup_*.sql ~/backups/
```

### 9.3 Restaurar Backup

```bash
# En el servidor
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres estatemap < backup_20240115.sql
```

### 9.4 Actualización Manual

Si necesitas desplegar manualmente (sin GitHub Actions):

```bash
cd /var/www/estatemap
./scripts/deploy.sh
```

### 9.5 Reiniciar Servicios

```bash
# Reiniciar todo
docker-compose -f docker-compose.prod.yml restart

# Reiniciar solo backend
docker-compose -f docker-compose.prod.yml restart backend

# Reiniciar solo nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### 9.6 Renovación SSL

Los certificados SSL se renuevan automáticamente cada 12 horas (configurado en `docker-compose.prod.yml`).

Para forzar renovación:

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## 10. Troubleshooting

### ❌ Error: "502 Bad Gateway"

**Causa:** El backend no está respondiendo.

**Solución:**
```bash
# Ver logs del backend
docker-compose -f docker-compose.prod.yml logs backend

# Reiniciar backend
docker-compose -f docker-compose.prod.yml restart backend

# Verificar que las migraciones estén al día
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

### ❌ Error: "SSL certificate problem"

**Causa:** Certificado SSL no configurado o expirado.

**Solución:**
```bash
# Volver a ejecutar el script SSL
./scripts/init-ssl.sh

# Verificar certificados
docker-compose -f docker-compose.prod.yml exec certbot certificates
```

### ❌ Error: GitHub Actions falla en "Deploy to server"

**Causa:** Problemas de SSH o secrets incorrectos.

**Solución:**
1. Verifica que `SSH_PRIVATE_KEY` en GitHub Secrets sea correcta
2. Verifica que la clave pública esté en `~/.ssh/authorized_keys` del servidor
3. Prueba SSH manualmente: `ssh -i ~/.ssh/estatemap_deploy root@TU_IP`

### ❌ Error: "Database connection failed"

**Causa:** PostgreSQL no está listo o contraseña incorrecta.

**Solución:**
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose -f docker-compose.prod.yml ps db

# Ver logs de PostgreSQL
docker-compose -f docker-compose.prod.yml logs db

# Verificar que DB_PASSWORD en .env.production coincida
cat .env.production | grep DB_PASSWORD
```

### ❌ Error: Imágenes no se suben

**Causa:** MinIO no está funcionando correctamente.

**Solución:**
```bash
# Verificar MinIO
docker-compose -f docker-compose.prod.yml ps minio

# Ver logs de MinIO
docker-compose -f docker-compose.prod.yml logs minio

# Reiniciar MinIO
docker-compose -f docker-compose.prod.yml restart minio

# Verificar bucket
docker-compose -f docker-compose.prod.yml exec backend python init_minio.py
```

### ❌ Página carga pero sin estilos

**Causa:** Static files no se recolectaron correctamente.

**Solución:**
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
docker-compose -f docker-compose.prod.yml restart nginx
```

### 🔍 Comandos Útiles de Diagnóstico

```bash
# Ver uso de recursos
docker stats

# Ver espacio en disco
df -h

# Ver uso de Docker
docker system df

# Limpiar imágenes antiguas
docker image prune -af

# Ver redes Docker
docker network ls

# Inspeccionar contenedor
docker inspect estatemap_backend_prod
```

---

## 📞 Contacto y Soporte

Si encuentras problemas no cubiertos en esta guía:

1. **Revisa los logs:** `docker-compose -f docker-compose.prod.yml logs -f`
2. **Verifica variables de entorno:** `cat .env.production`
3. **Comprueba DNS:** `dig tu-dominio.com`
4. **Verifica firewall:** `sudo ufw status`

---

## 🎉 ¡Felicidades!

Tu aplicación EstateMap está ahora corriendo en producción con:

- ✅ SSL/HTTPS automático con Let's Encrypt
- ✅ Despliegue continuo con GitHub Actions
- ✅ Base de datos PostgreSQL
- ✅ Almacenamiento de imágenes con MinIO
- ✅ Optimización automática de imágenes
- ✅ Nginx como reverse proxy
- ✅ Docker containerizado
- ✅ Backups automáticos

**URLs importantes:**
- Frontend: `https://tu-dominio.com`
- Admin: `https://tu-dominio.com/admin/`
- API: `https://tu-dominio.com/api/`

---

**Última actualización:** Enero 2025
**Versión:** 1.0
**Estado:** ✅ Producción
