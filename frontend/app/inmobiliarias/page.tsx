import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Para inmobiliarias y corredores | Geo Propiedades Ecuador',
  description:
    'Publica tus propiedades en el mapa de Ecuador, recibe contactos directos por WhatsApp y gestiona tus leads desde un panel. Planes para inmobiliarias y corredores independientes.',
  alternates: { canonical: '/inmobiliarias' },
};

// Número de contacto comercial (configurable por entorno).
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '593999999999';
const WHATSAPP_TEXT = encodeURIComponent(
  'Hola, soy corredor/inmobiliaria y quiero publicar mis propiedades en Geo Propiedades.'
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_TEXT}`;

const BENEFITS = [
  {
    title: 'Tus propiedades en el mapa',
    desc: 'Cada inmueble se ubica con precisión en el mapa, con polígono del terreno, fotos y precio visible.',
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    title: 'Contacto directo por WhatsApp',
    desc: 'Los interesados te escriben o llaman al instante desde la ficha, sin intermediarios.',
    icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  },
  {
    title: 'Leads que sí puedes medir',
    desc: 'Cada contacto queda registrado: nombre, teléfono, mensaje y propiedad de interés.',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    title: 'Publicación asistida',
    desc: 'Sube fotos, dibuja el terreno y completa los datos con un flujo guiado, en minutos.',
    icon: 'M12 4v16m8-8H4',
  },
  {
    title: 'Alcance SEO local',
    desc: 'Tus inmuebles aparecen en páginas por ciudad y tipo (casas en venta, terrenos, etc.).',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  {
    title: 'Panel de gestión',
    desc: 'Administra tus publicaciones, revisa vistas y da seguimiento a los contactos recibidos.',
    icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v2H4V6zM4 10h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8z',
  },
];

const STEPS = [
  { n: 1, title: 'Crea tu cuenta', desc: 'Regístrate gratis como corredor o inmobiliaria.' },
  { n: 2, title: 'Publica tus inmuebles', desc: 'Fotos, ubicación en el mapa, precio y detalles.' },
  { n: 3, title: 'Recibe contactos', desc: 'Los interesados te escriben directo por WhatsApp o teléfono.' },
];

const PLANS = [
  {
    name: 'Corredor',
    price: 'Gratis',
    highlight: false,
    features: ['Hasta 5 propiedades', 'Contacto por WhatsApp', 'Ubicación en el mapa', 'Leads básicos'],
    cta: 'Empezar gratis',
    href: '/register',
  },
  {
    name: 'Inmobiliaria',
    price: '$29/mes',
    highlight: true,
    features: [
      'Propiedades ilimitadas',
      'Panel de gestión de leads',
      'Métricas de vistas y contactos',
      'Prioridad en el mapa y SEO',
      'Soporte por WhatsApp',
    ],
    cta: 'Hablar con ventas',
    href: WHATSAPP_URL,
  },
  {
    name: 'Empresa',
    price: 'A medida',
    highlight: false,
    features: ['Todo lo de Inmobiliaria', 'Varios usuarios/agentes', 'Marca destacada', 'Integraciones a medida'],
    cta: 'Contactar',
    href: WHATSAPP_URL,
  },
];

function Icon({ d, className = 'h-6 w-6' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {d.split(' M').map((seg, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}

export default function InmobiliariasPage() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">
              Para inmobiliarias y corredores
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
              Publica tus propiedades donde los compradores las buscan: en el mapa
            </h1>
            <p className="mt-5 text-base leading-7 text-white/80 sm:text-lg">
              Geo Propiedades conecta tus inmuebles con interesados de todo Ecuador. Ubicación
              exacta, contacto directo por WhatsApp y un panel para no perder ningún lead.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-white hover:bg-secondaryHover"
              >
                Publicar mis propiedades
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Hablar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-textPrimary sm:text-3xl">
          Todo lo que necesitas para vender más rápido
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-card border border-line bg-white p-6 shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon d={b.icon} />
              </div>
              <h3 className="mt-4 text-base font-bold text-textPrimary">{b.title}</h3>
              <p className="mt-2 text-sm leading-6 text-textSecondary">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-textPrimary sm:text-3xl">
            Publicar es simple
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 text-base font-bold text-textPrimary">{s.title}</h3>
                <p className="mt-2 text-sm text-textSecondary">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/publicar-asistido"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primaryHover"
            >
              Publicación asistida
            </Link>
          </div>
        </div>
      </section>

      {/* Panel de gestión + leads */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-textPrimary sm:text-3xl">
              Un panel para gestionar tus contactos
            </h2>
            <p className="mt-4 text-base leading-7 text-textSecondary">
              Cada vez que alguien se interesa en una propiedad, su contacto queda registrado.
              Da seguimiento, marca el estado (nuevo, contactado, cerrado) y mide qué inmuebles
              generan más interés.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Bandeja de leads por propiedad',
                'Estado de cada contacto',
                'Métricas de vistas y contactos',
                'Nombre, teléfono y mensaje del interesado',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-textPrimary">
                  <svg className="h-5 w-5 flex-shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-line bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-textPrimary">Contactos recientes</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">12 nuevos</span>
            </div>
            <div className="space-y-2">
              {[
                { name: 'María López', prop: 'Casa en Macas', tag: 'Nuevo' },
                { name: 'Jorge Vera', prop: 'Terreno en Puyo', tag: 'Contactado' },
                { name: 'Ana Ruiz', prop: 'Departamento en Cuenca', tag: 'Nuevo' },
              ].map((l) => (
                <div key={l.name} className="flex items-center justify-between rounded-lg bg-background p-3">
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">{l.name}</p>
                    <p className="text-xs text-textSecondary">{l.prop}</p>
                  </div>
                  <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-medium text-secondaryHover">
                    {l.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Planes */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-textPrimary sm:text-3xl">Planes</h2>
          <p className="mt-2 text-center text-sm text-textSecondary">
            Empieza gratis y escala cuando lo necesites.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-card border bg-white p-6 shadow-card ${
                  plan.highlight ? 'border-primary ring-2 ring-primary' : 'border-line'
                }`}
              >
                {plan.highlight && (
                  <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                    Más popular
                  </span>
                )}
                <h3 className="mt-3 text-lg font-bold text-textPrimary">{plan.name}</h3>
                <p className="mt-1 text-2xl font-bold text-primary">{plan.price}</p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-textSecondary">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  target={plan.href.startsWith('http') ? '_blank' : undefined}
                  rel={plan.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className={`mt-6 block rounded-lg px-5 py-2.5 text-center text-sm font-semibold ${
                    plan.highlight
                      ? 'bg-primary text-white hover:bg-primaryHover'
                      : 'border border-line text-textPrimary hover:bg-background'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">¿Listo para captar más clientes?</h2>
          <p className="mt-3 text-white/80">
            Publica tus propiedades hoy y empieza a recibir contactos directos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-white hover:bg-secondaryHover"
            >
              Crear cuenta gratis
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
