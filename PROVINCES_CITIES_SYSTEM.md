# Sistema de Provincias y Ciudades de Ecuador 🇪🇨

## 📋 Resumen

Se ha implementado un sistema completo y administrable de **provincias y ciudades de Ecuador** que permite a los usuarios seleccionar ubicaciones de forma precisa mediante selectores con búsqueda.

---

## 🎯 Backend (Django)

### 1. Modelos de Base de Datos

**Archivo:** `backend/real_estate/models.py`

```python
class Province(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, null=True, blank=True)
    country = models.CharField(max_length=100, default='Ecuador')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class City(models.Model):
    name = models.CharField(max_length=100)
    province = models.ForeignKey(Province, on_delete=models.CASCADE, related_name='cities')
    code = models.CharField(max_length=10, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Características:**
- ✅ Relación uno-a-muchos (Provincia → Ciudades)
- ✅ Unique constraints para evitar duplicados
- ✅ Timestamps automáticos
- ✅ Ordenamiento alfabético por defecto

### 2. API REST Endpoints

**Provincias:**
```
GET  /api/provinces/              # Listar todas las provincias
GET  /api/provinces/{id}/          # Detalle de una provincia
GET  /api/provinces/{id}/cities/   # Ciudades de una provincia específica
GET  /api/provinces/?search=texto  # Buscar provincias
```

**Ciudades:**
```
GET  /api/cities/                  # Listar todas las ciudades
GET  /api/cities/{id}/             # Detalle de una ciudad
GET  /api/cities/?province={id}    # Filtrar ciudades por provincia
GET  /api/cities/?search=texto     # Buscar ciudades
```

**Ejemplo de respuesta:**
```json
// GET /api/provinces/
[
  {
    "id": 15,
    "name": "Morona Santiago",
    "code": null,
    "country": "Ecuador",
    "cities": [...],
    "cities_count": 12
  }
]

// GET /api/cities/?province=15
[
  {
    "id": 145,
    "name": "Macas",
    "code": null,
    "province": 15,
    "province_name": "Morona Santiago"
  }
]
```

### 3. Serializers

**Archivo:** `backend/real_estate/serializers.py`

```python
class ProvinceSerializer(serializers.ModelSerializer):
    cities = CitySerializer(many=True, read_only=True)
    cities_count = serializers.SerializerMethodField()
    # Incluye lista de ciudades y contador

class CitySerializer(serializers.ModelSerializer):
    province_name = serializers.CharField(source='province.name', read_only=True)
    # Incluye nombre de la provincia
```

### 4. ViewSets

**Archivo:** `backend/real_estate/views.py`

```python
class ProvinceViewSet(viewsets.ReadOnlyModelViewSet):
    # Solo lectura para usuarios normales
    # CRUD completo disponible en Django Admin
    queryset = Province.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']

class CityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = City.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'province__name']

    def get_queryset(self):
        # Filtrar por provincia si se proporciona
        queryset = City.objects.all()
        province_id = self.request.query_params.get('province', None)
        if province_id:
            queryset = queryset.filter(province_id=province_id)
        return queryset
```

### 5. Django Admin

**Archivo:** `backend/real_estate/admin.py`

**Panel de Administración:**
- ✅ Gestión completa de provincias
- ✅ Gestión completa de ciudades
- ✅ Inline de ciudades al editar provincia
- ✅ Búsqueda y filtros avanzados
- ✅ Autocomplete en campos de relación

**Acceso:**
- URL: http://localhost:8000/admin
- Secciones: "Provincias" y "Ciudades"

### 6. Comando de Carga de Datos

**Archivo:** `backend/real_estate/management/commands/load_ecuador_locations.py`

**Uso:**
```bash
docker-compose run --rm backend python manage.py load_ecuador_locations
```

**Datos cargados:**
- ✅ 24 provincias de Ecuador
- ✅ 221 ciudades/cantones
- ✅ Evita duplicados automáticamente
- ✅ Muestra resumen de operaciones

**Salida del comando:**
```
Resumen:
  Provincias creadas: 24
  Provincias existentes: 0
  Ciudades creadas: 221
  Ciudades existentes: 0
