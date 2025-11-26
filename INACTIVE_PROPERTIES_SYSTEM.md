# Sistema de Propiedades Inactivas

## 📋 Resumen

Se ha implementado un sistema de filtrado de propiedades **inactivas** que garantiza que solo sean visibles para su creador. Las propiedades con estado "inactive" NO aparecen en el mapa público ni están disponibles para otros usuarios.

---

## 🎯 Reglas de Visibilidad

### Para Usuarios NO Autenticados (Visitantes)
- ✅ **VER**: Solo propiedades con status `for_sale` o `for_rent`
- ❌ **NO VER**: Propiedades con status `inactive`

### Para Usuarios Autenticados
- ✅ **VER**: Todas las propiedades activas (`for_sale`, `for_rent`) de todos los usuarios
- ✅ **VER**: Sus propias propiedades (incluyendo las `inactive`)
- ❌ **NO VER**: Propiedades inactivas de otros usuarios

---

## 🔧 Cambios Realizados

### Backend (Django)

**Archivo:** `backend/real_estate/views.py`

#### PropertyViewSet - Método `get_queryset()` (Líneas 80-99)

```python
def get_queryset(self):
    """
    Filtrar propiedades según el usuario:
    - Usuarios no autenticados: solo propiedades activas (status != 'inactive')
    - Usuarios autenticados: propiedades activas + sus propias propiedades (incluyendo inactivas)
    """
    queryset = Property.objects.all()
    user = self.request.user

    if user.is_authenticated:
        # Mostrar propiedades activas + propiedades propias (incluyendo inactivas)
        from django.db.models import Q
        queryset = queryset.filter(
            Q(status__in=['for_sale', 'for_rent']) | Q(owner=user)
        )
    else:
        # Usuarios no autenticados: solo propiedades activas
        queryset = queryset.exclude(status='inactive')

    return queryset
```

**Características:**
- ✅ Filtrado automático a nivel de API
- ✅ Usa Django Q objects para consultas complejas
- ✅ Respeta el principio de privacidad
- ✅ Optimizado con consultas eficientes

#### Endpoint `my_properties` (Líneas 104-109)

```python
@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
def my_properties(self, request):
    """Get only the properties owned by the current user (including inactive)"""
    properties = Property.objects.filter(owner=request.user)
    serializer = self.get_serializer(properties, many=True)
    return Response(serializer.data)
```

**Características:**
- ✅ Devuelve TODAS las propiedades del usuario
- ✅ Incluye propiedades inactivas
- ✅ Requiere autenticación
- ✅ Usado en la página "Mis Propiedades"

---

### Frontend (Next.js)

**No se requirieron cambios en el frontend**, ya que:

1. **Mapa Principal** (`frontend/app/page.tsx`):
   - Usa `GET /api/properties/` que ahora filtra automáticamente
   - El backend se encarga de ocultar propiedades inactivas

2. **Mis Propiedades** (`frontend/app/my-properties/page.tsx`):
   - Ya usa `GET /api/properties/my_properties/`
   - Muestra todas las propiedades del usuario
   - Ya tenía soporte visual para estados inactivos:
     - Badge rojo con texto "Inactivo" (líneas 169-171)
     - Funciones `getStatusLabel()` y `getStatusColor()` (líneas 81-101)

---

## 🧪 Cómo Probar el Sistema

### Preparación

1. **Asegúrate de tener al menos 2 usuarios registrados:**
   ```bash
   # Usuario 1: Tu cuenta principal
   # Usuario 2: Cuenta de prueba
   ```

2. **Crea algunas propiedades de prueba:**
   - Usuario 1: 3 propiedades (2 activas + 1 inactiva)
   - Usuario 2: 2 propiedades (1 activa + 1 inactiva)

### Prueba 1: Usuario No Autenticado

**Pasos:**
1. Cierra sesión (o usa modo incógnito)
2. Ve a http://localhost:3000 (mapa principal)
3. Observa el mapa

**Resultado Esperado:**
- ✅ Solo aparecen propiedades con status `for_sale` o `for_rent`
- ❌ NO aparecen propiedades con status `inactive`
- ✅ Total visible: 3 propiedades (2 del Usuario 1 + 1 del Usuario 2)

### Prueba 2: Usuario Autenticado - Mapa Principal

**Pasos:**
1. Inicia sesión con Usuario 1
2. Ve a http://localhost:3000 (mapa principal)
3. Observa el mapa

**Resultado Esperado:**
- ✅ Aparecen propiedades activas de todos los usuarios
- ✅ Aparece la propiedad inactiva del Usuario 1 (propia)
- ❌ NO aparece la propiedad inactiva del Usuario 2
- ✅ Total visible: 4 propiedades (3 del Usuario 1 incluyendo su inactiva + 1 del Usuario 2)

### Prueba 3: Mis Propiedades - Usuario 1

**Pasos:**
1. Con sesión del Usuario 1 iniciada
2. Ve a http://localhost:3000/my-properties
3. Observa la lista

**Resultado Esperado:**
- ✅ Aparecen las 3 propiedades del Usuario 1
- ✅ La propiedad inactiva tiene badge ROJO con texto "Inactivo"
- ✅ Las propiedades activas tienen badge VERDE "En Venta" o AZUL "En Alquiler"
- ✅ Total visible: 3 propiedades

