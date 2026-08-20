import type { Metadata } from 'next';
import Link from 'next/link';
import { Archive, Check, Mail, MapPin, Phone, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { buildWhatsAppUrl } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Para inmobiliarias y corredores',
  description:
    'Publica tus propiedades en el mapa de Ecuador, recibe contactos directos por WhatsApp y gestiona tus leads desde un panel. Planes para inmobiliarias y corredores independientes.',
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
    title: 'Leads que sí puedes medir',
    desc: 'Cada contacto queda registrado: nombre, teléfono, mensaje y propiedad de interés.',
    icon: Mail,
  },
  {
    title: 'Publicación asistida',
    desc: 'Sube fotos, dibuja el terreno y completa los datos con un flujo guiado, en minutos.',
    icon: Plus,
  },
  {
    title: 'Alcance SEO local',
    desc: 'Tus inmuebles aparecen en páginas por ciudad y tipo (casas en venta, terrenos, etc.).',
    icon: Search,
  },
  {
    title: 'Panel de gestión',
    desc: 'Administra tus publicaciones, revisa vistas y da seguimiento a los contactos recibidos.',
    icon: Archive,
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
    href: '/registro',
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
              Centraliza tu inventario, mide qué propiedades generan intención y asigna contactos a tus agentes
            </h1>
            <p className="mt-5 text-base leading-7 text-white/80 sm:text-lg">
              Publica en el mapa, compara el rendimiento de cada inmueble y gestiona desde un
              solo panel los contactos directos que recibe tu equipo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-secondary text-white hover:bg-secondaryHover">
                <Link href="/registro">Publicar mis propiedades</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Hablar por WhatsApp
                </a>
              </Button>
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
            <Card key={b.title} className="rounded-card border-line p-6 shadow-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-4 text-base font-bold text-textPrimary">{b.title}</h3>
              <p className="mt-2 text-sm leading-6 text-textSecondary">{b.desc}</p>
            </Card>
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
            <Button asChild size="lg">
              <Link href="/publicar-asistido">Publicación asistida</Link>
            </Button>
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
                  <Check className="h-5 w-5 flex-shrink-0 text-success" strokeWidth={1.75} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <Card className="rounded-card border-line p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-textPrimary">Contactos recientes</span>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">12 nuevos</Badge>
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
                  <Badge className="bg-secondary/15 text-secondaryHover hover:bg-secondary/15">{l.tag}</Badge>
                </div>
              ))}
            </div>
          </Card>
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
              <Card
                key={plan.name}
                className={`rounded-card p-6 shadow-card ${
                  plan.highlight ? 'border-primary ring-2 ring-primary' : 'border-line'
                }`}
              >
                {plan.highlight && <Badge className="bg-primary text-white hover:bg-primary">Más popular</Badge>}
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
                  <a
                    href={plan.href}
                    target={plan.href.startsWith('http') ? '_blank' : undefined}
                    rel={plan.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {plan.cta}
                  </a>
                </Button>
              </Card>
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
            <Button asChild size="lg" className="bg-secondary text-white hover:bg-secondaryHover">
              <Link href="/registro">Crear cuenta gratis</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Escríbenos por WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
