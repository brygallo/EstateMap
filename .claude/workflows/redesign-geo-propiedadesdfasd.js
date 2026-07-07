export const meta = {
  name: 'redesign-geo-propiedades',
  description: 'Rediseño completo de Geo Propiedades Ecuador: fundación shadcn/ui, rediseño de pantallas en paralelo y coordinación/verificación',
  phases: [
    { title: 'Fundación', detail: 'shadcn/ui + providers + todas las deps (1 agente opus)' },
    { title: 'Rediseño', detail: 'un agente por pantalla, en paralelo, modelo según complejidad' },
    { title: 'Coordinación', detail: 'build, integración, toast→Sonner, verificación SEO (1 agente opus)' },
  ],
}

const DESIGN_BRIEF = `
SISTEMA DE DISEÑO — Geo Propiedades Ecuador (ya implementado en tokens, NO lo cambies):
- Sensación objetivo: startup tecnológica (tipo Airbnb/Zillow/Booking), NO inmobiliaria tradicional. Limpio, mucho espacio en blanco, fotos grandes protagonistas, la interfaz nunca compite con las propiedades.
- Color (tokens de Tailwind ya definidos): primary #2563EB (hover primaryHover #1D4ED8, primaryLight #DBEAFE), CTA secondary=cyan #06B6D4, fondo background #F8FAFC (nunca blanco puro), surface #FFFFFF, textPrimary #111827, textSecondary #6B7280, line #E5E7EB, success #10B981, warning #F59E0B, error #DC2626. USA estos tokens (bg-primary, text-textSecondary, border-line, etc.), no hexes crudos.
- Tipografía: Geist (font-sans) para todo; font-geo (Geist Mono) solo para precios/cifras tabulares. Títulos bold, subtítulos medium, texto regular. Jamás mezclar tipografías.
- Radios: rounded-input/rounded-button=12px, rounded-card=18px, rounded-modal/rounded-sidebar=20px, rounded-hero=24px. Nunca esquinas cuadradas.
- Sombras: shadow-card (muy suave), shadow-cardHover (elevación ligera). Nunca sombras negras fuertes.
- Espaciado generoso: secciones amplias (py-16/py-24), gap-6 entre cards, padding interno 24-32px. Todo respira, nunca saturar.
- Iconos: SOLO lucide-react, mismo estilo siempre.
- Badges por operación: Venta=azul, Arriendo=verde, Proyecto=morado, Nuevo=naranja, Destacado=dorado, Verificada=verde con check (lucide CheckCircle).
- Grid de listados: 3-4 col desktop, 2 tablet, 1 móvil.
- Skeletons SIEMPRE mientras carga (cards, tablas, imágenes, formularios). Nunca pantallas vacías. Imágenes: skeleton -> fade-in.
- Animaciones (Motion, import desde 'motion/react'): 200-300ms, tipos fade/scale/slide/blur-fade, discretas, la UI debe sentirse rápida. Respetar prefers-reduced-motion.
- Microinteracciones: favorito=corazón se llena suave; compartir=rebote; guardar búsqueda=check animado; publicar=confetti pequeño (canvas-confetti); filtros=animar al aparecer (AnimatePresence); precio=contador animado; buscar=leve presión; cards=elevación al hover; sidebar=slide; modales=scale+fade.
- Componentes base: usa shadcn/ui desde '@/components/ui/*' (Button, Card, Input, Textarea, Select, Dialog, Sheet, Badge, Skeleton, Tabs, Tooltip, DropdownMenu, etc.). Toasts con Sonner (import { toast } from 'sonner').
`

const RULES = (files) => `
REGLAS ESTRICTAS:
- Edita ÚNICAMENTE estos archivos: ${files.join(', ')}.
- NO edites tailwind.config.js, app/globals.css, app/layout.tsx, package.json ni nada fuera de tu lista.
- NO ejecutes npm install, npm run build, ni el dev server. NO hagas git commit.
- NO toques components/maps/LeafletMap.tsx (tiene un refactor en curso del usuario).
- Preserva TODA la lógica existente: data fetching, SEO (metadata, JSON-LD, generateMetadata), rutas, props, auth. Solo rediseña la capa visual/UX y, cuando se indique, migra formularios/tablas.
- Los componentes de @/components/ui/* YA están instalados por la fase de fundación: impórtalos, no los crees.
- Devuelve un resumen corto (5-8 líneas) de qué archivos tocaste y qué cambiaste.
`

