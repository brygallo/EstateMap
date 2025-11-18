# 🔧 Configuración de GitHub Actions para Despliegue Automático

Esta guía te enseña cómo configurar GitHub Actions para que tu aplicación se despliegue automáticamente en tu servidor Contabo cada vez que hagas push o merge a la rama `main`.

---

## 📋 Prerrequisitos

Antes de configurar GitHub Actions, asegúrate de haber completado:

1. ✅ Ejecutado `server-setup.sh` en tu servidor Contabo
2. ✅ Clonado el repositorio en `/var/www/estatemap`
3. ✅ Ejecutado `quick-start-ip.sh` al menos una vez (para verificar que todo funciona)

---

## 🔑 Paso 1: Generar Par de Claves SSH

GitHub Actions necesita una clave SSH para conectarse a tu servidor.

### En tu **computadora local** (NO en el servidor):

```bash
# Generar nueva clave SSH
ssh-keygen -t ed25519 -C "github-actions-estatemap"

# Cuando pregunte dónde guardarla:
# Enter file: ~/.ssh/estatemap_deploy

# Cuando pregunte por passphrase:
# Presiona Enter (sin passphrase)
```

Ahora tienes dos archivos:
- `~/.ssh/estatemap_deploy` - Clave PRIVADA (para GitHub)
- `~/.ssh/estatemap_deploy.pub` - Clave PÚBLICA (para el servidor)

---

## 🔐 Paso 2: Agregar Clave Pública al Servidor

Necesitas copiar la clave PÚBLICA a tu servidor Contabo.

### Opción A: Usando ssh-copy-id (más fácil)

```bash
ssh-copy-id -i ~/.ssh/estatemap_deploy.pub root@TU_IP_DEL_SERVIDOR
```

### Opción B: Manual

```bash
# 1. Mostrar la clave pública
cat ~/.ssh/estatemap_deploy.pub

# 2. Copiar todo el contenido

# 3. Conectar al servidor
ssh root@TU_IP_DEL_SERVIDOR

# 4. Agregar la clave
echo "PEGA_AQUI_LA_CLAVE_PUBLICA" >> ~/.ssh/authorized_keys

# 5. Verificar permisos
chmod 600 ~/.ssh/authorized_keys
```

### Verificar que funciona:

```bash
# Desde tu computadora local
ssh -i ~/.ssh/estatemap_deploy root@TU_IP_DEL_SERVIDOR

# Si te conecta sin pedir contraseña, ¡funciona! ✅
exit
```

---

## 🔐 Paso 3: Configurar GitHub Secrets

Ve a tu repositorio en GitHub:

1. Click en **Settings** (Configuración)
2. En el menú izquierdo, click en **Secrets and variables** → **Actions**
3. Click en **New repository secret**

### Crear estos 5 secrets:

#### 1. `SSH_PRIVATE_KEY`

**Valor:** Contenido de tu clave PRIVADA

```bash
# Mostrar la clave privada
cat ~/.ssh/estatemap_deploy
```

Copia **TODO** el contenido, desde:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
...
-----END OPENSSH PRIVATE KEY-----
```

**Nota:** Incluye las líneas `BEGIN` y `END`

---

#### 2. `SERVER_IP`

**Valor:** La IP pública de tu servidor Contabo

**Ejemplo:** `157.90.123.45`

---

#### 3. `SERVER_USER`

**Valor:** El usuario SSH de tu servidor

**Generalmente:** `root`

---

#### 4. `DJANGO_SECRET_KEY`

**Valor:** Tu Django secret key

Si ya ejecutaste `quick-start-ip.sh`, puedes obtenerla de tu servidor:

```bash
# En el servidor
cat /var/www/estatemap/.env.ip | grep DJANGO_SECRET_KEY
```

O genera una nueva:

```bash
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

---

#### 5. `DB_PASSWORD`

**Valor:** Contraseña de PostgreSQL

Si ya ejecutaste `quick-start-ip.sh`:

```bash
# En el servidor
cat /var/www/estatemap/.env.ip | grep DB_PASSWORD
```

O genera una nueva:

```bash
openssl rand -base64 32
```

---

#### 6. `MINIO_ROOT_PASSWORD`

**Valor:** Contraseña de MinIO

Si ya ejecutaste `quick-start-ip.sh`:

```bash
# En el servidor
cat /var/www/estatemap/.env.ip | grep MINIO_ROOT_PASSWORD
```

