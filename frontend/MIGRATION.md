# Guía de Migración: React (Vite) → Next.js 14 con App Router

Este documento describe el proceso completo de migración del frontend de Geo Propiedades Ecuador desde React con Vite a Next.js 14+ con App Router.

## 📋 Resumen Ejecutivo

### Antes
- **Framework**: React 18.3.1 con Vite
- **Routing**: React Router DOM v6
- **SSR/SEO**: No (SPA tradicional)
- **Build**: Vite
- **PWA**: Service Worker manual

### Después
- **Framework**: Next.js 14+ con App Router
- **Routing**: Next.js App Router (basado en sistema de archivos)
- **SSR/SEO**: Sí (SSR, SSG, metadata avanzada)
- **Build**: Next.js (optimización automática)
- **PWA**: next-pwa (automatizado)

## 🎯 Objetivos Logrados

✅ **SEO Avanzado**: Metadata completa, Open Graph, Twitter Cards, canonical URLs
✅ **SSR/SSG**: Server-side rendering donde sea apropiado
✅ **Mejor Performance**: Optimización automática de Next.js
✅ **Mismo Diseño**: Estilos Tailwind preservados al 100%
✅ **Misma Funcionalidad**: Toda la lógica intacta
✅ **TypeScript**: Migración completa a TypeScript
✅ **PWA Mejorado**: Configuración automatizada con next-pwa

## 📁 Estructura del Proyecto Migrado

```
frontend/
├── app/                          # App Router de Next.js
│   ├── (auth)/                   # Grupo de rutas de autenticación
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── verify-email/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx            # Layout compartido para auth
│   ├── add-property/
│   │   └── page.tsx
│   ├── my-properties/
│   │   └── page.tsx
│   ├── edit-property/
│   │   └── [id]/
│   │       └── page.tsx          # Ruta dinámica
│   ├── layout.tsx                # Layout raíz
│   ├── page.tsx                  # Página principal (MapPage)
│   └── globals.css
├── components/
│   ├── maps/                     # Componentes de mapas (carga dinámica)
│   │   ├── LeafletMap.tsx
│   │   └── AddPropertyMap.tsx
│   ├── NavBar.tsx
│   ├── Footer.tsx
│   ├── PrivateRoute.tsx
│   ├── PropertyModal.tsx
│   ├── ShareModal.tsx
│   └── RangeSlider.tsx
├── lib/
│   ├── auth-context.tsx
│   └── metadata.ts
├── public/
│   ├── manifest.json
│   └── [iconos]
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 🔄 Cambios Técnicos Principales

### 1. Sistema de Rutas

#### Antes (React Router)
```jsx
// main.jsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<MapPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/add-property" element={<PrivateRoute><AddProperty /></PrivateRoute>} />
  </Routes>
</BrowserRouter>
```

#### Después (Next.js App Router)
```
app/
├── page.tsx                    → /
├── (auth)/
│   └── login/page.tsx         → /login
└── add-property/page.tsx      → /add-property
```

### 2. Navegación y Links

#### Antes
```jsx
import { Link, useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/dashboard');

<Link to="/login">Login</Link>
```

#### Después
```tsx
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push('/dashboard');

<Link href="/login">Login</Link>
```

### 3. Parámetros de URL

#### Antes
```jsx
import { useSearchParams, useParams } from 'react-router-dom';

const [searchParams] = useSearchParams();
const email = searchParams.get('email');

const { id } = useParams();
```

#### Después
```tsx
import { useSearchParams, useParams } from 'next/navigation';

const searchParams = useSearchParams();
const email = searchParams.get('email');

const params = useParams();
const id = params.id;
```

### 4. Variables de Entorno

#### Antes
```jsx
const API_URL = import.meta.env.VITE_API_URL;
```

#### Después
```tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL;
```

### 5. Componentes de Leaflet (Critical!)

#### Problema
Leaflet depende del objeto `window`, que no existe en SSR de Next.js.

#### Solución
```tsx
// app/page.tsx
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/components/maps/LeafletMap'), {
  ssr: false,  // ¡CRITICAL! Deshabilitar SSR para Leaflet
  loading: () => <div>Cargando mapa...</div>
});

export default function MapPage() {
  return <LeafletMap {...props} />;
}
```

### 6. Autenticación

#### Context API Adaptado para Next.js
```tsx
// lib/auth-context.tsx
'use client';  // ¡Necesario para hooks!

import { createContext, useContext, useState, useEffect } from 'react';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  // ... lógica de autenticación
};
```

#### Rutas Protegidas
```tsx
// components/PrivateRoute.tsx
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [token, loading, router]);

  if (loading) return <LoadingSpinner />;
  if (!token) return null;

  return <>{children}</>;
}
```

### 7. Metadata SEO

#### Layout Raíz
```tsx
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Geo Propiedades Ecuador',
    template: '%s | Geo Propiedades Ecuador',
  },
  description: 'Plataforma de búsqueda y gestión de propiedades...',
  openGraph: { ... },
  twitter: { ... },
  robots: { ... },
  manifest: '/manifest.json',
};
```

#### Páginas Individuales
```tsx
// app/login/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description: '...',
};

