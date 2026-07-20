'use client';

import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { WHATSAPP_NUMBER } from '@/lib/constants';
import { HELP_FAQS } from '@/lib/help-faqs';

function Icon({ path, className = 'h-5 w-5' }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  ruler: 'M3 7l4-4m0 0l4 4M7 3v12m10 6l-4-4m0 0l-4 4m4-4V9',
  photo: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  link: 'M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m6.328-2.828a4 4 0 015.656 0 4 4 0 010 5.656l-1.5 1.5',
  check: 'M5 13l4 4L19 7',
  building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-14h2m-2 4h2m-2 4h2m4-8h2m-2 4h2m-2 4h2',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  pin: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  pencil: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  gift: 'M12 8v13m0-13a4 4 0 10-4-4c1.5 0 3 1.5 4 4zm0 0a4 4 0 114-4c-1.5 0-3 1.5-4 4zM5 8h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1zm1 4v8a1 1 0 001 1h10a1 1 0 001-1v-8',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a13.5 13.5 0 000 18M12 3a13.5 13.5 0 010 18',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

const TRUST = [
  { icon: ICONS.gift, label: '100% gratis' },
  { icon: ICONS.check, label: 'Sin comisiones' },
  { icon: ICONS.clock, label: 'Listo en minutos' },
  { icon: ICONS.globe, label: 'Todo Ecuador' },
];

const FEATURES = [
  {
    icon: ICONS.pin,
    title: 'Ubicación real, no “por el sector”',
    desc: 'Tu propiedad aparece en su punto exacto del mapa, con marcador o con el contorno del terreno dibujado. Nadie se pierde buscándola.',
  },
  {
    icon: ICONS.ruler,
    title: 'Dibuja los límites del terreno',
    desc: 'Marca el contorno del predio en el mapa para mostrar su forma. Puedes anotar la medida de cada lado y los interesados ven los linderos sin adivinar.',
  },
  {
    icon: ICONS.photo,
    title: 'Hasta 10 fotos optimizadas',
    desc: 'Sube tus mejores tomas. Las comprimimos para que carguen rápido, incluso con datos móviles, sin perder calidad.',
  },
  {
    icon: ICONS.filter,
    title: 'Filtros que encuentran lo justo',
    desc: 'Tipo, precio, zona y área. Cada persona llega a lo que busca en segundos, sin desplazarse por listas eternas.',
  },
  {
    icon: ICONS.link,
    title: 'Enlaces que comparten el resultado',
    desc: 'Aplica filtros en el mapa y copia el enlace. Quien lo abra verá exactamente lo mismo que tú, sin explicaciones.',
  },
  {
    icon: ICONS.user,
    title: 'Contacto directo, sin intermediarios',
    desc: 'La ficha muestra tu teléfono. Los interesados te llaman o te escriben por WhatsApp al instante. Tú cierras el trato.',
  },
];

const AUDIENCES = [
  {
    icon: ICONS.user,
    title: 'Propietarios directos',
    desc: 'Publica sin pagar comisiones y llega a compradores reales compartiendo un solo enlace.',
  },
  {
    icon: ICONS.building,
    title: 'Agentes e inmobiliarias',
    desc: 'Reúne todo tu inventario en un mapa y compártelo con tus clientes en un clic.',
  },
  {
    icon: ICONS.ruler,
    title: 'Vendedores de terrenos',
    desc: 'Dibuja los linderos y muestra la forma y la superficie exactas del predio.',
  },
  {
    icon: ICONS.search,
    title: 'Compradores',
    desc: 'Explora por zona, compara ubicaciones y contacta antes de perder un viaje.',
  },
];

const STEPS = [
  {
    n: 1,
    icon: ICONS.pin,
    title: 'Ubica en el mapa',
    desc: 'Marca un punto o dibuja el terreno. La ciudad y la provincia se completan solas.',
  },
  {
    n: 2,
    icon: ICONS.pencil,
    title: 'Completa lo básico',
    desc: 'Título, precio y fotos. El resto de los detalles es opcional: agrégalos cuando quieras.',
  },
  {
    n: 3,
    icon: ICONS.bolt,
    title: 'Publica y comparte',
    desc: 'Crea tu cuenta gratis al guardar y tu anuncio aparece en el mapa al instante.',
  },
];

const FAQS = HELP_FAQS;

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background text-textPrimary">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2D3C67] via-primary to-[#688CCA] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)',
            backgroundSize: '34px 34px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
            <Icon path={ICONS.map} className="h-4 w-4" />
            Centro de ayuda
          </span>
          <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            Tu propiedad en el mapa,
            <br className="hidden sm:block" />
            <span className="text-white/85"> no perdida en una lista</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">
            Publica terrenos, casas, departamentos y locales con ubicación exacta, fotos y medidas
            reales. Gratis, sin intermediarios y visible para todo Ecuador.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/publicar-propiedad"
              className="inline-flex items-center justify-center gap-2 rounded-button bg-white px-5 py-3 text-base font-semibold text-primary shadow-cardHover transition hover:bg-white/90 hover:scale-[1.02]"
            >
              <Icon path={ICONS.bolt} className="h-5 w-5" />
              Publicar gratis
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-button border border-white/40 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              <Icon path={ICONS.search} className="h-5 w-5" />
              Explorar el mapa
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            {TRUST.map((t) => (
              <div key={t.label} className="flex items-center gap-2 text-sm font-medium text-white/90">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                  <Icon path={t.icon} className="h-4 w-4" />
                </span>
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-20 px-4 py-16 md:py-20">
        {/* Qué ofrece */}
        <section>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Todo lo que necesitas para vender o arrendar
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              El mapa es la diferencia: quien busca no solo ve tu propiedad, entiende dónde está y
              cómo llegar.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="card card-hover p-5">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                  <Icon path={f.icon} />
                </div>
                <h3 className="font-semibold leading-snug">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo publicar */}
        <section>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Publica en 3 pasos</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Sin trámites ni letras chiquitas. La mayoría termina en menos de lo que toma un café.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card relative overflow-hidden p-6">
                <span className="pointer-events-none absolute -right-2 -top-3 select-none font-geo text-7xl font-bold text-primary/[0.07]">
                  {s.n}
                </span>
                <div className="relative">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-card">
                    <Icon path={s.icon} />
                  </div>
                  <h3 className="font-semibold">
                    <span className="mr-2 font-geo text-primary">{s.n}.</span>
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/publicar-propiedad" className="btn btn-md btn-primary">
              <Icon path={ICONS.bolt} className="h-4 w-4" />
              Empezar a publicar
            </Link>
          </div>
        </section>

        {/* Para quién sirve */}
        <section>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Hecho para quien vende y para quien busca
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {AUDIENCES.map((a, i) => (
              <div key={i} className="flex gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
                <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primaryLight text-primary">
                  <Icon path={a.icon} />
                </div>
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compartir un mapa filtrado */}
        <section className="overflow-hidden rounded-card border border-primary/15 bg-gradient-to-br from-primaryLight/60 to-surface p-6 shadow-card md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-card">
              <Icon path={ICONS.link} className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                Comparte exactamente lo que quieres que vean
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Aplica los filtros que quieras en el mapa —zona, tipo, precio, área— y copia el
                enlace del navegador. La persona que lo abra verá el mismo resultado, sin que tengas
                que explicarle nada.
              </p>
            </div>
            <Link href="/" className="btn btn-md btn-secondary flex-shrink-0">
              Ir al mapa
            </Link>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Preguntas frecuentes</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Lo que más nos preguntan antes de publicar la primera propiedad.
            </p>
          </div>
          <Accordion type="single" collapsible className="card mt-8 max-w-3xl divide-y divide-line px-5">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-line last:border-b-0">
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary to-[#2D3C67] p-8 text-white shadow-cardHover md:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                ¿Listo para publicar tu propiedad?
              </h2>
              <p className="mt-2 text-white/85 leading-relaxed">
                Es gratis y toma unos minutos. Si prefieres, te ayudamos por WhatsApp paso a paso.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/publicar-propiedad"
                className="inline-flex items-center justify-center gap-2 rounded-button bg-white px-5 py-3 font-semibold text-primary transition hover:bg-white/90 hover:scale-[1.02]"
              >
                <Icon path={ICONS.bolt} className="h-5 w-5" />
                Publicar gratis
              </Link>
              <Link
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 rounded-button border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                <svg className="h-5 w-5" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M16 3C9.4 3 4 8.4 4 15c0 2.2.6 4.2 1.7 6.1L4 29l8-1.6c1.8 1 3.8 1.5 6 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.4c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.7.9.9-4.6-.3-.5C6 17.4 5.6 16.2 5.6 15 5.6 9.9 10 5.6 16 5.6S26.4 9.9 26.4 15 22 24.4 16 24.4zm5.1-7.9c-.3-.1-1.9-.9-2.2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.1-.3.2-.6.1-.3-.1-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.8-2.1-.2-.3 0-.4.1-.5.1-.1.3-.3.4-.4.1-.1.1-.2.2-.3.1-.1.1-.2.2-.3.1-.1.1-.2.1-.3 0-.1 0-.2 0-.3 0-.1-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.3 0-.5.2-.2.3-.7.7-.7 1.8s.7 2.1.8 2.3c.1.2 1.4 2.2 3.4 3.1 2 .9 2 .6 2.4.6.4 0 1.2-.5 1.3-1 .1-.5.1-.9.1-1 0-.1-.1-.1-.2-.1z" />
                </svg>
                Ayuda por WhatsApp
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-line pt-6 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-textPrimary">Geo Propiedades Ecuador</span> — la
            plataforma para publicar y explorar propiedades en un mapa interactivo.
          </p>
        </footer>
      </div>
    </div>
  );
}
