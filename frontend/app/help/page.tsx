'use client';

import Link from 'next/link';

const highlights = [
  {
    title: 'Crea predios fácil',
    desc: 'Dibuja el terreno, marca puntos y sube imágenes en la misma pantalla.',
    icon: (
      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4m-8 4v9m0-9L4 7m8 4 8-4" />
      </svg>
    ),
  },
  {
    title: 'Mapas listos',
    desc: 'Calles, Satélite y OSM con etiquetas de precio clicables y zoom inteligente.',
    icon: (
      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 2a9 9 0 0 1 9 9c0 6-9 11-9 11S3 17 3 11a9 9 0 0 1 9-9z" />
        <circle cx="12" cy="11" r="3" />
      </svg>
    ),
  },
  {
    title: 'Filtros que convierten',
    desc: 'Precio editable hasta 10M, área manual, tipo, estado, usuario y compartir búsqueda.',
    icon: (
      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h6" />
      </svg>
    ),
  },
  {
    title: 'Cuenta segura',
    desc: 'Cambio de correo con código, contraseña con validación y cierres de sesión seguros.',
    icon: (
      <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 1.75 19.25 5v6.5c0 4.1-3.1 7.9-7.25 8.75C7.85 19.4 4.75 15.6 4.75 11.5V5L12 1.75Z" />
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9.5 11.5 11 13l3.5-3.5" />
      </svg>
    ),
  },
];

const steps = [
  {
    title: 'Inicia sesión o regístrate',
    desc: 'Entra con tu correo y contraseña o crea tu cuenta desde el menú superior.',
    badge: 'Acceso',
  },
  {
    title: 'Dibuja y llena datos',
    desc: 'Elige la capa, dibuja el polígono o coloca el marcador y completa título, tipo, precio, áreas e imágenes.',
    badge: 'Ficha',
  },
  {
    title: 'Publica y comparte',
    desc: 'Guarda y usa “Compartir búsqueda” para enviar el enlace con filtros y vista actual.',
    badge: 'Difusión',
  },
];

const faqs = [
  {
    q: '¿Cómo creo un predio?',
    a: 'Ve a “Nueva Propiedad”, selecciona la capa, dibuja el polígono o marca el punto, completa los datos y sube hasta 10 imágenes.',
  },
  {
    q: '¿Puedo editar después?',
    a: 'Sí. En “Mis Propiedades” abre la propiedad y usa “Editar” para cambiar mapa, datos o imágenes.',
  },
  {
    q: '¿Cómo comparto resultados?',
    a: 'En el mapa principal presiona “Compartir Búsqueda”; se copia un enlace con filtros y vista actual para enviar a clientes.',
  },
  {
    q: '¿Dónde cambio mi correo o contraseña?',
    a: 'En “Mi cuenta”: solicita código para actualizar correo y cambia la contraseña validando la anterior.',
  },
  {
    q: '¿Qué filtros tengo?',
    a: 'Tipo, estado, usuario, precio editable hasta 10M y área editable. Las etiquetas de precio abren el detalle al clic.',
  },
  {
    q: '¿Cómo veo medidas y zonas?',
    a: 'Activa capas y usa polígonos con etiquetas de lado. El mapa centra la zona visible y muestra tu ubicación si la permites.',
  },
];

