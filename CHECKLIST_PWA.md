# ✅ Checklist - PWA & Responsive

## 🚀 Inicio Rápido

### 1. Generar Iconos (REQUERIDO)

```bash
cd frontend
npm run dev
```

Luego abre en el navegador:
```
http://localhost:5173/generate-icons.html
```

**Acciones:**
- [ ] Descargar los 8 iconos usando los botones
- [ ] Guardar todos en `/frontend/public/` con los nombres exactos
- [ ] Verificar que existan: icon-72x72.png, icon-96x96.png, icon-128x128.png, icon-144x144.png, icon-152x152.png, icon-192x192.png, icon-384x384.png, icon-512x512.png

### 2. Verificar Build

```bash
cd frontend
npm run build
```

**Debe mostrar:**
- [ ] ✓ built in X.XXs (sin errores)
- [ ] Archivos generados en `/frontend/dist/`

### 3. Probar en Preview

```bash
npm run preview
```

Abre: `http://localhost:4173`

**Verifica:**
- [ ] La página carga correctamente
- [ ] NavBar responsive funciona
- [ ] MapPage sidebar se puede abrir/cerrar en móvil
- [ ] No hay errores en la consola

### 4. Verificar PWA en DevTools

Abre Chrome DevTools (F12) → Pestaña "Application"

**Manifest:**
- [ ] manifest.json carga sin errores
- [ ] Todos los iconos aparecen en la lista
- [ ] Name: "EstateMap - Gestión de Propiedades"
- [ ] Display: "standalone"

**Service Workers:**
- [ ] Service Worker aparece como "activated and running"
- [ ] Scope: "/"
- [ ] Sin errores en el log

**Storage → Cache Storage:**
- [ ] Aparece cache "estatemap-v1"
- [ ] Contiene archivos cacheados

### 5. Probar Instalación

**Desktop (Chrome/Edge):**
- [ ] Aparece icono de instalación en barra de direcciones
- [ ] Clic en "Instalar"
- [ ] App se abre en ventana separada
- [ ] Icono aparece en escritorio/menú inicio

**Móvil (Android Chrome):**
- [ ] Menú → "Añadir a pantalla de inicio"
- [ ] Banner de instalación aparece
- [ ] Icono aparece en home screen

**Móvil (iOS Safari):**
- [ ] Compartir → "Añadir a pantalla de inicio"
- [ ] Icono personalizado aparece

### 6. Probar Responsive

Usa Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M)

**Móvil (375px):**
- [ ] NavBar muestra botón hamburguesa
- [ ] Menú hamburguesa se abre/cierra correctamente
- [ ] MapPage sidebar está oculto por defecto
- [ ] Botón flotante visible para abrir sidebar
- [ ] AddProperty: formulario aparece primero

**Tablet (768px):**
- [ ] NavBar muestra navegación completa
- [ ] MapPage sidebar visible
- [ ] Todos los elementos accesibles

**Desktop (1920px):**
- [ ] Todo visible y bien espaciado
- [ ] Sidebar fijo en MapPage
- [ ] Formulario y mapa lado a lado en AddProperty

### 7. Probar Offline

1. Visita la app con internet
2. Chrome DevTools → Network → Throttling → "Offline"
3. Recarga la página

**Debe:**
- [ ] La app carga desde cache
- [ ] Páginas principales accesibles
- [ ] Service Worker sirve archivos cacheados
- [ ] No se muestran errores (excepto para llamadas API)

---

## 🔍 Verificaciones Opcionales

### Lighthouse Audit

Chrome DevTools → Lighthouse → Generate report

**Objetivos:**
- [ ] PWA: ✅ (todos los checks verdes)
- [ ] Performance: > 90
- [ ] Accessibility: > 90
- [ ] Best Practices: > 90
- [ ] SEO: > 90

### Pruebas en Dispositivos Reales

**Android:**
- [ ] Chrome Remote Debugging configurado
- [ ] App funciona correctamente
- [ ] Gestos táctiles funcionan
- [ ] Orientación responsive

**iOS:**
- [ ] Safari Web Inspector configurado
- [ ] App se instala correctamente
- [ ] Touch events funcionan
- [ ] Status bar configurado

---

## 📋 Lista de Archivos Nuevos

```
frontend/
├── public/
│   ├── manifest.json         ✅
│   ├── sw.js                 ✅
│   ├── generate-icons.html   ✅
│   ├── icon.svg              ✅
│   └── icon-*.png            ⚠️ (Debes generarlos)
├── src/
│   ├── components/
│   │   └── NavBar.jsx        ✅ (Modificado)
│   ├── pages/
│   │   ├── MapPage.jsx       ✅ (Modificado)
│   │   └── AddProperty.jsx   ✅ (Modificado)
│   └── main.jsx              ✅ (Modificado)
└── index.html                ✅ (Modificado)
```

---

## 🐛 Problemas Comunes

### ❌ "Failed to register service worker"
**Solución:**
- Verifica que estés en localhost o HTTPS
- Asegúrate que sw.js esté en /public/
- Revisa permisos del archivo

### ❌ "Manifest: Failed to load"
**Solución:**
- Verifica que manifest.json esté en /public/
- Revisa la sintaxis JSON (sin errores)
- Asegúrate que el link en index.html sea correcto

### ❌ Iconos no aparecen en PWA
**Solución:**
- Genera los iconos con generate-icons.html
- Verifica que los nombres coincidan con manifest.json
- Limpia cache del navegador (Ctrl+Shift+Delete)

### ❌ App no se puede instalar
**Solución:**
- Todos los iconos deben existir (especialmente 192x192 y 512x512)
- Manifest debe tener start_url válido
- Service Worker debe estar registrado sin errores
- En producción: HTTPS obligatorio

---

## ✨ ¡Todo Listo!

Si completaste todos los checks, tu aplicación está lista:

✅ Responsive en todos los dispositivos
✅ PWA instalable
✅ Funcionamiento offline
✅ Experiencia de usuario optimizada

**Siguiente paso:** Deploy a producción con HTTPS

---

## 📚 Recursos

- 📖 `PWA_SETUP.md` - Guía detallada de configuración
- 📄 `CAMBIOS_RESPONSIVE_PWA.md` - Lista completa de cambios
- 🎨 `generate-icons.html` - Generador de iconos
- 🌐 http://localhost:5173/generate-icons.html - Herramienta en vivo

---

**¿Problemas?** Revisa los documentos completos o la consola del navegador para más detalles.
