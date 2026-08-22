import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileText,
  Megaphone,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { buildWhatsAppUrl } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Publicar contenido publicitario en el blog',
  description:
    'Un artículo que presenta tu negocio ante quien está comprando, vendiendo o arrendando en Ecuador. Siempre identificado como publicidad, con enlaces marcados y sin tocar las cifras del portal.',
  alternates: { canonical: '/publicidad' },
};

const WHATSAPP_URL = buildWhatsAppUrl(
  'Hola, me interesa publicar un artículo publicitario en el blog de Geo Propiedades.'
);

// The page sells the format, not a price. Nothing here promises reach, ranking
// or results, because none of that can be guaranteed before the piece exists.
const INCLUDED = [
  'Un artículo propio con URL permanente',
  'Redacción y edición basada en hechos',
  'Aviso publicitario visible antes del texto',
  'Enlaces externos marcados como patrocinados',
  'Ficha de autor separada de la redacción',
  'Preguntas frecuentes cuando el tema las pide',
];

const STEPS = [
  {
    n: '01',
    icon: Send,
    title: 'Nos cuentas qué haces',
    desc: 'Qué vendes, a quién le sirve y qué debe poder hacer la persona después de leer.',
  },
  {
    n: '02',
    icon: PenLine,
    title: 'Escribimos un borrador',
    desc: 'Creamos una pieza que enseñe algo por sí sola. Tú corriges los hechos y apruebas.',
  },
  {
    n: '03',
    icon: Megaphone,
    title: 'Se publica identificado',
    desc: 'El aviso publicitario y los enlaces marcados aparecen desde el primer día.',
  },
];

const RULES = [
  {
    title: 'Siempre va identificado',
    desc: 'Cada artículo dice que es publicidad y quién lo paga. No hay una versión discreta.',
  },
  {
    title: 'Los enlaces van marcados',
    desc: 'Los enlaces a tu sitio llevan rel="sponsored" para preservar la transparencia del portal.',
  },
  {
    title: 'No toca las cifras',
    desc: 'Las estadísticas salen del inventario y de la metodología. Ningún anunciante las modifica.',
  },
  {
    title: 'No prometemos resultados',
    desc: 'No vendemos posiciones, tráfico garantizado ni clientes. Se contratan el espacio y la redacción.',
  },
  {
    title: 'Nada que no se sostenga',
    desc: 'Sin cifras inventadas, testimonios inexistentes ni comparaciones sin respaldo.',
  },
  {
    title: 'Se puede retirar',
    desc: 'Si un dato deja de ser cierto, se corrige o se despublica el artículo.',
  },
];

const NOT_ACCEPTED = [
  'Créditos, inversiones o rendimientos garantizados',
  'Plusvalía asegurada u “oportunidades” de inversión',
  'Contenido que compita con las cifras del portal',
  'Cualquier afirmación que no se pueda comprobar',
];

