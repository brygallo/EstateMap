# 🔑 Actualizar GitHub Secrets para Next.js

## ⚠️ Acción Requerida

La migración de Vite/React a Next.js requiere actualizar los secretos en GitHub Actions.

---

## 📝 Pasos a Seguir

### 1. Ir a GitHub Secrets
1. Abre tu repositorio en GitHub
2. Ve a: `Settings` → `Secrets and variables` → `Actions`

### 2. Eliminar Secretos Antiguos (Vite)
Elimina estos secretos si existen:
- ❌ `VITE_API_URL`
- ❌ `VITE_MAPTILER_KEY`

### 3. Agregar Nuevos Secretos (Next.js)

Haz clic en "New repository secret" y agrega:

#### ⚠️ CRÍTICO - Frontend Next.js
```
Nombre: NEXT_PUBLIC_API_URL
Valor: https://tu-dominio.com/api
(o http://tu-ip:8000/api si no tienes dominio)
```

```
Nombre: NEXT_PUBLIC_FRONTEND_URL
Valor: https://tu-dominio.com
(o http://tu-ip:3000 si no tienes dominio)
```

### 4. Verificar Secretos Existentes

Asegúrate de tener estos secretos configurados:

#### Servidor SSH
- ✅ `SERVER_IP`
- ✅ `SERVER_USER`
- ✅ `SSH_PRIVATE_KEY`

#### Django
- ✅ `DJANGO_SECRET_KEY`
- ✅ `ALLOWED_HOSTS`

#### Base de Datos
- ✅ `DB_HOST`
- ✅ `DB_USER`
- ✅ `DB_PASSWORD`
- ✅ `DB_NAME`

#### MinIO
- ✅ `MINIO_ENDPOINT`
- ✅ `MINIO_ACCESS_KEY`
- ✅ `MINIO_SECRET_KEY`
- ✅ `MINIO_USE_SSL`
- ✅ `MINIO_BUCKET_NAME`
- ✅ `MINIO_PUBLIC_ENDPOINT`

#### Email
- ✅ `EMAIL_BACKEND`
- ✅ `EMAIL_HOST`
- ✅ `EMAIL_PORT`
- ✅ `EMAIL_USE_TLS`
- ✅ `EMAIL_HOST_USER`
- ✅ `EMAIL_HOST_PASSWORD`
- ✅ `DEFAULT_FROM_EMAIL`

#### Otros
- ✅ `FRONTEND_URL`

---

## 🎯 Valores de Ejemplo

### Para Desarrollo/Testing
```bash
NEXT_PUBLIC_API_URL=http://tu-ip-servidor:8000/api
NEXT_PUBLIC_FRONTEND_URL=http://tu-ip-servidor:3000
```

### Para Producción con Dominio
```bash
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api
NEXT_PUBLIC_FRONTEND_URL=https://tu-dominio.com
```

### Para Producción sin Dominio
```bash
NEXT_PUBLIC_API_URL=http://tu-ip-servidor:8000/api
NEXT_PUBLIC_FRONTEND_URL=http://tu-ip-servidor:3000
```

---

## ✅ Verificación

Después de configurar los secretos:

1. Haz un commit pequeño al branch `main`
2. Ve a `Actions` en GitHub
3. Observa el workflow "Deploy to Production"
4. Verifica que el despliegue se complete exitosamente

---

## ⚠️ Importante

- Las variables **DEBEN** empezar con `NEXT_PUBLIC_` para estar disponibles en el navegador
- No uses comillas en los valores de los secretos en GitHub
- Asegúrate que las URLs no terminen en `/`

---

## 📋 Checklist

Antes de hacer push a main, verifica:

- [ ] Eliminé los secretos de Vite (`VITE_*`)
- [ ] Agregué `NEXT_PUBLIC_API_URL`
- [ ] Agregué `NEXT_PUBLIC_FRONTEND_URL`
- [ ] Verifiqué que todos los demás secretos existan
- [ ] Las URLs son correctas (HTTP/HTTPS según corresponda)
- [ ] No hay espacios al inicio/final de los valores

---

**Una vez completado, haz push a `main` para activar el despliegue automático.**
