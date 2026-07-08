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
  getCities,
  getProperties,
  jsonLd,
  SITE_NAME,
  SITE_URL,
} from '@/lib/properties';
import {
  generateCombosWithCounts,
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
  const properties = await getProperties();
  const cities = getCities(properties).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const topCities = cities.slice(0, 24);
  const combos = generateCombosWithCounts(properties).slice(0, 36);
  const totalCities = cities.length;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Propiedades en Ecuador',
        description:
          'Indice nacional de casas, departamentos, terrenos y locales comerciales en Ecuador con paginas por ciudad y busquedas locales.',
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
              text: `${SITE_NAME} organiza propiedades en Ecuador por ciudad, tipo de inmueble, operacion y ubicacion en mapa para comparar opciones reales del catalogo.`,
            },
          },
          {
            '@type': 'Question',
            name: '¿Las paginas locales se generan con inventario real?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Si. Las paginas por ciudad y combinaciones locales se publican a partir de propiedades disponibles en el catalogo, no de listas vacias.',
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
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Directorio inmobiliario nacional
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-textPrimary sm:text-5xl">
              Propiedades en Ecuador
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-textSecondary">
              Explora casas, departamentos, terrenos y locales comerciales por ciudad,
              tipo de propiedad y busquedas locales con inventario real. Todo apunta al
              mapa para comparar ubicacion, precio y contacto directo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primaryHover"
              >
                <MapPinned className="h-4 w-4" aria-hidden />
                Abrir mapa
              </Link>
              <Link
                href="/publicar-propiedad"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold text-textPrimary hover:border-primary hover:text-primary"
              >
                Publicar propiedad
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          <aside className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-textPrimary">Cobertura actual</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white p-4">
                <p className="text-3xl font-bold text-textPrimary">{properties.length}</p>
                <p className="mt-1 text-xs text-textSecondary">propiedades publicadas</p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-3xl font-bold text-textPrimary">{totalCities}</p>
                <p className="mt-1 text-xs text-textSecondary">ciudades con inventario</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-textSecondary">
              Las rutas locales se actualizan con el catalogo para evitar paginas vacias
              y concentrar autoridad en busquedas que si tienen resultados.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-textPrimary">Buscar por tipo</h2>
            <p className="mt-1 text-sm text-textSecondary">
              Accesos principales para las intenciones inmobiliarias mas comunes.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                className="group rounded-card border border-line bg-white p-5 shadow-card transition hover:border-primary"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-4 font-semibold text-textPrimary group-hover:text-primary">
                  {typeDef.plural}
                </h3>
                <p className="mt-2 text-sm leading-6 text-textSecondary">
                  Ver {typeDef.plural.toLowerCase()} disponibles en Ecuador.
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {topCities.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-textPrimary">Ciudades con propiedades</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topCities.map((city) => (
              <Link
                key={city.slug}
                href={`/propiedades/${city.slug}`}
                className="flex items-center justify-between rounded-card border border-line bg-white p-4 shadow-card hover:border-primary"
              >
                <span>
                  <span className="block font-semibold text-textPrimary">
                    Propiedades en {city.name}
                  </span>
                  <span className="mt-1 block text-sm text-textSecondary">
                    {city.count} {city.count === 1 ? 'publicacion' : 'publicaciones'}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      )}

      {combos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-textPrimary">Busquedas locales fuertes</h2>
          <p className="mt-1 text-sm text-textSecondary">
            Combinaciones creadas solo cuando hay suficientes propiedades reales.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {combos.map(({ combo, count }) => {
              const label = comboLabel(combo, count);
              if (!label) return null;
              return (
                <Link
                  key={combo}
                  href={`/${combo}`}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-textPrimary hover:border-primary hover:text-primary"
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