export default function PublicidadPage() {
  return (
    <main className="overflow-hidden bg-background">
      <section className="relative isolate bg-primary text-white">
        <div
          className="absolute inset-0 -z-10 opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 18%, rgba(255,255,255,.22), transparent 25%), radial-gradient(circle at 88% 72%, rgba(37,169,102,.55), transparent 31%)',
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur-sm">
              <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
              Publicidad que se reconoce como publicidad
            </span>
            <h1 className="mt-6 max-w-2xl text-pretty text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Convierte lo que sabes en un artículo que valga la pena leer
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-white/80 sm:text-lg">
              Presenta tu negocio mientras ayudas a quien está comprando, vendiendo,
              arrendando o mejorando una vivienda en Ecuador.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-h-12 bg-secondary px-6 text-white shadow-lg shadow-black/15 hover:bg-secondaryHover">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Cuéntanos sobre tu negocio
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12 border-white/30 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white">
                <Link href="/blog/quien-construyo-este-portal-aents">Ver un ejemplo real</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs leading-5 text-white/60">
              La conversación y el acuerdo ocurren por WhatsApp. No hay formulario ni pago en línea.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto">
            <div className="absolute -inset-6 -z-10 rotate-2 rounded-[2rem] border border-white/10 bg-white/5" aria-hidden="true" />
            <article className="overflow-hidden rounded-[1.5rem] border border-white/20 bg-white text-textPrimary shadow-2xl shadow-black/25">
              <div className="flex items-center justify-between border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary">
                <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Blog inmobiliario</span>
                <span>Ejemplo del formato</span>
              </div>
              <div className="p-6 sm:p-8">
                <div className="rounded-lg border border-secondary/25 bg-secondary/10 p-3">
                  <p className="text-xs font-bold text-primary">Contenido publicitario</p>
                  <p className="mt-1 text-xs leading-5 text-textSecondary">
                    Este artículo fue preparado con una marca anunciante y está claramente identificado.
                  </p>
                </div>
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Guía práctica</p>
                <h2 className="mt-3 text-pretty text-2xl font-bold leading-tight sm:text-3xl">
                  Lo que conviene revisar antes de elegir un servicio para tu nueva casa
                </h2>
                <p className="mt-4 text-sm leading-6 text-textSecondary">
                  Una pieza útil primero; tu negocio aparece dentro del contexto que realmente entiende.
                </p>
                <div className="mt-7 flex items-center gap-3 border-t border-line pt-5">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-white">M</div>
                  <div>
                    <p className="text-sm font-bold">Tu marca</p>
                    <p className="text-xs text-textSecondary">Autor comercial identificado</p>
                  </div>
                </div>
              </div>
            </article>
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-white shadow-xl sm:flex">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Transparente desde el título
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl divide-y divide-line px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          {[
            ['Audiencia', 'Personas tomando decisiones sobre vivienda'],
            ['Formato', 'Artículo útil con una URL propia'],
            ['Principio', 'La publicidad nunca se disfraza de dato'],
          ].map(([label, value]) => (
            <div key={label} className="py-6 sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">{label}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-textPrimary">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">El entregable</p>
            <h2 className="mt-3 text-pretty text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl">No es un banner. Es una pieza que explica.</h2>
            <p className="mt-5 text-base leading-7 text-textSecondary">
              El artículo presenta tu negocio bajo tu nombre y permanece separado de las cifras y de la voz editorial del portal.
            </p>
            <div className="mt-7 rounded-card border-l-4 border-secondary bg-white p-5 shadow-card">
              <p className="text-sm font-bold text-textPrimary">La prueba de relevancia</p>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Si tu negocio ayuda a mudarse, arreglar, financiar, amoblar, asesorar o construir, hay una conversación posible. Si no encaja, te lo decimos antes de cobrar.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-line bg-white p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primaryLight text-primary"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
              <h3 className="text-xl font-bold text-textPrimary">Todo lo que incluye</h3>
            </div>
            <ul className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-textPrimary">
                  <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-secondary text-white">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-line pt-6">
              <p className="text-sm leading-6 text-textSecondary">
                El precio depende del trabajo de redacción y de si existe una campaña asociada. Se acuerda antes de escribir, por WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Proceso editorial</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl">De la conversación a la publicación</h2>
          </div>
          <ol className="relative mt-12 grid gap-8 lg:grid-cols-3 lg:gap-0">
            <div className="absolute left-[16.7%] right-[16.7%] top-7 hidden border-t border-dashed border-primary/25 lg:block" aria-hidden="true" />
            {STEPS.map((step) => (
              <li key={step.n} className="relative lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <div className="flex items-center gap-4 lg:block">
                  <span className="relative z-10 grid h-14 w-14 flex-none place-items-center rounded-full border-4 border-white bg-primary text-white shadow-card">
                    <step.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold tracking-[0.18em] text-secondary lg:mt-6 lg:block">PASO {step.n}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-textPrimary">{step.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-textSecondary">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-16">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primaryLight text-primary"><ShieldCheck className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" /></span>
            <h2 className="mt-5 text-pretty text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl">La confianza no está en venta</h2>
            <p className="mt-5 text-base leading-7 text-textSecondary">
              El lector debe distinguir con claridad lo que medimos de lo que alguien contrató. Estas reglas van antes que cualquier acuerdo.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[1.5rem] border border-line bg-line sm:grid-cols-2">
            {RULES.map((rule, index) => (
              <article key={rule.title} className="bg-white p-6 sm:p-7">
                <span className="text-xs font-bold tabular-nums text-secondary">0{index + 1}</span>
                <h3 className="mt-3 text-base font-bold text-textPrimary">{rule.title}</h3>
                <p className="mt-2 text-sm leading-6 text-textSecondary">{rule.desc}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[1.25rem] border border-amber-300 bg-amber-50 p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[.6fr_1.4fr]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-700" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Límite editorial</p>
                <h3 className="mt-2 text-lg font-bold text-textPrimary">Lo que no publicamos</h3>
              </div>
            </div>
            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {NOT_ACCEPTED.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-textSecondary">
                  <span className="text-amber-700" aria-hidden="true">—</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-primary px-6 py-12 text-white shadow-xl sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14 lg:py-14">
          <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[48px] border-white/5" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">El siguiente paso es simple</p>
            <h2 className="mt-3 text-pretty text-3xl font-bold tracking-tight sm:text-4xl">¿Tu negocio tiene algo útil que contar?</h2>
            <p className="mt-4 text-base leading-7 text-white/75">Escríbenos qué haces y a quién ayudas. Si el tema no encaja, te lo decimos antes de cobrar.</p>
          </div>
          <div className="relative mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col">
            <Button asChild size="lg" className="min-h-12 bg-secondary px-6 text-white hover:bg-secondaryHover">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Conversar por WhatsApp <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-12 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/blog">Explorar el blog</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