const propertyTypes = [
  { label: 'Casa', emoji: '🏠', desc: 'Viviendas listas para habitar o remodelar.' },
  { label: 'Apartamento', emoji: '🏢', desc: 'Departamentos en edificios y conjuntos.' },
  { label: 'Terreno', emoji: '🏞️', desc: 'Lotes y parcelas con o sin servicios.' },
  { label: 'Comercial', emoji: '🏪', desc: 'Locales, oficinas y bodegas para negocio.' },
  { label: 'Otro', emoji: '✨', desc: 'Propiedades especiales o mixtas.' },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/90 via-secondary/80 to-primary text-white">
      <div className="max-w-6xl mx-auto px-4 py-14 space-y-12">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
          <div className="lg:col-span-3 space-y-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide">
              Centro de ayuda · Geo Propiedades Ecuador
            </span>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              Todo en un solo lugar
              <span className="text-white/80 block">para publicar, medir y compartir propiedades gratis.</span>
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl">
              Geo Propiedades Ecuador conecta vendedores y compradores en un mismo mapa: carga tu inventario, mide terrenos, filtra por precio/área, comparte búsquedas y encuentra tu próximo inmueble sin costo de publicación.
            </p>
            <p className="text-sm md:text-base text-white/85 max-w-2xl">
              Nuestro objetivo: acelerar tus cierres mostrando información clara y visual. Llena tus predios, invita a tus clientes a explorar zonas y recibe consultas con contexto preciso.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/add-property"
                className="px-4 py-2 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-all shadow-lg shadow-black/10"
              >
                Crear propiedad
              </Link>
              <Link
                href="/account"
                className="px-4 py-2 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 transition-all"
              >
                Mi cuenta
              </Link>
              <Link
                href="/"
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all"
              >
                Ir al mapa
              </Link>
            </div>
          </div>
          <div className="lg:col-span-2 bg-white/10 border border-white/15 rounded-2xl p-5 backdrop-blur shadow-xl shadow-black/20">
            <p className="text-sm text-white/80 font-semibold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white/70" />
              Lo esencial de Geo Propiedades
            </p>
            <ul className="space-y-3 text-sm text-white/90">
              <li className="flex gap-2">
                <span className="text-white">✓</span>
                Capas Calles/Satélite/OSM con etiquetas de precio clicables y zoom automático.
              </li>
              <li className="flex gap-2">
                <span className="text-white">✓</span>
                Polígonos con medidas, rango de precio editable hasta 10M y área manual.
              </li>
              <li className="flex gap-2">
                <span className="text-white">✓</span>
                Comparte búsquedas y abre el mismo resultado en cualquier dispositivo.
              </li>
              <li className="flex gap-2">
                <span className="text-white">✓</span>
                Cambio de correo con código y contraseña validada para más seguridad.
              </li>
            </ul>
          </div>
        </section>

        {/* Highlights */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {highlights.map((item) => (
              <div key={item.title} className="bg-white/10 border border-white/15 rounded-2xl p-4 shadow-md shadow-black/10">
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-white/80 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Property types */}
        <section className="bg-white text-slate-900 rounded-3xl p-7 shadow-2xl shadow-black/10 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <p className="text-sm text-primary font-semibold">Tipos de propiedad</p>
              <h2 className="text-2xl font-bold">Publica todo tu inventario</h2>
              <p className="text-sm text-slate-600 mt-1">Selecciona el tipo correcto para filtrar mejor y mostrar etiquetas claras.</p>
            </div>
            <Link
              href="/add-property"
              className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
            >
              Añadir propiedad
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {propertyTypes.map((type) => (
              <div key={type.label} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2">
                <div className="text-2xl">{type.emoji}</div>
                <h3 className="text-base font-semibold text-slate-900">{type.label}</h3>
                <p className="text-sm text-slate-600">{type.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl shadow-black/10 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-primary font-semibold">Guía rápida</p>
              <h2 className="text-2xl font-bold">Publica una propiedad sin perderte</h2>
              <p className="text-sm text-slate-600 mt-1">Acceso, creación y publicación en tres pasos.</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/add-property"
                className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
              >
                Empezar ahora
              </Link>
              <Link
                href="/my-properties"
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-800 font-semibold hover:bg-slate-50 transition-colors"
              >
                Ver mis predios
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step, idx) => (
              <div key={step.title} className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wide mb-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {step.badge} · Paso {idx + 1}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="mb-5">
            <p className="text-sm text-white/80 font-semibold">Preguntas frecuentes</p>
            <h2 className="text-3xl font-bold">Resuelve rápido</h2>
            <p className="text-sm text-white/80 mt-1">Acceso, creación, filtros, mapas y seguridad en un vistazo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((item) => (
              <details key={item.q} className="bg-white/10 border border-white/15 rounded-2xl p-4">
                <summary className="cursor-pointer text-white font-semibold flex items-center justify-between">
                  <span>{item.q}</span>
                  <span className="text-white text-lg leading-none">+</span>
                </summary>
                <p className="text-sm text-white/85 mt-2">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl shadow-black/10 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary uppercase">¿Necesitas ayuda directa?</p>
              <h3 className="text-2xl font-bold">Comparte tu caso con enlace y captura</h3>
              <p className="text-sm text-slate-700 mt-1">
                Incluye el ID de propiedad o la URL de la búsqueda para responderte más rápido.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4v10l9 4 9-4V7" />
                </svg>
                Abrir mapa
              </Link>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-800 font-semibold hover:bg-slate-50 transition-colors shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="8" r="4" />
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6" />
                </svg>
                Ajustar mi cuenta
              </Link>
              <Link
                href="https://wa.me/593983738151"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M16 3C9.4 3 4 8.4 4 15c0 2.2.6 4.2 1.7 6.1L4 29l8-1.6c1.8 1 3.8 1.5 6 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.4c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.7.9.9-4.6-.3-.5C6 17.4 5.6 16.2 5.6 15 5.6 9.9 10 5.6 16 5.6S26.4 9.9 26.4 15 22 24.4 16 24.4zm5.1-7.9c-.3-.1-1.9-.9-2.2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.1-.3.2-.6.1-.3-.1-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.8-2.1-.2-.3 0-.4.1-.5.1-.1.3-.3.4-.4.1-.1.1-.2.2-.3.1-.1.1-.2.2-.3.1-.1.1-.2.1-.3 0-.1 0-.2 0-.3 0-.1-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.3 0-.5.2-.2.3-.7.7-.7 1.8s.7 2.1.8 2.3c.1.2 1.4 2.2 3.4 3.1 2 .9 2 .6 2.4.6.4 0 1.2-.5 1.3-1 .1-.5.1-.9.1-1 0-.1-.1-.1-.2-.1z" />
                </svg>
                WhatsApp soporte
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