### Prueba 4: Cambiar Estado de Propiedad

**Pasos:**
1. En "Mis Propiedades", haz clic en "Editar" en una propiedad activa
2. Cambia el estado a "Inactive"
3. Guarda los cambios
4. Regresa al mapa principal

**Resultado Esperado:**
- ✅ La propiedad desaparece del mapa principal para otros usuarios
- ✅ La propiedad sigue visible para ti (el dueño)
- ✅ En "Mis Propiedades", aparece con badge rojo "Inactivo"

### Prueba 5: Verificar API Directamente

**Prueba API sin autenticación:**
```bash
curl http://localhost:8000/api/properties/ | jq
```
**Resultado:** Solo propiedades con `"status": "for_sale"` o `"status": "for_rent"`

**Prueba API con autenticación:**
```bash
# 1. Obtener token
TOKEN=$(curl -s -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"tuusuario","password":"tupassword"}' \
  | jq -r '.access')

# 2. Obtener propiedades
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/properties/ | jq
```
**Resultado:** Propiedades activas + tus propiedades inactivas

**Prueba endpoint my_properties:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/properties/my_properties/ | jq
```
**Resultado:** TODAS tus propiedades (incluyendo inactivas)

---

## 📊 Estados de Propiedad

### Estados Disponibles (backend/real_estate/models.py líneas 64-68)

| Status | Descripción | Visible Públicamente | Color Badge |
|--------|-------------|---------------------|-------------|
| `for_sale` | En Venta | ✅ Sí | 🟢 Verde |
| `for_rent` | En Alquiler | ✅ Sí | 🔵 Azul |
| `inactive` | Inactivo | ❌ No (solo dueño) | 🔴 Rojo |

---

## 🔒 Seguridad

### Nivel de Backend
- ✅ Filtrado implementado en `get_queryset()` del ViewSet
- ✅ No se puede bypassear desde el frontend
- ✅ Protección automática en todos los endpoints de lista
- ✅ El endpoint `my_properties` requiere autenticación obligatoria

### Casos de Uso Seguros
1. **Usuario intenta acceder a propiedad inactiva de otro usuario directamente:**
   ```
   GET /api/properties/{id}/  # ID de propiedad inactiva de otro usuario
   ```
   - ✅ Django retornará 404 (Not Found) porque no está en el queryset

2. **Usuario intenta ver todas las propiedades inactivas:**
   ```
   GET /api/properties/?status=inactive
   ```
   - ✅ Solo verá sus propias propiedades inactivas

3. **Usuario no autenticado intenta acceder a my_properties:**
   ```
   GET /api/properties/my_properties/
   ```
   - ✅ Django retornará 401 (Unauthorized)

---

## 💡 Casos de Uso Reales

### Caso 1: Propiedad Vendida
```
1. Usuario crea propiedad con status "for_sale"
2. Propiedad aparece en mapa público
3. Se vende la propiedad
4. Usuario edita y cambia a status "inactive"
5. Propiedad desaparece del mapa público
6. Usuario aún puede ver la propiedad en "Mis Propiedades"
```

### Caso 2: Propiedad en Mantenimiento
```
1. Usuario tiene propiedad en alquiler (for_rent)
2. Necesita hacer reparaciones
3. Cambia temporalmente a "inactive"
4. Nadie puede ver la propiedad mientras está en mantenimiento
5. Al terminar, cambia de nuevo a "for_rent"
6. Propiedad vuelve a aparecer en el mapa
```

### Caso 3: Borrador de Propiedad
```
1. Usuario crea propiedad pero no tiene todas las fotos
2. Guarda como "inactive"
3. La propiedad no es visible para otros
4. Usuario edita, agrega fotos, completa información
5. Cambia a "for_sale" cuando está lista
6. Propiedad ahora visible públicamente
```

---

## 🚀 Ventajas del Sistema

1. **Privacidad**: Los usuarios pueden ocultar propiedades sin eliminarlas
2. **Flexibilidad**: Cambiar entre activo/inactivo es instantáneo
3. **Control**: El dueño siempre tiene acceso a sus propiedades
4. **Seguridad**: Implementado a nivel de base de datos/API
5. **UX Mejorada**: Indicadores visuales claros (badges de colores)
6. **Reversible**: A diferencia de eliminar, se puede reactivar fácilmente
7. **Historial**: Mantiene el historial de la propiedad aunque esté inactiva

---

## 📝 Notas Técnicas

### Performance
- El filtrado se hace a nivel de base de datos (eficiente)
- No se cargan propiedades inactivas innecesariamente
- Las consultas usan índices de Django ORM

### Extensibilidad
Si en el futuro se necesitan más estados (ej: "sold", "rented", "pending"), se puede:
1. Agregar al campo `STATUS_CHOICES` en el modelo
2. Agregar en `getStatusLabel()` y `getStatusColor()` del frontend
3. Decidir si ese nuevo estado debe ser público o privado modificando el filtro

### Compatibilidad
- ✅ Compatible con sistema de provincias/ciudades
- ✅ Compatible con geocodificación
- ✅ Compatible con filtros de búsqueda
- ✅ Compatible con sistema de imágenes

---

**Implementado el:** 2025-11-25
**Estado:** ✅ Completamente Funcional
**Backend Modificado:** `views.py` líneas 74-109
**Frontend:** Sin cambios (ya tenía soporte visual)

