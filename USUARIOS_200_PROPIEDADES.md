# Base de Datos de Prueba - 200 Propiedades

## 📊 Resumen

- **Total Usuarios:** 21 (1 admin + 20 usuarios regulares)
- **Total Propiedades:** 200
- **Ubicaciones:** 10 zonas diferentes de Macas, Morona Santiago

## 🔐 Usuarios Creados

### Administrador
- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **Email:** admin@estatemap.com

### Usuarios Regulares (1-20)

Los usuarios están numerados del 1 al 20:

| Usuario | Contraseña | Email |
|---------|-----------|--------|
| usuario1 | pass1 | usuario1@email.com |
| usuario2 | pass2 | usuario2@email.com |
| usuario3 | pass3 | usuario3@email.com |
| usuario4 | pass4 | usuario4@email.com |
| usuario5 | pass5 | usuario5@email.com |
| usuario6 | pass6 | usuario6@email.com |
| usuario7 | pass7 | usuario7@email.com |
| usuario8 | pass8 | usuario8@email.com |
| usuario9 | pass9 | usuario9@email.com |
| usuario10 | pass10 | usuario10@email.com |
| usuario11 | pass11 | usuario11@email.com |
| usuario12 | pass12 | usuario12@email.com |
| usuario13 | pass13 | usuario13@email.com |
| usuario14 | pass14 | usuario14@email.com |
| usuario15 | pass15 | usuario15@email.com |
| usuario16 | pass16 | usuario16@email.com |
| usuario17 | pass17 | usuario17@email.com |
| usuario18 | pass18 | usuario18@email.com |
| usuario19 | pass19 | usuario19@email.com |
| usuario20 | pass20 | usuario20@email.com |

## 🏘️ Zonas de Propiedades

Las 200 propiedades están distribuidas en las siguientes zonas de Macas:

1. **Centro** - Zona céntrica de Macas
2. **Norte** - Sector norte de la ciudad
3. **Sur** - Sector sur de la ciudad
4. **Este** - Sector este de la ciudad
5. **Oeste** - Sector oeste de la ciudad
6. **Sector Don Bosco** - Zona comercial
7. **Sector 29 de Mayo** - Zona residencial
8. **Sector Los Pinos** - Zona residencial tranquila
9. **Vía Puyo** - Carretera hacia Puyo
10. **Vía Sucúa** - Carretera hacia Sucúa

## 🏠 Tipos de Propiedades

Las propiedades incluyen:

- **Casas** - De 2 a 6 habitaciones, con jardines y garajes
- **Apartamentos** - De 1 a 4 habitaciones, algunos amoblados
- **Terrenos** - Desde 200m² hasta 5,000m², urbanos y rurales
- **Locales Comerciales** - Oficinas, bodegas, locales

## 💰 Precios

- **Venta:** Desde $6,000 hasta $1,000,000+
- **Alquiler:** Desde $90/mes hasta $7,500/mes

## 📐 Características

Todas las propiedades incluyen:
- ✅ Coordenadas GPS precisas
- ✅ Polígonos delimitadores en el mapa
- ✅ Áreas con 2 decimales (formato: XXX.XX m²)
- ✅ Direcciones generadas aleatoriamente
- ✅ Teléfonos de contacto
- ✅ Descripciones detalladas
- ✅ Año de construcción (2000-2024)
- ✅ Estados: En Venta / En Alquiler
- ✅ Precios negociables/no negociables

## 🔄 Regenerar Datos

Para volver a poblar la base de datos con estas 200 propiedades:

```bash
docker-compose exec backend python populate_200_properties.py
```

**⚠️ Advertencia:** Este comando eliminará TODOS los usuarios y propiedades existentes.

## 🗺️ Visualización en el Mapa

Al cargar la aplicación verás:
- 200 polígonos de diferentes colores según el estado (verde = venta, azul = alquiler)
- Distribuidos en toda la zona de Macas
- Cada polígono es clickeable para ver detalles
- El sidebar muestra las propiedades visibles en el área del mapa

## 📱 Probar el Sistema

1. **Iniciar sesión** con cualquier usuario (usuario1 a usuario20)
2. **Ver propiedades** en el mapa principal
3. **Filtrar propiedades** moviendo el mapa
4. **Click en propiedades** para ver detalles en el modal
5. **Agregar nuevas propiedades** desde "Nueva Propiedad"
6. **Administrar propiedades** desde "Mis Propiedades"

## 🎯 Datos Generados

Cada propiedad tiene datos realistas:
- Nombres de propiedades contextuales por zona
- Precios calculados según área y tipo
- Características apropiadas por tipo de propiedad
- Distribución geográfica realista en Macas
- Polígonos con tamaños variables

---

**Fecha de Generación:** 2025-01-11
**Versión del Script:** populate_200_properties.py
