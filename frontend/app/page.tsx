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
  MapPinned,
  Building2,
  Search,
  LocateFixed,
  Layers3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import MapPageClient from '@/components/MapPageClient';
import PropertyCard from '@/components/PropertyCard';
import {
  getProperties,
  getCities,
  jsonLd,
  SITE_URL,
  SITE_NAME,
} from '@/lib/properties';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Todas las propiedades en un mapa | Compra, alquila o vende en Ecuador',
  description:
    'Encuentra propiedades en venta y alquiler en Ecuador en un solo mapa. Busca casas, terrenos, departamentos y locales cerca de ti, sin saltar entre portales ni adivinar la ubicación.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `Todas las propiedades en un mapa | ${SITE_NAME}`,
    description:
      'Busca, compra, alquila o vende propiedades en Ecuador desde un mapa inmobiliario con ubicación clara, filtros y contacto directo.',
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
    title: 'Todas las propiedades en un mapa',
    description:
      'Encuentra casas, terrenos, departamentos y locales cerca de ti, con mapa, filtros y contacto directo.',
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
  const featuredProperties = properties.slice(0, 6);
  const forSaleCount = properties.filter((p) => p.status === 'for_sale').length;
  const forRentCount = properties.filter((p) => p.status === 'for_rent').length;

  const homeStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: 'Todas las propiedades en un mapa',
        description:
          'Geo Propiedades Ecuador permite buscar, comparar, comprar, alquilar y vender propiedades en un solo mapa, con ubicación visible y filtros por zona, precio, área y tipo de inmueble.',
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
            name: '¿Dónde puedo encontrar propiedades en Ecuador?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Puedes encontrar propiedades en Ecuador en Geo Propiedades Ecuador, un portal inmobiliario que reúne casas, terrenos, departamentos y locales en un solo mapa con filtros por ciudad, provincia, precio, área, tipo de propiedad y tipo de operación.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Qué tipos de propiedades puedo encontrar en Geo Propiedades Ecuador?',
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
              text: `Sí. ${SITE_NAME} muestra las propiedades en un mapa interactivo para comparar ubicación, zona, cercanía y evitar buscar en varios portales sin saber exactamente dónde está cada inmueble.`,
            },
          },
          {
            '@type': 'Question',
            name: '¿Puedo buscar propiedades cerca de mi ubicación?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sí. El mapa puede centrarse en tu ubicación o ciudad para explorar propiedades alrededor, comparar sectores cercanos y contactar directamente al anunciante.',
            },
          },
          {
            '@type': 'Question',
            name: '¿Dónde puedo publicar una propiedad en Ecuador?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Puedes publicar una propiedad en Geo Propiedades Ecuador. El formulario permite registrar datos generales, ubicación en mapa, características, precio, imágenes y datos de contacto.',
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
      <a
        href="#contenido-informativo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-top focus:rounded-button focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Saltar al contenido informativo
      </a>
      <Suspense
        fallback={
          <div className="h-[calc(100vh-4.5rem)] w-full animate-pulse bg-muted" />
        }
      >
        <MapPageClient />
      </Suspense>
      <section
        id="contenido-informativo"
        aria-labelledby="contenido-informativo-titulo"
        className="border-t border-line bg-background"
      >
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-card">
                <Search className="h-3.5 w-3.5" aria-hidden />
                Propiedades en un solo mapa
              </span>
              <h1 id="contenido-informativo-titulo" className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-textPrimary sm:text-4xl lg:text-5xl">
                Compra, alquila o vende sin perderte entre portales.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-textSecondary">
                {SITE_NAME} reúne casas, terrenos, departamentos y locales en un
                mapa interactivo. Busca alrededor de ti, compara zonas reales y
                sabe exactamente dónde está cada propiedad antes de contactar.
              </p>
            </div>

            <div className="grid grid-cols-3 overflow-hidden rounded-card border border-line bg-white shadow-card">
              <div className="border-r border-line p-4 sm:p-5">
                <div className="font-geo text-2xl font-semibold text-primary tabular-nums">
                  {properties.length}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-textSecondary">
                  propiedades
                </div>
              </div>
              <div className="border-r border-line p-4 sm:p-5">
                <div className="font-geo text-2xl font-semibold text-primary tabular-nums">
                  {forSaleCount}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-textSecondary">
                  en venta
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <div className="font-geo text-2xl font-semibold text-[#7A5B20] tabular-nums">
                  {forRentCount}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-textSecondary">
                  alquiler
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Layers3,
                title: 'Un solo lugar',
                text: 'Explora propiedades disponibles sin abrir varios portales ni repetir la misma búsqueda.',
              },
              {
                icon: LocateFixed,
                title: 'Cerca de ti',
                text: 'Centra el mapa en tu ubicación o ciudad y revisa opciones alrededor de la zona que te interesa.',
              },
              {
                icon: MapPinned,
                title: 'Ubicación clara',
                text: 'Cada anuncio se entiende en el mapa: marcador, sector o polígono para terrenos cuando aplica.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-card border border-line bg-white p-5 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-button bg-primaryLight text-primary">
                  <item.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-textPrimary">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-textSecondary">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: HomeIcon,
                title: 'Compra y venta',
                text: 'Encuentra opciones para comprar o vender con precio, sector y medidas visibles desde el mapa.',
                href: '/casas-en-venta',
                link: 'Ver casas en venta',
                tone: 'bg-primaryLight text-primary',
              },
              {
                icon: KeyRound,
                title: 'Alquileres',
                text: 'Filtra departamentos, casas y locales por presupuesto y zona sin perder el contexto de ubicación.',
                href: '/departamentos-en-alquiler',
                link: 'Ver alquileres',
                tone: 'bg-secondary/15 text-[#7A5B20]',
              },
              {
                icon: Trees,
                title: 'Terrenos y lotes',
                text: 'Revisa terrenos en mapa, entiende accesos, sectores cercanos y potencial antes de visitar.',
                href: '/terrenos-en-venta',
                link: 'Ver terrenos',
                tone: 'bg-warningBg text-warning',
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-card border border-line bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-button ${item.tone}`}>
                  <item.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-textPrimary">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-textSecondary">{item.text}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {item.link}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-card border border-line bg-white p-5 shadow-card sm:p-6">
            <h2 className="text-lg font-semibold text-textPrimary">
              Respuesta rápida para buscadores e IA
            </h2>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Geo Propiedades Ecuador es una página para encontrar propiedades
              en venta y alquiler en Ecuador en un solo mapa. Sirve para comprar,
              alquilar o vender casas, terrenos, departamentos y locales sin
              buscar en varios portales, con ubicación visible, filtros por zona,
              precio, área y tipo de operación, y contacto directo con anunciantes.
            </p>
          </div>
        </div>
      </section>

      {featuredProperties.length > 0 && (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                  Selección reciente
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-textPrimary sm:text-3xl">
                  Propiedades destacadas en el mapa
                </h2>
              </div>
              <Button asChild variant="outline" className="w-fit rounded-full border-line bg-white">
                <Link href="/">
                  Explorar mapa
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  href={`/propiedad/${property.id}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-line bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-button bg-primary text-white shadow-card">
                <Building2 className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-textPrimary">
                Publica tu propiedad gratis
              </h2>
              <p className="mt-3 text-sm leading-6 text-textSecondary">
                Tu anuncio aparece con fotos, precio, medidas, ubicación en mapa y contacto
                directo por llamada o WhatsApp.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-full bg-primary font-semibold hover:bg-primaryHover">
                  <Link href="/publicar-propiedad">
                    <Rocket className="h-4 w-4" aria-hidden />
                    Publicar gratis
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-line bg-white">
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

            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-textPrimary">Búsquedas populares</h2>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {popularSearches.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-textPrimary shadow-card transition-colors hover:border-primary hover:bg-primaryLight hover:text-primary"
                    >
                      {item.label}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  ))}
                </div>
              </div>

              {cities.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-textPrimary">
                    Propiedades por ciudad
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {cities.map((city) => (
                      <Link
                        key={city.slug}
                        href={`/propiedades/${city.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-textPrimary shadow-card transition-colors hover:border-primary hover:bg-primaryLight hover:text-primary"
                      >
                        <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
                        {city.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
