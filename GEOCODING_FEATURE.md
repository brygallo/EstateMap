# Función de Geocodificación Inversa 🗺️

## 📋 Resumen

Se ha implementado una nueva funcionalidad que permite **obtener automáticamente la dirección, ciudad y provincia** a partir de las coordenadas del polígono dibujado en el mapa.

## ✨ Funcionalidad

Cuando dibujas un polígono en el mapa para marcar una propiedad, ahora puedes hacer clic en el botón **"Obtener Ubicación del Mapa"** y el sistema automáticamente:

1. Calcula el centro del polígono dibujado
2. Consulta la API de OpenStreetMap (Nominatim) para obtener la dirección
3. Rellena automáticamente los campos:
   - **Dirección**: Calle y número (si está disponible)
   - **Ciudad**: Ciudad, pueblo o municipio
   - **Provincia**: Provincia, estado o región

## 🔧 Implementación Técnica

### 1. **Servicio de Geocodificación** (`frontend/lib/geocoding.ts`)

```typescript
// Obtener dirección desde coordenadas
const result = await reverseGeocode(lat, lng);

// Obtener dirección desde polígono (usa el centro del polígono)
const result = await reverseGeocodePolygon(polygonCoords);
```

**Características:**
- Usa **Nominatim** de OpenStreetMap (gratuito, sin API key requerida)
- Respeta los límites de uso de Nominatim
- Maneja errores gracefully
- Devuelve resultados en español

**Datos retornados:**
```typescript
{
  address: string,      // Calle y número
  city: string,         // Ciudad/pueblo/municipio
  province: string,     // Provincia/estado
  country: string,      // País
  postalCode: string,   // Código postal
  displayName: string,  // Nombre completo de la ubicación
  latitude: number,
  longitude: number
}
```

### 2. **Integración en Formularios**

Se agregó en:
- ✅ `frontend/app/add-property/page.tsx` (Agregar propiedad)
- ✅ `frontend/app/edit-property/[id]/page.tsx` (Editar propiedad)

**Botón agregado en la sección de "Ubicación":**
- Solo se habilita cuando hay un polígono dibujado (≥3 puntos)
- Muestra un spinner mientras carga
- Muestra notificaciones toast con el resultado

## 🎯 Cómo Usar

### Para Agregar una Nueva Propiedad:

1. Ve a **"Nueva Propiedad"**
2. Dibuja un polígono en el mapa marcando el área de la propiedad
3. En la sección **"Ubicación"**, haz clic en el botón **"Obtener Ubicación del Mapa"**
4. Espera unos segundos mientras se obtiene la información
5. Los campos de dirección, ciudad y provincia se llenarán automáticamente
6. Puedes editar manualmente cualquier campo si es necesario

### Para Editar una Propiedad Existente:

1. Ve a **"Mis Propiedades"** y haz clic en **"Editar"**
2. Si necesitas actualizar la ubicación:
   - Edita el polígono en el mapa
   - Haz clic en **"Obtener Ubicación del Mapa"**
3. Los campos se actualizarán con la nueva ubicación

## 🌍 API Utilizada

**Nominatim - OpenStreetMap**
- URL: `https://nominatim.openstreetmap.org/`
- Documentación: https://nominatim.org/release-docs/latest/api/Reverse/
- **Gratuito** y sin necesidad de API key
- Límite de uso: 1 petición por segundo (respetado por el código)

**Ejemplo de petición:**
```
GET https://nominatim.openstreetmap.org/reverse?
  lat=-2.31194
  &lon=-78.124395
  &format=json
  &addressdetails=1
  &accept-language=es
```

## ⚙️ Detalles de Implementación

### Cálculo del Centro del Polígono

```typescript
function getPolygonCenter(polygon: [number, number][]): { lat: number; lng: number } {
  const sumLat = polygon.reduce((sum, [lat]) => sum + lat, 0);
  const sumLng = polygon.reduce((sum, [, lng]) => sum + lng, 0);

  return {
    lat: sumLat / polygon.length,
    lng: sumLng / polygon.length,
  };
}
```

### Manejo de Respuesta de Nominatim

El servicio intenta obtener la información en este orden de prioridad:

**Ciudad:**
1. `address.city`
2. `address.town`
3. `address.village`
4. `address.municipality`
5. `address.county`

**Provincia:**
1. `address.state`
2. `address.province`
3. `address.region`

**Dirección:**
1. `address.road + address.house_number`
2. `address.suburb`
3. `address.neighbourhood`

## 🎨 UI/UX

**Botón:**
- Color: Azul (`bg-blue-500`)
- Posición: Arriba a la derecha en la sección de Ubicación
- Estados:
  - **Habilitado**: Cuando hay un polígono válido
  - **Deshabilitado**: Cuando no hay polígono o tiene menos de 3 puntos
  - **Cargando**: Muestra spinner animado

**Notificaciones:**
- ✅ **Éxito**: "Ubicación obtenida del mapa exitosamente"
- ⚠️ **Advertencia**: "Primero dibuja un polígono en el mapa"
- ❌ **Error**: "No se pudo obtener la ubicación. Intenta con otro punto del mapa."

## 🔒 Privacidad y Seguridad

- ✅ No se envía información personal a Nominatim
- ✅ Solo se envían coordenadas geográficas
- ✅ Respeta el User-Agent requerido por Nominatim
- ✅ Manejo adecuado de errores y timeouts

## 📊 Casos de Uso

### Caso 1: Propiedad en Zona Urbana
```
Input: Polígono en el centro de Macas
Output:
  - Dirección: "Calle Tarqui 123"
  - Ciudad: "Macas"
  - Provincia: "Morona Santiago"
```

### Caso 2: Propiedad en Zona Rural
```
Input: Polígono en área rural
Output:
  - Dirección: "" (puede estar vacío)
  - Ciudad: "San Juan Bosco"
  - Provincia: "Morona Santiago"
```

### Caso 3: Polígono Grande
```
Input: Polígono de gran extensión
Output: Se usa el centro geométrico del polígono
```

## 🐛 Manejo de Errores

El sistema maneja elegantemente los siguientes casos:

1. **No hay polígono dibujado**: Muestra advertencia
2. **Error de red**: Muestra error genérico
3. **Respuesta vacía de Nominatim**: Muestra error amigable
4. **Timeout**: Se maneja con catch general
5. **Coordenadas inválidas**: Se valida antes de enviar

## 🚀 Mejoras Futuras (Opcionales)

- [ ] Caché de resultados para evitar peticiones repetidas
- [ ] Soporte para múltiples idiomas
- [ ] Mostrar vista previa del resultado antes de aplicar
- [ ] Permitir seleccionar entre múltiples resultados si hay ambigüedad
- [ ] Agregar soporte para otros proveedores de geocodificación (Google Maps, Mapbox)
- [ ] Rate limiting más sofisticado para respetar límites de API

## 📝 Notas Importantes

1. **Límite de peticiones**: Nominatim tiene un límite de 1 petición por segundo. Si planeas escalar la aplicación, considera implementar rate limiting o usar un servicio pagado.

2. **Precisión**: La precisión de los resultados depende de la calidad de los datos de OpenStreetMap en la región. En Ecuador, especialmente en Morona Santiago, la cobertura es buena pero puede variar.

3. **Internet requerido**: Esta funcionalidad requiere conexión a internet para funcionar.

4. **Manual override**: Los usuarios siempre pueden editar manualmente los campos después de obtener la ubicación automáticamente.

---

**Implementado el:** 2025-01-24
**Versión:** 1.0
**Estado:** ✅ Funcionando
