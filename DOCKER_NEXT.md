# Docker con Next.js - Guía de Uso

## 🐳 Cambios Aplicados para Next.js

### Archivos Actualizados

1. **`docker-compose.yml`**
   - ✅ Puerto cambiado de `5173` (Vite) a `3000` (Next.js)
   - ✅ Comando actualizado de `npm run dev -- --host` a `npm run dev`
   - ✅ Variables de entorno agregadas para Next.js
   - ✅ Volume para `.next` agregado (cache de Next.js)

2. **`frontend/Dockerfile`**
   - ✅ Puerto EXPOSE cambiado a `3000`
   - ✅ Comentarios actualizados

3. **`frontend/.dockerignore`**
   - ✅ Agregado `.next` (directorio de build)
   - ✅ Agregado archivos de Next.js

## 🚀 Uso

### Iniciar todos los servicios

```bash
cd /Users/usuario/gad/EstateMap
docker-compose up --build
```

### Servicios disponibles

- **Frontend (Next.js)**: http://localhost:3000
- **Backend (Django)**: http://localhost:8000
- **MinIO**: http://localhost:9000
- **MinIO Console**: http://localhost:9001

### Comandos útiles

```bash
# Iniciar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Detener servicios
docker-compose down

# Reconstruir y reiniciar
docker-compose up --build --force-recreate

# Limpiar todo (incluyendo volúmenes)
docker-compose down -v
```

## ⚙️ Variables de Entorno

Las variables de entorno para el frontend se configuran en `docker-compose.yml`:

```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://backend:8000
  - NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

**Nota importante**: Dentro del contenedor Docker, el frontend se comunica con el backend usando `http://backend:8000` (nombre del servicio), pero desde el navegador usa `http://localhost:8000`.

## 📁 Volúmenes

```yaml
volumes:
  - ./frontend:/app           # Código fuente (hot reload)
  - /app/node_modules         # Dependencies (no sobrescribir)
  - /app/.next                # Build cache de Next.js
```

### ¿Por qué estos volúmenes?

1. **`./frontend:/app`**: Permite hot reload durante desarrollo
2. **`/app/node_modules`**: Evita conflictos entre node_modules del host y del contenedor
3. **`/app/.next`**: Cache de Next.js para builds más rápidos

## 🔥 Hot Reload

Next.js soporta hot reload automáticamente. Los cambios en el código se reflejarán inmediatamente en el navegador sin necesidad de reconstruir el contenedor.

## 🐛 Solución de Problemas

### Error: "Puerto 3000 ya en uso"

```bash
# Ver qué está usando el puerto
lsof -i :3000

# Detener el proceso o cambiar el puerto en docker-compose.yml
```

### Error: "Cannot find module"

```bash
# Reconstruir el contenedor
docker-compose build frontend
docker-compose up frontend
```

### El hot reload no funciona

```bash
# Asegúrate de que los volúmenes están montados correctamente
docker-compose down
docker-compose up --build
```

### Error de permisos con .next

```bash
# Limpiar el directorio .next
rm -rf frontend/.next
docker-compose up --build
```

### Frontend no se conecta al backend

Verifica que las URLs sean correctas:
- **Desde el navegador**: `http://localhost:8000`
- **Desde el contenedor frontend**: `http://backend:8000`

La variable `NEXT_PUBLIC_API_URL` debe apuntar a `http://localhost:8000` para que el navegador pueda conectarse (las peticiones se hacen desde el cliente, no desde el servidor Next.js).

Actualiza `docker-compose.yml`:
```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://localhost:8000  # ← Cambia a localhost
  - NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

## 📝 Notas Importantes

1. **Primera ejecución**: La primera vez tardará más porque debe instalar todas las dependencias.

2. **Instalación de nuevas dependencias**: Si agregas nuevas dependencias en `package.json`:
   ```bash
   docker-compose build frontend
   docker-compose up frontend
   ```

3. **Node modules**: No necesitas ejecutar `npm install` en tu máquina local si usas Docker. Todo se maneja dentro del contenedor.

4. **`.next` directory**: Este directorio puede crecer bastante. Límpialo periódicamente:
   ```bash
   rm -rf frontend/.next
   ```

## 🎯 Diferencias con Vite

| Aspecto | Vite (Antes) | Next.js (Ahora) |
|---------|--------------|-----------------|
| Puerto | 5173 | 3000 |
| Comando dev | `npm run dev -- --host` | `npm run dev` |
| Hot reload | Vite HMR | Next.js Fast Refresh |
| Build dir | `dist/` | `.next/` |
| SSR | No | Sí |

## ✅ Checklist de Verificación

Antes de hacer commit de estos cambios, verifica:

- [ ] `docker-compose up` inicia correctamente
- [ ] Frontend accesible en http://localhost:3000
- [ ] Backend accesible en http://localhost:8000
- [ ] Hot reload funciona al editar código
- [ ] Login funciona correctamente
- [ ] Mapas de Leaflet cargan sin errores
- [ ] Subida de imágenes funciona (MinIO)

## 🔒 Producción

**Nota**: Esta configuración es para **desarrollo local** únicamente. Para producción, usa `docker-compose.prod.yml` (que necesitaría actualización similar).

La configuración de producción incluirá:
- Build optimizado (`npm run build`)
- Servidor de producción (`npm run start`)
- Variables de entorno de producción
- Certificados SSL
- nginx como reverse proxy

---

**Fecha**: Noviembre 2025
**Framework**: Next.js 14+
**Docker Compose Version**: 3.9
