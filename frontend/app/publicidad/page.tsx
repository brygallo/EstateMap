import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Check, Megaphone, PenLine, Send, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  'Un artículo propio en el blog, con su URL permanente',
  'Redacción y edición a partir de lo que tu negocio hace de verdad',
  'Aviso de contenido publicitario antes del texto, con tu nombre',
  'Enlaces a tu sitio marcados como publicidad (rel="sponsored")',
  'Ficha de autor con tu marca, separada de la redacción',
  'Preguntas frecuentes al final, si el tema las pide',
];

const STEPS = [
  {
    n: 1,
    icon: Send,
    title: 'Nos cuentas qué haces',
    desc: 'Qué vendes, a quién le sirve y qué quieres que la persona pueda hacer después de leer.',
  },
  {
    n: 2,
    icon: PenLine,
    title: 'Escribimos un borrador',
    desc: 'Un artículo que enseñe algo por sí solo. Lo revisas, corriges los hechos y apruebas.',
  },
  {
    n: 3,
    icon: Megaphone,
    title: 'Se publica identificado',
    desc: 'Con el aviso de contenido publicitario arriba y tus enlaces marcados, desde el primer día.',
  },
];

const RULES = [
  {
    title: 'Siempre va identificado',
    desc: 'Cada artículo abre con un aviso que dice que es publicidad y quién lo paga. No hay versión discreta de esto.',
  },
  {
    title: 'Los enlaces van marcados',
    desc: 'Los enlaces a tu sitio llevan rel="sponsored". Es la regla de Google y también la nuestra: sin ella, el resto de enlaces del portal dejan de significar algo.',
  },
  {
    title: 'No toca las cifras',
    desc: 'Las estadísticas de precio por m² salen del inventario y de la metodología publicada. Ningún anunciante las cambia, las matiza ni aparece en ellas.',
  },
  {
    title: 'No prometemos resultados',
    desc: 'No vendemos posiciones en Google, ni tráfico garantizado, ni cantidad de clientes. Lo que se contrata es el espacio y el trabajo de redacción.',
  },
  {
    title: 'Nada que no se pueda sostener',
    desc: 'Sin cifras inventadas, sin testimonios que no existan, sin comparaciones con competidores que no podamos respaldar.',
  },
  {
    title: 'Se puede retirar',
    desc: 'Si algo del artículo deja de ser cierto —un precio, un servicio que ya no prestas—, se corrige o se despublica.',
  },
];

const NOT_ACCEPTED = [
  'Créditos, inversiones o rendimientos garantizados',
  'Promesas de retorno, plusvalía asegurada o "oportunidades" de inversión',
  'Contenido que compita con las cifras del portal presentándose como dato propio',
  'Cualquier afirmación que no se pueda comprobar',
];

export default function PublicidadPage() {
  return (
    <main className="bg-background">
      <section className="bg-primary text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">
              <Megaphone className="h-3.5 w-3.5" aria-hidden />
              Contenido publicitario
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
              Cuéntale a quien está comprando casa qué hace tu negocio
            </h1>
            <p className="mt-5 text-base leading-7 text-white/80 sm:text-lg">
              Un artículo propio en el blog, escrito para que enseñe algo por sí solo y
              siempre identificado como publicidad. Quien lo lee está tomando una decisión
              de vivienda: mudándose, vendiendo, arrendando o arreglando lo que compró.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-secondary text-white hover:bg-secondaryHover">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Conversar por WhatsApp
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/blog/quien-construyo-este-portal-aents">Ver un ejemplo publicado</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-textPrimary sm:text-3xl">Qué es exactamente</h2>
            <p className="mt-4 text-base leading-7 text-textSecondary">
              Un artículo del blog que presenta tu negocio, publicado bajo tu nombre y
              marcado como publicidad. No es un banner ni una mención suelta: es una pieza
              con URL propia que se queda publicada y que alguien puede encontrar meses
              después buscando el problema que tú resuelves.
            </p>
            <p className="mt-4 text-base leading-7 text-textSecondary">
              La condición es que enseñe algo. Un artículo que solo repite lo bueno que eres
              no lo lee nadie, y por lo tanto no le sirve a nadie —a ti tampoco—.
            </p>
            <div className="mt-6 rounded-card border border-line bg-white p-5 shadow-card">
              <p className="text-sm font-semibold text-textPrimary">A quién le llega</p>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Gente que entró al portal a buscar vivienda o a publicar la suya. Si tu
                negocio tiene que ver con mudarse, arreglar, financiar, amoblar, asesorar
                o construir, esa es tu audiencia. Si no tiene nada que ver, te lo diremos.
              </p>
            </div>
          </div>
          <Card className="rounded-card border-line p-6 shadow-card">
            <h3 className="text-lg font-bold text-textPrimary">Qué incluye</h3>
            <ul className="mt-5 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-6 text-textSecondary">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-success" strokeWidth={2} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-lg bg-background p-3 text-xs leading-5 text-textSecondary">
              El precio depende del trabajo de redacción y de si hay una campaña asociada.
              Se acuerda antes de escribir nada, por WhatsApp.
            </p>
          </Card>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-textPrimary sm:text-3xl">Cómo funciona</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-white">
                  <step.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-bold text-textPrimary">
                  {step.n}. {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-textSecondary">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden />
          <h2 className="text-2xl font-bold text-textPrimary sm:text-3xl">Lo que no se negocia</h2>
        </div>
        <p className="mt-3 max-w-3xl text-base leading-7 text-textSecondary">
          Este portal publica precios por metro cuadrado que la gente usa para decidir. El
          día en que un lector no pueda distinguir lo que medimos de lo que alguien compró,
          esas cifras dejan de valer. Por eso estas reglas van antes que cualquier acuerdo.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {RULES.map((rule) => (
            <Card key={rule.title} className="rounded-card border-line p-5 shadow-card">
              <h3 className="text-base font-bold text-textPrimary">{rule.title}</h3>
              <p className="mt-2 text-sm leading-6 text-textSecondary">{rule.desc}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-card border border-amber-400/60 bg-amber-50 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" strokeWidth={1.75} aria-hidden />
            <h3 className="text-base font-bold text-textPrimary">Lo que no publicamos</h3>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {NOT_ACCEPTED.map((item) => (
              <li key={item} className="text-sm leading-6 text-textSecondary">
                · {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-textPrimary sm:text-3xl">
            ¿Tu negocio tiene algo que enseñarle a quien busca casa?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-textSecondary">
            Escríbenos contando qué haces y a quién le sirve. Si el tema no encaja con lo
            que lee esta audiencia, te lo decimos antes de cobrar nada.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Conversar por WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/blog">Ver el blog</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
