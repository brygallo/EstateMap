import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoLanding, { TYPE_LINKS, priceRangeText } from '@/components/SeoLanding';
import { getProperties, getCities, slugify } from '@/lib/properties';
import { generateCombosWithCounts, parseComboSlug } from '@/lib/seo-combos';
import { generatePageMetadata } from '@/lib/metadata';

export const revalidate = 3600;
// Cities discovered at build time are pre-rendered; new ones render on demand.
export const dynamicParams = true;

interface CityPageProps {
  params: Promise<{ ciudad: string }>;
}

async function resolveCity(slug: string) {
  const properties = await getProperties();
  const match = getCities(properties).find((c) => c.slug === slug);
  if (!match) return null;
  const cityProperties = properties.filter((p) => slugify(p.city || '') === slug);
  return { name: match.name, properties: cityProperties };
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

  return generatePageMetadata(
    `Propiedades en ${city.name}`,
    `Casas, departamentos, terrenos y locales en venta y alquiler en ${city.name}, Ecuador. Cobertura para ciudades principales, cantones y búsquedas locales con mapa, precios y fotos.`,
    `/propiedades/${ciudad}`
  );
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

  return (
    <SeoLanding
      title={`Propiedades en ${city.name}`}
      intro={`Encuentra casas, departamentos, terrenos y locales comerciales en venta y alquiler en ${city.name}. Geo Propiedades Ecuador cubre ciudades grandes, cantones y mercados locales menos visibles para que puedas comparar ubicación en el mapa, precio, área y características.${priceRangeText(
        city.properties
      )}`}
      properties={city.properties}
      pageHref={`/propiedades/${ciudad}`}
      mapHref={`/?search=${encodeURIComponent(city.name)}`}
      relatedLinks={relatedLocalLinks.length ? relatedLocalLinks : TYPE_LINKS}
      locationName={city.name}
      emptyMessage={`Aún no hay propiedades publicadas en ${city.name}.`}
    />
  );
}
