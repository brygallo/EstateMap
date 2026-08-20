import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Home,
  Landmark,
  MapPinned,
  Store,
} from 'lucide-react';
import {
  citiesFromSummary,
  getPropertySummary,
  jsonLd,
  SITE_NAME,
  SITE_URL,
} from '@/lib/properties';
import {
  generateCombosFromGroups,
  parseComboSlug,
  TYPE_DEFS,
} from '@/lib/seo-combos';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Propiedades en Ecuador',
  description:
    'Directorio nacional de propiedades en Ecuador por ciudad, tipo de inmueble y búsquedas locales con inventario real en mapa.',
  alternates: { canonical: '/propiedades' },
};

const typeIcons = {
  house: Home,
  apartment: Building2,
  land: Landmark,
  commercial: Store,
} as const;

function comboLabel(combo: string, count: number): string | null {
  const parsed = parseComboSlug(combo);
  if (!parsed) return null;
  const op = parsed.opDef ? ` ${parsed.opDef.label}` : '';
  const location = parsed.locationSlug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return `${parsed.typeDef.plural}${op} en ${location} (${count})`;
}

export default async function PropiedadesPage() {
  // Counts come from the database aggregate: the list endpoint caps
  // `page_size` at 2000, so counting a fetched page under-reported everything.
  const summary = await getPropertySummary();
  const cities = citiesFromSummary(summary).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const topCities = cities.slice(0, 24);
  const combos = generateCombosFromGroups(summary.groups).slice(0, 36);
  const totalCities = cities.length;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Propiedades en Ecuador',
        description:
          'Índice nacional de casas, departamentos, terrenos y locales comerciales en Ecuador con páginas por ciudad y búsquedas locales.',
        url: `${SITE_URL}/propiedades`,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'es-EC',
        about: [
          'propiedades en Ecuador',
          'casas en venta en Ecuador',
          'terrenos en venta en Ecuador',
          'departamentos en alquiler en Ecuador',
          'locales comerciales en Ecuador',
        ],
      },
      {
        '@type': 'ItemList',
        name: 'Ciudades con propiedades en Ecuador',
        numberOfItems: topCities.length,
        itemListElement: topCities.map((city, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: `Propiedades en ${city.name}`,
          url: `${SITE_URL}/propiedades/${city.slug}`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: '¿Dónde buscar propiedades en Ecuador?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${SITE_NAME} organiza propiedades en Ecuador por ciudad, tipo de inmueble, operación y ubicación en mapa para comparar opciones reales del catálogo.`,
            },
          },
          {
            '@type': 'Question',
            name: '¿Las páginas locales se generan con inventario real?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sí. Las páginas por ciudad y combinaciones locales se publican a partir de propiedades disponibles en el catálogo, no de listas vacías.',
            },
          },
        ],
      },
    ],
  };

  return (
    <main className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary sm:text-sm sm:tracking-wide">
              Directorio inmobiliario nacional
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-textPrimary sm:mt-3 sm:text-4xl lg:text-5xl">
              Propiedades en Ecuador
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary sm:mt-4 sm:text-base sm:leading-7">
              Explora casas, departamentos, terrenos y locales comerciales por ciudad,
              tipo de propiedad y búsquedas locales con inventario real. Todo apunta al
              mapa para comparar ubicación, precio y contacto directo.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover sm:px-5 sm:py-3"
              >
                <MapPinned className="h-4 w-4" aria-hidden />
                Abrir mapa
              </Link>
              <Link
                href="/publicar-propiedad"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-center text-sm font-semibold text-textPrimary hover:border-primary hover:text-primary sm:px-5 sm:py-3"
              >
                Publicar propiedad
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          <aside className="rounded-card border border-line bg-surface p-4 sm:p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-textSecondary sm:text-sm sm:normal-case sm:tracking-normal sm:text-textPrimary">Cobertura actual</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
              <div className="rounded-lg bg-white p-3 sm:p-4">
                <p className="font-geo text-2xl font-bold text-textPrimary sm:text-3xl">{summary.total.toLocaleString('es-EC')}</p>
                <p className="mt-1 text-xs text-textSecondary">propiedades publicadas</p>
              </div>
              <div className="rounded-lg bg-white p-3 sm:p-4">
                <p className="font-geo text-2xl font-bold text-textPrimary sm:text-3xl">{totalCities}</p>
                <p className="mt-1 text-xs text-textSecondary">ciudades con inventario</p>
              </div>
            </div>
            <p className="mt-3 hidden text-sm leading-6 text-textSecondary sm:block">
              Las rutas locales se actualizan con el catálogo para evitar páginas vacías
              y concentrar autoridad en búsquedas que sí tienen resultados.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
          <div>
            <h2 className="text-xl font-bold text-textPrimary sm:text-2xl">Buscar por tipo</h2>
            <p className="mt-1 text-sm text-textSecondary">
              Accesos principales para las intenciones inmobiliarias más comunes.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {TYPE_DEFS.map((typeDef) => {
            const Icon = typeIcons[typeDef.type as keyof typeof typeIcons] || Home;
            const href =
              typeDef.type === 'house'
                ? '/casas-en-venta'
                : typeDef.type === 'apartment'
                  ? '/departamentos-en-alquiler'
                  : typeDef.type === 'land'
                    ? '/terrenos-en-venta'
                    : '/locales-comerciales';
            return (
              <Link
                key={typeDef.type}
                href={href}
                className="group min-w-0 rounded-card border border-line bg-white p-4 shadow-card transition hover:border-primary sm:p-5"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 text-sm font-semibold text-textPrimary group-hover:text-primary sm:mt-4 sm:text-base">
                  {typeDef.plural}
                </h3>
                <p className="mt-1.5 hidden text-sm leading-6 text-textSecondary sm:block">
                  Ver {typeDef.plural.toLowerCase()} disponibles en Ecuador.
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {topCities.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
          <h2 className="text-xl font-bold text-textPrimary sm:text-2xl">Ciudades con propiedades</h2>
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-white shadow-card sm:mt-5 sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:overflow-visible sm:border-0 sm:bg-transparent sm:shadow-none lg:grid-cols-3">
            {topCities.map((city) => (
              <Link
                key={city.slug}
                href={`/propiedades/${city.slug}`}
                aria-label={`Propiedades en ${city.name}, ${city.count} ${city.count === 1 ? 'publicación' : 'publicaciones'}`}
                className="group flex min-h-14 items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-primaryLight sm:rounded-card sm:border sm:border-line sm:bg-white sm:p-4 sm:shadow-card sm:hover:border-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-textPrimary group-hover:text-primary sm:text-base">
                    Propiedades en {city.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-textSecondary sm:mt-1 sm:text-sm">
                    {city.count} {city.count === 1 ? 'publicación' : 'publicaciones'}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}

      {combos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 sm:pb-12 lg:px-8">
          <h2 className="text-xl font-bold text-textPrimary sm:text-2xl">Búsquedas locales fuertes</h2>
          <p className="mt-1 text-sm text-textSecondary">
            Combinaciones creadas solo cuando hay suficientes propiedades reales.
          </p>
          <div className="-mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-5 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {combos.map(({ combo, count }) => {
              const label = comboLabel(combo, count);
              if (!label) return null;
              return (
                <Link
                  key={combo}
                  href={`/${combo}`}
                  className="shrink-0 snap-start rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-textPrimary hover:border-primary hover:text-primary"
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