// ---------- Fase 1: Fundación ----------
phase('Fundación')
const foundation = await agent(`Eres el ingeniero de fundación del rediseño de un portal inmobiliario Next.js 14 (App Router) + Tailwind CSS v3.4 + TypeScript, en frontend/ del repo.

Ya están instalados: motion, sonner, class-variance-authority, clsx, tailwind-merge, tailwindcss-animate, lucide-react, react-leaflet. Los tokens de marca ya existen en tailwind.config.js y app/globals.css (NO los borres).

${DESIGN_BRIEF}

TU TRABAJO (déjalo 100% funcional para que otros agentes construyan encima):
1. Instala TODAS estas deps de una sola vez (para que nadie más tenga que instalar): react-hook-form @hookform/resolvers zod @tanstack/react-query @tanstack/react-table canvas-confetti @types/canvas-confetti cmdk react-day-picker date-fns @radix-ui/react-icons.
2. Configura shadcn/ui para Tailwind v3 SIN destruir los tokens existentes:
   - Crea components.json (aliases: components '@/components', utils '@/lib/utils', ui '@/components/ui'; tailwind config 'tailwind.config.js', css 'app/globals.css', baseColor 'slate', cssVariables true, rsc true, style 'new-york').
   - Crea lib/utils.ts con la función cn (clsx + tailwind-merge).
   - Añade las variables CSS de shadcn a app/globals.css (en @layer base :root y .dark) mapeando --primary al azul de marca (#2563EB / foreground blanco), --ring al azul, --radius: 0.75rem (12px). Reconcilia colisiones: en tailwind.config.js los tokens existentes primary/secondary/muted son strings; conviértelos a la forma que shadcn necesita SIN romper utilidades existentes (p.ej. primary como objeto {DEFAULT:'#2563EB', foreground:'#FFFFFF'} para que bg-primary y text-primary-foreground funcionen; conserva primaryHover y primaryLight; añade background/foreground, card/card-foreground, popover, muted/muted-foreground, accent, destructive, border, input, ring, y los keyframes/animation de shadcn). Verifica con grep que no rompes usos existentes de text-muted/bg-secondary; si los rompes, ajusta.
   - Añade el plugin tailwindcss-animate a tailwind.config.js.
3. Instala (con: npx shadcn@latest add --yes --overwrite) TODOS estos componentes: button card input textarea label select checkbox switch dialog drawer sheet popover dropdown-menu tooltip hover-card badge avatar skeleton tabs accordion separator scroll-area command sonner breadcrumb pagination navigation-menu table calendar form carousel alert-dialog.
4. Providers: crea components/providers/QueryProvider.tsx ('use client', QueryClientProvider con un QueryClient) y envuélvelo en app/layout.tsx alrededor de children (dentro de AuthProvider). Añade <Toaster richColors position="top-right" /> de sonner en app/layout.tsx y ELIMINA el <ToastContainer/> de react-toastify y su import/css. (Los call sites que aún importan de 'react-toastify' los migrará el coordinador; no los toques ahora.)
5. Crea un componente reutilizable components/ui/PropertyImage.tsx ('use client') que muestre un Skeleton mientras carga y haga fade-in de la imagen (next/image) al cargar (onLoad). Y components/ui/AnimatedNumber.tsx (contador animado con Motion) para precios.
6. Al final: corre 'npx tsc --noEmit' y arregla cualquier error que hayas introducido. NO corras next build (lento). NO hagas commit.

Devuelve un INVENTARIO claro: lista de componentes en components/ui/ disponibles, helpers creados (cn, PropertyImage, AnimatedNumber, QueryProvider), deps instaladas, y cualquier gotcha o colisión de tokens que resolviste. Este inventario lo usarán los agentes de pantallas.`, { model: 'opus', effort: 'high', label: 'foundation' })

log('Fundación lista. Lanzando rediseño de pantallas en paralelo...')

