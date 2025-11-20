# 🚀 Guía Rápida de Configuración - Estate Map

Guía paso a paso para configurar el proyecto en desarrollo y producción.

## 📋 Pre-requisitos

- Docker Desktop instalado y ejecutándose
- Git
- Un editor de código (VS Code, etc.)

## 🏁 Configuración Rápida (Desarrollo)

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd EstateMap
```

### 2. Configurar variables de entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores
# Para desarrollo, los valores por defecto funcionan bien
# Solo necesitas cambiar:
# - VITE_MAPTILER_KEY (obtén uno gratis en https://cloud.maptiler.com/)
```

### 3. Levantar servicios
```bash
# Construir y levantar todos los servicios
docker-compose up --build

# O en segundo plano
docker-compose up -d
```

### 4. Acceder a la aplicación
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api
- **Admin Django:** http://localhost:8000/admin
- **MinIO Console:** http://localhost:9001 (minioadmin/minioadmin)

### 5. Crear superusuario (opcional)
```bash
docker-compose exec backend python manage.py createsuperuser
```

## 📧 Configurar Email en Desarrollo

En desarrollo, los emails se imprimen en la consola del backend:

```bash
# Ver logs del backend en tiempo real
docker-compose logs -f backend

# Ver últimos logs
docker-compose logs backend
```

Para probar:
1. Regístrate en http://localhost:5173/register
2. Ve a los logs del backend
3. Copia el código de verificación de 6 dígitos
4. Ingrésalo en la página de verificación

## 🌐 Configuración para Producción

### 1. Configurar variables de entorno

Edita tu archivo `.env` con los valores de producción:

```bash
# Django
DEBUG=False
SECRET_KEY=<genera-una-nueva-clave-secreta>
ALLOWED_HOSTS=tudominio.com,www.tudominio.com

# Base de datos
DB_HOST=tu-servidor-postgres
DB_NAME=tu_base_datos
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña_segura

# Email - Ejemplo con Gmail
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-contraseña-de-aplicación
DEFAULT_FROM_EMAIL=noreply@tudominio.com

# Frontend URL
FRONTEND_URL=https://tudominio.com

# MinIO
MINIO_ENDPOINT=minio.tudominio.com
MINIO_PUBLIC_ENDPOINT=minio.tudominio.com
MINIO_USE_SSL=True
MINIO_ACCESS_KEY=nueva-access-key-segura
MINIO_SECRET_KEY=nueva-secret-key-segura
```

### 2. Generar SECRET_KEY de Django

```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### 3. Configurar Gmail para envío de emails

1. Ve a https://myaccount.google.com/security
2. Activa la **verificación en 2 pasos**
3. Ve a https://myaccount.google.com/apppasswords
4. Selecciona "Correo" y "Otro (nombre personalizado)"
5. Escribe "Estate Map" como nombre
6. Copia la contraseña de 16 caracteres generada
7. Úsala en `EMAIL_HOST_PASSWORD` en tu `.env`

### 4. Configurar MinIO con SSL

```bash
# 1. Configura un subdominio en tu DNS
# Ejemplo: minio.tudominio.com apuntando a tu servidor

# 2. Obtén certificado SSL con Let's Encrypt
certbot certonly --standalone -d minio.tudominio.com

# 3. Configura MinIO con SSL
# Copia certificados a ~/.minio/certs/
mkdir -p ~/.minio/certs
cp /etc/letsencrypt/live/minio.tudominio.com/fullchain.pem ~/.minio/certs/public.crt
cp /etc/letsencrypt/live/minio.tudominio.com/privkey.pem ~/.minio/certs/private.key

# 4. Reinicia MinIO
docker-compose restart minio
```

### 5. Ejecutar migraciones

```bash
docker-compose exec backend python manage.py migrate
```

### 6. Colectar archivos estáticos

```bash
docker-compose exec backend python manage.py collectstatic --noinput
```

## 🔧 Comandos Útiles

### Docker
```bash
# Ver servicios en ejecución
docker-compose ps

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar servicios
docker-compose restart backend
docker-compose restart frontend

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

