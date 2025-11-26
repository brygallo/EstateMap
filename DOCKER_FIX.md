# 🔧 Solución al Error "sh: next: not found"

## Problema

El error `sh: next: not found` ocurre porque las dependencias de Next.js no están instaladas en el contenedor Docker.

## ✅ Solución

Sigue estos pasos **en orden**:

### 1. Detener y limpiar contenedores existentes

```bash
cd /Users/usuario/gad/EstateMap

# Detener todos los contenedores
docker-compose down

# Limpiar contenedores y volúmenes viejos
docker-compose down -v

# (Opcional) Limpiar imágenes antiguas del frontend
docker rmi estatemap_frontend
```

### 2. Asegurarte de que package.json esté actualizado

El archivo `frontend/package.json` debe tener Next.js:

```bash
# Verificar que Next.js esté en las dependencias
grep "next" frontend/package.json
```

Deberías ver:
```
"next": "^14.2.0",
```

### 3. Reconstruir la imagen del frontend

```bash
# Reconstruir solo el frontend (más rápido)
docker-compose build --no-cache frontend

# O reconstruir todo si prefieres
docker-compose build --no-cache
```

El flag `--no-cache` asegura que se instalen las dependencias desde cero.

### 4. Iniciar los servicios

```bash
# Iniciar en modo detached (segundo plano)
docker-compose up -d

# O iniciar viendo los logs
docker-compose up
```

### 5. Verificar que funciona

```bash
# Ver logs del frontend
docker-compose logs -f frontend

# Deberías ver algo como:
# ▲ Next.js 14.x
# - Local:        http://localhost:3000
# ✓ Ready in X ms
```

Abre http://localhost:3000 en tu navegador.

## 🔍 Verificación Adicional

Si el problema persiste, verifica los volúmenes:

```bash
# Ver volúmenes montados
docker-compose ps

# Entrar al contenedor del frontend
docker-compose exec frontend sh

# Dentro del contenedor, verificar que next esté instalado
ls -la node_modules/.bin/next

# Debe existir y ser un enlace simbólico
# Si existe, sal del contenedor
exit
```

## 🐛 Otros Problemas Comunes

### Error: "Cannot find module 'next'"

**Solución**: Reconstruir sin cache
```bash
docker-compose down -v
docker-compose build --no-cache frontend
docker-compose up
```

### El contenedor se reinicia constantemente

**Solución**: Ver los logs completos
```bash
docker-compose logs frontend
```

### Cambios en package.json no se reflejan

**Solución**: Siempre reconstruir después de cambiar dependencias
```bash
docker-compose build frontend
docker-compose up
```

## 📋 Comando Todo-en-Uno

Si quieres empezar completamente de cero:

```bash
cd /Users/usuario/gad/EstateMap

# Limpiar todo
docker-compose down -v
docker rmi estatemap_frontend 2>/dev/null || true

# Reconstruir e iniciar
docker-compose build --no-cache frontend
docker-compose up
```

## ✅ Checklist

- [ ] `docker-compose down -v` ejecutado
- [ ] `docker-compose build --no-cache frontend` ejecutado sin errores
- [ ] `docker-compose up` muestra "Ready in X ms"
- [ ] http://localhost:3000 carga correctamente
- [ ] Los mapas funcionan
- [ ] El login funciona

## 💡 Explicación Técnica

El problema ocurre porque:

1. El `Dockerfile` instala dependencias en `/app/node_modules`
2. El volumen `./frontend:/app` monta tu directorio local sobre `/app`
3. Si tu `node_modules` local no existe o es diferente, sobrescribe el del contenedor

**Solución**: El volumen `/app/node_modules` en docker-compose.yml previene que el `node_modules` local sobrescriba el del contenedor.

```yaml
volumes:
  - ./frontend:/app          # Monta código fuente
  - /app/node_modules        # ← Previene sobrescritura
  - /app/.next               # ← Previene sobrescritura
```

---

**Última actualización**: Noviembre 2025
