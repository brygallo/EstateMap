import Link from 'next/link';
import { ArrowRight, CheckCircle2, MapPin, PlusCircle, Search } from 'lucide-react';
import SeoPropertyGrid from '@/components/SeoPropertyGrid';
import {
  Property,
  SITE_URL,
  formatPrice,
  getFeaturedProperties,
  jsonLd,
} from '@/lib/properties';

export type RelatedLink = { label: string; href: string };

/** Filtros explícitos para el grid de "Propiedades destacadas" (con fotos),
 * usados cuando `mapHref` no trae `type`/`status`/`city`/`province` legibles
 * (p. ej. páginas que arman el mapa con `search=`). */
export type FeaturedQuery = {
  type?: string;
  status?: string;
  city?: string;
  province?: string;
};

/**
 * Reusable server-rendered landing page for SEO segments (by type, by city…).
 * Renders an H1, intro copy, a crawlable property grid, related internal links
 * and an ItemList JSON-LD so search engines understand the listing set.
 */
export default async function SeoLanding({
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
  breadcrumbs = [],
  featuredQuery,
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
  /** Migas intermedias entre "Inicio" y la página actual (visibles + JSON-LD). */
  breadcrumbs?: RelatedLink[];
  /** Filtros explícitos para las fotos destacadas cuando `mapHref` no los expone. */
  featuredQuery?: FeaturedQuery;
}) {
  const hasProperties = properties.length > 0;
  const featuredProperties = properties.slice(0, 8);
  const canonicalHref = pageHref || mapHref;

  // El grid "destacado" se pinta con fotos reales: `properties` llega sin
  // imágenes (viene de `getProperties({ includeImages: false })` para que la
  // lista completa sea cacheable), así que se pide aparte una página chica
  // con `include_images=1`, filtrada con lo que se pueda leer de `mapHref`
  // (o lo que la página haya pasado explícito en `featuredQuery`).
  const parsedMapUrl = new URL(mapHref, SITE_URL);
  const featuredFilters = {
    type: featuredQuery?.type ?? parsedMapUrl.searchParams.get('type') ?? undefined,
    status: featuredQuery?.status ?? parsedMapUrl.searchParams.get('status') ?? undefined,
    city: featuredQuery?.city ?? parsedMapUrl.searchParams.get('city') ?? undefined,
    province:
      featuredQuery?.province ?? parsedMapUrl.searchParams.get('province') ?? undefined,
  };
  const featuredWithImages = await getFeaturedProperties({
    ...featuredFilters,
    limit: 8,
  });
  const featuredList = featuredWithImages.length
    ? featuredWithImages
    : properties.slice(0, 8);

  // Datos calculados por página para diferenciar la copy (evita que todas las
  // landings compartan texto byte-idéntico) y para citabilidad por IA.
  const priceValues = properties
    .map((p) => Number.parseFloat(String(p.price)))
    .filter((n) => Number.isFinite(n) && n > 0);
  // Filtro de outliers basado en la mediana: un precio mal parseado (p. ej.
  // $379 en un listado de casas de $150k) no debe convertirse en el "desde"
  // que se muestra/promete en la copy y el JSON-LD.
  const sortedPrices = priceValues.slice().sort((a, b) => a - b);
  const medianPrice = sortedPrices.length
    ? sortedPrices[Math.floor(sortedPrices.length / 2)]
    : 0;
  const priceFloor = medianPrice * 0.02;
  const cleanPrices = priceValues.filter((n) => n >= priceFloor);
  const minPrice = cleanPrices.length ? Math.min(...cleanPrices) : null;
  const maxPrice = cleanPrices.length ? Math.max(...cleanPrices) : null;
  const rangeText =
    minPrice !== null && maxPrice !== null
      ? minPrice === maxPrice
        ? ` con precio de referencia ${formatPrice(minPrice)}`
        : ` con precios desde ${formatPrice(minPrice)} hasta ${formatPrice(maxPrice)}`
      : '';
  // Solo se baja de mayúscula la primera letra (p. ej. "Casas en venta en
  // Quito" -> "casas en venta en Quito"): con `.toLowerCase()` los nombres
  // propios como "Quito" o "Ecuador" quedaban en minúscula.
  const segment = title.charAt(0).toLowerCase() + title.slice(1);
  const countText = `${properties.length} ${
    properties.length === 1 ? 'publicación' : 'publicaciones'
  }`;
  const quickPoints = [
    'Ubicación visible en el mapa',
    'Filtros por precio, tipo y operación',
    'Contacto directo con anunciantes',
  ];

  const pageUrl = `${SITE_URL}${canonicalHref.startsWith('/') ? canonicalHref : `/${canonicalHref}`}`;
  const itemListData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        // CollectionPage + SearchResultsPage describe mejor una landing de
        // inventario que un WebPage genérico (Google y las IAs entienden que
        // es un listado de resultados, no un artículo).
        '@type': ['CollectionPage', 'SearchResultsPage'],
        '@id': `${pageUrl}#webpage`,
        name: title,
        description: intro,
        url: pageUrl,
        inLanguage: 'es-EC',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        mainEntity: { '@id': `${pageUrl}#inventario` },
        about: title,
        ...(minPrice !== null && maxPrice !== null
          ? {
              offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'USD',
                lowPrice: minPrice,
                highPrice: maxPrice,
                offerCount: priceValues.length,
              },
            }
          : {}),
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
          ...breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 2,
            name: crumb.label,
            item: `${SITE_URL}${crumb.href}`,
          })),
          {
            '@type': 'ListItem',
            position: breadcrumbs.length + 2,
            name: title,
          },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#inventario`,
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
            name: `¿Dónde encontrar ${segment}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: hasProperties
                ? `En Geo Propiedades Ecuador hay ${countText} de ${segment}${rangeText}, con mapa interactivo, filtros, área, ubicación y contacto directo con el anunciante.`
                : `En Geo Propiedades Ecuador puedes buscar ${segment} con mapa interactivo, filtros, precio, área, ubicación y contacto directo con el anunciante.`,
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

      {breadcrumbs.length > 0 && (
        <nav aria-label="Migas de pan" className="mb-5">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-textSecondary">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">
                Inicio
              </Link>
            </li>
            {breadcrumbs.map((crumb) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                <span aria-hidden className="text-line">/</span>
                <Link href={crumb.href} className="transition-colors hover:text-primary">
                  {crumb.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-1.5" aria-current="page">
              <span aria-hidden className="text-line">/</span>
              <span className="font-medium text-textPrimary">{title}</span>
            </li>
          </ol>
        </nav>
      )}

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
                Hay {countText} de {segment}
                {rangeText}. Compara ubicación en el mapa, filtra por precio y
                características, y contacta directo con los anunciantes.
              </>
            ) : (
              <>
                En Geo Propiedades Ecuador puedes buscar {segment} con
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
          properties={featuredList}
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
  const priceValues = properties
    .map((p) => Number.parseFloat(String(p.price)))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!priceValues.length) return '';
  // Mismo filtro de outliers que en el componente: un precio mal parseado no
  // debe convertirse en el "desde" de la intro.
  const sortedPrices = priceValues.slice().sort((a, b) => a - b);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
  const priceFloor = medianPrice * 0.02;
  const cleanPrices = priceValues.filter((n) => n >= priceFloor);
  if (!cleanPrices.length) return '';
  const min = Math.min(...cleanPrices);
  const max = Math.max(...cleanPrices);
  if (min === max) return ` Precio de referencia: ${formatPrice(min)}.`;
  return ` Precios desde ${formatPrice(min)} hasta ${formatPrice(max)}.`;
}
