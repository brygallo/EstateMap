import type { Metadata } from 'next';
import Link from 'next/link';
import { Archive, ArrowRight, Check, Eye, MapPin, Phone, Plus, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { buildWhatsAppUrl } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Para inmobiliarias y corredores',
  description:
    'Publica tus propiedades en el mapa de Ecuador, recibe contactos directos por WhatsApp y gestiona tus leads desde un panel.',
  alternates: { canonical: '/inmobiliarias' },
};

const WHATSAPP_URL = buildWhatsAppUrl(
  'Hola, soy corredor/inmobiliaria y quiero publicar mis propiedades en Geo Propiedades.'
);

const BENEFITS = [
  {
    title: 'Tus propiedades en el mapa',
    desc: 'Cada inmueble se ubica con precisión en el mapa, con polígono del terreno, fotos y precio visible.',
    icon: MapPin,
  },
  {
    title: 'Contacto directo por WhatsApp',
    desc: 'Los interesados te escriben o llaman al instante desde la ficha, sin intermediarios.',
    icon: Phone,
  },
  {
    title: 'Sabes cuánta gente lo vio',
    desc: 'El informe de cada anuncio muestra cuántas personas lo abrieron y desde qué red llegaron. Los rastreadores no cuentan.',
    icon: Eye,
  },
  {
    title: 'Publicación asistida',
    desc: 'Sube fotos, dibuja el terreno y completa los datos con un flujo guiado de cinco pasos.',
    icon: Plus,
  },
  {
    title: 'Alcance SEO local',
    desc: 'Tus inmuebles aparecen en páginas por ciudad y tipo (casas en venta, terrenos, etc.).',
    icon: Search,
  },
  {
    title: 'Panel de gestión',
    desc: 'Administra tus publicaciones, edítalas cuando cambie el precio y revisa el rendimiento de cada una.',
    icon: Archive,
  },
];

const STEPS = [
  { n: 1, title: 'Crea tu cuenta', desc: 'Regístrate gratis como corredor o inmobiliaria.' },
  { n: 2, title: 'Publica tus inmuebles', desc: 'Fotos, ubicación en el mapa, precio y detalles.' },
  { n: 3, title: 'Recibe contactos', desc: 'Los interesados te escriben directo por WhatsApp o teléfono.' },
];

const PUBLISHING_OPTIONS = [
  {
    name: 'Publica por tu cuenta',
    price: 'Gratis',
    highlight: true,
    features: ['Sin límite de propiedades por plan', 'Contacto directo por WhatsApp', 'Ubicación en el mapa', 'Panel de contactos'],
    cta: 'Publicar mi primera propiedad',
    href: '/publicar-propiedad',
  },
  {
    name: 'Publicación asistida',
    price: 'Por WhatsApp',
    highlight: false,
    features: [
      'Te ayudamos a completar el borrador',
      'Revisión de datos y ubicación',
      'Continuación mediante enlace seguro',
      'Soporte directo por WhatsApp',
    ],
    cta: 'Pedir ayuda para publicar',
    href: '/publicar-asistido',
  },
];