export default function LoginPage() { ... }
```

### 8. PWA con next-pwa

#### next.config.js
```js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  reactStrictMode: true,
  // ... otras configuraciones
});
```

## 📦 Dependencias

### Nuevas
- `next@^14.2.0` - Framework principal
- `next-pwa@^5.6.0` - PWA support
- TypeScript types: `@types/node`, `@types/react`, `@types/react-dom`, `@types/leaflet`

### Removidas
- `react-router-dom` - Reemplazado por Next.js Router
- `vite` y `@vitejs/plugin-react` - Reemplazados por Next.js build system

### Mantenidas
- React, React DOM
- Tailwind CSS
- Leaflet y react-leaflet
- Formik, Yup
- React Toastify
- QRCode.react
- Turf.js
- Todas las demás dependencias de UI

## 🚀 Comandos

```bash
# Desarrollo
npm run dev        # http://localhost:3000

# Producción
npm run build      # Crear build optimizado
npm run start      # Ejecutar build en producción

# Linting
npm run lint       # ESLint con configuración de Next.js
```

## 🎨 Estilos

### Sin Cambios
- Todos los estilos Tailwind se mantuvieron **exactamente iguales**
- Todas las clases CSS personalizadas preservadas
- Configuración de Tailwind adaptada a Next.js:

```js
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // ... resto igual
};
```

## 🔍 SEO Implementado

### Metadata por Página
- ✅ Títulos únicos y descriptivos
- ✅ Descripciones optimizadas para búsqueda
- ✅ Open Graph para redes sociales
- ✅ Twitter Cards
- ✅ Canonical URLs
- ✅ Robots meta tags

### Mejoras Automáticas de Next.js
- ✅ Sitemap.xml automático
- ✅ robots.txt
- ✅ Optimización de imágenes
- ✅ Code splitting automático
- ✅ Server-side rendering donde sea apropiado
- ✅ Static generation donde sea apropiado

## ⚠️ Consideraciones Importantes

### 1. Directiva 'use client'
Todos los componentes que usan hooks de React deben tener `'use client'` al inicio:
```tsx
'use client';

import { useState } from 'react';

export default function MyComponent() { ... }
```

### 2. Leaflet SSR
Los componentes de Leaflet **DEBEN** cargarse dinámicamente con `{ ssr: false }`:
```tsx
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
```

### 3. Variables de Entorno
Solo las variables que empiezan con `NEXT_PUBLIC_` son accesibles en el cliente:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000    # ✅ Accesible
API_SECRET=xxxxx                              # ❌ Solo servidor
```

### 4. Rutas Protegidas
El componente `PrivateRoute` ahora usa `useEffect` + `router.push()` en lugar de `<Navigate>`:
```tsx
useEffect(() => {
  if (!loading && !token) {
    router.push('/login');
  }
}, [token, loading]);
```

## 📝 Checklist de Migración Completada

- ✅ Estructura de directorios App Router creada
- ✅ Layout raíz con metadata SEO
- ✅ Todas las páginas migradas a TypeScript
- ✅ React Router → Next.js Router
- ✅ Variables de entorno actualizadas
- ✅ Leaflet con carga dinámica
- ✅ AuthContext adaptado
- ✅ PrivateRoute reimplementado
- ✅ Componentes comunes migrados
- ✅ PWA configurado con next-pwa
- ✅ Manifest.json actualizado
- ✅ Tailwind CSS configurado
- ✅ package.json actualizado
- ✅ .gitignore para Next.js
- ✅ .env.example creado
- ✅ README.md completo
- ✅ TypeScript configurado
- ✅ ESLint con Next.js

## 🐛 Problemas Comunes y Soluciones

### Error: "window is not defined"
**Causa**: Componente cliente ejecutándose en SSR
**Solución**: Usar dynamic import con `{ ssr: false }`

### Error: Leaflet iconos no aparecen
**Causa**: Path incorrecto en SSR
**Solución**: Fix de iconos en componente del mapa:
```tsx
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
```

### Error: useSearchParams must be wrapped in Suspense
**Solución**: Envolver componente en Suspense o usar en Client Component

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)

## 🎉 Resultado Final

La aplicación ahora tiene:

1. **SEO Profesional**: Metadata completa, SSR, optimización automática
2. **Mejor Performance**: Code splitting, optimización de Next.js
3. **PWA Mejorado**: Configuración automatizada
4. **TypeScript**: Mejor experiencia de desarrollo
5. **Misma UX**: Diseño y funcionalidad 100% preservados
6. **Preparado para Producción**: Build optimizado y prácticas modernas

---

**Fecha de Migración**: Noviembre 2025
**Versión Original**: React 18.3.1 + Vite
**Versión Nueva**: Next.js 14+ con App Router
**Status**: ✅ Completado