// ---------- Fase 2: Rediseño en paralelo ----------
phase('Rediseño')
const SCREENS = [
  {
    key: 'navbar-footer', model: 'sonnet', effort: 'medium',
    files: ['components/NavBar.tsx', 'components/Footer.tsx'],
    task: 'Rediseña la barra de navegación y el footer al nuevo look startup-tech. NavBar: limpia, sticky, con logo, navegación, botón CTA "Publicar gratis" (bg-primary, hover scale), menú de usuario con shadcn DropdownMenu/Avatar, versión móvil con shadcn Sheet (slide). Footer: minimalista, mucho espacio, pocas líneas divisorias. Conserva todos los links y la lógica de auth existente.',
  },
  {
    key: 'home-map', model: 'opus', effort: 'high',
    files: ['app/page.tsx', 'components/MapPageClient.tsx', 'components/map/MapFilters.tsx', 'components/map/PropertySidebar.tsx', 'components/map/UserFilter.tsx'],
    task: 'Rediseña la home (mapa interactivo + secciones SEO) y los paneles del mapa. CRÍTICO: preserva intactos el JSON-LD, la metadata, revalidate y todo el contenido SEO de app/page.tsx (solo mejora su presentación visual). Mapa moderno: MapFilters como panel limpio con shadcn (Select/Combobox, sliders), que animen al aparecer (AnimatePresence). PropertySidebar: lista de cards con hover que resalta (preparado para sync mapa<->card; añade clases/handlers si el sidebar ya recibe hover state, sin romper props). Sección hero/CTA para propietarios con rounded-hero y estética sobria. NO edites LeafletMap.tsx.',
  },
  {
    key: 'property-card', model: 'sonnet', effort: 'high',
    files: ['components/PropertyCard.tsx', 'components/SeoPropertyGrid.tsx'],
    task: 'Rediseña la card de propiedad y el grid. Card: foto grande (usa PropertyImage con skeleton->fade), precio en font-geo con AnimatedNumber, badges de operación por color (Venta azul/Arriendo verde/etc.), botón favorito (corazón que se llena suave con Motion), stat-tiles de m2/hab/baños con iconos lucide, elevación al hover (shadow-cardHover, -translate-y). Grid: responsive 3-4/2/1 columnas, gap-6. Skeletons de card para estados de carga.',
  },
  {
    key: 'property-detail', model: 'opus', effort: 'high',
    files: ['app/property/[id]/page.tsx', 'components/PropertyModal.tsx', 'components/ShareModal.tsx'],
    task: 'Rediseña el detalle de propiedad y sus modales. Detalle: carousel de fotos grande (shadcn Carousel), precio prominente (AnimatedNumber + font-geo), badges de estado, stat-tiles de características, descripción, mapa de ubicación, CTA de contacto en cyan (WhatsApp) con rebote. PropertyModal (se carga en el mapa): scale+fade al abrir, layout limpio. ShareModal: botones con micro-rebote, check animado al copiar. Preserva metadata/SEO del page y toda la lógica. Modales con shadcn Dialog (rounded-modal).',
  },
  {
    key: 'auth', model: 'sonnet', effort: 'medium',
    files: ['app/(auth)/login/page.tsx', 'app/(auth)/register/page.tsx', 'app/(auth)/forgot-password/page.tsx', 'app/(auth)/reset-password/page.tsx', 'app/(auth)/verify-email/page.tsx', 'app/(auth)/layout.tsx', 'components/GoogleSignInButton.tsx'],
    task: 'Rediseña las pantallas de autenticación: cards centradas limpias (rounded-card, shadow-card, mucho espacio), inputs shadcn con focus glow azul, botón primario con presión, GoogleSignInButton coherente. Layout de auth con fondo background (no blanco). Conserva TODA la lógica de auth, validación y llamadas existentes. Si usan formik/yup puedes mantenerlos aquí (no es obligatorio migrar auth a RHF), solo enfócate en el rediseño visual con componentes shadcn.',
  },
  {
    key: 'forms', model: 'opus', effort: 'high',
    files: ['app/add-property/page.tsx', 'app/edit-property/[id]/page.tsx', 'app/publicar-asistido/page.tsx', 'components/LeadForm.tsx', 'components/LocationSelect.tsx', 'components/RangeSlider.tsx'],
    task: 'Rediseña y MIGRA los formularios de Formik/Yup a React Hook Form + Zod usando el componente Form de shadcn. add-property y edit-property: formulario multi-sección limpio, inputs shadcn con validación en tiempo real, subida de imágenes con preview+skeleton, y al publicar con éxito lanzar confetti pequeño (canvas-confetti). LeadForm: compacto, validación en vivo, toast de Sonner al enviar. Reemplaza react-select por shadcn Select/Combobox en LocationSelect. CRÍTICO: preserva exactamente los mismos campos, endpoints y payloads que la API espera; no cambies contratos. Usa toast de sonner para feedback.',
  },
  {
    key: 'admin', model: 'opus', effort: 'high',
    files: ['app/admin/page.tsx', 'app/admin/users/page.tsx', 'app/admin/properties/page.tsx', 'app/admin/pending-publications/page.tsx', 'components/AdminSidebar.tsx', 'app/admin/layout.tsx'],
    task: 'Rediseña el dashboard admin: layout con AdminSidebar a la izquierda (slide, rounded-sidebar, iconos lucide) y contenido a la derecha. Dashboard (admin/page): cards KPI arriba (con AnimatedNumber), luego espacio para gráficos, luego tablas. Migra las tablas de users/properties/pending-publications a TanStack Table + shadcn Table (sorting, filtro, paginación con shadcn Pagination). Skeletons de tabla mientras carga. Confirmaciones con shadcn AlertDialog. Mucho espacio, sombras suaves. Preserva toda la lógica de datos, permisos y acciones existentes.',
  },
  {
    key: 'account-misc', model: 'sonnet', effort: 'medium',
    files: ['app/account/page.tsx', 'app/account/layout.tsx', 'app/my-properties/page.tsx', 'app/help/page.tsx', 'app/help/layout.tsx', 'app/inmobiliarias/page.tsx'],
    task: 'Rediseña las pantallas de cuenta, "mis propiedades", ayuda e inmobiliarias con el nuevo sistema: cards limpias, tabs shadcn donde aporten, skeletons de carga, mucho espacio, grids responsive de propiedades (reutiliza PropertyCard). Ayuda con Accordion shadcn para FAQs. Conserva SEO/metadata y lógica existente.',
  },
]

