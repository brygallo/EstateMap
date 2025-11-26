# Geo Propiedades Ecuador - Frontend (Next.js)

Plataforma de búsqueda y gestión de propiedades en Ecuador con mapas interactivos. Migrada a Next.js 14+ con App Router para SEO avanzado y mejor rendimiento.

## 🚀 Características

- ✅ **Next.js 14+ con App Router** - SSR, SSG y optimización automática
- ✅ **SEO Avanzado** - Metadata completa, Open Graph, Twitter Cards
- ✅ **PWA (Progressive Web App)** - Instalable en dispositivos móviles
- ✅ **Mapas Interactivos** - Leaflet con herramientas de dibujo
- ✅ **Autenticación Completa** - Login, registro, verificación de email, recuperación de contraseña
- ✅ **Gestión de Propiedades** - CRUD completo con imágenes y polígonos
- ✅ **Responsive Design** - Tailwind CSS con diseño adaptativo
- ✅ **TypeScript** - Tipado estático para mejor desarrollo

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Backend de API corriendo (por defecto en http://localhost:8000)

## 🛠️ Instalación

1. **Instalar dependencias**:
```bash
cd frontend
npm install
```

2. **Configurar variables de entorno**:

**IMPORTANTE**: Este proyecto usa un único archivo `.env` en la **raíz del proyecto** (no en `frontend/`).

```bash
# Desde la raíz del proyecto EstateMap/
cp .env.example .env

# Editar .env con tus valores
# Las variables para Next.js deben empezar con NEXT_PUBLIC_
```

Variables requeridas en `.env` (raíz):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

Ver [ENV_CONFIG.md](../ENV_CONFIG.md) para más detalles.

3. **Generar iconos PNG para PWA (si no existen)**:
```bash
# Opcional: usa el script generate-icons.cjs si necesitas regenerar iconos
node generate-icons.cjs
```

## 🏃 Desarrollo

Ejecutar en modo desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## 🏗️ Build de Producción

```bash
# Crear build optimizado
npm run build

# Ejecutar build en producción
npm run start
```

## 📁 Estructura del Proyecto

```
frontend/
├── app/                      # App Router de Next.js
│   ├── (auth)/              # Rutas de autenticación (agrupadas)
│   │   ├── login/
│   │   ├── register/
│   │   ├── verify-email/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── add-property/        # Agregar propiedad
│   ├── my-properties/       # Mis propiedades
│   ├── edit-property/[id]/  # Editar propiedad (ruta dinámica)
│   ├── layout.tsx           # Layout raíz
│   ├── page.tsx             # Página principal (MapPage)
│   └── globals.css          # Estilos globales
├── components/              # Componentes reutilizables
│   ├── maps/                # Componentes de mapas
│   │   ├── LeafletMap.tsx
│   │   └── AddPropertyMap.tsx
│   ├── NavBar.tsx
│   ├── Footer.tsx
│   ├── PrivateRoute.tsx
│   ├── PropertyModal.tsx
│   ├── ShareModal.tsx
│   └── RangeSlider.tsx
├── lib/                     # Utilidades y helpers
│   ├── auth-context.tsx    # Contexto de autenticación
│   └── metadata.ts          # Generadores de metadata SEO
├── public/                  # Archivos estáticos
│   ├── manifest.json        # PWA manifest
│   ├── favicon.svg
│   └── icon-*.svg           # Iconos PWA
├── next.config.js           # Configuración de Next.js
├── tailwind.config.js       # Configuración de Tailwind
└── tsconfig.json            # Configuración de TypeScript
```

## 🎨 Tecnologías Utilizadas

- **Framework**: Next.js 14+ (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Mapas**: Leaflet, React-Leaflet, Leaflet Geoman
- **Formularios**: Formik + Yup
- **Notificaciones**: React Toastify
- **QR Codes**: qrcode.react
- **Geometría**: Turf.js
- **PWA**: next-pwa

## 🔒 Autenticación

El sistema de autenticación incluye:

- ✅ Login con opción "Recordar sesión"
- ✅ Registro con validación de campos
- ✅ Verificación de email con código de 6 dígitos
- ✅ Recuperación de contraseña por email
- ✅ Rutas protegidas con componente `PrivateRoute`
- ✅ Almacenamiento de token en localStorage/sessionStorage

## 🗺️ Funcionalidad de Mapas

### Página Principal (MapPage)
- Visualización de todas las propiedades en el mapa
- Filtros avanzados: tipo, estado, precio, área, habitaciones, baños, usuario
- Búsqueda por texto
- Localización del usuario
- Sidebar con lista de propiedades visibles
- Modal de detalles de propiedad con galería de imágenes

### Agregar/Editar Propiedad
- Dibujo de polígonos en el mapa
- Cálculo automático de área
- Carga de múltiples imágenes
- Validación de formularios
- Integración con Leaflet Geoman

## 📱 PWA (Progressive Web App)

La aplicación es instalable como PWA:

- ✅ Manifest.json configurado
- ✅ Service Worker con next-pwa
- ✅ Iconos en múltiples tamaños
- ✅ Shortcuts a secciones principales
- ✅ Modo standalone

## 🔍 SEO

Metadata completa implementada:

- ✅ Títulos y descripciones únicas por página
- ✅ Open Graph para compartir en redes sociales
- ✅ Twitter Cards
- ✅ Canonical URLs
- ✅ Robots meta tags
- ✅ Sitemap automático (generado por Next.js)

## 🐛 Solución de Problemas

### Error de Leaflet en SSR
Los componentes de Leaflet se cargan dinámicamente con `{ ssr: false }` para evitar errores de renderizado en el servidor.

### Iconos del mapa no aparecen
Asegúrate de que el fix de iconos de Leaflet está aplicado en los componentes del mapa.

### PWA no se instala
Verifica que los archivos PNG de los iconos existan en el directorio `public/` y que coincidan con los definidos en `manifest.json`.

## 📄 Licencia

© 2025 Geo Propiedades Ecuador. Todos los derechos reservados.

## 👥 Soporte

Para reportar problemas o solicitar características, contacta al equipo de desarrollo.