export default function InmobiliariasPage() {
  return (
    <main className="overflow-hidden bg-background">
      <section className="relative isolate bg-primary text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_20%,rgba(37,169,102,.5),transparent_30%),radial-gradient(circle_at_8%_90%,rgba(255,255,255,.12),transparent_25%)]" aria-hidden="true" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div className="min-w-0">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              Para inmobiliarias y corredores
            </span>
            <h1 className="mt-6 max-w-2xl break-words text-pretty text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Tu inventario, ordenado en el mapa y listo para recibir contactos
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-white/80 sm:text-lg">
              Publica en el mapa, compara el rendimiento de cada inmueble y gestiona desde un
              solo panel los contactos directos que recibe tu equipo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-h-12 bg-secondary px-6 text-white shadow-lg shadow-black/15 hover:bg-secondaryHover">
                <Link href="/publicar-propiedad">Publicar una propiedad <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12 border-white/30 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Consultar por WhatsApp
                </a>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full min-w-0 max-w-lg lg:mx-0 lg:ml-auto">
            <div className="absolute -inset-5 -z-10 rotate-2 rounded-[2rem] border border-white/10 bg-white/5" aria-hidden="true" />
            <div className="overflow-hidden rounded-[1.5rem] border border-white/20 bg-white text-textPrimary shadow-2xl shadow-black/25">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-slate-50 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Panel de propiedades</p>
                <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-bold text-secondary">Vista del anunciante</span>
              </div>
              <div className="p-5 sm:p-7">
                <div className="rounded-card border border-line p-4 shadow-sm">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="grid h-16 w-20 flex-none place-items-center rounded-lg bg-primaryLight text-primary"><MapPin className="h-6 w-6" aria-hidden="true" /></div>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold">Casa con jardín en Cumbayá</p>
                      <p className="mt-1 text-xs text-textSecondary">Publicada · contacto directo</p>
                      <p className="mt-2 font-geo text-lg font-black text-primary">$185.000</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="min-w-0 rounded-xl bg-background p-4"><Eye className="h-4 w-4 text-secondary" aria-hidden="true" /><p className="mt-3 break-words text-xs font-bold">Actividad del anuncio</p><p className="mt-1 text-[11px] leading-4 text-textSecondary">Sin contar rastreadores</p></div>
                  <div className="min-w-0 rounded-xl bg-background p-4"><Phone className="h-4 w-4 text-secondary" aria-hidden="true" /><p className="mt-3 break-words text-xs font-bold">Contactos directos</p><p className="mt-1 text-[11px] leading-4 text-textSecondary">WhatsApp o llamada</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl divide-y divide-line px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          {[
            ['Publicación', 'Inventario profesional sin cupos artificiales'],
            ['Contacto', 'WhatsApp y llamada sin intermediarios'],
            ['Control', 'Cada anuncio conserva su propio informe'],
          ].map(([label, value]) => <div key={label} className="min-w-0 py-6 sm:px-6 sm:first:pl-0 sm:last:pr-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">{label}</p><p className="mt-2 break-words text-sm font-semibold leading-6 text-textPrimary">{value}</p></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Un lugar para operar</p>
          <h2 className="mt-3 text-pretty text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl">Del inventario al contacto, sin saltar entre herramientas</h2>
          <p className="mt-4 text-base leading-7 text-textSecondary">Cada función responde una pregunta concreta: qué está publicado, dónde aparece y qué actividad produjo.</p>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-[1.5rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <article key={b.title} className="min-w-0 bg-white p-6 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primaryLight text-primary">
                <b.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-5 break-words text-base font-bold text-textPrimary">{b.title}</h3>
              <p className="mt-2 break-words text-sm leading-6 text-textSecondary">{b.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Cómo funciona</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl">Publica y mantén el control</h2>
          <ol className="relative mt-12 grid gap-8 lg:grid-cols-3 lg:gap-0">
            <div className="absolute left-[16.7%] right-[16.7%] top-7 hidden border-t border-dashed border-primary/25 lg:block" aria-hidden="true" />
            {STEPS.map((s) => (
              <li key={s.n} className="relative min-w-0 lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-primary text-lg font-bold text-white shadow-card">
                  {s.n}
                </div>
                <h3 className="mt-5 break-words text-lg font-bold text-textPrimary">{s.title}</h3>
                <p className="mt-2 max-w-sm break-words text-sm leading-6 text-textSecondary">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Informe por anuncio: lo que el panel sí sabe responder */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Información accionable</p>
            <h2 className="mt-3 text-pretty text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl">
              Un panel para saber qué anuncio funciona
            </h2>
            <p className="mt-4 text-base leading-7 text-textSecondary">
              Cada publicación tiene su propio informe: cuánta gente la abrió, desde qué red
              llegó y cuántas veces se compartió. Los rastreadores y los robots de búsqueda no
              cuentan, así que el número que ves es de personas.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Visitantes reales por anuncio, sin robots',
                'De qué red llegó cada visita',
                'Cuántas veces se compartió el anuncio',
                'Edición rápida cuando cambia el precio',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-textPrimary">
                  <Check className="h-5 w-5 flex-shrink-0 text-success" strokeWidth={1.75} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <Card className="min-w-0 rounded-[1.5rem] border-line p-6 shadow-card sm:p-8">
            <p className="text-sm font-semibold text-textPrimary">
              Lo que responde el informe de cada anuncio
            </p>
            <div className="mt-4 space-y-2">
              {[
                { q: '¿Cuántas personas lo abrieron?', a: 'Visitantes únicos, sin contar robots' },
                { q: '¿Desde qué red llegaron?', a: 'WhatsApp, Facebook, búsqueda o directo' },
                { q: '¿Cuántas veces se compartió?', a: 'Desde el kit de promoción del anuncio' },
              ].map((row) => (
                <div key={row.q} className="min-w-0 rounded-xl bg-background p-4">
                  <p className="break-words text-sm font-semibold text-textPrimary">{row.q}</p>
                  <p className="mt-0.5 text-xs text-textSecondary">{row.a}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Opciones de publicación */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-secondary">Dos caminos reales</p>
          <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl">Elige cómo publicar</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-textSecondary">
            Usa el formulario gratis o pídenos ayuda para completar la publicación.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            {PUBLISHING_OPTIONS.map((plan) => (
              <Card
                key={plan.name}
                className={`min-w-0 rounded-[1.25rem] p-6 shadow-card sm:p-8 ${
                  plan.highlight ? 'border-primary ring-2 ring-primary' : 'border-line'
                }`}
              >
                {plan.highlight && <Badge className="bg-primary text-white hover:bg-primary">Disponible ahora</Badge>}
                <h3 className="mt-3 text-lg font-bold text-textPrimary">{plan.name}</h3>
                <p className="mt-1 text-2xl font-bold text-primary">{plan.price}</p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-textSecondary">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={plan.highlight ? 'default' : 'outline'}
                  className="mt-6 w-full"
                >
                  <Link href={plan.href} className="whitespace-normal text-center leading-5">
                    {plan.cta}
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-primary px-6 py-12 text-white shadow-xl sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14 lg:py-14">
          <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[48px] border-white/5" aria-hidden="true" />
          <div className="relative min-w-0 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Puedes empezar gratis</p>
            <h2 className="mt-3 break-words text-pretty text-3xl font-bold tracking-tight sm:text-4xl">Publica la primera propiedad de tu inventario</h2>
            <p className="mt-4 text-base leading-7 text-white/75">Completa la ficha por tu cuenta o pide ayuda para preparar el borrador.</p>
          </div>
          <div className="relative mt-8 flex min-w-0 flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col">
            <Button asChild size="lg" className="min-h-12 bg-secondary px-6 text-white hover:bg-secondaryHover">
              <Link href="/publicar-propiedad" className="whitespace-normal text-center leading-5">Publicar una propiedad <ArrowRight className="ml-2 h-4 w-4 flex-none" aria-hidden="true" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-12 border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Pedir ayuda por WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
