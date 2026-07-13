import Link from 'next/link';
import { ArrowRight, CheckCircle2, MapPin, PlusCircle, Search } from 'lucide-react';
import SeoPropertyGrid from '@/components/SeoPropertyGrid';
import { Property, SITE_URL, formatPrice, jsonLd } from '@/lib/properties';

export type RelatedLink = { label: string; href: string };

/**
 * Reusable server-rendered landing page for SEO segments (by type, by city…).
 * Renders an H1, intro copy, a crawlable property grid, related internal links
 * and an ItemList JSON-LD so search engines understand the listing set.
 */
export default function SeoLanding({
  title,
  intro,
  properties,
  pageHref,
  mapHref,
  mapLabel = 'Ver en el mapa interactivo',
  relatedLinks = [],
  cityLinks = [],
  locationName,
  emptyMessage,
}: {
  title: string;
  intro: string;
  properties: Property[];
  pageHref?: string;
  mapHref: string;
  mapLabel?: string;
  relatedLinks?: RelatedLink[];
  /** Enlaces hacia la intención por ciudad (p. ej. "Casas en venta en Quito"). */
  cityLinks?: RelatedLink[];
  /** Ubicación (ciudad/provincia) de la página, si aplica: añade schema Place. */
  locationName?: string;
  emptyMessage?: string;
}) {
  const hasProperties = properties.length > 0;
  const featuredProperties = properties.slice(0, 8);
  const canonicalHref = pageHref || mapHref;

  // Datos calculados por página para diferenciar la copy (evita que todas las
  // landings compartan texto byte-idéntico) y para citabilidad por IA.
  const priceValues = properties
    .map((p) => Number.parseFloat(String(p.price)))
    .filter((n) => Number.isFinite(n) && n > 0);
  const minPrice = priceValues.length ? Math.min(...priceValues) : null;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : null;
  const rangeText =
    minPrice !== null && maxPrice !== null
      ? minPrice === maxPrice
        ? ` con precio de referencia ${formatPrice(minPrice)}`
        : ` con precios desde ${formatPrice(minPrice)} hasta ${formatPrice(maxPrice)}`
      : '';
  const countText = `${properties.length} ${
    properties.length === 1 ? 'propiedad disponible' : 'propiedades disponibles'
  }`;
  const quickPoints = [
    'Ubicación visible en el mapa',
    'Filtros por precio, tipo y operación',
    'Contacto directo con anunciantes',
  ];

  const itemListData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: title,
        description: intro,
        url: `${SITE_URL}${canonicalHref.startsWith('/') ? canonicalHref : `/${canonicalHref}`}`,
        isPartOf: {
          '@type': 'WebSite',
          name: 'Geo Propiedades Ecuador',
          url: SITE_URL,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/?search={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        about: title,
        ...(locationName
          ? {
              spatialCoverage: {
                '@type': 'Place',
                name: locationName,
                containedInPlace: { '@type': 'Country', name: 'Ecuador' },
              },
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Inicio',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: title,
        numberOfItems: properties.length,
        itemListElement: properties.slice(0, 30).map((p, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_URL}/propiedad/${p.id}`,
          name: p.title || title,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `¿Dónde encontrar ${title.toLowerCase()}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: hasProperties
                ? `En Geo Propiedades Ecuador hay ${countText.toLowerCase()} de ${title.toLowerCase()}${rangeText}, con mapa interactivo, filtros, área, ubicación y contacto directo con el anunciante.`
                : `En Geo Propiedades Ecuador puedes buscar ${title.toLowerCase()} con mapa interactivo, filtros, precio, área, ubicación y contacto directo con el anunciante.`,
            },
          },
          {
            '@type': 'Question',
            name: '¿Qué información muestra cada propiedad?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Cada ficha puede mostrar fotos, precio, ciudad, provincia, área, habitaciones, baños, parqueos, tipo de operación, polígono o marcador en mapa y datos de contacto.',
            },
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(itemListData) }}
      />

      <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
            Propiedades en Ecuador
          </p>
          <h1 className="text-3xl font-bold leading-tight text-textPrimary sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-textSecondary">
            {intro}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={mapHref}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primaryHover"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              {mapLabel}
            </Link>
            <Link
              href="/publicar-propiedad"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold text-textPrimary hover:border-primary hover:text-primary"
            >
              <PlusCircle className="h-4 w-4" aria-hidden />
              Publicar propiedad
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm text-textSecondary">
            {quickPoints.map((point) => (
              <span
                key={point}
                className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5"
              >
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
                {point}
              </span>
            ))}
          </div>
        </div>

        <aside className="rounded-card border border-line bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-textPrimary">
            Respuesta rápida
          </h2>
          <p className="mt-2 text-sm leading-6 text-textSecondary">
            {hasProperties ? (
              <>
                {countText} de {title.toLowerCase()}
                {rangeText}. Compara ubicación en el mapa, filtra por precio y
                características, y contacta directo con los anunciantes.
              </>
            ) : (
              <>
                En Geo Propiedades Ecuador puedes buscar {title.toLowerCase()} con
                ubicación en mapa, filtros por precio y características, y contacto
                directo con anunciantes.
              </>
            )}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface p-3">
              <p className="text-2xl font-bold text-textPrimary">
                {properties.length}
              </p>
              <p className="mt-1 text-xs text-textSecondary">
                {properties.length === 1
                  ? 'propiedad disponible'
                  : 'propiedades disponibles'}
              </p>
            </div>
            <div className="rounded-lg bg-surface p-3">
              <p className="text-2xl font-bold text-textPrimary">Mapa</p>
              <p className="mt-1 text-xs text-textSecondary">
                Búsqueda por ubicación
              </p>
            </div>
          </div>
        </aside>
      </header>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-textPrimary">
              {hasProperties ? 'Propiedades destacadas' : 'Disponibilidad actual'}
            </h2>
            <p className="mt-1 text-sm text-textSecondary">
              {hasProperties
                ? 'Revisa las fichas y abre el mapa para comparar zonas cercanas.'
                : 'Todavía no hay publicaciones exactas para esta búsqueda, pero puedes explorar opciones cercanas.'}
            </p>
          </div>
          {hasProperties && properties.length > featuredProperties.length && (
            <Link
              href={mapHref}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primaryHover"
            >
              Ver todas en el mapa
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
        <SeoPropertyGrid
          properties={featuredProperties}
          emptyMessage={emptyMessage}
          mapHref={mapHref}
          relatedLinks={relatedLinks.length > 0 ? relatedLinks : cityLinks}
          priorityCount={2}
        />
      </section>

      {cityLinks.length > 0 && (
        <nav aria-label="Explora por ciudad" className="mt-12">
          <h2 className="text-xl font-bold text-textPrimary">Explora por ciudad</h2>
          <p className="mt-1 text-sm text-textSecondary">
            Ciudades con más inventario disponible para esta búsqueda.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {cityLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-textPrimary hover:border-primary hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {relatedLinks.length > 0 && (
        <nav aria-label="Búsquedas relacionadas" className="mt-12">
          <h2 className="text-xl font-bold text-textPrimary">
            Búsquedas relacionadas
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-textPrimary hover:border-primary hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <article className="rounded-card border border-line bg-white p-5">
          <Search className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-base font-semibold text-textPrimary">
            Busca por zona
          </h2>
          <p className="mt-2 text-sm leading-6 text-textSecondary">
            Abre el mapa y escribe una ciudad, sector o referencia para encontrar
            propiedades cerca del lugar que te interesa.
          </p>
        </article>
        <article className="rounded-card border border-line bg-white p-5">
          <MapPin className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-base font-semibold text-textPrimary">
            Compara ubicación
          </h2>
          <p className="mt-2 text-sm leading-6 text-textSecondary">
            Evalúa precio, área y características junto con la ubicación real o
            aproximada de cada anuncio.
          </p>
        </article>
        <article className="rounded-card border border-line bg-white p-5">
          <PlusCircle className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-base font-semibold text-textPrimary">
            ¿Tienes una propiedad?
          </h2>
          <p className="mt-2 text-sm leading-6 text-textSecondary">
            Publica gratis con fotos, precio, datos de contacto y ubicación para
            que compradores o arrendatarios te encuentren.
          </p>
        </article>
      </section>
    </main>
  );
}

/** Shared related-links block reused across landing pages. */
export const TYPE_LINKS: RelatedLink[] = [
  { label: 'Casas en venta', href: '/casas-en-venta' },
  { label: 'Departamentos en alquiler', href: '/departamentos-en-alquiler' },
  { label: 'Terrenos en venta', href: '/terrenos-en-venta' },
  { label: 'Locales comerciales', href: '/locales-comerciales' },
];

/** Formats an approximate price range for intro copy. */
export function priceRangeText(properties: Property[]): string {
  const prices = properties
    .map((p) => Number.parseFloat(String(p.price)))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (!prices.length) return '';
  const min = prices[0];
  const max = prices[prices.length - 1];
  if (min === max) return ` Precio de referencia: ${formatPrice(min)}.`;
  return ` Precios desde ${formatPrice(min)} hasta ${formatPrice(max)}.`;
}