const results = await parallel(SCREENS.map((s) => () =>
  agent(`Eres un ingeniero frontend rediseñando UNA parte de un portal inmobiliario Next.js 14 App Router + Tailwind v3 + shadcn/ui + TypeScript (dir frontend/).

Contexto de la fundación (componentes/helpers ya disponibles):
${foundation}

${DESIGN_BRIEF}

TU PANTALLA: ${s.key}
${s.task}
${RULES(s.files)}`, { phase: 'Rediseño', model: s.model, effort: s.effort, label: s.key })
    .then((summary) => ({ key: s.key, files: s.files, summary }))
    .catch((e) => ({ key: s.key, files: s.files, summary: 'ERROR: ' + (e && e.message) }))
))

log('Pantallas listas. Coordinador integrando y verificando...')

// ---------- Fase 3: Coordinación / verificación ----------
phase('Coordinación')
const resultsText = results.filter(Boolean).map((r) => `### ${r.key} (${r.files.join(', ')})\n${r.summary}`).join('\n\n')

const report = await agent(`Eres el COORDINADOR técnico del rediseño de Geo Propiedades Ecuador (Next.js 14 App Router + Tailwind v3 + shadcn/ui + TypeScript, dir frontend/). Varios agentes rediseñaron pantallas en paralelo. Tu trabajo es integrar, arreglar y verificar que TODO quede bien.

Resumen de la fundación:
${foundation}

Resúmenes de los agentes de pantallas:
${resultsText}

${DESIGN_BRIEF}

HAZ ESTO EN ORDEN:
1. Migración global de toasts: reemplaza en TODO el código cualquier import y uso de 'react-toastify' por 'sonner' (import { toast } from 'sonner'; toast.success/error/info). Busca con grep todos los call sites y actualízalos. Asegura que ya no queda react-toastify en uso (el Toaster de sonner ya está en layout).
2. Corre 'npx tsc --noEmit' y arregla TODOS los errores de tipos/imports que hayan quedado (props cambiadas, imports faltantes, componentes ui mal referenciados, contratos rotos entre pantallas).
3. Corre 'npm run build' (next build). Arregla cualquier error de compilación hasta que el build pase. Presta atención a componentes client/server ('use client'), imports de sonner/motion, y RSC.
4. Consistencia de diseño: revisa rápidamente que las pantallas usen los tokens de marca (bg-primary azul, radios, sombras suaves, Geist), lucide para iconos, y skeletons de carga. Corrige inconsistencias evidentes.
5. Verificación CRÍTICA de no-regresión SEO: confirma que app/sitemap.ts, app/robots.ts, la metadata/generateMetadata y los JSON-LD de las páginas (home, property, landings) siguen intactos y presentes. Si algún agente los dañó, restáuralos.
6. NO hagas git commit.

Devuelve un REPORTE FINAL claro en español con: (a) estado del build (¿pasa sí/no?), (b) qué integraste/arreglaste, (c) migración de toasts hecha, (d) confirmación de SEO intacto, (e) lista de pantallas rediseñadas, (f) cualquier cosa que quede pendiente o que el usuario deba revisar manualmente, (g) archivos con cambios más significativos.`, { model: 'opus', effort: 'high', label: 'coordinator' })

return report