### Django (Backend)
```bash
# Crear migraciones
docker-compose exec backend python manage.py makemigrations

# Aplicar migraciones
docker-compose exec backend python manage.py migrate

# Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# Shell de Django
docker-compose exec backend python manage.py shell

# Ejecutar tests
docker-compose exec backend python manage.py test
```

### Base de Datos
```bash
# Acceder a PostgreSQL
docker-compose exec db psql -U estateuser -d estatedb

# Backup de base de datos
docker-compose exec db pg_dump -U estateuser estatedb > backup.sql

# Restaurar backup
docker-compose exec -T db psql -U estateuser estatedb < backup.sql
```

## 📱 Variables de Entorno Importantes

### Desarrollo
```bash
DEBUG=True
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
MINIO_USE_SSL=False
DB_HOST=db
FRONTEND_URL=http://localhost:5173
```

### Producción
```bash
DEBUG=False
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
MINIO_USE_SSL=True
DB_HOST=tu-servidor-postgres
FRONTEND_URL=https://tudominio.com
```

## 🧪 Verificar Instalación

### 1. Verificar Backend
```bash
curl http://localhost:8000/api/properties/
```

Debería devolver una lista JSON de propiedades.

### 2. Verificar Frontend
Abre http://localhost:5173 en tu navegador.

### 3. Verificar MinIO
```bash
curl http://localhost:9000/minio/health/live
```

### 4. Verificar Base de Datos
```bash
docker-compose exec backend python manage.py showmigrations
```

Todas las migraciones deberían tener [X].

## 🔒 Checklist de Seguridad para Producción

- [ ] `DEBUG=False` en `.env`
- [ ] `SECRET_KEY` generada aleatoriamente
- [ ] `ALLOWED_HOSTS` configurado con dominios específicos
- [ ] Contraseñas de base de datos cambiadas
- [ ] Credenciales de MinIO cambiadas
- [ ] SSL/HTTPS configurado
- [ ] Firewall configurado (solo puertos necesarios)
- [ ] Backups automáticos de base de datos configurados
- [ ] Variables de entorno en servidor (no archivo .env)
- [ ] `.env` en `.gitignore`
- [ ] Logs monitoreados
- [ ] Rate limiting configurado (opcional)
- [ ] CORS configurado correctamente

## 🐛 Solución de Problemas

### Backend no inicia
```bash
# Ver logs detallados
docker-compose logs backend

# Verificar migraciones
docker-compose exec backend python manage.py migrate

# Reconstruir contenedor
docker-compose up --build backend
```

### Frontend no se conecta al backend
1. Verificar `VITE_API_URL` en `.env`
2. Verificar CORS en settings.py
3. Verificar que backend esté corriendo: `curl http://localhost:8000/api/`

### Emails no se envían
1. En desarrollo: ver logs con `docker-compose logs backend`
2. En producción:
   - Verificar credenciales SMTP
   - Verificar que `EMAIL_BACKEND` sea smtp
   - Verificar firewall (puerto 587 abierto)

### MinIO no es accesible
1. Verificar que el contenedor esté corriendo: `docker-compose ps`
2. Verificar logs: `docker-compose logs minio`
3. Verificar que el bucket esté creado
4. Verificar configuración de endpoint público

### Error de permisos en archivos
```bash
# Dar permisos al usuario
sudo chown -R $USER:$USER .

# Reiniciar Docker Desktop
```

## 📚 Recursos Adicionales

- [Documentación de Django](https://docs.djangoproject.com/)
- [Documentación de React](https://react.dev/)
- [Documentación de MinIO](https://min.io/docs/)
- [Documentación de Docker](https://docs.docker.com/)
- [MapTiler Cloud](https://cloud.maptiler.com/)

## 🆘 Soporte

Si encuentras problemas:

1. Revisa esta guía completa
2. Verifica los logs: `docker-compose logs`
3. Revisa las guías específicas:
   - `AUTHENTICATION_GUIDE.md` - Sistema de autenticación
   - `EMAIL_TEMPLATES_GUIDE.md` - Templates de email
4. Crea un issue en el repositorio con:
   - Descripción del problema
   - Logs relevantes
   - Pasos para reproducir

---

**Última actualización:** 2025-11-20
**Versión:** 1.0.0