```

---

## 💻 Frontend (Next.js + React)

### 1. Componente LocationSelect

**Archivo:** `frontend/components/LocationSelect.tsx`

**Características:**
- ✅ Selector con búsqueda (react-select)
- ✅ Carga dinámica de provincias desde API
- ✅ Carga dinámica de ciudades al seleccionar provincia
- ✅ Búsqueda/filtrado en tiempo real
- ✅ Diseño responsive y elegante
- ✅ Estados de carga con spinners
- ✅ Estilos personalizados integrados

**Props:**
```typescript
interface LocationSelectProps {
  provinceValue: string;        // Valor actual de provincia
  cityValue: string;            // Valor actual de ciudad
  onProvinceChange: (value: string) => void;  // Callback al cambiar provincia
  onCityChange: (value: string) => void;      // Callback al cambiar ciudad
  required?: boolean;           // Si los campos son requeridos
}
```

**Uso en componentes:**
```tsx
import LocationSelect from '@/components/LocationSelect';

<LocationSelect
  provinceValue={province}
  cityValue={city}
  onProvinceChange={setProvince}
  onCityChange={setCity}
  required={false}
/>
```

### 2. Integración en Formularios

**Archivos actualizados:**
- ✅ `frontend/app/add-property/page.tsx`
- ✅ `frontend/app/edit-property/[id]/page.tsx`

**Flujo de usuario:**
1. Usuario hace clic en "Provincia"
2. Ve lista de 24 provincias
3. Puede buscar escribiendo (ej: "mor" → "Morona Santiago")
4. Selecciona una provincia
5. El selector de "Ciudad" se habilita automáticamente
6. Carga solo las ciudades de esa provincia
7. Usuario busca/selecciona la ciudad

### 3. Dependencias Instaladas

```bash
npm install react-select
```

**Versión instalada:** react-select (última versión)

---

## 📊 Datos de Ecuador Incluidos

### Provincias (24 total)

1. **Azuay** (15 cantones)
2. **Bolívar** (7 cantones)
3. **Cañar** (7 cantones)
4. **Carchi** (6 cantones)
5. **Chimborazo** (10 cantones)
6. **Cotopaxi** (7 cantones)
7. **El Oro** (14 cantones)
8. **Esmeraldas** (8 cantones)
9. **Galápagos** (3 cantones)
10. **Guayas** (25 cantones)
11. **Imbabura** (6 cantones)
12. **Loja** (16 cantones)
13. **Los Ríos** (13 cantones)
14. **Manabí** (22 cantones)
15. **Morona Santiago** (12 cantones) ⭐
16. **Napo** (5 cantones)
17. **Orellana** (4 cantones)
18. **Pastaza** (4 cantones)
19. **Pichincha** (8 cantones)
20. **Santa Elena** (3 cantones)
21. **Santo Domingo de los Tsáchilas** (1 cantón)
22. **Sucumbíos** (7 cantones)
23. **Tungurahua** (9 cantones)
24. **Zamora Chinchipe** (9 cantones)

### Ejemplo: Morona Santiago

**Ciudades/Cantones:**
- Macas (capital)
- Gualaquiza
- Limón Indanza
- Palora
- Santiago
- Sucúa
- Huamboya
- San Juan Bosco
- Taisha
- Logroño
- Pablo Sexto
- Tiwintza

---

## 🧪 Cómo Usar el Sistema

### 1. Como Usuario (Frontend)

**Agregar Nueva Propiedad:**
```
1. Ir a http://localhost:3000/add-property
2. En la sección "Ubicación":
   a. Hacer clic en el selector de "Provincia"
   b. Buscar escribiendo: "mor" → ver "Morona Santiago"
   c. Seleccionar "Morona Santiago"
   d. El selector de "Ciudad" se habilita automáticamente
   e. Buscar escribiendo: "mac" → ver "Macas"
   f. Seleccionar "Macas"
