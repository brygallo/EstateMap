# 📍 Funcionalidad de Ubicación Automática

Esta funcionalidad está implementada en **dos páginas principales**:
- **Página Principal (Mapa de Propiedades)**: `/`
- **Página de Agregar Propiedad**: `/add-property`

## ✨ Características

### 1. **Carga Inicial**
- Al visitar por primera vez, aparece un modal atractivo solicitando permiso de ubicación
- Si el usuario **acepta**:
  - Se obtiene su ubicación actual
  - El mapa se centra en su ciudad con zoom 12 (vista amplia de la ciudad)
  - Se guarda la preferencia en localStorage
- Si el usuario **rechaza**:
  - El mapa muestra la vista por defecto de Ecuador
  - No se vuelve a preguntar

### 2. **Recargas Subsecuentes**
- **Si el usuario dio permiso anteriormente**:
  - Automáticamente obtiene la ubicación en cada recarga
  - Muestra un toast notification discreto "Obteniendo tu ubicación..."
  - Centra el mapa en la ciudad del usuario con animación suave
  - El toast desaparece después de 2 segundos

- **Si el usuario rechazó**:
  - Se muestra la vista por defecto de Ecuador
  - No se solicita ubicación

### 3. **Botón "Mi Ubicación"**
- Siempre disponible en la esquina inferior derecha
- Centra el mapa con zoom 17 (muy cercano) para ver detalles
- Útil para re-centrar después de explorar otras zonas

## 🗺️ Páginas Implementadas

### Página Principal (`/`)
- **Archivo**: `frontend/app/page.tsx`
- **Mapa**: `frontend/components/maps/LeafletMap.tsx`
- **Zoom configurado**: 12 (vista de ciudad)
- **Funcionalidad**: Permite ver propiedades en el mapa y filtrarlas

### Página Agregar Propiedad (`/add-property`)
- **Archivo**: `frontend/app/add-property/page.tsx`
- **Mapa**: `frontend/components/maps/AddPropertyMap.tsx`
- **Zoom configurado**: 12 (vista de ciudad)
- **Funcionalidad**: Permite dibujar polígonos para definir propiedades
- **Ventaja**: Al aceptar ubicación, el mapa se centra automáticamente en la ciudad del usuario para facilitar el dibujo de propiedades locales

## 🎨 Componentes Visuales

### Modal de Permiso de Ubicación
- **Archivo**: `frontend/components/LocationPermissionModal.tsx`
- **Características**:
  - Diseño moderno con gradientes
  - Lista de beneficios para el usuario
  - Animación suave de entrada/salida
  - Indicador de carga al obtener ubicación
  - Responsive (funciona perfecto en móviles)

### Toast de Ubicación
- Aparece en la parte superior central
- Animación fade-in suave
- Muestra spinner y mensaje informativo
- Se oculta automáticamente después de obtener ubicación

## 📱 Compatibilidad Multiplataforma

### iOS (Safari, Chrome, etc.)
- ✅ Solicitud de permisos nativos
- ✅ Mensajes de error personalizados
- ✅ Instrucciones específicas para habilitar ubicación
- ⚠️ Nota: iOS requiere que el usuario acepte manualmente en la configuración si deniega inicialmente

### Android (Chrome, Firefox, etc.)
- ✅ Permissions API completa
- ✅ Detección de permisos previamente denegados
- ✅ Mensajes de error específicos
- ✅ Instrucciones claras para habilitar ubicación

### Desktop (Chrome, Firefox, Edge, Safari)
- ✅ Soporte completo
- ✅ Permisos del navegador estándar
- ✅ Mensajes de error descriptivos

## ⚙️ Configuración Técnica

### Timeout y Opciones
```javascript
{
  enableHighAccuracy: true,  // Máxima precisión GPS
  timeout: 20000,            // 20 segundos (ideal para móviles)
  maximumAge: 0              // No usar ubicación cacheada
}
```

### Niveles de Zoom
- **Zoom 12**: Vista de ciudad (al cargar automáticamente)
- **Zoom 17**: Vista de calle (botón "Mi ubicación")

### LocalStorage Keys
- `locationPermissionAsked`: Indica si ya se preguntó al usuario
- `hasInitialLocation`: Indica si el usuario aceptó dar ubicación

## 🔄 Resetear Permisos

### Para el Usuario
Si un usuario quiere cambiar sus preferencias de ubicación:

1. **Limpiar localStorage**:
   - Abrir DevTools (F12)
   - Console: `localStorage.clear()`
   - Recargar página

2. **Resetear permisos del navegador**:
   - **Chrome/Edge**: Icono de candado → Configuración del sitio → Ubicación
   - **Firefox**: Icono de candado → Más información → Permisos
   - **Safari**: Configuración → Privacidad → Servicios de ubicación

### Para Desarrollo
```javascript
// En la consola del navegador:
localStorage.removeItem('locationPermissionAsked');
localStorage.removeItem('hasInitialLocation');
location.reload();
```

## 🐛 Manejo de Errores

### Tipos de Error
1. **PERMISSION_DENIED**: Usuario rechazó el permiso
   - Muestra instrucciones específicas por plataforma
   - No interrumpe la experiencia (fallback a Ecuador)

2. **POSITION_UNAVAILABLE**: GPS/Ubicación no disponible
   - Mensaje: "Asegúrate de tener activados los servicios de ubicación"

3. **TIMEOUT**: Timeout al obtener ubicación
   - Mensaje: "Por favor intenta de nuevo. Asegúrate de tener buena señal GPS o Wi-Fi"

## 🚀 Testing

### Casos de Prueba
1. ✅ Primera visita → Modal aparece
2. ✅ Aceptar → Mapa se centra en ciudad
3. ✅ Recargar → Automáticamente centra en ciudad con toast
4. ✅ Rechazar → Mapa en Ecuador, no pregunta de nuevo
5. ✅ Permisos del navegador denegados → Instrucciones claras
6. ✅ Botón "Mi ubicación" → Zoom cercano funciona siempre

### Testing en Dispositivos Reales
- **iOS**: Probar en Safari y Chrome
- **Android**: Probar en Chrome y Firefox
- **Desktop**: Probar en todos los navegadores mayores

## 📝 Notas Adicionales

- La ubicación se obtiene cada vez que se recarga la página (si el usuario aceptó)
- No se almacena la ubicación del usuario, solo la preferencia de permiso
- El sistema es totalmente compatible con HTTPS (requerido para geolocalización)
- La experiencia es fluida y no intrusiva
