import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  Home as HomeIcon,
  KeyRound,
  Trees,
  ArrowRight,
  Rocket,
  MessageCircle,
  MapPin,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import MapPageClient from '@/components/MapPageClient';
import {
  getProperties,
  getCities,
  jsonLd,
  SITE_URL,
  SITE_NAME,
} from '@/lib/properties';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Propiedades en Ecuador en mapa | Casas, terrenos y departamentos',
  description:
    'Busca propiedades en venta y alquiler en Ecuador con mapa interactivo. Encuentra casas, terrenos, departamentos y locales comerciales por ciudad, precio, área y ubicación.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `Propiedades en Ecuador en mapa | ${SITE_NAME}`,
    description:
      'Portal inmobiliario con mapa interactivo para encontrar casas, terrenos, departamentos y locales comerciales en Ecuador.',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'es_EC',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Mapa inmobiliario de propiedades en Ecuador',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Propiedades en Ecuador en mapa',
    description:
      'Encuentra propiedades en venta y alquiler en Ecuador con filtros por ubicación, precio, área y tipo.',
    images: [`${SITE_URL}/og-image.png`],
  },
};

// Landing pages that turn map filters into crawlable, indexable URLs.
const popularSearches = [
  { label: 'Casas en venta', href: '/casas-en-venta' },
  { label: 'Departamentos en alquiler', href: '/departamentos-en-alquiler' },
  { label: 'Terrenos en venta', href: '/terrenos-en-venta' },
  { label: 'Locales comerciales', href: '/locales-comerciales' },
];

export default async function HomePage() {
  const properties = await getProperties();
  const cities = getCities(properties).slice(0, 12);

  const homeStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: 'Propiedades en Ecuador en mapa',
        description:
          'Busca propiedades en venta y alquiler en Ecuador con mapa interactivo, filtros por ubicación, precio, área y tipo de inmueble.',
        inLanguage: 'es-EC',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@type': 'Thing', name: 'Bienes raíces en Ecuador' },
      },
      {
        '@type': 'ItemList',
        name: 'Búsquedas inmobiliarias populares',
        itemListElement: [
          ...popularSearches.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            url: `${SITE_URL}${item.href}`,
          })),
          ...cities.map((city, index) => ({
            '@type': 'ListItem',
            position: popularSearches.length + index + 1,
            name: `Propiedades en ${city.name}`,
            url: `${SITE_URL}/propiedades/${city.slug}`,
          })),
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: '¿Qué tipos de propiedades puedo buscar?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Puedes buscar casas, departamentos, terrenos y propiedades comerciales en venta o alquiler en Ecuador.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Puedo ver las propiedades en un mapa?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Sí. ${SITE_NAME} muestra las propiedades en un mapa interactivo para comparar ubicación, zona y cercanía.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(homeStructuredData) }}
      />
      <Suspense
        fallback={
          <div className="h-[calc(100vh-4.5rem)] w-full animate-pulse bg-muted" />
        }
      >
        <MapPageClient />
      </Suspense>
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-hero bg-gradient-to-br from-primary to-primaryHover px-6 py-10 text-white shadow-card sm:px-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  Para propietarios, agentes e inmobiliarias
                </span>
                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                  Publica tu propiedad gratis y recibe contactos directos
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/85 sm:text-base">
                  Tu anuncio aparece en el mapa con fotos, precio, medidas y botón de
                  WhatsApp. No cobramos por publicar ni comisión por la venta o alquiler.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="rounded-button bg-white font-bold text-primary shadow-card hover:bg-white/90"
                >
                  <Link href="/add-property">
                    <Rocket className="h-4 w-4" aria-hidden />
                    Publicar gratis
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-button border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <a
                    href="https://wa.me/593983738151?text=Hola%20quiero%20publicar%20una%20propiedad%20en%20Geo%20Propiedades"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Ayuda por WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Portal inmobiliario en Ecuador
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-textPrimary sm:text-4xl">
              Encuentra propiedades en venta y alquiler con mapa interactivo
            </h1>
            <p className="mt-4 text-base leading-7 text-textSecondary">
              {SITE_NAME} ayuda a buscar casas, departamentos, terrenos y locales
              comerciales por ubicación, precio, área, habitaciones y tipo de operación.
              Explora inmuebles en el mapa para entender mejor la zona antes de contactar
              o visitar.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Card className="rounded-card border-line p-6 shadow-card transition-shadow hover:shadow-cardHover">
              <span className="flex h-11 w-11 items-center justify-center rounded-button bg-primaryLight text-primary">
                <HomeIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-textPrimary">Compra y venta</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Filtra{' '}
                <Link href="/casas-en-venta" className="font-medium text-primary hover:underline">
                  casas en venta
                </Link>{' '}
                en Ecuador, compara precios y revisa ubicación exacta o área delimitada
                cuando el anunciante la publica.
              </p>
            </Card>
            <Card className="rounded-card border-line p-6 shadow-card transition-shadow hover:shadow-cardHover">
              <span className="flex h-11 w-11 items-center justify-center rounded-button bg-successBg text-success">
                <KeyRound className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-textPrimary">Alquileres</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Encuentra{' '}
                <Link href="/departamentos-en-alquiler" className="font-medium text-primary hover:underline">
                  departamentos en alquiler
                </Link>
                , casas y espacios comerciales usando filtros de precio, ciudad, área y
                características.
              </p>
            </Card>
            <Card className="rounded-card border-line p-6 shadow-card transition-shadow hover:shadow-cardHover">
              <span className="flex h-11 w-11 items-center justify-center rounded-button bg-warningBg text-warning">
                <Trees className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-textPrimary">Terrenos y lotes</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                Ubica{' '}
                <Link href="/terrenos-en-venta" className="font-medium text-primary hover:underline">
                  terrenos en venta
                </Link>{' '}
                y revisa su posición en el mapa para evaluar accesos, sectores cercanos y
                oportunidades de inversión.
              </p>
            </Card>
          </div>

          <div className="mt-14">
            <h2 className="text-xl font-bold text-textPrimary">Búsquedas populares</h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {popularSearches.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-textPrimary transition-colors hover:border-primary hover:bg-primaryLight hover:text-primary"
                >
                  {item.label}
                  <ArrowRight
                    className="h-3.5 w-3.5 -translate-x-0.5 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </div>

          {cities.length > 0 && (
            <div className="mt-14">
              <h2 className="text-xl font-bold text-textPrimary">
                Propiedades por ciudad
              </h2>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {cities.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/propiedades/${city.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-textPrimary transition-colors hover:border-primary hover:bg-primaryLight hover:text-primary"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
                    Propiedades en {city.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
