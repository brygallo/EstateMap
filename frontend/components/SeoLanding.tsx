import Link from 'next/link';
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
  mapHref,
  mapLabel = 'Ver en el mapa interactivo',
  relatedLinks = [],
  emptyMessage,
}: {
  title: string;
  intro: string;
  properties: Property[];
  mapHref: string;
  mapLabel?: string;
  relatedLinks?: RelatedLink[];
  emptyMessage?: string;
}) {
  const itemListData = {
    '@context': 'https://schema.org',
    '@graph': [
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
              text: `En Geo Propiedades Ecuador puedes encontrar ${title.toLowerCase()} con mapa interactivo, filtros, precio, área, ubicación y contacto directo con el anunciante.`,
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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(itemListData) }}
      />

      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold text-textPrimary sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-textSecondary">{intro}</p>
        <div className="mt-5 rounded-card border border-line bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-textPrimary">
            Respuesta rápida
          </h2>
          <p className="mt-2 text-sm leading-6 text-textSecondary">
            En Geo Propiedades Ecuador puedes encontrar {title.toLowerCase()} con
            ubicación en mapa, filtros por precio y características, y contacto
            directo con anunciantes.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={mapHref}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
          >
            {mapLabel}
          </Link>
          <span className="text-sm text-textSecondary">
            {properties.length}{' '}
            {properties.length === 1
              ? 'propiedad disponible'
              : 'propiedades disponibles'}
          </span>
        </div>
      </header>

      <section className="mt-8">
        <SeoPropertyGrid properties={properties} emptyMessage={emptyMessage} />
      </section>

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
