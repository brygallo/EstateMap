# 🚀 Quick Start - EstateMap

## Opciones de Deployment

### 📍 Opción 1: Deployment con IP (SIN dominio) ⭐ RECOMENDADO PARA EMPEZAR

**Usa esta opción si:**
- No tienes dominio todavía
- Quieres probar rápido
- Estás en desarrollo/staging

**Pasos:**
1. Conecta al servidor: `ssh root@TU_IP`
2. Clona el repo: `cd /var/www/estatemap && git clone [URL] .`
3. Ejecuta: `./scripts/quick-start-ip.sh`
4. ¡Listo! Accede en `http://TU_IP/`

📖 **Guía completa:** [DEPLOYMENT_IP.md](./DEPLOYMENT_IP.md)

---

### 🌐 Opción 2: Deployment con Dominio (CON SSL)

**Usa esta opción si:**
- Ya tienes un dominio
- Quieres HTTPS/SSL
- Es para producción

📖 **Guía completa:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## ⚡ Super Quick Start (con IP)

```bash
# En tu servidor Contabo
ssh root@TU_IP

# Ir al directorio web
cd /var/www/estatemap

# Clonar repositorio
git clone https://github.com/TU_USUARIO/EstateMap.git .

# Ejecutar script de inicio rápido
./scripts/quick-start-ip.sh

# El script hará:
# ✅ Detectar tu IP automáticamente
# ✅ Generar todas las contraseñas seguras
# ✅ Construir e iniciar todos los servicios
# ✅ Preguntarte si quieres crear un superusuario

# Listo! Tu app está en http://TU_IP/
```

---

## 📋 Requisitos Previos

1. **Servidor configurado:** Ejecuta primero `./scripts/server-setup.sh`
2. **Docker instalado:** El script anterior lo instala
3. **Puerto 80 abierto:** El firewall debe permitir HTTP

---

## 🔄 Actualizar la Aplicación

```bash
# Opción con IP
./scripts/deploy-ip.sh

# Opción con dominio
./scripts/deploy.sh
```

---

## 🆘 Ayuda Rápida

### Ver logs
```bash
docker-compose -f docker-compose.ip.yml logs -f
```

### Reiniciar servicios
```bash
docker-compose -f docker-compose.ip.yml restart
```

### Crear superusuario
```bash
docker-compose -f docker-compose.ip.yml exec backend python manage.py createsuperuser
```

### Backup de base de datos
```bash
docker-compose -f docker-compose.ip.yml exec -T db pg_dump -U postgres estatemap > backup.sql
```

---

## 📚 Documentación

- **[DEPLOYMENT_IP.md](./DEPLOYMENT_IP.md)** - Guía completa con IP
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía completa con dominio
- **[SISTEMA_OPTIMIZACION_IMAGENES.md](./SISTEMA_OPTIMIZACION_IMAGENES.md)** - Sistema de imágenes

---

## 🎯 URLs Importantes

Después del deployment:

- **Frontend:** `http://TU_IP/` o `https://tu-dominio.com/`
- **Admin:** `http://TU_IP/admin/` o `https://tu-dominio.com/admin/`
- **API:** `http://TU_IP/api/properties/` o `https://tu-dominio.com/api/properties/`

---

**¿Problemas?** Revisa las secciones de Troubleshooting en las guías completas.
