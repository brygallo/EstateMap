# Configuración PWA - EstateMap

## ✅ Cambios Realizados

### 1. Diseño Responsive
- **NavBar**: Menú hamburguesa para móviles con animaciones suaves
- **MapPage**: Sidebar colapsable con botón flotante en móviles
- **AddProperty**: Layout adaptativo que se ajusta a diferentes tamaños de pantalla
- **Otras páginas**: Login, Register y MyProperties ya tienen diseño responsive con Tailwind

### 2. Configuración PWA
- ✅ Manifest.json creado con configuración completa
- ✅ Service Worker implementado con estrategia de cache
- ✅ Meta tags PWA agregados al index.html
- ✅ Registro del Service Worker en main.jsx

## 📱 Generar Iconos PWA

Los iconos son necesarios para que la PWA se vea profesional cuando se instale en dispositivos móviles.

### Opción 1: Usar el Generador Automático (Recomendado)

1. Inicia el servidor de desarrollo:
   ```bash
   cd frontend
   npm run dev
   ```

2. Abre en tu navegador:
   ```
   http://localhost:5173/generate-icons.html
   ```

3. Para cada icono:
   - Haz clic en el botón "Descargar" debajo de cada icono
   - O haz clic derecho sobre el icono → "Guardar imagen como..."
   - Guarda con el nombre exacto: `icon-72x72.png`, `icon-96x96.png`, etc.

4. Coloca todos los iconos generados en:
   ```
   frontend/public/
   ```

### Opción 2: Usar una Herramienta Online

Si prefieres usar una herramienta online:

1. Crea un icono base de 512x512px con:
   - Fondo: Degradado azul (#1E3A8A → #3B82F6)
   - Logo: Icono de mapa blanco centrado

2. Usa una herramienta como:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator

3. Sube tu icono y descarga todos los tamaños necesarios:
   - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

4. Colócalos en `frontend/public/`

## 🧪 Probar la PWA

### En Desarrollo Local

1. **Build de Producción**:
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

2. **Abrir en el navegador**:
   ```
   http://localhost:4173
   ```

3. **Verificar instalabilidad**:
   - Chrome/Edge: Icono de instalación en la barra de direcciones
   - Firefox: No soporta instalación PWA desktop completamente
   - Safari: Compartir → "Añadir a pantalla de inicio"

### En Producción

Después de hacer deploy:

1. Abre tu sitio en HTTPS (requerido para PWA)
2. En Chrome DevTools:
   - Abre la pestaña "Application"
   - Sección "Manifest": Verifica que todo esté correcto
   - Sección "Service Workers": Debe aparecer como "activated and running"

3. Prueba la instalación:
   - Desktop: Clic en el icono de instalación
   - Móvil: Menú → "Añadir a pantalla de inicio"

## 📋 Características de la PWA

### Service Worker
El service worker implementado proporciona:
- **Cache de recursos estáticos**: HTML, CSS, JS
- **Funcionamiento offline**: La app carga aunque no haya internet
- **Actualización automática**: Se actualiza cuando hay nuevos cambios
- **Estrategia Network First para API**: Siempre intenta obtener datos frescos

### Manifest
El manifest incluye:
- **Nombre**: EstateMap - Gestión de Propiedades
- **Display**: Standalone (se ve como app nativa)
- **Theme Color**: #1E3A8A (azul)
- **Orientación**: Portrait-primary (preferiblemente vertical)
- **Shortcuts**: Accesos directos a Mapa, Mis Propiedades, Nueva Propiedad

## 🔧 Configuración Adicional

### Para Deploy en Producción

Si usas **Nginx**, agrega estos headers:
```nginx
add_header Cache-Control "no-cache" always;
add_header Service-Worker-Allowed "/";
```

Si usas **Apache**, agrega a `.htaccess`:
```apache
<Files "sw.js">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Service-Worker-Allowed "/"
</Files>
```

### Actualizar Service Worker

Cuando hagas cambios importantes:
1. Actualiza la versión en `sw.js`:
   ```javascript
   const CACHE_NAME = 'estatemap-v2'; // Cambiar versión
   ```

2. El service worker se actualizará automáticamente en la próxima visita

## 🎨 Personalización

### Cambiar colores del tema

En `manifest.json`:
```json
{
  "theme_color": "#TU_COLOR",
  "background_color": "#TU_COLOR"
}
```

En `index.html`:
```html
<meta name="theme-color" content="#TU_COLOR" />
```

### Modificar estrategia de cache

En `sw.js`, puedes ajustar:
- Qué recursos cachear
- Estrategias de cache (Network First, Cache First, etc.)
- Tiempo de vida del cache

## 📱 Pruebas en Dispositivos Reales

### Android
1. Conecta tu dispositivo
2. Chrome DevTools → More Tools → Remote Devices
3. Inspecciona tu sitio
4. Verifica PWA en Application tab

### iOS
1. Abre Safari en el dispositivo
2. Navega a tu sitio
3. Compartir → "Añadir a pantalla de inicio"
4. Prueba la app instalada

## ✅ Checklist de Verificación

- [ ] Iconos generados y colocados en `/public/`
- [ ] Build ejecutado sin errores
- [ ] Service Worker registrado correctamente (sin errores en consola)
- [ ] Manifest carga correctamente (verificar en DevTools)
- [ ] App se puede instalar (aparece prompt de instalación)
- [ ] App funciona offline (después de primera visita)
- [ ] Diseño responsive en todos los tamaños de pantalla
- [ ] Navegación funciona en móvil
- [ ] Mapa es interactivo en touch

## 🐛 Solución de Problemas

### Service Worker no se registra
- Verifica que estés en HTTPS o localhost
- Revisa la consola del navegador por errores
- Asegúrate que `sw.js` esté en `/public/`

### Iconos no aparecen
- Verifica que los nombres coincidan con manifest.json
- Asegúrate que sean PNG válidos
- Limpia cache del navegador

### App no se puede instalar
- Verifica que manifest.json esté accesible
- Asegúrate que todos los iconos estén disponibles
- Usa HTTPS (requerido para PWA)

### Cache no se actualiza
- Incrementa la versión en `sw.js`
- Force refresh (Ctrl+Shift+R o Cmd+Shift+R)
- Desregistra el SW en DevTools y recarga

## 📚 Recursos Adicionales

- [MDN Web Docs - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)

---

¡Tu aplicación EstateMap ahora está completamente adaptada para móviles y lista para ser una PWA! 🎉