O genera una nueva (mínimo 8 caracteres):

```bash
openssl rand -base64 32
```

---

## ✅ Paso 4: Verificar Configuración

### Checklist de Secrets en GitHub:

Ve a **Settings** → **Secrets and variables** → **Actions** y verifica que tengas:

- [x] `SSH_PRIVATE_KEY` - Clave SSH (empieza con `-----BEGIN OPENSSH PRIVATE KEY-----`)
- [x] `SERVER_IP` - IP del servidor (ej: `157.90.123.45`)
- [x] `SERVER_USER` - Usuario SSH (generalmente `root`)
- [x] `DJANGO_SECRET_KEY` - Secret key de Django (string largo aleatorio)
- [x] `DB_PASSWORD` - Contraseña de PostgreSQL
- [x] `MINIO_ROOT_PASSWORD` - Contraseña de MinIO

---

## 🚀 Paso 5: Probar el Despliegue Automático

### Hacer un cambio pequeño:

```bash
# En tu computadora local
cd /path/to/EstateMap

# Hacer un cambio pequeño
echo "# Test auto deploy" >> README.md

# Commit y push
git add README.md
git commit -m "test: probar despliegue automático"
git push origin main
```

### Ver el progreso en GitHub:

1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Verás el workflow "Deploy to Server (IP - No SSL)" ejecutándose

**Tiempo estimado:** 5-10 minutos

### Estados posibles:

- 🟡 **Amarillo (en progreso):** Se está desplegando
- ✅ **Verde (success):** Despliegue exitoso
- ❌ **Rojo (failed):** Algo salió mal, click para ver los logs

---

## 🎉 ¡Listo!

Ahora cada vez que hagas:

```bash
git push origin main
```

O hagas merge de un pull request a `main`, GitHub Actions automáticamente:

1. ✅ Se conecta a tu servidor
2. ✅ Hace backup de la base de datos
3. ✅ Descarga los cambios
4. ✅ Construye las imágenes Docker
5. ✅ Ejecuta migraciones
6. ✅ Reinicia los servicios
7. ✅ Verifica que todo funcione

---

## 🔧 Comandos Útiles

### Ver logs del último deployment:

En GitHub → Actions → Click en el último workflow

### Ejecutar deployment manualmente:

En GitHub → Actions → "Deploy to Server (IP - No SSL)" → "Run workflow"

### Deshabilitar auto-deployment:

En GitHub → Actions → "Deploy to Server (IP - No SSL)" → "..." → "Disable workflow"

---

## 🚨 Troubleshooting

### ❌ Error: "Permission denied (publickey)"

**Problema:** La clave SSH no está configurada correctamente.

**Solución:**
1. Verifica que copiaste la clave COMPLETA (incluyendo BEGIN/END)
2. Verifica que agregaste la clave pública al servidor
3. Prueba la conexión manualmente:
   ```bash
   ssh -i ~/.ssh/estatemap_deploy root@TU_IP
   ```

### ❌ Error: "Host key verification failed"

**Problema:** El servidor no está en known_hosts.

**Solución:** El workflow debería manejarlo automáticamente. Si persiste:
```bash
ssh-keyscan -H TU_IP >> ~/.ssh/known_hosts
```

### ❌ Error: "docker-compose: command not found"

**Problema:** Docker Compose no está instalado en el servidor.

**Solución:**
```bash
# En el servidor
./scripts/server-setup.sh
```

### ❌ Error: Secrets no definidos

**Problema:** Falta algún secret en GitHub.

**Solución:** Verifica el checklist del Paso 4 y agrega los secrets faltantes.

---

## 🔄 Actualizar Secrets

Si necesitas cambiar alguna contraseña:

1. Actualiza el secret en GitHub (Settings → Secrets → Edit)
2. Haz un push cualquiera para que se actualice en el servidor
3. O actualízalo manualmente en el servidor:
   ```bash
   nano /var/www/estatemap/.env.ip
   docker-compose -f docker-compose.ip.yml restart
   ```

---

## 📚 Más Información

- **Workflow file:** `.github/workflows/deploy-ip.yml`
- **Documentación GitHub Actions:** https://docs.github.com/en/actions
- **Guía de deployment:** `DEPLOYMENT_IP.md`

---

**¿Problemas?** Revisa los logs en GitHub Actions y la sección de Troubleshooting de esta guía.

**Última actualización:** Enero 2025
