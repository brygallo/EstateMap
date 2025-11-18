# 📋 Guía Rápida de Deployment

## 🔄 Diferencias: IP vs Dominio

### Configuración con IP (Sin SSL)

**Cuándo usar:**
- No tienes dominio
- Deployment rápido para testing
- Acceso directo por IP

**Configuración:**
- Nginx: `nginx/estatemap-ip.conf`
- HTTP (puerto 80)
- Sin certificado SSL
- Acceso: `http://123.45.67.89`

**Variables de entorno:**
```bash
ALLOWED_HOSTS=123.45.67.89,localhost,127.0.0.1
```

---

### Configuración con Dominio (Con SSL)

**Cuándo usar:**
- Tienes un dominio
- Necesitas HTTPS
- Producción real

**Configuración:**
- Nginx: `nginx/estatemap-domain.conf`
- HTTPS (puerto 443) + HTTP redirect
- Certificado SSL de Let's Encrypt
- Acceso: `https://tudominio.com`

**Variables de entorno:**
```bash
ALLOWED_HOSTS=tudominio.com,www.tudominio.com,123.45.67.89,localhost,127.0.0.1
```

**Pasos adicionales:**
1. Configurar DNS (A records)
2. Ejecutar Certbot para SSL
3. Actualizar ALLOWED_HOSTS con dominio

---

## ⚡ Comandos Rápidos

### Deploy Inicial

```bash
# En el servidor
ssh root@TU_IP
cd /var/www/estatemap
./scripts/deploy.sh
```

### Ver Logs en Tiempo Real

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Reiniciar Servicios

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Crear Superusuario

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### Backup Base de Datos

```bash
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres estatemap > backup.sql
```

---

## 🔧 Cambiar de IP a Dominio

Si empezaste con IP y ahora tienes un dominio:

```bash
# 1. Configurar DNS (en tu proveedor)
# Tipo A: @ -> TU_IP
# Tipo A: www -> TU_IP

# 2. En el servidor
sudo rm /etc/nginx/sites-enabled/estatemap
sudo cp /var/www/estatemap/nginx/estatemap-domain.conf /etc/nginx/sites-available/estatemap
sudo nano /etc/nginx/sites-available/estatemap
# Reemplazar: YOUR_DOMAIN.COM con tudominio.com

# 3. Activar y obtener SSL
sudo ln -s /etc/nginx/sites-available/estatemap /etc/nginx/sites-enabled/
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# 4. Actualizar Django
cd /var/www/estatemap
nano .env.prod
# Agregar dominio a ALLOWED_HOSTS

# 5. Reiniciar
docker-compose -f docker-compose.prod.yml restart backend
sudo systemctl reload nginx
```

---

## 🚨 Troubleshooting

### Error: "Bad Gateway 502"
```bash
# Verificar que backend esté corriendo
docker-compose -f docker-compose.prod.yml ps backend

# Ver logs del backend
docker-compose -f docker-compose.prod.yml logs backend
```

### Error: "Database connection failed"
```bash
# Verificar que DB esté corriendo
docker-compose -f docker-compose.prod.yml ps db

# Ver logs de DB
docker-compose -f docker-compose.prod.yml logs db
```

### Frontend no carga
```bash
# Verificar que frontend esté corriendo
docker-compose -f docker-compose.prod.yml ps frontend

# Reconstruir frontend
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### MinIO no accesible
```bash
# Verificar puerto 9001
sudo ufw allow 9001/tcp

# Verificar MinIO
docker-compose -f docker-compose.prod.yml logs minio
```

---

## 📊 Monitoreo

### Ver uso de recursos
```bash
docker stats
```

### Ver espacio en disco
```bash
df -h
```

### Ver logs de nginx
```bash
sudo tail -f /var/log/nginx/estatemap_access.log
sudo tail -f /var/log/nginx/estatemap_error.log
```

---

## 🔐 Seguridad

### Cambiar contraseñas

```bash
# Editar .env.prod
nano .env.prod

# Actualizar DB_PASSWORD, MINIO_ROOT_PASSWORD, DJANGO_SECRET_KEY

# Reiniciar servicios
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Actualizar GitHub Secrets

Después de cambiar contraseñas en `.env.prod`, actualizar también en:
**GitHub → Settings → Secrets and variables → Actions**

---

## 📚 Recursos

- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Nginx Docs](https://nginx.org/en/docs/)
