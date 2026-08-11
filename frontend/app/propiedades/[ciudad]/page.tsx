import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoLanding, { TYPE_LINKS, priceRangeText } from '@/components/SeoLanding';
import { getProperties, getCities, getLocationCatalog, slugify } from '@/lib/properties';
import {
  generateCombosWithCounts,
  MIN_LOCATION_PROPERTIES,
  parseComboSlug,
} from '@/lib/seo-combos';
import { generatePageMetadata } from '@/lib/metadata';
import { MIN_LISTINGS_FOR_PROMOTION } from '@/lib/market-stats';

export const revalidate = 3600;
// Cities discovered at build time are pre-rendered; new ones render on demand.
export const dynamicParams = true;

interface CityPageProps {
  params: Promise<{ ciudad: string }>;
}

async function resolveCity(slug: string) {
  const properties = await getProperties();
  const match = getCities(properties).find((c) => c.slug === slug);
  if (match) {
    const cityProperties = properties.filter((p) => slugify(p.city || '') === slug);
    return { name: match.name, properties: cityProperties };
  }

  // No listings right now: fall back to the stable canton catalogue so the page
  // keeps answering 200 with an empty state instead of 404-ing an indexed URL.
  // A slug missing from the catalogue too is a genuine 404.
  const { cities } = await getLocationCatalog();
  const known = cities.find((c) => c.slug === slug);
  return known ? { name: known.name, properties: [] } : null;
}

export async function generateStaticParams() {
  const properties = await getProperties();
  return getCities(properties).map((city) => ({ ciudad: city.slug }));
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { ciudad } = await params;
  const city = await resolveCity(ciudad);

  if (!city) {
    return { title: 'Ciudad no encontrada', robots: { index: false, follow: false } };
  }

  const metadata = generatePageMetadata(
    `Propiedades en ${city.name}`,
    `Casas, departamentos, terrenos y locales en venta y alquiler en ${city.name}, Ecuador. Cobertura para ciudades principales, cantones y búsquedas locales con mapa, precios y fotos.`,
    `/propiedades/${ciudad}`
  );

  // Out of stock, not gone: crawlable so it recovers on its own when listings
  // return, but out of the index while it has nothing to show.
  if (city.properties.length < MIN_LOCATION_PROPERTIES) {
    return { ...metadata, robots: { index: false, follow: true } };
  }
  return metadata;
}

export default async function CiudadPage({ params }: CityPageProps) {
  const { ciudad } = await params;
  const city = await resolveCity(ciudad);

  if (!city) {
    notFound();
  }

  const relatedLocalLinks = generateCombosWithCounts(city.properties)
    .map(({ combo, count }) => {
      const parsed = parseComboSlug(combo);
      if (!parsed || parsed.locationSlug !== ciudad) return null;
      const op = parsed.opDef ? ` ${parsed.opDef.label}` : '';
      return {
        label: `${parsed.typeDef.plural}${op} en ${city.name} (${count})`,
        href: `/${combo}`,
      };
    })
    .filter(Boolean)
    .slice(0, 10) as { label: string; href: string }[];

  // Cross-link to the city's m² price page when it has enough comparable
  // sale inventory to be indexable.
  const comparableSales = city.properties.filter(
    (p) => p.status === 'for_sale' && Number(p.price) > 0 && Number(p.area) > 0
  ).length;
  if (comparableSales >= MIN_LISTINGS_FOR_PROMOTION) {
    relatedLocalLinks.unshift({
      label: `Precio del metro cuadrado en ${city.name}`,
      href: `/estadisticas-inmobiliarias/${ciudad}`,
    });
  }

  return (
    <SeoLanding
      title={`Propiedades en ${city.name}`}
      intro={`Encuentra casas, departamentos, terrenos y locales comerciales en venta y alquiler en ${city.name}. Geo Propiedades Ecuador cubre ciudades grandes, cantones y mercados locales menos visibles para que puedas comparar ubicación en el mapa, precio, área y características.${priceRangeText(
        city.properties
      )}`}
      properties={city.properties}
      pageHref={`/propiedades/${ciudad}`}
      mapHref={`/?search=${encodeURIComponent(city.name)}`}
      featuredQuery={{ city: city.name }}
      relatedLinks={relatedLocalLinks.length ? relatedLocalLinks : TYPE_LINKS}
      locationName={city.name}
      breadcrumbs={[{ label: 'Propiedades', href: '/propiedades' }]}
      emptyMessage={`Aún no hay propiedades publicadas en ${city.name}.`}
    />
  );
}