3. Los valores se guardan en los campos province y city
4. Completar el resto del formulario
5. Guardar la propiedad
```

**Editar Propiedad:**
```
1. Ir a "Mis Propiedades"
2. Hacer clic en "Editar" en una propiedad
3. Los selectores cargan automáticamente los valores actuales
4. Cambiar provincia/ciudad si es necesario
5. Guardar cambios
```

### 2. Como Administrador (Backend)

**Acceder al Admin:**
```
1. Ir a http://localhost:8000/admin
2. Iniciar sesión con credenciales de superusuario
3. Ver secciones "Provincias" y "Ciudades"
```

**Agregar Nueva Provincia:**
```
1. Admin → Provincias → Agregar Provincia
2. Completar: Nombre, Código (opcional), País
3. Agregar ciudades inline (opcionales)
4. Guardar
```

**Agregar Nueva Ciudad:**
```
1. Admin → Ciudades → Agregar Ciudad
2. Completar: Nombre, Provincia, Código (opcional)
3. Guardar
```

**Editar Provincia con Ciudades:**
```
1. Admin → Provincias → Seleccionar provincia
2. Ver ciudades en tabla inline
3. Agregar/editar/eliminar ciudades directamente
4. Guardar todos los cambios
```

### 3. Como Desarrollador (API)

**Obtener Provincias:**
```bash
curl http://localhost:8000/api/provinces/
```

**Buscar Provincia:**
```bash
curl http://localhost:8000/api/provinces/?search=morona
```

**Obtener Ciudades de una Provincia:**
```bash
# Opción 1: Endpoint específico
curl http://localhost:8000/api/provinces/15/cities/

# Opción 2: Filtro de query
curl http://localhost:8000/api/cities/?province=15
```

**Buscar Ciudad:**
```bash
curl http://localhost:8000/api/cities/?search=macas
```

---

## 🎨 Diseño del Componente

### Estilos Personalizados

El componente `LocationSelect` usa estilos personalizados de react-select que coinciden con el diseño de la aplicación:

- **Control**: Bordes redondeados, focus azul, padding consistente
- **Options**: Hover azul claro, selección azul, texto gris oscuro
- **Menu**: Sombra elegante, bordes redondeados
- **Placeholders**: Mensajes contextuales y útiles

### Estados del Componente

1. **Loading**: Muestra spinner mientras carga datos
2. **Disabled**: Ciudad deshabilitada hasta seleccionar provincia
3. **Empty**: Mensaje cuando no hay opciones
4. **Clearable**: Permite limpiar selección

---

## 🔧 Comandos Útiles

### Backend

```bash
# Crear migraciones
docker-compose run --rm backend python manage.py makemigrations

# Aplicar migraciones
docker-compose run --rm backend python manage.py migrate

# Cargar datos de Ecuador
docker-compose run --rm backend python manage.py load_ecuador_locations

# Crear superusuario
docker-compose run --rm backend python manage.py createsuperuser

# Acceder a shell de Django
docker-compose run --rm backend python manage.py shell
```

### Frontend

```bash
# Instalar dependencias
docker-compose run --rm frontend npm install

# Instalar react-select
docker-compose run --rm frontend npm install react-select

# Reiniciar frontend
docker-compose restart frontend
```

---

## ✨ Ventajas del Sistema

1. **Datos Precisos**: No hay errores de tipeo en nombres de ubicaciones
2. **UX Mejorada**: Búsqueda rápida y selección fácil
3. **Validación**: Solo ubicaciones válidas de Ecuador
4. **Escalable**: Fácil agregar más países en el futuro
5. **Administrable**: Super admin actualiza datos sin tocar código
6. **Performante**: Carga dinámica reduce peticiones al servidor
7. **Responsive**: Funciona en móvil, tablet y desktop
8. **Accesible**: Teclado navegable, screen-reader friendly

---

## 🚀 Mejoras Futuras (Opcionales)

- [ ] Agregar coordenadas (lat/lng) a provincias y ciudades
- [ ] Agregar códigos oficiales (INEC) de cantones
- [ ] Incluir parroquias (nivel 3 de división territorial)
- [ ] Multi-idioma (español/inglés)
- [ ] Iconos de banderas/escudos
- [ ] Caché en frontend para reducir peticiones
- [ ] Lazy loading de ciudades solo cuando se despliega el selector
- [ ] Agregar más países (Colombia, Perú, etc.)

---

## 📝 Notas Importantes

1. **Permisos**: Los usuarios normales tienen acceso de solo lectura a la API. Solo los administradores pueden modificar provincias/ciudades desde el Django Admin.

2. **Migración de Datos**: Si ya tienes propiedades con ciudades/provincias en formato texto, seguirán funcionando. El nuevo sistema no afecta datos existentes.

3. **Geocodificación**: El sistema de ubicaciones es complementario a la geocodificación inversa. Puedes usar ambos: obtener ubicación del mapa Y seleccionar de la lista.

4. **Backup**: Los datos de provincias/ciudades se pueden exportar desde Django Admin o mediante fixtures.

---

**Implementado el:** 2025-01-24
**Estado:** ✅ Completamente Funcional
**Datos cargados:** 24 provincias, 221 ciudades de Ecuador
